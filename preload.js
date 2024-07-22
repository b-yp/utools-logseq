const { writeFile, copyFile } = require("fs");
const {
  logseqRequest,
  formatDate,
  dataUrlToBuffer,
  getFileTypeAndFormat,
} = require("./utils");

const appendBlockInPage = async (args) => {
  await logseqRequest("logseq.Editor.appendBlockInPage", args)
  await logseqRequest("logseq.Editor.exitEditingMode");  // TODO 为什么这个方法没有生效
  window.utools.outPlugin();
};

window.exports = {
  save_to_logseq: {
    mode: "none",
    args: {
      enter: async ({ code, type, payload }) => {
        console.log("enter", code, type, payload);
        window.utools.hideMainWindow();

        try {
          const { path: currentGraphPath } = await logseqRequest(
            "logseq.App.getCurrentGraph"
          );

          const { preferredDateFormat } = await logseqRequest(
            "logseq.App.getUserConfigs"
          );

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
};
