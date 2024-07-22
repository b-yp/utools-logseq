const { BASE_URL, TOKEN } = require('./config')

/**
 * request 方法
 * @param {string} url - 请求的 URL
 * @param {Object} options - 请求选项
 * @param {string} [options.method='GET'] - 请求方法 (GET, POST, PUT, DELETE, etc.)
 * @param {Object} [options.headers={}] - 请求头
 * @param {Object|string} [options.body=null] - 请求体 (对于 POST 和 PUT 请求)
 * @returns {Promise<Object>} - 返回一个 Promise，解析为响应的 JSON 对象
 */
const request = async (url, options = {}) => {
  // 设置默认的请求方法为 GET
  const method = options.method || "GET";
  // 设置默认的请求头
  const headers = options.headers || {};
  // 处理请求体
  let body = options.body || null;

  // 如果请求体是一个对象，将其转换为 JSON 字符串，并设置 Content-Type 为 application/json
  if (typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  // 发送请求
  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  // 检查响应状态码
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // 解析响应为 JSON
  return response.json();
};

/**
 * 
 * @param {*} method 
 * @param {*} args 
 */
const logseqRequest = (method, args) => {
  return request(BASE_URL, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: {
      method,
      args
    }
  });
};

const dateFormatters = {
  'do': date => getOrdinalDate(date.getDate()),
  'MMM': date => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
  'MMMM': date => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date),
  'E': date => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
  'EEE': date => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
  'EEEE': date => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
  'dd': date => pad(date.getDate()),
  'MM': date => pad(date.getMonth() + 1),
  'yyyy': date => date.getFullYear(),
};

const formatDate = (date, format) => {
  return format.replace(/do|MMM|MMMM|E{1,4}|dd|MM|yyyy/g, (match) => {
    return dateFormatters[match] ? dateFormatters[match](date) : match;
  });
};

const getOrdinalDate = (date) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = date % 100;
  return date + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

const pad = (number) => number < 10 ? '0' + number : number;

const base64ToBuffer = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
const dataUrlToBuffer = (urlData) => {
  const [head, base64] = urlData.split(',')
  const type = head.match(/:(.*?);/)[1]
  
  return [base64ToBuffer(base64), type]
}

/**
 * 根据文件名匹配文件类型和格式
 * @param {string} fileName - 文件名
 * @returns {Object} - 包含类型和格式的对象
 */
function getFileTypeAndFormat(fileName) {
  // 文件类型和对应的格式
  const fileTypes = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'],
    video: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
    markdown: ['md'],
    pdf: ['pdf'],
    document: ['txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    code: ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'java', 'py', 'cpp', 'c', 'cs', 'php'],
  };

  // 获取文件扩展名
  const extension = fileName.split('.').pop().toLowerCase();
  const name = fileName.replace(`.${extension}`, '')

  // 匹配文件类型
  for (const [type, formats] of Object.entries(fileTypes)) {
    if (formats.includes(extension)) {
      return { type, format: extension, name};
    }
  }

  // 如果没有匹配的类型和格式，返回未知类型
  return { type: 'unknown', format: extension, name };
}

module.exports = {
  request,
  logseqRequest,
  formatDate,
  dataUrlToBuffer,
  getFileTypeAndFormat
}
