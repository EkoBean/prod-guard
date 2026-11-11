import { getDomains, setDomains, normalizeHost, toPattern } from "./shared.js";

const $ = (id) => document.getElementById(id);
const listEl = $("list");
const emptyEl = $("empty");
const msgEl = $("msg");

function say(text) {
  msgEl.textContent = text || "";
}

function isGranted(host) {
  return chrome.permissions.contains({ origins: [toPattern(host)] });
}

// 注意：popup 在瀏覽器跳出授權視窗時可能被關掉，
// 所以每個動作都先寫入清單，再要求授權。授權狀態之後會由 background 對齊。
async function requestPermission(host) {
  return chrome.permissions.request({ origins: [toPattern(host)] });
}

async function addDomain(raw) {
  const host = normalizeHost(raw);
  if (!host) return say("網域格式不正確。");

  const domains = await getDomains();
  if (domains.includes(host)) return say("這個網域已經在清單裡。");

  await setDomains([...domains, host]);
  say("");
  await requestPermission(host);
  await render();
}

async function updateDomain(index, raw) {
  const host = normalizeHost(raw);
  if (!host) return say("網域格式不正確。");

  const domains = await getDomains();
  if (host === domains[index]) return say("");
  if (domains.includes(host)) return say("這個網域已經在清單裡。");

  domains[index] = host;
  await setDomains(domains);
  say("");
  await requestPermission(host);
  await render();
}

async function deleteDomain(index) {
  const domains = await getDomains();
  domains.splice(index, 1);
  await setDomains(domains);
  say("");
  await render();
}

async function buildRow(host, index) {
  const li = document.createElement("li");

  const row = document.createElement("div");
  row.className = "row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = host;
  input.setAttribute("aria-label", "網域");

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "儲存";
  save.addEventListener("click", () => updateDomain(index, input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") updateDomain(index, input.value);
  });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "danger";
  del.textContent = "刪除";
  del.addEventListener("click", () => deleteDomain(index));

  row.append(input, save, del);
  li.append(row);

  const status = document.createElement("p");
  status.className = "status";
  if (await isGranted(host)) {
    status.classList.add("ok");
    status.textContent = "已授權，遮罩生效中（已開啟的分頁要重新整理）";
  } else {
    status.textContent = "尚未授權，遮罩不會出現。";
    const grant = document.createElement("button");
    grant.type = "button";
    grant.textContent = "授權";
    grant.addEventListener("click", async () => {
      await requestPermission(host);
      await render();
    });
    status.append(" ", grant);
  }
  li.append(status);
  return li;
}

async function render() {
  const domains = await getDomains();
  const rows = await Promise.all(domains.map(buildRow));
  listEl.replaceChildren(...rows);
  emptyEl.hidden = domains.length > 0;
}

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("add-input");
  await addDomain(input.value);
  input.value = "";
});

$("add-current").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url;
  try {
    url = new URL(tab?.url || "");
  } catch {
    return say("讀不到目前網站的網址。");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return say("只能加入 http 或 https 網站。");
  }
  await addDomain(url.hostname);
});

render();
