// background.js 和 popup.js 共用的小工具。

export const DEFAULT_DOMAINS = ["app.shadow.flowyard.com.tw"];

export async function getDomains() {
  const { domains } = await chrome.storage.sync.get("domains");
  return Array.isArray(domains) ? domains : [...DEFAULT_DOMAINS];
}

export async function setDomains(domains) {
  await chrome.storage.sync.set({ domains });
}

// 把使用者輸入（網域或完整網址）轉成小寫的 hostname。無效則回傳 null。
export function normalizeHost(input) {
  const text = String(input || "").trim();
  if (!text) return null;
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return url.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

// hostname 轉成 match pattern。只比對這個完整主機名稱，不含子網域。
export function toPattern(host) {
  return `*://${host}/*`;
}

// 從 match pattern 取回 hostname。格式不符則回傳 null。
export function hostFromPattern(pattern) {
  const m = /^\*:\/\/([^/]+)\/\*$/.exec(pattern);
  return m ? m[1] : null;
}
