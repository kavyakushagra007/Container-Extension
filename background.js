importScripts("sync.js");

// ── Context Menu Setup ──
chrome.runtime.onInstalled.addListener(async () => {
  clearBadge();
  await SyncService.ensureInitializedAndMigrated();
  setupContextMenus();
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "saveit-selection",
      title: 'Save snippet / quote to SaveIt',
      contexts: ["selection"],
    });

    chrome.contextMenus.create({
      id: "saveit-image",
      title: "Save image to SaveIt",
      contexts: ["image"],
    });

    chrome.contextMenus.create({
      id: "saveit-link",
      title: "Save link to SaveIt",
      contexts: ["link"],
    });

    chrome.contextMenus.create({
      id: "saveit-page",
      title: "Bookmark this page to SaveIt",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "saveit-separator",
      type: "separator",
      contexts: ["all"],
    });

    chrome.contextMenus.create({
      id: "saveit-open-dashboard",
      title: "Open SaveIt Workspace (Dashboard)",
      contexts: ["all"],
    });
  });
}

// ── Handle Context Menu Clicks ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveit-open-dashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    return;
  }

  let item = null;

  if (info.menuItemId === "saveit-selection" && info.selectionText) {
    const text = info.selectionText.trim();
    const classification = classifyContent(text, tab?.url || "");
    item = {
      id: generateId(),
      type: classification.type === "quote" ? "quote" : "text",
      title: tab?.title ? `From: ${tab.title}` : "Saved Snippet",
      content: text,
      sourceUrl: tab?.url || "",
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  } else if (info.menuItemId === "saveit-image" && info.srcUrl) {
    item = {
      id: generateId(),
      type: "image",
      title: tab?.title ? `Image from: ${tab.title}` : "Saved Image",
      content: info.srcUrl,
      previewImage: info.srcUrl,
      sourceUrl: tab?.url || info.pageUrl || "",
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  } else if (info.menuItemId === "saveit-link" && info.linkUrl) {
    const classification = classifyContent("", info.linkUrl);
    item = {
      id: generateId(),
      type: classification.type,
      title: info.selectionText || tab?.title || info.linkUrl,
      content: info.linkUrl,
      previewImage: classification.thumbnail || "",
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: info.linkUrl,
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  } else if (info.menuItemId === "saveit-page") {
    const pageUrl = tab?.url || info.pageUrl || "";
    const classification = classifyContent("", pageUrl);
    item = {
      id: generateId(),
      type: classification.type === "youtube" ? "youtube" : "link",
      title: tab?.title || "Web Bookmark",
      content: pageUrl,
      previewImage: classification.thumbnail || "",
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: pageUrl,
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  }

  if (item) {
    await saveItem(item);
  }
});

// ── Keyboard shortcut handler ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-selection") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting
          .executeScript({
            target: { tabId: tabs[0].id },
            func: getSelectedText,
          })
          .then((results) => {
            const text = results?.[0]?.result;
            if (text && text.trim()) {
              const classification = classifyContent(text, tabs[0].url || "");
              const item = {
                id: generateId(),
                type: classification.type === "quote" ? "quote" : "text",
                title: tabs[0].title ? `From: ${tabs[0].title}` : "Saved Snippet",
                content: text.trim(),
                sourceUrl: tabs[0].url || "",
                sourceTitle: tabs[0].title || "",
                createdAt: Date.now(),
                tags: [],
                favorite: false,
              };
              saveItem(item);
            }
          });
      }
    });
  }
});

function getSelectedText() {
  return window.getSelection()?.toString() || "";
}

function clearBadge() {
  try {
    chrome.action.setBadgeText({ text: "" });
  } catch {}
}

chrome.runtime.onStartup.addListener(clearBadge);

async function saveItem(item) {
  const { items = [] } = await chrome.storage.local.get(["items"]);

  items.unshift(item);
  await chrome.storage.local.set({ items });

  // Sync to cloud if user is logged in
  if (typeof SyncService !== "undefined" && SyncService.pushToCloud) {
    SyncService.pushToCloud(items, [], []).catch(() => {});
  }

  clearBadge();

  // Notify content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const preview = item.content.length > 60 ? item.content.slice(0, 60) + "…" : item.content;

      chrome.tabs.sendMessage(tab.id, {
        action: "showSaveNotification",
        type: item.type,
        preview,
      }).catch(() => {});
    }
  } catch {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Message Listener ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getItems") {
    chrome.storage.local.get("items", (data) => {
      sendResponse(data.items || []);
    });
    return true;
  }

  if (message.action === "saveItem") {
    (async () => {
      await saveItem(message.item);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "deleteItem") {
    chrome.storage.local.get("items", (data) => {
      const items = (data.items || []).filter((i) => i.id !== message.id);
      chrome.storage.local.set({ items }, () => sendResponse({ success: true }));
    });
    return true;
  }

  if (message.action === "updateItem") {
    chrome.storage.local.get("items", (data) => {
      const items = (data.items || []).map((i) =>
        i.id === message.item.id ? { ...i, ...message.item } : i
      );
      chrome.storage.local.set({ items }, () => sendResponse({ success: true }));
    });
    return true;
  }

  if (message.action === "exportData") {
    chrome.storage.local.get(["collections", "containers", "items"], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.action === "importData") {
    (async () => {
      const data = message.data || {};
      const { collections = [], containers = [], items = [] } = data;
      const current = await chrome.storage.local.get(["collections", "containers", "items"]);
      
      const newCollections = [...(current.collections || []), ...collections];
      const newContainers = [...(current.containers || []), ...containers];
      const newItems = [...(current.items || []), ...items];

      await chrome.storage.local.set({
        collections: Array.from(new Map(newCollections.map(c => [c.id, c])).values()),
        containers: Array.from(new Map(newContainers.map(c => [c.id, c])).values()),
        items: Array.from(new Map(newItems.map(i => [i.id, i])).values()),
      });
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "clearAll") {
    chrome.storage.local.set({ items: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
