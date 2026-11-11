// 只會在你授權過的正式環境網域上執行（由 background.js 註冊）。
(() => {
  let overlay = null;

  function show() {
    if (overlay && overlay.isConnected) return;

    overlay = document.createElement("div");
    // 用 shadow DOM 隔離，網頁自己的 CSS 不會影響遮罩。
    const root = overlay.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = `
      .box {
        position: fixed; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px;
        background: rgba(0, 0, 0, 0.3); color: #fff;
        font-family: system-ui, "Noto Sans TC", "Microsoft JhengHei", sans-serif;
        text-align: center; cursor: pointer; user-select: none;
      }
      .title { font-size: 40px; font-weight: 700; }
      .host { font-size: 20px; opacity: 0.85; }
    `;

    const box = document.createElement("div");
    box.className = "box";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "此為正式環境，點擊螢幕開始操作";

    const host = document.createElement("div");
    host.className = "host";
    host.textContent = location.hostname;

    box.append(title, host);
    box.addEventListener("click", hide);
    root.append(style, box);

    overlay.style.cssText =
      "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
    document.documentElement.append(overlay);
  }

  function hide() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  // 從同網站的其他頁面點進來時，不重複蓋遮罩。
  function cameFromSameSite() {
    try {
      return !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {
      return false;
    }
  }

  if (!cameFromSameSite()) show();

  // 分頁被切走時就先蓋上，切回來時你看到的就是遮罩，不會閃一下內容。
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") show();
  });
})();
