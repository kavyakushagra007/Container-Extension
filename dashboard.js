// ── SaveIt: Dashboard Controller (Cloud Sync, Tags & Categories) ──
let allItems = [];
let categories = ["General", "Study", "Reading", "Ideas"];
let currentView = "all"; // "all", "text", "link", "favorite", or "cat:CategoryName"
let searchQuery = "";
let currentSort = "newest";
let selectedIds = new Set();
let editingItemId = null;
let authIsSignUp = false;

// ── DOM Elements ──
const itemsGrid = document.getElementById("items-grid");
const emptyState = document.getElementById("empty-state");
const settingsPanel = document.getElementById("settings-panel");
const statsRow = document.getElementById("stats-row");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const pageTitle = document.getElementById("page-title");
const bulkBar = document.getElementById("bulk-bar");
const selectedCount = document.getElementById("selected-count");
const btnSelectAll = document.getElementById("btn-select-all");
const btnBulkCategory = document.getElementById("btn-bulk-category");
const btnDeleteSelected = document.getElementById("btn-delete-selected");
const btnCancelSelect = document.getElementById("btn-cancel-select");
const btnAddNew = document.getElementById("btn-add-new");
const btnSettings = document.getElementById("btn-settings");
const toast = document.getElementById("toast");
const importFile = document.getElementById("import-file");

// Categories in sidebar
const dashCategoriesList = document.getElementById("dash-categories-list");
const btnAddCategoryDash = document.getElementById("btn-add-category-dash");
const dashCategoryOptions = document.getElementById("dash-category-options");

// Add / Edit Modal elements
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalCategoryInput = document.getElementById("modal-category-input");
const modalContentInput = document.getElementById("modal-content-input");
const modalTagsInput = document.getElementById("modal-tags-input");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

// Auth / Cloud Sync modal
const btnDashAuth = document.getElementById("btn-dash-auth");
const dashAuthLabel = document.getElementById("dash-auth-label");
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

// Counts & Stats
const countAll = document.getElementById("count-all");
const countText = document.getElementById("count-text");
const countLink = document.getElementById("count-link");
const countFav = document.getElementById("count-fav");
const statTotal = document.getElementById("stat-total");
const statText = document.getElementById("stat-text");
const statLinks = document.getElementById("stat-links");
const statFavs = document.getElementById("stat-favs");

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
      if (res.categories && res.categories.length > 0) {
        categories = res.categories;
      }
      updateCategoryDatalist();
      renderSidebarCategories();
      updateStats();
      render();
    }
  } catch (err) {
    console.warn("Background auto-sync:", err);
  }
}

async function loadState() {
  const data = await chrome.storage.local.get(["items", "categories"]);
  allItems = data.items || [];
  if (data.categories && data.categories.length > 0) {
    categories = data.categories;
  }
  updateCategoryDatalist();
  renderSidebarCategories();
  updateStats();
  render();
}

function updateCategoryDatalist() {
  if (!dashCategoryOptions) return;
  dashCategoryOptions.innerHTML = categories
    .map((c) => `<option value="${escapeHTML(c)}">`)
    .join("");
}

