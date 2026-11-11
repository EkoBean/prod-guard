import { getDomains, setDomains, DEFAULT_DOMAINS, toPattern, hostFromPattern } from "./shared.js";

const SCRIPT_ID = "prod-guard";

// 讓清單、權限、已註冊的 content script 三者保持一致。
async function doSync() {
  const domains = await getDomains();
  const wanted = new Set(domains);

  // 1. 收回清單裡已經沒有的網域權限（刪除或改名後留下的）。
  const { origins = [] } = await chrome.permissions.getAll();
  const stale = origins.filter((o) => {
    const host = hostFromPattern(o);
    return host !== null && !wanted.has(host);
  });
  if (stale.length) {
    await chrome.permissions.remove({ origins: stale });
  }

  // 2. 只為「已授權」的網域註冊 content script。
  const matches = [];
  for (const host of domains) {
    const pattern = toPattern(host);
    if (await chrome.permissions.contains({ origins: [pattern] })) {
      matches.push(pattern);
    }
  }

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch {
    // 還沒註冊過時會丟錯，可以忽略。
  }
  if (matches.length) {
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches,
        js: ["content.js"],
        runAt: "document_start",
        persistAcrossSessions: true,
      },
    ]);
  }
}

// 事件可能連續觸發，所以排成一條佇列，一次只跑一個 sync。
let queue = Promise.resolve();
function sync() {
  queue = queue.then(doSync).catch((err) => console.error("[Prod Guard] sync failed", err));
  return queue;
}

chrome.runtime.onInstalled.addListener(async () => {
  const { domains } = await chrome.storage.sync.get("domains");
  if (!Array.isArray(domains)) {
    await setDomains([...DEFAULT_DOMAINS]);
  }
  sync();
});
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.domains) sync();
});
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);
