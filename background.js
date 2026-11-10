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

// ── Get Active Destination (Collection & Container) ──
async function getTargetDestination() {
  const data = await chrome.storage.local.get([
    "collections",
    "containers",
    "lastActiveContainer",
  ]);
  let collections = data.collections || [];
  let containers = data.containers || [];
  const lastActiveContainer = data.lastActiveContainer;

  let targetCont = null;
  if (lastActiveContainer && lastActiveContainer !== "all" && lastActiveContainer !== "default") {
    targetCont = containers.find((c) => c.id === lastActiveContainer);
  }

  if (!targetCont) {
    if (containers.length > 0) {
      targetCont = containers[0];
    } else {
      // First save when vault is completely brand new
      let parentCol = collections[0];
      if (!parentCol) {
        parentCol = {
          id: "col_" + Date.now(),
          name: "My Vault",
          color: "#4F46E5",
          createdAt: Date.now(),
          order: 0,
        };
        collections.push(parentCol);
        await chrome.storage.local.set({ collections });
      }
      targetCont = {
        id: "cont_" + Date.now(),
        collectionId: parentCol.id,
        name: "Saved Items",
        color: "#2563EB",
        note: "",
        description: "",
        createdAt: Date.now(),
        order: 0,
      };
      containers.push(targetCont);
      await chrome.storage.local.set({ containers, lastActiveContainer: targetCont.id });
    }
    if (targetCont) {
      chrome.storage.local.set({ lastActiveContainer: targetCont.id }).catch(() => {});
    }
  }

  const parentCol =
    collections.find((col) => col.id === targetCont.collectionId) ||
    collections[0];

  return {
    collection: parentCol,
    container: targetCont,
  };
}

// ── Handle Context Menu Clicks ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveit-open-dashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    return;
  }

  const { collection, container } = await getTargetDestination();
  let item = null;

  if (info.menuItemId === "saveit-selection" && info.selectionText) {
    const text = info.selectionText.trim();
    const classification = classifyContent(text, tab?.url || "");
    item = {
      id: generateId(),
      type: classification.type === "quote" ? "quote" : "text",
      title: tab?.title ? `From: ${tab.title}` : "Saved Snippet",
      content: text,
      containerId: container.id,
      collectionId: collection.id,
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
      containerId: container.id,
      collectionId: collection.id,
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
      containerId: container.id,
      collectionId: collection.id,
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
      containerId: container.id,
      collectionId: collection.id,
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
    await saveItem(item, collection, container);
  }
});

// ── Keyboard shortcut handler ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-selection") {
    const { collection, container } = await getTargetDestination();

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
                containerId: container.id,
                collectionId: collection.id,
                sourceUrl: tabs[0].url || "",
                sourceTitle: tabs[0].title || "",
                createdAt: Date.now(),
                tags: [],
                favorite: false,
              };
              saveItem(item, collection, container);
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

async function saveItem(item, collection, container) {
  const { items = [], containers = [], collections = [] } = await chrome.storage.local.get([
    "items",
    "containers",
    "collections",
  ]);

  items.unshift(item);
  await chrome.storage.local.set({ items });

  // Sync to cloud if user is logged in
  if (typeof SyncService !== "undefined" && SyncService.pushToCloud) {
    SyncService.pushToCloud(items, containers, collections).catch(() => {});
  }

  clearBadge();

  // Notify content script with rich destination information
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const colName = collection?.name || "Collection";
      const contName = container?.name || "Container";
      const preview = item.content.length > 60 ? item.content.slice(0, 60) + "…" : item.content;

      chrome.tabs.sendMessage(tab.id, {
        action: "showSaveNotification",
        type: item.type,
        preview,
        collectionName: colName,
        containerName: contName,
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
      const { collection, container } = await getTargetDestination();
      await saveItem(message.item, collection, container);
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
