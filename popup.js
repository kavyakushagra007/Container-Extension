// ── SaveIt: Popup Controller (Containers & Cloud Sync) ──
let allItems = [];
let containers = [{ id: "default", name: "Quick Saves", icon: "⚡" }];
let activeContainerId = "all"; // "all" or specific container ID
let currentFilter = "all";
let searchQuery = "";
let editingItemId = null;
let selectedContainerEmoji = "⚡";
let authIsSignUp = false;

// ── DOM Elements ──
const itemsContainer = document.getElementById("items-container");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const btnAdd = document.getElementById("btn-add");
const btnPaste = document.getElementById("btn-paste");
const btnDashboard = document.getElementById("btn-dashboard");
const btnMenu = document.getElementById("btn-menu");
const dropdownMenu = document.getElementById("dropdown-menu");
const countBar = document.getElementById("count-bar");
const itemCount = document.getElementById("item-count");
const containersList = document.getElementById("containers-list");
const btnAddContainer = document.getElementById("btn-add-container");

// Add item modal
const addModal = document.getElementById("add-modal");
const addContent = document.getElementById("add-content");
const addTags = document.getElementById("add-tags");
const addContainerSelect = document.getElementById("add-container-select");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

// Container modal
const containerModal = document.getElementById("container-modal");
const containerNameInput = document.getElementById("container-name-input");
const containerModalCancel = document.getElementById("container-modal-cancel");
const containerModalSave = document.getElementById("container-modal-save");
const emojiOpts = document.querySelectorAll(".emoji-opt");

// Edit modal
const editModal = document.getElementById("edit-modal");
const editContainerSelect = document.getElementById("edit-container-select");
const editContent = document.getElementById("edit-content");
const editTags = document.getElementById("edit-tags");
const editCancel = document.getElementById("edit-cancel");
const editSave = document.getElementById("edit-save");

// Auth modal
const btnAuth = document.getElementById("btn-auth");
const authModal = document.getElementById("auth-modal");
const authModalTitle = document.getElementById("auth-modal-title");
const authLoggedInView = document.getElementById("auth-logged-in-view");
const authLoggedOutView = document.getElementById("auth-logged-out-view");
const authUserEmail = document.getElementById("auth-user-email");
const authEmailInput = document.getElementById("auth-email-input");
const authPasswordInput = document.getElementById("auth-password-input");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleMode = document.getElementById("auth-toggle-mode");
const authModeText = document.getElementById("auth-mode-text");
const authModalCancel = document.getElementById("auth-modal-cancel");
const btnSyncNow = document.getElementById("btn-sync-now");
const btnLogout = document.getElementById("btn-logout");

const toast = document.getElementById("toast");
const importFile = document.getElementById("import-file");

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  setupEventListeners();
  checkAuthStatus();
  autoSyncBackground();
});

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
      allItems = res.items || [];
      containers = res.containers && res.containers.length > 0 ? res.containers : [...DEFAULT_CONTAINERS];
      renderContainersBar();
      renderItems();
    }
  } catch (err) {
    console.warn("Background auto-sync:", err);
  }
}

async function loadState() {
  const data = await chrome.storage.local.get(["items", "containers", "lastActiveContainer"]);
  allItems = data.items || [];
  if (data.containers && data.containers.length > 0) {
    containers = data.containers;
  }
  if (data.lastActiveContainer) {
    activeContainerId = data.lastActiveContainer;
  }
  renderContainersBar();
  renderItems();
}

