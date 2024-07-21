const { writeFile, copyFile } = require("fs");

window.writeFile = (filePath, binaryData, fn) => {
  writeFile(filePath, binaryData, fn);
};

window.copyFile = (originalFilePath, targetFilePath, fn) => {
  copyFile(originalFilePath, targetFilePath, fn);
};
