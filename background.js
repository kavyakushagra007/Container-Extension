importScripts("sync.js");

// ── Context Menu Setup ──
chrome.runtime.onInstalled.addListener(() => {
  clearBadge();
  chrome.contextMenus.create({
    id: "saveit-selection",
    title: 'Save "%s" to SaveIt',
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "saveit-link",
    title: "Save this link to SaveIt",
    contexts: ["link"],
  });

  chrome.contextMenus.create({
    id: "saveit-page",
    title: "Save this page to SaveIt",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "saveit-open-dashboard",
    title: "Open SaveIt Dashboard",
    contexts: ["all"],
  });
});

// ── Handle context menu clicks ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveit-open-dashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    return;
  }

  const { lastActiveContainer = "default" } = await chrome.storage.local.get("lastActiveContainer");
  const containerId = lastActiveContainer !== "all" ? lastActiveContainer : "default";
  let item = null;

  if (info.menuItemId === "saveit-selection" && info.selectionText) {
    item = {
      id: generateId(),
      type: "text",
      content: info.selectionText,
      containerId,
      sourceUrl: tab?.url || "",
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  } else if (info.menuItemId === "saveit-link" && info.linkUrl) {
    item = {
      id: generateId(),
      type: "link",
      content: info.linkUrl,
      containerId,
      sourceUrl: tab?.url || "",
      sourceTitle: tab?.title || "",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  } else if (info.menuItemId === "saveit-page") {
    item = {
      id: generateId(),
      type: "link",
      content: tab?.url || info.pageUrl,
      containerId,
      sourceUrl: tab?.url || info.pageUrl,
      sourceTitle: tab?.title || "Untitled Page",
      createdAt: Date.now(),
      tags: [],
      favorite: false,
    };
  }

  if (item) {
    saveItem(item);
  }
});

// ── Keyboard shortcut handler ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-selection") {
    const { lastActiveContainer = "default" } = await chrome.storage.local.get("lastActiveContainer");
    const containerId = lastActiveContainer !== "all" ? lastActiveContainer : "default";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: getSelectedText,
        }).then((results) => {
          const text = results?.[0]?.result;
          if (text) {
            const item = {
              id: generateId(),
              type: "text",
              content: text,
              containerId,
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

// ── Clear Badge ──
function clearBadge() {
  try {
    chrome.action.setBadgeText({ text: "" });
  } catch {}
}

chrome.runtime.onStartup.addListener(clearBadge);

async function saveItem(item) {
  const { items = [], containers = [] } = await chrome.storage.local.get(["items", "containers"]);
  items.unshift(item);
  await chrome.storage.local.set({ items });

  // Sync to cloud in background if user is logged in
  if (typeof SyncService !== "undefined" && SyncService.pushToCloud) {
    const safeContainers =
      containers && containers.length > 0
        ? containers
        : [{ id: "default", name: "Quick Saves", icon: "⚡", createdAt: 0 }];
    SyncService.pushToCloud(items, safeContainers).catch(() => {});
  }

  // Ensure no badge is shown
  clearBadge();

  // Show floating notification on the active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const preview = item.content.length > 50 ? item.content.slice(0, 50) + "…" : item.content;
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

// ── Listen for messages from popup ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getItems") {
    chrome.storage.local.get("items", (data) => {
      sendResponse(data.items || []);
    });
    return true;
  }

  if (message.action === "saveItem") {
    saveItem(message.item).then(() => sendResponse({ success: true }));
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

  if (message.action === "exportItems") {
    chrome.storage.local.get("items", (data) => {
      sendResponse(data.items || []);
    });
    return true;
  }

  if (message.action === "importItems") {
    chrome.storage.local.get("items", (data) => {
      const existing = data.items || [];
      const merged = [...message.items, ...existing];
      chrome.storage.local.set({ items: merged }, () =>
        sendResponse({ success: true })
      );
    });
    return true;
  }

  if (message.action === "clearAll") {
    chrome.storage.local.set({ items: [] }, () =>
      sendResponse({ success: true })
    );
    return true;
  }
});