// ── Sidebar Categories ──
function renderSidebarCategories() {
  if (!dashCategoriesList) return;

  dashCategoriesList.innerHTML = categories
    .map((cat) => {
      const isAct = currentView === `cat:${cat}`;
      const count = allItems.filter(
        (i) => (i.category || "General").toLowerCase() === cat.toLowerCase()
      ).length;
      const isDefault = cat.toLowerCase() === "general";
      const delBtn = isDefault
        ? ""
        : `<span class="nav-del-btn" data-del-cat="${escapeHTML(cat)}" title="Delete category">×</span>`;

      return `
        <button class="nav-item ${isAct ? "active" : ""}" data-cat-name="${escapeHTML(cat)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(cat)}</span>
          <span class="nav-count">${count}</span>
          ${delBtn}
        </button>
      `;
    })
    .join("");

  dashCategoriesList.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest(".nav-del-btn")) return;
      document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.catName;
      currentView = `cat:${cat}`;
      pageTitle.textContent = cat;
      settingsPanel.classList.add("hidden");
      statsRow.classList.remove("hidden");
      itemsGrid.classList.remove("hidden");
      render();
    });
  });

  dashCategoriesList.querySelectorAll(".nav-del-btn").forEach((delBtn) => {
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const catToDelete = delBtn.dataset.delCat;
      if (!catToDelete) return;

      const count = allItems.filter(
        (i) => (i.category || "General").toLowerCase() === catToDelete.toLowerCase()
      ).length;

      const confirmMsg = count > 0
        ? `Delete category "${catToDelete}"?\n${count} item(s) will be moved to "General".`
        : `Delete category "${catToDelete}"?`;

      if (confirm(confirmMsg)) {
        allItems.forEach((i) => {
          if ((i.category || "General").toLowerCase() === catToDelete.toLowerCase()) {
            i.category = "General";
          }
        });
        categories = categories.filter((c) => c.toLowerCase() !== catToDelete.toLowerCase());
        if (currentView === `cat:${catToDelete}`) {
          currentView = "all";
          const allBtn = document.querySelector('.sidebar-nav .nav-item[data-view="all"]');
          if (allBtn) allBtn.classList.add("active");
          pageTitle.textContent = "All Items";
        }
        chrome.storage.local.set({ items: allItems, categories }, () => {
          updateCategoryDatalist();
          renderSidebarCategories();
          updateStats();
          render();
          showToast(`Category "${catToDelete}" removed`);
          SyncService.pushToCloud(allItems, categories);
        });
      }
    });
  });
}

// ── Stats ──
function updateStats() {
  const total = allItems.length;
  const texts = allItems.filter((i) => i.type === "text").length;
  const links = allItems.filter((i) => i.type === "link").length;
  const favs = allItems.filter((i) => i.favorite).length;

  statTotal.textContent = total;
  statText.textContent = texts;
  statLinks.textContent = links;
  statFavs.textContent = favs;

  countAll.textContent = total;
  countText.textContent = texts;
  countLink.textContent = links;
  countFav.textContent = favs;
}

// ── Filter & Sort ──
function getFilteredItems() {
  let items = allItems.filter((item) => {
    // If viewing a category
    if (currentView.startsWith("cat:")) {
      const targetCat = currentView.slice(4).toLowerCase();
      const itemCat = (item.category || "General").toLowerCase();
      if (itemCat !== targetCat) return false;
    } else {
      // Standard views
      if (currentView === "favorite" && !item.favorite) return false;
      if (currentView !== "all" && currentView !== "favorite" && item.type !== currentView)
        return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = item.content.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchCategory = (item.category || "General").toLowerCase().includes(q);
      const matchSource = item.sourceTitle?.toLowerCase().includes(q);
      if (!matchContent && !matchTags && !matchCategory && !matchSource) return false;
    }

    return true;
  });

  // Sort
  if (currentSort === "newest") {
    items.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === "oldest") {
    items.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === "alpha") {
    items.sort((a, b) => a.content.localeCompare(b.content));
  }

  return items;
}

// ── Render Items Grid ──
function render() {
  if (!settingsPanel.classList.contains("hidden")) return;

  const items = getFilteredItems();

  if (items.length === 0) {
    itemsGrid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  itemsGrid.classList.remove("hidden");
  emptyState.classList.add("hidden");

  itemsGrid.innerHTML = items.map((item) => createCardHTML(item)).join("");

  // Attach card event listeners
  itemsGrid.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", handleCardAction);
  });

  itemsGrid.querySelectorAll(".item-checkbox").forEach((cb) => {
    cb.addEventListener("click", handleCheckbox);
  });

  itemsGrid.querySelectorAll(".card-content").forEach((el) => {
    el.addEventListener("click", () => el.classList.toggle("expanded"));
  });

  itemsGrid.querySelectorAll(".tag").forEach((tagEl) => {
    tagEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = e.currentTarget.dataset.tag;
      if (tag) {
        searchInput.value = tag;
        searchQuery = tag;
        render();
      }
    });
  });

  // Clickable category badges on cards
  itemsGrid.querySelectorAll(".card-category-badge").forEach((catBadge) => {
    catBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      const cat = catBadge.dataset.category;
      if (cat) {
        document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
        const targetBtn = document.querySelector(`.sidebar-nav .nav-item[data-cat-name="${cat}"]`);
        if (targetBtn) targetBtn.classList.add("active");
        currentView = `cat:${cat}`;
        pageTitle.textContent = cat;
        render();
      }
    });
  });
}

