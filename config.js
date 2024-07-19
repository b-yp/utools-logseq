const BASE_URL = 'http://127.0.0.1:12315/api'
const TOKEN = 'utools'

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

export default {
  request,
  logseqRequest,
  formatDate
}