// ── Containers Bar Rendering ──
function renderContainersBar() {
  let html = `
    <button class="container-chip ${activeContainerId === "all" ? "active" : ""}" data-id="all">
      🌐 All
    </button>
  `;

  containers.forEach((c) => {
    const isAct = activeContainerId === c.id;
    const isCustom = c.id !== "default";
    const delHTML = isCustom
      ? `<span class="chip-del" data-del-container="${c.id}" title="Delete container">×</span>`
      : "";
    html += `
      <button class="container-chip ${isAct ? "active" : ""}" data-id="${c.id}">
        ${c.icon} ${escapeHTML(c.name)}
        ${delHTML}
      </button>
    `;
  });

  containersList.innerHTML = html;

  containersList.querySelectorAll(".container-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      if (e.target.closest(".chip-del")) return;
      activeContainerId = e.currentTarget.dataset.id;
      chrome.storage.local.set({ lastActiveContainer: activeContainerId });
      renderContainersBar();
      renderItems();
    });
  });

  // Handle delete container in popup
  containersList.querySelectorAll(".chip-del").forEach((delBtn) => {
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const contId = delBtn.dataset.delContainer;
      const cont = containers.find((c) => c.id === contId);
      if (!cont) return;

      const itemCount = allItems.filter((i) => i.containerId === contId).length;
      const confirmMsg = itemCount > 0
        ? `Delete container "${cont.name}"?\n${itemCount} item(s) will be moved to Quick Saves.`
        : `Delete container "${cont.name}"?`;

      if (confirm(confirmMsg)) {
        allItems.forEach((i) => {
          if (i.containerId === contId) i.containerId = "default";
        });
        containers = containers.filter((c) => c.id !== contId);
        if (activeContainerId === contId) {
          activeContainerId = "all";
        }
        chrome.storage.local.set({ containers, items: allItems, lastActiveContainer: activeContainerId }, () => {
          renderContainersBar();
          renderItems();
          showToast(`Container "${cont.name}" deleted`);
          SyncService.pushToCloud(allItems, containers);
        });
      }
    });
  });

  // Populate Add & Edit Modal container dropdowns
  const optionsHTML = containers
    .map(
      (c) =>
        `<option value="${c.id}">${c.icon} ${escapeHTML(c.name)}</option>`
    )
    .join("");

  if (addContainerSelect) {
    addContainerSelect.innerHTML = optionsHTML;
    if (activeContainerId !== "all") {
      addContainerSelect.value = activeContainerId;
    }
  }

  if (editContainerSelect) {
    editContainerSelect.innerHTML = optionsHTML;
  }
}

// ── Render Items ──
function renderItems() {
  const filtered = allItems.filter((item) => {
    // Filter by container
    if (activeContainerId !== "all") {
      const itemCont = item.containerId || "default";
      if (itemCont !== activeContainerId) return false;
    }

    // Filter by Type / Favorite
    if (currentFilter === "favorite" && !item.favorite) return false;
    if (currentFilter !== "all" && currentFilter !== "favorite" && item.type !== currentFilter)
      return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = item.content.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchSource = item.sourceTitle?.toLowerCase().includes(q);
      if (!matchContent && !matchTags && !matchSource) return false;
    }

    return true;
  });

  // Count bar
  if (allItems.length > 0) {
    countBar.classList.remove("hidden");
    const containerName =
      activeContainerId === "all"
        ? "All Containers"
        : containers.find((c) => c.id === activeContainerId)?.name || "Container";
    itemCount.textContent = `${filtered.length} saved in ${containerName}`;
  } else {
    countBar.classList.add("hidden");
  }

  if (filtered.length === 0) {
    itemsContainer.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  itemsContainer.classList.remove("hidden");
  emptyState.classList.add("hidden");

  itemsContainer.innerHTML = filtered.map((item) => createItemHTML(item)).join("");

  // Attach event listeners
  itemsContainer.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", handleItemAction);
  });

  // Expand text on click
  itemsContainer.querySelectorAll(".item-content").forEach((el) => {
    el.addEventListener("click", () => el.classList.toggle("expanded"));
  });

  // Clickable tags
  itemsContainer.querySelectorAll(".tag").forEach((tagEl) => {
    tagEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = e.currentTarget.dataset.tag;
      if (tag) {
        searchInput.value = tag;
        searchQuery = tag;
        renderItems();
      }
    });
  });
}

