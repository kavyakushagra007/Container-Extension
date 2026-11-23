// SaveIt - Content Script
// 1. Shows floating notification on webpage when an item is saved
// 2. Extracts page digest for Web Memory (local, non-blocking, privacy-first)

(() => {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "captureWebMemoryNow") {
      initWebMemory({ allowHidden: true }).then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true;
    }
    if (message.action === "showSaveNotification") {
      showNotification(message.type, message.preview);
    }
  });

  function showNotification(type, preview) {
    const existing = document.getElementById("saveit-notification");
    if (existing) existing.remove();

    const typeEmoji = type === "text" ? "📝" : type === "link" ? "🔗" : "📄";

    const notification = document.createElement("div");
    notification.id = "saveit-notification";
    notification.innerHTML = `
      <div class="saveit-notif-inner">
        <div class="saveit-notif-icon">${typeEmoji}</div>
        <div class="saveit-notif-text">
          <div class="saveit-notif-title">Saved to SaveIt!</div>
          <div class="saveit-notif-preview">${escapeHTML(preview)}</div>
        </div>
        <div class="saveit-notif-check">✓</div>
      </div>
    `;

    // Inject styles
    if (!document.getElementById("saveit-notif-styles")) {
      const style = document.createElement("style");
      style.id = "saveit-notif-styles";
      style.textContent = `
        #saveit-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: saveit-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #saveit-notification.saveit-fade-out {
          animation: saveit-slide-out 0.25s ease forwards;
        }

        .saveit-notif-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #000000;
          border: 1px solid rgba(190, 250, 79, 0.45);
          border-radius: 12px;
          padding: 12px 18px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.95), 0 0 20px rgba(190, 250, 79, 0.3);
          max-width: 340px;
          color: #f5fbee;
        }

        .saveit-notif-icon {
          font-size: 20px;
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(190, 250, 79, 0.5));
        }

        .saveit-notif-text {
          flex: 1;
          min-width: 0;
        }

        .saveit-notif-title {
          font-size: 13px;
          font-weight: 800;
          color: #BEFA4F;
          text-shadow: 0 0 8px rgba(190, 250, 79, 0.5);
          margin-bottom: 2px;
          letter-spacing: 0.3px;
        }

        .saveit-notif-preview {
          font-size: 12px;
          color: #9ea98f;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 220px;
        }

        .saveit-notif-check {
          font-size: 16px;
          color: #BEFA4F;
          font-weight: 900;
          flex-shrink: 0;
          text-shadow: 0 0 10px rgba(190, 250, 79, 0.6);
        }

        @keyframes saveit-slide-in {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        @keyframes saveit-slide-out {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(40px) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("saveit-fade-out");
      setTimeout(() => notification.remove(), 250);
    }, 2500);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Web Memory Extractor ──
  // Extracts lightweight summary of visited webpage for local memory index
  let lastMemorySignature = "";
  let memoryUrl = "";
  let captureId = "";
  let captureRunning = false;

  let captureQueue = Promise.resolve();
  function initWebMemory(options = {}) {
    // A search arriving during capture waits for the latest page snapshot.
    captureQueue = captureQueue.then(() => captureWebMemory(options));
    return captureQueue;
  }

  async function captureWebMemory({ allowHidden = false } = {}) {
    if (!allowHidden && document.visibilityState === "hidden") return;
    captureRunning = true;
    try {
      // 1. Only run in top frame
      if (window !== window.top) return;

      // 2. Only run on HTTP/HTTPS
      const loc = window.location;
      if (!loc || !loc.protocol.startsWith("http")) return;

      // 3. Skip if password field exists on page (security & privacy)
      if (document.querySelector('input[type="password"]')) return;

      const hostname = loc.hostname.toLowerCase();

      // 4. Default sensitive domains to ignore
      const sensitiveDomains = [
        "accounts.google.com",
        "login.microsoftonline.com",
        "appleid.apple.com",
        "paypal.com",
        "checkout.stripe.com",
        "auth0.com",
        "bankofamerica.com",
        "chase.com",
        "wellsfargo.com",
        "citi.com",
        "fidelity.com",
        "capitalone.com",
        "login.live.com",
      ];
      if (sensitiveDomains.some((d) => hostname.includes(d))) return;

      // 5. Check user settings in storage
      const settings = await chrome.storage.local.get(["memoryEnabled", "memoryBlacklist"]);
      if (settings.memoryEnabled === false) return;

      const blacklist = settings.memoryBlacklist || [];
      if (blacklist.some((blocked) => blocked && hostname.includes(blocked.toLowerCase().trim()))) {
        return;
      }

      // 6. Extract page digest
      const title = document.title ? document.title.trim() : "";
      if (!title && !document.body) return;

      const metaDesc =
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ||
        "";

      // Headings (H1 to H3)
      const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .map((h) => h.innerText || h.textContent || "")
        .map((s) => s.trim().replace(/\s+/g, " "))
        .filter((s) => s.length > 2 && s.length < 200)
        .slice(0, 12)
        .join(" • ");

      // Index readable body text, not just the first few paragraphs.
      const textExcerpt = PageText.extract(document.body);

      const favicon = "";

      const payload = {
        url: loc.href,
        domain: hostname.replace(/^www\./, ""),
        title: title || hostname,
        description: (metaDesc || "").slice(0, 500).trim(),
        keywords: headings.slice(0, 500),
        textContent: textExcerpt,
        favicon: favicon,
      };

      // A refresh of the same loaded page updates its text without adding a visit.
      if (memoryUrl !== loc.href) {
        memoryUrl = loc.href;
        captureId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        lastMemorySignature = "";
      }
      const signature = JSON.stringify(payload);
      if (signature === lastMemorySignature) return;
      payload.captureId = captureId;

      // Send to background to save in IndexedDB (guard against invalidated context)
      if (!chrome.runtime || !chrome.runtime.id) return;

      try {
        const response = await chrome.runtime.sendMessage({
          action: "recordPageMemory",
          payload,
        });
        if (response?.success) lastMemorySignature = signature;
      } catch (err) {
        // Silently handled
      }
    } catch (e) {
      // Fail silently to never disrupt the user's webpage.
    } finally {
      captureRunning = false;
    }
  }

  // Capture delayed and dynamically inserted content without rescanning on every mutation.
  let captureDebounce;
  const memoryObserver = new MutationObserver(() => {
    clearTimeout(captureDebounce);
    captureDebounce = setTimeout(() => initWebMemory(), 700);
  });
  memoryObserver.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["hidden", "aria-hidden", "class", "style"],
  });
  setTimeout(initWebMemory, 1200);
  const memoryTimer = setInterval(() => {
    if (!chrome.runtime?.id) {
      clearInterval(memoryTimer);
      memoryObserver.disconnect();
      return;
    }
    if (document.visibilityState === "hidden" || captureRunning) return;
    // Shadow-root updates do not bubble to the document observer. Recheck visible
    // pages periodically; unchanged snapshots are deduplicated before storage.
    initWebMemory();
  }, 5000);
  document.addEventListener("visibilitychange", () => {
    initWebMemory({ allowHidden: true });
  });
  window.addEventListener("pagehide", () => { initWebMemory({ allowHidden: true }); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.memoryEnabled || changes.memoryBlacklist)) initWebMemory();
  });

  // ── 1-Click Floating Quick Save Button on Selection ──
  let floatingSaveBtn = null;

  function removeFloatingSaveBtn() {
    if (floatingSaveBtn) {
      floatingSaveBtn.remove();
      floatingSaveBtn = null;
    }
  }

  function setupFloatingQuickSave() {
    document.addEventListener("mouseup", (e) => {
      // Don't trigger if clicked inside the button itself
      if (floatingSaveBtn && floatingSaveBtn.contains(e.target)) return;

      setTimeout(async () => {
        try {
          const { quickSaveEnabled = true } = await chrome.storage.local.get("quickSaveEnabled");
          if (quickSaveEnabled === false) return;

          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            removeFloatingSaveBtn();
            return;
          }

          const text = selection.toString().trim();
          if (text.length < 2) {
            removeFloatingSaveBtn();
            return;
          }

          // Skip if inside an input, textarea or contenteditable element
          const activeEl = document.activeElement;
          if (
            activeEl &&
            (activeEl.tagName === "INPUT" ||
              activeEl.tagName === "TEXTAREA" ||
              activeEl.isContentEditable)
          ) {
            removeFloatingSaveBtn();
            return;
          }

          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (!rect || (rect.width === 0 && rect.height === 0)) {
            removeFloatingSaveBtn();
            return;
          }

          removeFloatingSaveBtn();

          floatingSaveBtn = document.createElement("div");
          floatingSaveBtn.id = "saveit-floating-save";
          floatingSaveBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save</span>
          `;

          // Inject styles if needed
          if (!document.getElementById("saveit-floating-styles")) {
            const style = document.createElement("style");
            style.id = "saveit-floating-styles";
            style.textContent = `
              #saveit-floating-save {
                position: absolute;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                gap: 5px;
                background: #000000;
                color: #BEFA4F;
                border: 1px solid rgba(190, 250, 79, 0.6);
                border-radius: 16px;
                padding: 4px 10px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                user-select: none;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7), 0 0 10px rgba(190, 250, 79, 0.35);
                transform: translateY(0);
                transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
                animation: saveit-float-pop 0.15s cubic-bezier(0.16, 1, 0.3, 1);
              }
              #saveit-floating-save:hover {
                background: #111508;
                border-color: #BEFA4F;
                transform: translateY(-1px) scale(1.04);
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.8), 0 0 14px rgba(190, 250, 79, 0.5);
              }
              #saveit-floating-save:active {
                transform: translateY(1px) scale(0.97);
              }
              @keyframes saveit-float-pop {
                from { opacity: 0; transform: scale(0.85) translateY(4px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `;
            document.head.appendChild(style);
          }

          // Calculate coordinates: place above selection, or below if near top
          const btnHeight = 28;
          let top = window.scrollY + rect.top - btnHeight - 8;
          if (rect.top < 40) {
            top = window.scrollY + rect.bottom + 8;
          }
          let left = window.scrollX + rect.left + rect.width / 2 - 35;
          if (left < 10) left = 10;
          if (left + 70 > window.innerWidth) left = window.innerWidth - 75;

          floatingSaveBtn.style.top = `${top}px`;
          floatingSaveBtn.style.left = `${left}px`;

          // Handle clicking the button
          floatingSaveBtn.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
          });

          floatingSaveBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            floatingSaveBtn.innerHTML = `<span>✓ Saved!</span>`;
            floatingSaveBtn.style.background = "#BEFA4F";
            floatingSaveBtn.style.color = "#000000";

            try {
              chrome.runtime.sendMessage({
                action: "saveSelectionFromPage",
                text,
                url: window.location.href,
                title: document.title,
              }, () => {
                if (chrome.runtime.lastError) {}
              });
            } catch (err) {}

            setTimeout(() => {
              removeFloatingSaveBtn();
            }, 350);
          });

          document.body.appendChild(floatingSaveBtn);
        } catch {}
      }, 30);
    });

    // Remove button when user clicks anywhere else
    document.addEventListener("mousedown", (e) => {
      if (floatingSaveBtn && !floatingSaveBtn.contains(e.target)) {
        removeFloatingSaveBtn();
      }
    });

    // Remove button on scroll
    window.addEventListener("scroll", () => {
      removeFloatingSaveBtn();
    }, { passive: true });
  }

  setupFloatingQuickSave();
})();
