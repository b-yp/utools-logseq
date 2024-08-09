const { writeFile, copyFile } = require("fs");
const {
  logseqRequest,
  formatDate,
  dataUrlToBuffer,
  getFileTypeAndFormat,
  debounce,
} = require("./utils");

const appendBlockInPage = async (args) => {
  await logseqRequest(
    {
      logseqApi: "logseq.Editor.appendBlockInPage",
    },
    args
  );
  await logseqRequest({
    logseqApi: "logseq.Editor.exitEditingMode",
  }); // TODO 为什么这个方法没有生效
  utools.showNotification(`✅ 保存成功：${JSON.stringify(args)}`);
  utools.outPlugin();
};

const searchPageAndBlock = async (payload, signal) => {
  const pages = await logseqRequest(
    {
      logseqApi: "logseq.DB.datascriptQuery",
      signal,
    },
    [
      `
      [
        :find (pull ?block [*])
        :where
        [?block :block/name ?pagename]
        [(clojure.string/includes? ?pagename "${payload}")]
      ]
    `,
    ]
  );
  const blocks = await logseqRequest(
    {
      logseqApi: "logseq.DB.datascriptQuery",
      signal,
    },
    [
      `
      [
        :find (pull ?block [* {:block/page [:block/name]}])
        :where
        [?block :block/content ?blockcontent]
        [?block :block/page ?page]
        [?page :block/name ?pagename]
        [(clojure.string/includes? ?blockcontent "${payload}")]
      ]
    `,
    ]
  );

  const pageList = (pages || []).map((i) => ({
    type: "page",
    title: i?.[0]?.name,
    description: (i?.[0]?.properties?.tags || []).map((i) => ` #${i} `),
    icon: "page.png",
    uuid: i?.[0]?.uuid, // 暂时没用，以后万一有用呢？
  }));

  const blockList = (blocks || []).map((i) => ({
    type: "block",
    title: i?.[0]?.page?.name || "❌ 未知页面",
    description: i?.[0]?.content,
    icon: "block.png",
    uuid: i?.[0]?.uuid,
  }));

  return {
    pageList,
    blockList,
  };
};

let configItem = "";
const controller = new AbortController();

