const { writeFile } = require("fs");

window.writeFile = (filePath, binaryData, fn) => {
  writeFile(filePath, binaryData, fn);
};
