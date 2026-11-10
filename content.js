// SaveIt - Content Script
// Shows a floating light-mode notification on the webpage when an item is saved

(() => {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showSaveNotification") {
      showNotification(message);
    }
  });

  function showNotification({ type, preview, collectionName, containerName }) {
    const existing = document.getElementById("saveit-notification");
    if (existing) existing.remove();

    const typeIcons = {
      quote: "💬",
      youtube: "🎬",
      image: "🖼️",
      product: "🛍️",
      social: "📱",
      link: "🔗",
      text: "📝",
    };
    const icon = typeIcons[type] || "💾";

    const notification = document.createElement("div");
    notification.id = "saveit-notification";
    notification.innerHTML = `
      <div class="saveit-notif-inner">
        <div class="saveit-notif-icon">${icon}</div>
        <div class="saveit-notif-body">
          <div class="saveit-notif-header">
            <span class="saveit-notif-title">Saved to SaveIt</span>
            <span class="saveit-notif-path">
              📁 <strong>${escapeHTML(collectionName || "Collection")}</strong> › 🗄️ <strong>${escapeHTML(containerName || "Container")}</strong>
            </span>
          </div>
          <div class="saveit-notif-preview">${escapeHTML(preview || "")}</div>
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          animation: saveit-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          color: #1F2937;
          max-width: 380px;
        }

        #saveit-notification.saveit-fade-out {
          animation: saveit-slide-out 0.25s ease forwards;
        }

        .saveit-notif-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
        }

        .saveit-notif-icon {
          font-size: 20px;
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #F3F4F6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saveit-notif-body {
          flex: 1;
          min-width: 0;
        }

        .saveit-notif-header {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .saveit-notif-title {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }

        .saveit-notif-path {
          font-size: 11px;
          color: #4B5563;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .saveit-notif-preview {
          font-size: 12px;
          color: #6B7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .saveit-notif-check {
          color: #10B981;
          font-size: 16px;
          font-weight: bold;
          padding-left: 4px;
        }

        @keyframes saveit-slide-in {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes saveit-slide-out {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("saveit-fade-out");
      setTimeout(() => notification.remove(), 250);
    }, 2800);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