window.exports = {
  save_to_logseq: {
    mode: "none",
    args: {
      enter: async ({ code, type, payload }) => {
        console.log("enter", code, type, payload);
        window.utools.hideMainWindow();

        try {
          const { path: currentGraphPath } = await logseqRequest({
            logseqApi: "logseq.App.getCurrentGraph",
          });

          const { preferredDateFormat } = await logseqRequest({
            logseqApi: "logseq.App.getUserConfigs",
          });

          const nowJournal = formatDate(new Date(), preferredDateFormat);

          if (code === "save_to_logseq") {
            if (type === "over") {
              appendBlockInPage([nowJournal, payload]);
            }
            if (type === "img") {
              const base64String = payload;
              const base64Data = base64String.replace(
                /^data:image\/\w+;base64,/,
                ""
              );
              const [u8arr] = dataUrlToBuffer(base64String);

              const imageName = `image_${Date.now()}_0.png`; //毫秒级时间戳，基本上不可能有同一时间保存多张图片的情况，但是为了和 Logseq 格式保持一致，所以加个 _0
              const filePath = `${currentGraphPath}/assets/${imageName}`;
              writeFile(filePath, u8arr, (err) => {
                if (err) {
                  console.error("save error:", err);
                } else {
                  console.log("save success:", filePath);
                  appendBlockInPage([
                    nowJournal,
                    `![image.png](../assets/${imageName})`,
                  ]);
                }
              });
            }
            if (type === "files") {
              payload.forEach((item) => {
                if (
                  item.isFile &&
                  !item.isDirectory &&
                  item.path &&
                  item.name
                ) {
                  const { type, format, name } = getFileTypeAndFormat(
                    item.name
                  );

                  const fileName = `${name}_${Date.now()}_0.${format}`; // _0 为了和 Logseq 格式保持一致
                  const assetsFilePath = `${currentGraphPath}/assets/${fileName}`;
                  const pageFilePath = `${currentGraphPath}/pages/${item.name}`; // TODO: 已存在文件
                  const assetsList = ["image", "video", "audio", "pdf"];
                  const mdLink = `
                    ${assetsList.includes(type) ? "!" : ""}[${
                    item.name
                  }](../assets/${fileName})`;
                  const backlink = `[[${name}]]`;
                  const filePath =
                    type === "markdown" ? pageFilePath : assetsFilePath;
                  const link = type === "markdown" ? backlink : mdLink;

                  copyFile(item.path, filePath, (err) => {
                    if (err) {
                      console.error("copy error:", err);
                    } else {
                      console.log("copy success:", filePath);
                      // TODO: 文件名如果不规范则渲染会有问题, 比如: [7@7[_@J)C597LGT1R@E_GI, 解决方案就是给文件名编码
                      appendBlockInPage([nowJournal, link]);
                    }
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error("error", error);
        }
        // window.utools.outPlugin();
      },
    },
  },
  configs: {
    mode: "list",
    args: {
      enter: (action, callbackSetList) => {
        callbackSetList([
          {
            title: "Logseq Server Host",
            description:
              utools.dbStorage.getItem("host") || "默认值：127.0.0.1",
            type: "host",
            icon: "",
          },
          {
            title: "Logseq Server Port",
            description: utools.dbStorage.getItem("port") || "默认值：12315",
            type: "port",
            icon: "",
          },
          {
            title: "Logseq Server Token",
            description: utools.dbStorage.getItem("token") || "默认值：utools",
            type: "token",
            icon: "",
          },
        ]);
      },
      search: (action, searchWord) => {
        configItem = searchWord;
      },
      select: (action, itemData, callbackSetList) => {
        utools.dbStorage.setItem(itemData.type, configItem);
        utools.showNotification(`${itemData.title} 设置成功: ${configItem}`);

        callbackSetList([
          {
            title: "Logseq Server Host",
            description:
              utools.dbStorage.getItem("host") || "默认值：127.0.0.1",
            type: "host",
            icon: "",
          },
          {
            title: "Logseq Server Port",
            description: utools.dbStorage.getItem("port") || "默认值：12315",
            type: "port",
            icon: "",
          },
          {
            title: "Logseq Server Token",
            description: utools.dbStorage.getItem("token") || "默认值：utools",
            type: "token",
            icon: "",
          },
        ]);
        // utools.outPlugin();
      },
      placeholder: "请输入值然后选择对应设置项即可设置",
    },
  },
  search: {
    mode: "list",
    args: {
      enter: async (action, callbackSetList) => {
        callbackSetList([{ title: "加载中..." }]);
        const { pageList, blockList } = await searchPageAndBlock(
          action.payload
        );
        callbackSetList([...pageList, ...blockList]);
      },
      search: debounce(async (action, searchWord, callbackSetList) => {
        callbackSetList([{ title: "加载中..." }]);
        // controller.abort();
        const { pageList, blockList } = await searchPageAndBlock(
          searchWord,
          controller.signal
        );
        callbackSetList([...pageList, ...blockList]);
      }),
      select: async (action, itemData) => {
        const currentGraph = await logseqRequest({
          logseqApi: "logseq.App.getCurrentGraph",
        });

        const graphName = currentGraph?.name;
        if (!graphName) return;

        if (itemData.type == "page") {
          return (
            itemData.title &&
            utools.shellOpenExternal(
              `logseq://graph/${graphName}?page=${encodeURIComponent(
                itemData.title
              )}`
            )
          );
        }
        if (itemData.type === "block") {
          return (
            itemData.uuid &&
            utools.shellOpenExternal(
              `logseq://graph/${graphName}?block-id=${itemData.uuid}`
            )
          );
        }
      },
      placeholder: "请输入搜索Logseq页面和块，选择可直接打开",
    },
  },
};
