// SaveIt - Content Script
// Shows a floating notification on the webpage when an item is saved

(() => {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showSaveNotification") {
      showNotification(message.type, message.preview);
    }
  });

  function showNotification(type, preview) {
    // Remove any existing notification
    const existing = document.getElementById("saveit-notification");
    if (existing) existing.remove();

    const typeLabel = type === "text" ? "Text" : type === "link" ? "Link" : "Page";
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

    // Auto-dismiss after 2.5 seconds
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
})();