function createItemHTML(item) {
  const date = new Date(item.createdAt);
  const timeAgo = getTimeAgo(date);
  const badgeClass = item.type === "link" ? "badge-link" : "badge-text";
  const typeLabel = item.type === "link" ? "Link" : "Text";

  // Find container safely
  const container =
    containers.find((c) => c && c.id === (item.containerId || "default")) ||
    containers[0] ||
    { icon: "⚡", name: "Quick Saves" };

  let contentHTML;
  if (item.type === "link") {
    const url = /^https?:\/\//i.test(item.content) ? item.content : `https://${item.content}`;
    contentHTML = `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(item.content)}</a>`;
  } else {
    contentHTML = escapeHTML(item.content);
  }

  const tagsHTML =
    item.tags?.length > 0
      ? `<div class="item-tags">${item.tags.map((t) => `<span class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`).join("")}</div>`
      : "";

  const sourceHTML = item.sourceTitle
    ? `<span class="item-source" title="${escapeHTML(item.sourceUrl)}">from ${escapeHTML(item.sourceTitle)}</span>`
    : "";

  return `
    <div class="item-card" data-id="${item.id}">
      <div class="item-top">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="item-type-badge ${badgeClass}">${typeLabel}</span>
          <span class="tag" style="background:#0e1208; border-color:rgba(190,250,79,0.3); color:var(--neon); font-size:10px;">${container.icon} ${escapeHTML(container.name)}</span>
        </div>
        <div class="item-actions">
          <button class="item-action-btn ${item.favorite ? "favorite-active" : ""}" data-action="favorite" data-id="${item.id}" title="Favorite">
            <svg viewBox="0 0 24 24" fill="${item.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="item-action-btn edit-btn" data-action="edit" data-id="${item.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="item-action-btn" data-action="copy" data-id="${item.id}" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="item-action-btn delete-btn" data-action="delete" data-id="${item.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="item-content">${contentHTML}</div>
      ${tagsHTML}
      <div class="item-meta">
        <span>${timeAgo}</span>
        ${sourceHTML ? "·" : ""}
        ${sourceHTML}
      </div>
    </div>
  `;
}

// ── Card Actions ──
function handleItemAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const item = allItems.find((i) => i.id === id);
  if (!item) return;

  if (action === "copy") {
    navigator.clipboard.writeText(item.content);
    showToast("Copied to clipboard!");
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--neon);"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => (btn.innerHTML = originalHTML), 1200);
  }

  if (action === "favorite") {
    item.favorite = !item.favorite;
    chrome.runtime.sendMessage({ action: "updateItem", item }, () => {
      renderItems();
      SyncService.pushToCloud(allItems, containers);
    });
  }

  if (action === "edit") {
    editingItemId = id;
    editContent.value = item.content;
    editTags.value = (item.tags || []).join(", ");
    if (editContainerSelect) {
      editContainerSelect.value = item.containerId || "default";
    }
    editModal.classList.remove("hidden");
    editContent.focus();
  }

  if (action === "delete") {
    chrome.runtime.sendMessage({ action: "deleteItem", id }, () => {
      allItems = allItems.filter((i) => i.id !== id);
      renderItems();
      showToast("Item deleted");
      SyncService.pushToCloud(allItems, containers);
    });
  }
}

