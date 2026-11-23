importScripts("../services/sync.js", "../services/memory-store.js", "../services/nlp-parser.js");

// ── Context Menu Setup (1-Click Top Level — No Submenus) ──
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Single item for selected text: renders directly at the top level of right-click menu!
    chrome.contextMenus.create({
      id: "saveit-selection",
      title: "Save to SaveIt",
      contexts: ["selection"],
    });

    // Single item for links: renders directly at top level!
    chrome.contextMenus.create({
      id: "saveit-link",
      title: "Save link to SaveIt",
      contexts: ["link"],
    });

    // Single item for empty page: renders directly at top level!
    chrome.contextMenus.create({
      id: "saveit-page",
      title: "Save page to SaveIt",
      contexts: ["page"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  clearBadge();
  runMemoryRetentionPurge();
  setupContextMenus();
});

// Also initialize context menus when service worker starts
setupContextMenus();

// ── Handle context menu clicks ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveit-open-dashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
    return;
  }

  const { activeCategory = "General" } = await chrome.storage.local.get("activeCategory");
  const category = (activeCategory && activeCategory !== "all") ? activeCategory : "General";
  let item = null;

  if (info.menuItemId === "saveit-selection" && info.selectionText) {
    item = {
      id: generateId(),
      type: "text",
      content: info.selectionText,
      category,
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
      category,
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
      category,
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
    const { activeCategory = "General" } = await chrome.storage.local.get("activeCategory");
    const category = (activeCategory && activeCategory !== "all") ? activeCategory : "General";

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
              category,
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

async function runMemoryRetentionPurge() {
  try {
    const { memoryRetentionDays = 14 } = await chrome.storage.local.get("memoryRetentionDays");
    if (typeof MemoryStore !== "undefined" && MemoryStore.purgeOldMemories) {
      await MemoryStore.purgeOldMemories(memoryRetentionDays);
    }
  } catch (err) {
    console.warn("Memory retention purge:", err);
  }
}

chrome.runtime.onStartup.addListener(() => {
  clearBadge();
  runMemoryRetentionPurge();
});

async function saveItem(item) {
  return SyncService._enqueue(() => persistItem(item));
}

async function persistItem(item) {
  const { items = [], categories = ["General", "Study", "Reading", "Ideas"] } = await chrome.storage.local.get(["items", "categories"]);
  items.unshift(item);

  // If item has a new category not yet in categories, add it
  if (item.category && !categories.includes(item.category)) {
    categories.push(item.category);
    await SyncService._saveLocal({ items, categories });
  } else {
    await SyncService._saveLocal({ items });
  }

  // Sync to cloud in background if user is logged in
  if (typeof SyncService !== "undefined" && SyncService.pushToCloud) {
    SyncService.pushToCloud(items, categories).catch(() => {});
  }

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
      }, () => {
        if (chrome.runtime.lastError) {
          // Handled - content script may not be loaded on this tab
        }
      });
    }
  } catch {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Message Listeners ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "persistSaves" || message.action === "syncSaves") {
    // Only extension pages may request writes to the saved collection.
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
    const operation = message.action === "persistSaves"
      ? SyncService.saveLocal(message.data)
      : SyncService.syncNow();
    operation.then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "refreshActiveMemory") {
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
    (async () => {
      let timer;
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id && /^https?:\/\//i.test(tab.url || "")) {
          await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: "captureWebMemoryNow" }),
            new Promise(resolve => { timer = setTimeout(resolve, 2000); }),
          ]);
        }
      } catch {
        // Older tabs may need a reload to receive the new content script.
      } finally {
        clearTimeout(timer);
        sendResponse({ success: true });
      }
    })();
    return true;
  }

  // ── Clipboard / Saves Actions ──
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

  if (message.action === "saveSelectionFromPage") {
    (async () => {
      const { activeCategory = "General" } = await chrome.storage.local.get("activeCategory");
      const category = (activeCategory && activeCategory !== "all") ? activeCategory : "General";
      const item = {
        id: generateId(),
        type: "text",
        content: message.text,
        category,
        sourceUrl: sender.tab?.url || message.url || "",
        sourceTitle: sender.tab?.title || message.title || "",
        createdAt: Date.now(),
        tags: [],
        favorite: false,
      };
      await saveItem(item);
      sendResponse({ success: true, item });
    })();
    return true;
  }

  if (["deleteItem", "updateItem", "clearAll"].includes(message.action)) {
    SyncService._enqueue(async () => {
      const data = await chrome.storage.local.get("items");
      let items = data.items || [];
      if (message.action === "deleteItem") items = items.filter(item => item.id !== message.id);
      if (message.action === "updateItem") items = items.map(item => item.id === message.item.id ? { ...item, ...message.item } : item);
      if (message.action === "clearAll") items = [];
      await SyncService._saveLocal({ items });
    }).then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ── Web Memory Actions ──
  if (message.action === "recordPageMemory") {
    (async () => {
      try {
        const { memoryEnabled = true } = await chrome.storage.local.get("memoryEnabled");
        if (memoryEnabled === false) {
          sendResponse({ skipped: true });
          return;
        }
        const record = await MemoryStore.saveMemory(message.payload);
        sendResponse({ success: true, record });
      } catch (err) {
        sendResponse({ success: false, error: err?.message });
      }
    })();
    return true;
  }

  if (message.action === "searchMemories") {
    MemoryStore.searchMemories(message.query || "", message.limit || 50)
      .then((results) => sendResponse(results))
      .catch((err) => sendResponse([]));
    return true;
  }

  if (message.action === "queryMemoriesNLP") {
    const parsed = typeof NLPParser !== "undefined"
      ? NLPParser.parseQuery(message.query || "")
      : { cleanKeywords: (message.query || "").split(" "), timeRange: null, isConversational: false };

    MemoryStore.queryMemoriesByTimeAndKeywords({
      keywords: parsed.cleanKeywords,
      timeRange: parsed.timeRange,
      limit: message.limit || 40,
    })
      .then((res) => sendResponse({ ...res, parsed }))
      .catch((err) => sendResponse({ items: [], parsed, error: err?.message }));
    return true;
  }

  if (message.action === "getRecentMemories") {
    MemoryStore.getRecentMemories(message.limit || 100)
      .then((results) => sendResponse(results))
      .catch((err) => sendResponse([]));
    return true;
  }

  if (message.action === "deleteMemory") {
    MemoryStore.deleteMemory(message.id)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.action === "clearAllMemories") {
    MemoryStore.clearAllMemories()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.action === "getMemoryStats") {
    MemoryStore.getStats()
      .then((stats) => sendResponse(stats))
      .catch(() => sendResponse({ count: 0, approxBytes: 0 }));
    return true;
  }

  if (message.action === "saveMemoryToSaves") {
    (async () => {
      try {
        const mem = message.memory;
        if (!mem) return sendResponse({ success: false });

        const { activeCategory = "General" } = await chrome.storage.local.get("activeCategory");
        const category = message.category || (activeCategory !== "all" ? activeCategory : "General");

        const newItem = {
          id: generateId(),
          type: "link",
          content: mem.url,
          category,
          sourceUrl: mem.url,
          sourceTitle: mem.title || "Web Memory Save",
          createdAt: Date.now(),
          tags: ["from-memory"],
          favorite: false,
        };

        await saveItem(newItem);
        sendResponse({ success: true, item: newItem });
      } catch (err) {
        sendResponse({ success: false, error: err?.message });
      }
    })();
    return true;
  }

  if (message.action === "importChromeHistory") {
    (async () => {
      try {
        if (!chrome.history || !chrome.history.search) {
          sendResponse({ success: false, error: "Chrome history permission not available" });
          return;
        }

        const days = message.days || 14;
        const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const historyItems = await new Promise((resolve) => {
          chrome.history.search({ text: "", startTime, maxResults: 2000 }, resolve);
        });

        const sensitiveDomains = [
          "accounts.google.com", "login.microsoftonline.com", "appleid.apple.com",
          "paypal.com", "checkout.stripe.com", "auth0.com", "bankofamerica.com",
          "chase.com", "wellsfargo.com", "citi.com", "fidelity.com", "capitalone.com",
          "login.live.com"
        ];

        const { memoryBlacklist = [] } = await chrome.storage.local.get("memoryBlacklist");

        const validItems = (historyItems || [])
          .filter((h) => {
            if (!h.url || !h.url.startsWith("http")) return false;
            try {
              const u = new URL(h.url);
              const host = u.hostname.toLowerCase();
              if (sensitiveDomains.some((d) => host.includes(d))) return false;
              if (memoryBlacklist.some((b) => b && host.includes(b.toLowerCase().trim()))) return false;
              return true;
            } catch {
              return false;
            }
          })
          .map((h) => {
            let domain = "";
            try { domain = new URL(h.url).hostname.replace(/^www\./, ""); } catch {}
            return {
              url: h.url,
              title: h.title || domain,
              domain: domain,
              visitedAt: h.lastVisitTime || Date.now(),
              visitCount: h.visitCount || 1,
              description: "",
              keywords: "",
              textContent: "",
            };
          });

        const importedCount = await MemoryStore.importHistoryItems(validItems);
        sendResponse({ success: true, count: importedCount });
      } catch (err) {
        sendResponse({ success: false, error: err?.message });
      }
    })();
    return true;
  }
});