function createCardHTML(item) {
  const isSelected = selectedIds.has(item.id);
  const timeAgo = getTimeAgo(new Date(item.createdAt));
  const badgeClass = item.type === "link" ? "badge-link" : "badge-text";
  const typeLabel = item.type === "link" ? "Link" : "Text";
  const catName = item.category || "General";

  let contentHTML;
  if (item.type === "link") {
    const url = /^https?:\/\//i.test(item.content) ? item.content : `https://${item.content}`;
    contentHTML = `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(item.content)}</a>`;
  } else {
    contentHTML = escapeHTML(item.content);
  }

  const tagsHTML =
    item.tags?.length > 0
      ? `<div class="card-tags">${item.tags.map((t) => `<span class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`).join("")}</div>`
      : "";

  const sourceHTML = item.sourceTitle
    ? `<span class="card-source" title="${escapeHTML(item.sourceUrl)}">from ${escapeHTML(item.sourceTitle)}</span>`
    : "";

  return `
    <div class="item-card ${isSelected ? "selected" : ""}" data-id="${item.id}">
      <div class="item-checkbox" data-id="${item.id}"></div>
      <div class="card-top">
        <span class="item-badge ${badgeClass}">${typeLabel}</span>
        <span class="card-category-badge" data-category="${escapeHTML(catName)}" title="Filter by category">${escapeHTML(catName)}</span>
      </div>
      <div class="card-content">${contentHTML}</div>
      ${tagsHTML}
      <div class="card-footer">
        <div class="card-meta">
          <span>${timeAgo}</span>
          ${sourceHTML ? "·" : ""}
          ${sourceHTML}
        </div>
        <div class="card-actions">
          <button class="card-action-btn ${item.favorite ? "fav-active" : ""}" data-action="favorite" data-id="${item.id}" title="Favorite">
            <svg viewBox="0 0 24 24" fill="${item.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="card-action-btn" data-action="copy" data-id="${item.id}" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="card-action-btn" data-action="edit" data-id="${item.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card-action-btn delete-hover" data-action="delete" data-id="${item.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Card Actions ──
function handleCardAction(e) {
  e.stopPropagation();
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
    chrome.storage.local.set({ items: allItems }, () => {
      updateStats();
      render();
      SyncService.pushToCloud(allItems, categories);
    });
  }

  if (action === "edit") {
    editingItemId = id;
    modalTitle.textContent = "Edit Item";
    modalContentInput.value = item.content;
    modalCategoryInput.value = item.category || "General";
    modalTagsInput.value = (item.tags || []).join(", ");
    modal.classList.remove("hidden");
    modalContentInput.focus();
  }

  if (action === "delete") {
    allItems = allItems.filter((i) => i.id !== id);
    selectedIds.delete(id);
    chrome.storage.local.set({ items: allItems }, () => {
      updateBulkBar();
      renderSidebarCategories();
      updateStats();
      render();
      showToast("Item deleted");
      SyncService.pushToCloud(allItems, categories);
    });
  }
}

function handleCheckbox(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  updateBulkBar();
  render();
}

function updateBulkBar() {
  if (selectedIds.size > 0) {
    bulkBar.classList.remove("hidden");
    selectedCount.textContent = `${selectedIds.size} selected`;
  } else {
    bulkBar.classList.add("hidden");
  }
}

// ── Setup Event Listeners ──
function setupEventListeners() {
  // Navigation
  document.querySelectorAll(".sidebar-nav > .nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      pageTitle.textContent = btn.childNodes[2].textContent.trim();
      settingsPanel.classList.add("hidden");
      statsRow.classList.remove("hidden");
      itemsGrid.classList.remove("hidden");
      render();
    });
  });

  // Settings nav
  btnSettings.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
    btnSettings.classList.add("active");
    pageTitle.textContent = "Settings";
    statsRow.classList.add("hidden");
    itemsGrid.classList.add("hidden");
    emptyState.classList.add("hidden");
    bulkBar.classList.add("hidden");
    settingsPanel.classList.remove("hidden");
  });

  // Add Category Mini Button
  if (btnAddCategoryDash) {
    btnAddCategoryDash.addEventListener("click", () => {
      const newCat = prompt("Enter new category name (e.g. Study, Poems, Movies, Work):");
      if (newCat && newCat.trim()) {
        const trimmed = newCat.trim();
        if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          categories.push(trimmed);
          chrome.storage.local.set({ categories }, () => {
            updateCategoryDatalist();
            renderSidebarCategories();
            showToast(`Category "${trimmed}" created!`);
            SyncService.pushToCloud(allItems, categories);
          });
        }
      }
    });
  }

  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    render();
  });

  // Sort
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    render();
  });

  // Add New Item Button
  btnAddNew.addEventListener("click", () => {
    editingItemId = null;
    modalTitle.textContent = "Add New Item";
    modalContentInput.value = "";
    modalCategoryInput.value = currentView.startsWith("cat:") ? currentView.slice(4) : "General";
    modalTagsInput.value = "";
    modal.classList.remove("hidden");
    modalContentInput.focus();
  });

  modalCancel.addEventListener("click", () => modal.classList.add("hidden"));
  modal.querySelector(".modal-backdrop").addEventListener("click", () => modal.classList.add("hidden"));
  modalSave.addEventListener("click", handleModalSave);

  // Bulk Actions
  btnSelectAll.addEventListener("click", () => {
    const visible = getFilteredItems();
    visible.forEach((i) => selectedIds.add(i.id));
    updateBulkBar();
    render();
  });

  if (btnBulkCategory) {
    btnBulkCategory.addEventListener("click", () => {
      const targetCat = prompt(
        `Move ${selectedIds.size} selected item(s) to which category?`,
        "Study"
      );
      if (targetCat && targetCat.trim()) {
        const trimmed = targetCat.trim();
        if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          categories.push(trimmed);
        }
        allItems.forEach((i) => {
          if (selectedIds.has(i.id)) {
            i.category = trimmed;
          }
        });
        chrome.storage.local.set({ items: allItems, categories }, () => {
          selectedIds.clear();
          updateBulkBar();
          updateCategoryDatalist();
          renderSidebarCategories();
          render();
          showToast(`Items moved to "${trimmed}"`);
          SyncService.pushToCloud(allItems, categories);
        });
      }
    });
  }

  btnDeleteSelected.addEventListener("click", () => {
    if (confirm(`Delete ${selectedIds.size} selected items?`)) {
      allItems = allItems.filter((i) => !selectedIds.has(i.id));
      chrome.storage.local.set({ items: allItems }, () => {
        selectedIds.clear();
        updateBulkBar();
        renderSidebarCategories();
        updateStats();
        render();
        showToast("Selected items deleted");
        SyncService.pushToCloud(allItems, categories);
      });
    }
  });

  btnCancelSelect.addEventListener("click", () => {
    selectedIds.clear();
    updateBulkBar();
    render();
  });

  // Cloud Sync Button & Modal
  btnDashAuth.addEventListener("click", () => {
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
        showToast("Account created!");
      } else {
        await SyncService.logIn(email, password);
        showToast("Logged in!");
      }

      showToast("Syncing with cloud...");
      const synced = await SyncService.syncNow();
      if (synced) {
        allItems = synced.items || [];
        if (synced.categories && synced.categories.length > 0) {
          categories = synced.categories;
        }
        updateCategoryDatalist();
        renderSidebarCategories();
        updateStats();
        render();
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
        if (res.categories && res.categories.length > 0) {
          categories = res.categories;
        }
        updateCategoryDatalist();
        renderSidebarCategories();
        updateStats();
        render();
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

  // Settings Actions
  const btnShortcuts = document.getElementById("btn-shortcuts");
  if (btnShortcuts) {
    btnShortcuts.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }
  document.getElementById("settings-export").addEventListener("click", exportData);
  document.getElementById("settings-import").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", handleImport);
  document.getElementById("settings-clear").addEventListener("click", clearAllData);
}

// ── Modal Save ──
function handleModalSave() {
  const content = modalContentInput.value.trim();
  if (!content) {
    modalContentInput.style.borderColor = "var(--red)";
    setTimeout(() => (modalContentInput.style.borderColor = ""), 1000);
    return;
  }

  const cat = modalCategoryInput.value.trim() || "General";
  if (!categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    categories.push(cat);
    updateCategoryDatalist();
  }

  const tags = modalTagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);

  const isUrl = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content);
  const detectedType = isUrl ? "link" : "text";

  if (editingItemId) {
    const item = allItems.find((i) => i.id === editingItemId);
    if (item) {
      item.content = content;
      item.category = cat;
      item.tags = tags;
      item.type = detectedType;
    }
    showToast("Item updated!");
  } else {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: detectedType,
      content,
      category: cat,
      sourceUrl: "",
      sourceTitle: "",
      createdAt: Date.now(),
      tags,
      favorite: false,
    };
    allItems.unshift(item);
    showToast("Item saved!");
  }

  chrome.storage.local.set({ items: allItems, categories }, () => {
    modal.classList.add("hidden");
    editingItemId = null;
    updateCategoryDatalist();
    renderSidebarCategories();
    updateStats();
    render();
    SyncService.pushToCloud(allItems, categories);
  });
}

// ── Auth Status Check ──
async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session && session.user) {
    authLoggedOutView.classList.add("hidden");
    authLoggedInView.classList.remove("hidden");
    authUserEmail.textContent = session.user.email;
    dashAuthLabel.textContent = "Synced";
    btnDashAuth.classList.add("btn-primary");
    btnDashAuth.classList.remove("btn-secondary");
  } else {
    authLoggedInView.classList.add("hidden");
    authLoggedOutView.classList.remove("hidden");
    dashAuthLabel.textContent = "Cloud Sync";
    btnDashAuth.classList.remove("btn-primary");
    btnDashAuth.classList.add("btn-secondary");
  }
}

// ── Import / Export / Clear ──
function exportData() {
  const exportBundle = { items: allItems, categories };
  const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saveit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported successfully!");
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      const importedItems = Array.isArray(parsed) ? parsed : parsed.items || [];
      const importedCategories = parsed.categories || [];

      allItems = [...importedItems, ...allItems];
      if (importedCategories.length > 0) {
        categories = Array.from(new Set([...categories, ...importedCategories]));
      }

      chrome.storage.local.set({ items: allItems, categories }, () => {
        updateCategoryDatalist();
        renderSidebarCategories();
        updateStats();
        render();
        showToast(`Imported ${importedItems.length} items!`);
        SyncService.pushToCloud(allItems, categories);
      });
    } catch {
      showToast("Invalid file format");
    }
  };
  reader.readAsText(file);
  importFile.value = "";
}

function clearAllData() {
  if (confirm("Are you sure? This will delete ALL saved items permanently!")) {
    chrome.storage.local.set({ items: [] }, () => {
      allItems = [];
      selectedIds.clear();
      updateBulkBar();
      renderSidebarCategories();
      updateStats();
      render();
      showToast("All data cleared");
      SyncService.pushToCloud([], categories);
    });
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