// ── Event Listeners Setup ──
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderItems();
  });

  // Filter Buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderItems();
    });
  });

  // Paste from clipboard
  btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast("Clipboard is empty");
        return;
      }

      const isUrl = /^https?:\/\//i.test(text.trim()) || /^(www\.)/i.test(text.trim());
      const targetContainer = activeContainerId !== "all" ? activeContainerId : "default";

      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        type: isUrl ? "link" : "text",
        content: text.trim(),
        containerId: targetContainer,
        sourceUrl: "",
        sourceTitle: "",
        createdAt: Date.now(),
        tags: [],
        favorite: false,
      };

      chrome.runtime.sendMessage({ action: "saveItem", item }, () => {
        allItems.unshift(item);
        renderItems();
        showToast(`${isUrl ? "Link" : "Text"} saved to ${containers.find((c) => c.id === targetContainer)?.name || "container"}!`);
        SyncService.pushToCloud(allItems, containers);
      });
    } catch {
      showToast("Cannot read clipboard – permission needed");
    }
  });

  // Add Item Modal
  btnAdd.addEventListener("click", () => {
    addModal.classList.remove("hidden");
    addContent.value = "";
    addTags.value = "";
    if (addContainerSelect) {
      addContainerSelect.value = activeContainerId !== "all" ? activeContainerId : "default";
    }
    addContent.focus();
  });

  modalCancel.addEventListener("click", () => addModal.classList.add("hidden"));
  addModal.querySelector(".modal-backdrop").addEventListener("click", () => addModal.classList.add("hidden"));

  modalSave.addEventListener("click", () => {
    const content = addContent.value.trim();
    if (!content) {
      addContent.style.borderColor = "var(--red)";
      setTimeout(() => (addContent.style.borderColor = ""), 1000);
      return;
    }

    const tags = addTags.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const isUrl = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content);
    const targetContainer = addContainerSelect ? addContainerSelect.value : "default";

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: isUrl ? "link" : "text",
      content,
      containerId: targetContainer,
      sourceUrl: "",
      sourceTitle: "",
      createdAt: Date.now(),
      tags,
      favorite: false,
    };

    chrome.runtime.sendMessage({ action: "saveItem", item }, () => {
      allItems.unshift(item);
      renderItems();
      addModal.classList.add("hidden");
      showToast("Item saved!");
      SyncService.pushToCloud(allItems, containers);
    });
  });

  // Edit Item Modal
  editCancel.addEventListener("click", () => {
    editModal.classList.add("hidden");
    editingItemId = null;
  });
  editModal.querySelector(".modal-backdrop").addEventListener("click", () => {
    editModal.classList.add("hidden");
    editingItemId = null;
  });

  editSave.addEventListener("click", () => {
    const content = editContent.value.trim();
    if (!content) return;

    const tags = editTags.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const item = allItems.find((i) => i.id === editingItemId);
    if (item) {
      item.content = content;
      item.tags = tags;
      item.type = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content) ? "link" : "text";
      if (editContainerSelect) {
        item.containerId = editContainerSelect.value;
      }
      chrome.runtime.sendMessage({ action: "updateItem", item }, () => {
        renderItems();
        editModal.classList.add("hidden");
        editingItemId = null;
        showToast("Item updated!");
        SyncService.pushToCloud(allItems, containers);
      });
    }
  });

  // Container Creation Modal
  btnAddContainer.addEventListener("click", () => {
    containerModal.classList.remove("hidden");
    containerNameInput.value = "";
    selectedContainerEmoji = "⚡";
    emojiOpts.forEach((b) => b.classList.toggle("active", b.dataset.emoji === "⚡"));
    containerNameInput.focus();
  });

  containerModalCancel.addEventListener("click", () => containerModal.classList.add("hidden"));
  containerModal.querySelector(".modal-backdrop").addEventListener("click", () => containerModal.classList.add("hidden"));

  emojiOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      emojiOpts.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedContainerEmoji = btn.dataset.emoji;
    });
  });

  containerModalSave.addEventListener("click", () => {
    const name = containerNameInput.value.trim();
    if (!name) {
      containerNameInput.style.borderColor = "var(--red)";
      setTimeout(() => (containerNameInput.style.borderColor = ""), 1000);
      return;
    }

    const newContainer = {
      id: "cont_" + Date.now().toString(36),
      name,
      icon: selectedContainerEmoji,
      createdAt: Date.now(),
    };

    containers.push(newContainer);
    activeContainerId = newContainer.id;
    chrome.storage.local.set({ containers, lastActiveContainer: activeContainerId }, () => {
      containerModal.classList.add("hidden");
      renderContainersBar();
      renderItems();
      showToast(`Container "${name}" created!`);
      SyncService.pushToCloud(allItems, containers);
    });
  });

  // Auth / Cloud Sync Modal
  btnAuth.addEventListener("click", () => {
    checkAuthStatus();
    authModal.classList.remove("hidden");
  });

  authModalCancel.addEventListener("click", () => authModal.classList.add("hidden"));
  authModal.querySelector(".modal-backdrop").addEventListener("click", () => authModal.classList.add("hidden"));

  authToggleMode.addEventListener("click", (e) => {
    e.preventDefault();
    authIsSignUp = !authIsSignUp;
    authSubmitBtn.textContent = authIsSignUp ? "Create Account" : "Log In";
    authModeText.innerHTML = authIsSignUp
      ? `Already have an account? <a href="#" id="auth-toggle-mode" style="color:var(--neon);">Log In</a>`
      : `Don't have an account? <a href="#" id="auth-toggle-mode" style="color:var(--neon);">Sign Up</a>`;
    document.getElementById("auth-toggle-mode").addEventListener("click", arguments.callee);
  });

  authSubmitBtn.addEventListener("click", async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();
    if (!email || !password) {
      showToast("Please enter email and password");
      return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Connecting...";

    try {
      if (authIsSignUp) {
        await SyncService.signUp(email, password);
        showToast("Account created successfully!");
      } else {
        await SyncService.logIn(email, password);
        showToast("Logged in successfully!");
      }

      // Sync data immediately
      showToast("Syncing with cloud...");
      const synced = await SyncService.syncNow();
      if (synced) {
        allItems = synced.items;
        containers = synced.containers.length > 0 ? synced.containers : containers;
        renderContainersBar();
        renderItems();
      }
      checkAuthStatus();
    } catch (err) {
      showToast(err.message || "Authentication failed");
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authIsSignUp ? "Create Account" : "Log In";
    }
  });

  btnSyncNow.addEventListener("click", async () => {
    btnSyncNow.disabled = true;
    btnSyncNow.textContent = "Syncing...";
    try {
      const res = await SyncService.syncNow();
      if (res) {
        allItems = res.items || [];
        containers = res.containers && res.containers.length > 0 ? res.containers : [...DEFAULT_CONTAINERS];
        renderContainersBar();
        renderItems();
        showToast("Cloud sync complete!");
      }
    } catch (err) {
      showToast("Sync failed: " + err.message);
    } finally {
      btnSyncNow.disabled = false;
      btnSyncNow.textContent = "Sync Now";
    }
  });

  btnLogout.addEventListener("click", async () => {
    await SyncService.logOut();
    checkAuthStatus();
    showToast("Logged out of cloud account");
  });

  // Dropdown Menu
  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdownMenu.classList.add("hidden"));

  btnDashboard.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });

  const menuDashboard = document.getElementById("menu-dashboard");
  if (menuDashboard) {
    menuDashboard.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
  }

  // Export
  document.getElementById("menu-export").addEventListener("click", () => {
    const exportBundle = { items: allItems, containers };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported backup!");
  });

  // Import
  document.getElementById("menu-import").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedItems = Array.isArray(parsed) ? parsed : parsed.items || [];
        const importedContainers = parsed.containers || [];

        allItems = [...importedItems, ...allItems];
        if (importedContainers.length > 0) {
          const map = new Map();
          containers.forEach((c) => map.set(c.id, c));
          importedContainers.forEach((c) => map.set(c.id, c));
          containers = Array.from(map.values());
        }

        chrome.storage.local.set({ items: allItems, containers }, () => {
          renderContainersBar();
          renderItems();
          showToast(`Imported ${importedItems.length} items!`);
          SyncService.pushToCloud(allItems, containers);
        });
      } catch {
        showToast("Invalid file format");
      }
    };
    reader.readAsText(file);
    importFile.value = "";
  });

  // Clear All
  document.getElementById("menu-clear").addEventListener("click", () => {
    if (confirm("Delete ALL saved items? This cannot be undone.")) {
      chrome.runtime.sendMessage({ action: "clearAll" }, () => {
        allItems = [];
        renderItems();
        showToast("All items cleared");
        SyncService.pushToCloud([], containers);
      });
    }
  });
}

// ── Auth Status Check ──
async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session && session.user) {
    authLoggedOutView.classList.add("hidden");
    authLoggedInView.classList.remove("hidden");
    authUserEmail.textContent = session.user.email;
    authModalTitle.textContent = "Account & Cloud Sync";
  } else {
    authLoggedInView.classList.add("hidden");
    authLoggedOutView.classList.remove("hidden");
    authModalTitle.textContent = "Log In to Cloud Sync";
  }
}

// ── Helpers ──
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}
