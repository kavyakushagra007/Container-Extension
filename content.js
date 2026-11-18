// SaveIt - Content Script
// 1. Shows floating notification on webpage when an item is saved
// 2. Extracts page digest for Web Memory (local, non-blocking, privacy-first)

(() => {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
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
  async function initWebMemory() {
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
        .filter((s) => s.length > 2 && s.length < 150)
        .slice(0, 8)
        .join(" • ");

      // Clean text excerpt (first ~300 words)
      const textExcerpt = extractCleanTextExcerpt();

      // Favicon
      let favicon = "";
      const favEl =
        document.querySelector('link[rel~="icon"]') ||
        document.querySelector('link[rel="shortcut icon"]');
      if (favEl && favEl.href) {
        favicon = favEl.href;
      } else {
        favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
      }

      const payload = {
        url: loc.href,
        domain: hostname.replace(/^www\./, ""),
        title: title || hostname,
        description: (metaDesc || "").slice(0, 300).trim(),
        keywords: headings.slice(0, 300),
        textContent: textExcerpt.slice(0, 1000),
        favicon: favicon,
      };

      // Send to background to save in IndexedDB (guard against invalidated context)
      if (!chrome.runtime || !chrome.runtime.id) return;

      try {
        chrome.runtime.sendMessage({
          action: "recordPageMemory",
          payload: payload,
        }, () => {
          // Consume chrome.runtime.lastError so Chrome never logs an unhandled error
          if (chrome.runtime.lastError) {
            // Silently handled
          }
        });
      } catch (err) {
        // Silently handled
      }
    } catch (e) {
      // Fail silently to never disrupt the user's webpage
    }
  }

  function extractCleanTextExcerpt() {
    try {
      const container = document.querySelector("main") || document.querySelector("article") || document.body;
      if (!container) return "";

      const clone = container.cloneNode(true);
      // Remove unwanted elements
      const unwanted = clone.querySelectorAll("script, style, noscript, nav, footer, header, form, svg, iframe");
      unwanted.forEach((el) => el.remove());

      const raw = clone.innerText || clone.textContent || "";
      const cleaned = raw.replace(/\s+/g, " ").trim();
      const words = cleaned.split(" ").slice(0, 300);
      return words.join(" ");
    } catch {
      return "";
    }
  }

  // Run page extraction after a short delay so dynamically loaded titles/content settle
  setTimeout(initWebMemory, 1200);
})();
