// ── SaveIt: Popup Controller (Option 2: Two-Tab Mode - Save vs. Browse) ──

let collections = [];
let containers = [];
let allItems = [];

let activeCollectionId = "all";
let activeContainerId = "all";
let activeVaultBoxId = "all";
let currentFilter = "all";
let searchQuery = "";
let editingItemId = null;
let selectedColColor = "#4F46E5";
let selectedContColor = "#2563EB";
let authIsSignUp = false;
let currentTabInfo = null;

// ── DOM References ──
// Segmented Tabs & Views
const tabSavePage = document.getElementById("tab-save-page");
const tabRecentVault = document.getElementById("tab-recent-vault");
const tabVaultCount = document.getElementById("tab-vault-count");
const viewSavePage = document.getElementById("view-save-page");
const viewRecentVault = document.getElementById("view-recent-vault");

// Screen A (Save Page)
const savePageTypeChip = document.getElementById("save-page-type-chip");
const savePageTitle = document.getElementById("save-page-title");
const savePageUrl = document.getElementById("save-page-url");
const saveColSelect = document.getElementById("save-col-select");
const saveContSelect = document.getElementById("save-cont-select");
const btnQuickNewCol = document.getElementById("btn-quick-new-col");
const btnQuickNewCont = document.getElementById("btn-quick-new-cont");
const saveNoteInput = document.getElementById("save-note-input");
const saveTagsInput = document.getElementById("save-tags-input");
const btnSaveCurrentPage = document.getElementById("btn-save-current-page");
const btnSaveText = document.getElementById("btn-save-text");
const btnPasteClipboard = document.getElementById("btn-paste-clipboard");

// Screen B (Recent Vault)
const vaultSearchInput = document.getElementById("vault-search-input");
const vaultSearchClear = document.getElementById("vault-search-clear");
const vaultBoxFilter = document.getElementById("vault-box-filter");
const typeFilterChips = document.querySelectorAll(".type-filter-chip");
const itemsContainer = document.getElementById("items-container");
const emptyState = document.getElementById("empty-state");

// Header actions & Menu
const btnDashboard = document.getElementById("btn-dashboard");
const btnAdd = document.getElementById("btn-add");
const btnMenu = document.getElementById("btn-menu");
const dropdownMenu = document.getElementById("dropdown-menu");
const menuAddCollection = document.getElementById("menu-add-collection");
const menuAddContainer = document.getElementById("menu-add-container");
const menuAuth = document.getElementById("menu-auth");
const menuExport = document.getElementById("menu-export");
const menuImport = document.getElementById("menu-import");
const menuClear = document.getElementById("menu-clear");
const importFile = document.getElementById("import-file");

// Footer Status
const footerStatusText = document.getElementById("footer-status-text");
const footerItemCount = document.getElementById("footer-item-count");

// Add Modal (Manual Clip)
const addModal = document.getElementById("add-modal");
const addColSelect = document.getElementById("add-col-select");
const addContSelect = document.getElementById("add-cont-select");
const addTitle = document.getElementById("add-title");
const addContent = document.getElementById("add-content");
const addNote = document.getElementById("add-note");
const addTags = document.getElementById("add-tags");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");
const modalCloseX = document.getElementById("modal-close-x");

// Edit Modal
const editModal = document.getElementById("edit-modal");
const editColSelect = document.getElementById("edit-col-select");
const editContSelect = document.getElementById("edit-cont-select");
const editTitle = document.getElementById("edit-title");
const editContent = document.getElementById("edit-content");
const editNote = document.getElementById("edit-note");
const editTags = document.getElementById("edit-tags");
const editCancel = document.getElementById("edit-cancel");
const editSave = document.getElementById("edit-save");
const editCloseX = document.getElementById("edit-close-x");

// Collection Modal
const collectionModal = document.getElementById("collection-modal");
const colNameInput = document.getElementById("col-name-input");
const colColorPicker = document.getElementById("col-color-picker");
const colModalCancel = document.getElementById("col-modal-cancel");
const colModalSave = document.getElementById("col-modal-save");
const colModalCloseX = document.getElementById("col-modal-close-x");

// Container Modal
const containerModal = document.getElementById("container-modal");
const contParentColSelect = document.getElementById("cont-parent-col-select");
const containerNameInput = document.getElementById("container-name-input");
const containerDescInput = document.getElementById("container-desc-input");
const contColorPicker = document.getElementById("cont-color-picker");
const containerModalCancel = document.getElementById("container-modal-cancel");
const containerModalSave = document.getElementById("container-modal-save");
const contModalCloseX = document.getElementById("cont-modal-close-x");

// Auth Modal
const authModal = document.getElementById("auth-modal");
const authModalTitle = document.getElementById("auth-modal-title");
const authCloseX = document.getElementById("auth-close-x");
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

// ── Lifecycle ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  setupEventListeners();
  checkAuthStatus();
  autoSyncBackground();
  await populateActiveTabPreview();
});

async function loadState() {
  const state = await SyncService.ensureInitializedAndMigrated();
  collections = state.collections || [];
  containers = state.containers || [];
  allItems = state.items || [];

  const stored = await chrome.storage.local.get(["activeCollectionId", "activeContainerId"]);
  if (stored.activeCollectionId) activeCollectionId = stored.activeCollectionId;
  if (stored.activeContainerId) activeContainerId = stored.activeContainerId;

  // Validate active container still exists
  if (activeContainerId !== "all" && !containers.some((c) => c.id === activeContainerId)) {
    activeContainerId = "all";
  }
  if (activeCollectionId !== "all" && !collections.some((c) => c.id === activeCollectionId)) {
    activeCollectionId = "all";
  }

  updateVaultCounters();
  populateSaveDestinationSelects();
  populateVaultBoxFilter();
  renderItems();
}

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
      collections = res.collections || [];
      containers = res.containers || [];
      allItems = res.items || [];
      updateVaultCounters();
      populateSaveDestinationSelects();
      populateVaultBoxFilter();
      renderItems();
    }
  } catch (err) {
    console.warn("Auto-sync background check:", err);
  }
}

function updateVaultCounters() {
  const total = allItems.length;
  if (tabVaultCount) tabVaultCount.textContent = total;
  if (footerItemCount) footerItemCount.textContent = `${total} ${total === 1 ? "item" : "items"} in vault`;
}

// ── Event Listeners ──
function setupEventListeners() {
  // Segmented Tabs
  if (tabSavePage && tabRecentVault) {
    tabSavePage.addEventListener("click", () => switchToTab("save"));
    tabRecentVault.addEventListener("click", () => switchToTab("vault"));
  }

  // Active Tab Save Action
  if (btnSaveCurrentPage) {
    btnSaveCurrentPage.addEventListener("click", handleSaveCurrentTab);
  }

  // Quick Paste
  if (btnPasteClipboard) {
    btnPasteClipboard.addEventListener("click", handleQuickPaste);
  }

  // Destination selects in Save Page tab
  if (saveColSelect) {
    saveColSelect.addEventListener("change", () => {
      populateContainerSelect(saveContSelect, saveColSelect.value);
    });
  }
  if (btnQuickNewCol) {
    btnQuickNewCol.addEventListener("click", openCollectionModal);
  }
  if (btnQuickNewCont) {
    btnQuickNewCont.addEventListener("click", () => {
      openContainerModal();
      if (saveColSelect && saveColSelect.value) {
        contParentColSelect.value = saveColSelect.value;
      }
    });
  }

  // Recent Vault: Search
  if (vaultSearchInput) {
    vaultSearchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (vaultSearchClear) vaultSearchClear.classList.toggle("hidden", searchQuery.length === 0);
      renderItems();
    });
  }
  if (vaultSearchClear) {
    vaultSearchClear.addEventListener("click", () => {
      vaultSearchInput.value = "";
      searchQuery = "";
      vaultSearchClear.classList.add("hidden");
      renderItems();
    });
  }

  // Recent Vault: Box filter dropdown
  if (vaultBoxFilter) {
    vaultBoxFilter.addEventListener("change", (e) => {
      activeVaultBoxId = e.target.value;
      renderItems();
    });
  }

  // Recent Vault: Type filter chips
  typeFilterChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeFilterChips.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderItems();
    });
  });

  // Header Actions
  if (btnDashboard) {
    btnDashboard.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
  }
  if (btnAdd) {
    btnAdd.addEventListener("click", openAddModal);
  }
  if (btnMenu) {
    btnMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("hidden");
    });
  }
  document.addEventListener("click", (e) => {
    if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== btnMenu) {
      dropdownMenu.classList.add("hidden");
    }
  });

  // Dropdown Menu Items
  if (menuAddCollection) {
    menuAddCollection.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      openCollectionModal();
    });
  }
  if (menuAddContainer) {
    menuAddContainer.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      openContainerModal();
    });
  }
  if (menuAuth) {
    menuAuth.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      openAuthModal();
    });
  }
  if (menuExport) menuExport.addEventListener("click", handleExport);
  if (menuImport) {
    menuImport.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      importFile.click();
    });
  }
  if (importFile) importFile.addEventListener("change", handleImport);
  if (menuClear) menuClear.addEventListener("click", handleClearAll);

  // Add Item Modal
  if (modalCloseX) modalCloseX.addEventListener("click", closeAddModal);
  if (modalCancel) modalCancel.addEventListener("click", closeAddModal);
  if (modalSave) modalSave.addEventListener("click", handleSaveNewItem);
  if (addColSelect) {
    addColSelect.addEventListener("change", () => {
      populateContainerSelect(addContSelect, addColSelect.value);
    });
  }

  // Edit Item Modal
  if (editCloseX) editCloseX.addEventListener("click", closeEditModal);
  if (editCancel) editCancel.addEventListener("click", closeEditModal);
  if (editSave) editSave.addEventListener("click", handleSaveEditItem);
  if (editColSelect) {
    editColSelect.addEventListener("change", () => {
      populateContainerSelect(editContSelect, editColSelect.value);
    });
  }

  // Collection Modal
  if (colModalCloseX) colModalCloseX.addEventListener("click", closeCollectionModal);
  if (colModalCancel) colModalCancel.addEventListener("click", closeCollectionModal);
  if (colModalSave) colModalSave.addEventListener("click", handleCreateCollection);
  if (colColorPicker) {
    colColorPicker.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        colColorPicker.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        selectedColColor = swatch.dataset.color;
      });
    });
  }

  // Container Modal
  if (contModalCloseX) contModalCloseX.addEventListener("click", closeContainerModal);
  if (containerModalCancel) containerModalCancel.addEventListener("click", closeContainerModal);
  if (containerModalSave) containerModalSave.addEventListener("click", handleCreateContainer);
  if (contColorPicker) {
    contColorPicker.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        contColorPicker.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        selectedContColor = swatch.dataset.color;
      });
    });
  }

  // Auth Modal
  if (authCloseX) authCloseX.addEventListener("click", closeAuthModal);
  if (authModalCancel) authModalCancel.addEventListener("click", closeAuthModal);
  if (authToggleMode) authToggleMode.addEventListener("click", toggleAuthMode);
  if (authSubmitBtn) authSubmitBtn.addEventListener("click", handleAuthSubmit);
  if (btnSyncNow) btnSyncNow.addEventListener("click", handleManualSync);
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);
}

// ── Tab Switching ──
function switchToTab(tabName) {
  if (tabName === "save") {
    tabSavePage.classList.add("active");
    tabRecentVault.classList.remove("active");
    viewSavePage.classList.remove("hidden");
    viewRecentVault.classList.add("hidden");
    populateActiveTabPreview();
  } else {
    tabRecentVault.classList.add("active");
    tabSavePage.classList.remove("active");
    viewRecentVault.classList.remove("hidden");
    viewSavePage.classList.add("hidden");
    populateVaultBoxFilter();
    renderItems();
  }
}

// ── Screen A: Detect & Populate Active Browser Tab ──
async function populateActiveTabPreview() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;
    const tab = tabs[0];
    const url = tab.url || "";
    const title = tab.title || "";

    currentTabInfo = {
      title,
      url,
      favIconUrl: tab.favIconUrl || "",
    };

    if (savePageTitle) savePageTitle.value = title;
    if (savePageUrl) {
      savePageUrl.textContent = url || "Browser system page";
      savePageUrl.title = url;
    }

    // Auto classify type chip
    const classification = classifyContent(url);
    if (savePageTypeChip) {
      savePageTypeChip.textContent = classification.type.toUpperCase();
      savePageTypeChip.className = `tab-type-chip type-${classification.type}`;
    }

    // Check if current tab is already saved
    const existing = allItems.find((i) => i.sourceUrl === url || i.content === url);
    if (existing) {
      if (btnSaveText) btnSaveText.textContent = "Update Saved Page";
      if (saveNoteInput) saveNoteInput.value = existing.note || "";
      if (saveTagsInput) saveTagsInput.value = (existing.tags || []).join(", ");
      if (existing.collectionId && saveColSelect) {
        saveColSelect.value = existing.collectionId;
        populateContainerSelect(saveContSelect, existing.collectionId, existing.containerId);
      }
    } else {
      if (btnSaveText) btnSaveText.textContent = "Save Page to Vault";
    }

    if (footerStatusText) {
      footerStatusText.textContent = existing ? "Saved in Vault" : "Ready to Save";
    }
  } catch (err) {
    console.warn("Could not query active tab:", err);
    if (savePageUrl) savePageUrl.textContent = "Unable to read active tab";
  }
}

// ── Screen A: Save Current Tab ──
async function handleSaveCurrentTab() {
  const url = currentTabInfo?.url || (savePageUrl ? savePageUrl.textContent : "");
  if (!url || url.startsWith("chrome://") || url.startsWith("edge://")) {
    showToast("Cannot clip browser internal pages");
    return;
  }

  // Ensure user has at least one collection & container
  if (collections.length === 0) {
    const defaultCol = {
      id: "col_" + generateId(),
      name: "General",
      color: "#4F46E5",
      createdAt: Date.now(),
      order: 0,
    };
    collections.push(defaultCol);
    const defaultCont = {
      id: "cont_" + generateId(),
      collectionId: defaultCol.id,
      name: "Quick Saves",
      icon: "archive",
      color: "#2563EB",
      description: "Default storage box",
      createdAt: Date.now(),
      order: 0,
    };
    containers.push(defaultCont);
    await chrome.storage.local.set({ collections, containers });
    populateSaveDestinationSelects();
  }

  let colId = saveColSelect ? saveColSelect.value : collections[0]?.id;
  let contId = saveContSelect ? saveContSelect.value : containers[0]?.id;

  if (!colId && collections.length > 0) colId = collections[0].id;
  if (!contId && containers.length > 0) {
    const matched = containers.find((c) => c.collectionId === colId);
    contId = matched ? matched.id : containers[0].id;
  }

  const title = savePageTitle ? savePageTitle.value.trim() : (currentTabInfo?.title || "");
  const note = saveNoteInput ? saveNoteInput.value.trim() : "";
  const rawTags = saveTagsInput ? saveTagsInput.value : "";
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const classification = classifyContent(url);
  const existingIndex = allItems.findIndex((i) => i.sourceUrl === url || i.content === url);

  const targetBox = containers.find((c) => c.id === contId);
  const boxName = targetBox ? targetBox.name : "Storage Box";

  if (existingIndex !== -1) {
    // Update existing item
    allItems[existingIndex] = {
      ...allItems[existingIndex],
      title: title || allItems[existingIndex].title,
      note,
      tags,
      collectionId: colId,
      containerId: contId,
      updatedAt: Date.now(),
    };
    showToast(`Updated in 📦 ${boxName}!`);
  } else {
    // Create new item
    const newItem = {
      id: generateId(),
      type: classification.type,
      title: title || classification.title || "Saved Web Page",
      content: url,
      note,
      containerId: contId,
      collectionId: colId,
      previewImage: classification.thumbnail || "",
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: url,
      sourceTitle: title,
      tags,
      favorite: false,
      createdAt: Date.now(),
    };
    allItems.unshift(newItem);
    showToast(`Saved to 📦 ${boxName}!`);
  }

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  updateVaultCounters();
  populateVaultBoxFilter();
  renderItems();

  // Switch to Recent Vault tab to show the new card immediately
  switchToTab("vault");
}

// ── Destination Select Helpers ──
function populateSaveDestinationSelects() {
  if (!saveColSelect) return;
  populateCollectionSelect(saveColSelect, activeCollectionId !== "all" ? activeCollectionId : collections[0]?.id);
  populateContainerSelect(saveContSelect, saveColSelect.value, activeContainerId !== "all" ? activeContainerId : undefined);
}

function populateVaultBoxFilter() {
  if (!vaultBoxFilter) return;
  const currentVal = activeVaultBoxId || "all";
  vaultBoxFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = `All Boxes (${allItems.length}) ▾`;
  if (currentVal === "all") allOpt.selected = true;
  vaultBoxFilter.appendChild(allOpt);

  containers.forEach((cont) => {
    const count = allItems.filter((i) => i.containerId === cont.id).length;
    const opt = document.createElement("option");
    opt.value = cont.id;
    opt.textContent = `📦 ${cont.name} (${count})`;
    if (cont.id === currentVal) opt.selected = true;
    vaultBoxFilter.appendChild(opt);
  });
}

function populateCollectionSelect(selectEl, selectedColId) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  if (collections.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(No collections created)";
    selectEl.appendChild(opt);
    return;
  }
  collections.forEach((col) => {
    const opt = document.createElement("option");
    opt.value = col.id;
    opt.textContent = `📁 ${col.name}`;
    if (col.id === selectedColId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function populateContainerSelect(selectEl, colId, selectedContId) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const matching = containers.filter((c) => c.collectionId === colId);
  if (matching.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(No boxes in this folder)";
    selectEl.appendChild(opt);
    return;
  }

  matching.forEach((cont) => {
    const opt = document.createElement("option");
    opt.value = cont.id;
    opt.textContent = `📦 ${cont.name}`;
    if (cont.id === selectedContId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ── Screen B: Render Items (Cards Feed) ──
function renderItems() {
  if (!itemsContainer) return;
  let filtered = [...allItems];

  // Box filter dropdown
  if (activeVaultBoxId && activeVaultBoxId !== "all") {
    filtered = filtered.filter((i) => i.containerId === activeVaultBoxId);
  }

  // Type filter
  if (currentFilter === "quote") {
    filtered = filtered.filter((i) => i.type === "quote");
  } else if (currentFilter === "link") {
    filtered = filtered.filter((i) => i.type === "link" || i.type === "product" || i.type === "social");
  } else if (currentFilter === "media") {
    filtered = filtered.filter((i) => i.type === "youtube" || i.type === "image");
  } else if (currentFilter === "favorite") {
    filtered = filtered.filter((i) => i.favorite);
  }

  // Search query filter
  if (searchQuery) {
    filtered = filtered.filter((i) => {
      const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
      const contentMatch = (i.content || "").toLowerCase().includes(searchQuery);
      const noteMatch = (i.note || "").toLowerCase().includes(searchQuery);
      const tagMatch = (i.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
      const sourceMatch = (i.sourceTitle || i.sourceUrl || "").toLowerCase().includes(searchQuery);
      return titleMatch || contentMatch || noteMatch || tagMatch || sourceMatch;
    });
  }

  // Empty state check
  if (filtered.length === 0) {
    itemsContainer.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  // Render cards
  itemsContainer.innerHTML = "";
  filtered.forEach((item) => {
    const card = createItemCard(item);
    itemsContainer.appendChild(card);
  });
}

// ── Card Builder Factory ──
function createItemCard(item) {
  const card = document.createElement("div");
  card.className = `item-card type-${item.type || "text"}`;
  card.dataset.id = item.id;

  const parentCol = collections.find((c) => c.id === item.collectionId);
  const parentCont = containers.find((c) => c.id === item.containerId);
  const colName = parentCol ? parentCol.name : "Folder";
  const contName = parentCont ? parentCont.name : "Storage Box";

  const typeIcons = {
    youtube: "🎬 YouTube",
    quote: "💬 Quote",
    image: "🖼️ Image",
    product: "🛍️ Product",
    social: "📱 Social",
    link: "🔗 Link",
    text: "📝 Note",
  };
  const typeLabel = typeIcons[item.type] || "📄 Clip";
  const timeStr = formatRelativeTime(item.createdAt);
  const targetUrl = item.sourceUrl || (item.content.startsWith("http") ? item.content : "");

  let cardHtml = `
    <div class="card-top-row">
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="card-type-chip ${item.type || "text"}">${typeLabel}</span>
        <span class="card-hierarchy-tag" title="📁 ${escapeHTML(colName)} › 📦 ${escapeHTML(contName)}">
          📦 ${escapeHTML(contName)}
        </span>
      </div>
      <div class="card-actions-quick">
        <button class="card-action-btn fav-btn ${item.favorite ? "active" : ""}" title="${item.favorite ? "Unfavorite" : "Favorite"}">
          <svg viewBox="0 0 24 24" fill="${item.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="card-action-btn copy-btn" title="Copy Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="card-action-btn edit-btn" title="Edit Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="card-action-btn delete-btn" title="Delete Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;

  // Title
  if (item.title && item.title.trim()) {
    cardHtml += `<div class="card-title">${escapeHTML(item.title)}</div>`;
  }

  // Type specific content
  if (item.type === "youtube") {
    const thumb = item.previewImage || (item.metadata?.videoId ? `https://img.youtube.com/vi/${item.metadata.videoId}/hqdefault.jpg` : "");
    if (thumb) {
      cardHtml += `
        <div class="card-media-banner">
          <img src="${thumb}" alt="YouTube Preview" loading="lazy" />
          <div class="play-overlay-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      `;
    }
  } else if (item.type === "image") {
    const imgSrc = item.previewImage || item.content;
    cardHtml += `
      <div class="card-image-box">
        <img src="${escapeHTML(imgSrc)}" alt="Saved Image" loading="lazy" />
      </div>
    `;
  } else if (item.type === "quote") {
    cardHtml += `<div class="card-quote-body">“${escapeHTML(item.content)}”</div>`;
  } else {
    // Normal text or link snippet
    cardHtml += `<div class="card-content-text">${escapeHTML(item.content)}</div>`;
  }

  // Mini Swayed Yellow Sticky Note Memo
  if (item.note && item.note.trim()) {
    cardHtml += `
      <div class="card-sticky-memo">
        <span class="sticky-icon">📌</span>
        <span class="sticky-text">${escapeHTML(item.note)}</span>
      </div>
    `;
  }

  // Tags
  if (item.tags && item.tags.length > 0) {
    cardHtml += `
      <div class="card-tags">
        ${item.tags.map((t) => `<span class="tag-badge">#${escapeHTML(t)}</span>`).join("")}
      </div>
    `;
  }

  // Bottom Row: Source & Timestamp
  cardHtml += `
    <div class="card-source-row">
      ${
        targetUrl
          ? `<a href="${escapeHTML(targetUrl)}" target="_blank" class="card-source-link" title="${escapeHTML(targetUrl)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>${escapeHTML(extractHostname(targetUrl))}</span>
            </a>`
          : `<span></span>`
      }
      <span class="card-time">${timeStr}</span>
    </div>
  `;

  card.innerHTML = cardHtml;

  // Event handlers
  const favBtn = card.querySelector(".fav-btn");
  if (favBtn) favBtn.addEventListener("click", () => toggleFavorite(item.id));

  const copyBtn = card.querySelector(".copy-btn");
  if (copyBtn) copyBtn.addEventListener("click", () => copyToClipboard(item.content));

  const editBtn = card.querySelector(".edit-btn");
  if (editBtn) editBtn.addEventListener("click", () => openEditModal(item));

  const deleteBtn = card.querySelector(".delete-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", () => deleteItem(item.id));

  const mediaBanner = card.querySelector(".card-media-banner, .card-image-box");
  if (mediaBanner && targetUrl) {
    mediaBanner.style.cursor = "pointer";
    mediaBanner.addEventListener("click", () => chrome.tabs.create({ url: targetUrl }));
  }

  return card;
}

// ── Quick Paste Handler ──
async function handleQuickPaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      showToast("Clipboard is empty!");
      return;
    }

    // Default target
    if (collections.length === 0) {
      await handleSaveCurrentTab();
    }
    const targetCol = collections[0];
    const targetCont = containers.find((c) => c.collectionId === targetCol.id) || containers[0];

    const classification = classifyContent(text.trim());
    const newItem = {
      id: generateId(),
      type: classification.type,
      title: classification.type === "youtube" ? "YouTube Video" : classification.type === "quote" ? "Saved Quote" : "",
      content: text.trim(),
      containerId: targetCont.id,
      collectionId: targetCol.id,
      previewImage: classification.thumbnail || (classification.type === "image" ? text.trim() : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: text.trim().startsWith("http") ? text.trim() : "",
      sourceTitle: "",
      tags: [],
      favorite: false,
      createdAt: Date.now(),
    };

    allItems.unshift(newItem);
    await chrome.storage.local.set({ items: allItems });
    SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

    updateVaultCounters();
    populateVaultBoxFilter();
    renderItems();
    switchToTab("vault");
    showToast(`Saved to 📦 ${targetCont.name}`);
  } catch (err) {
    showToast("Clipboard access denied. Use ⌘+V");
  }
}

// ── Add Item Modal Logic ──
function openAddModal() {
  if (collections.length === 0) {
    showToast("Please create a collection folder first");
    openCollectionModal();
    return;
  }
  if (containers.length === 0) {
    showToast("Please create a storage box first");
    openContainerModal();
    return;
  }

  populateCollectionSelect(addColSelect, activeCollectionId !== "all" ? activeCollectionId : collections[0]?.id);
  populateContainerSelect(addContSelect, addColSelect.value, activeContainerId !== "all" ? activeContainerId : undefined);
  addTitle.value = "";
  addContent.value = "";
  if (addNote) addNote.value = "";
  addTags.value = "";
  addModal.classList.remove("hidden");
  addContent.focus();
}

function closeAddModal() {
  addModal.classList.add("hidden");
}

async function handleSaveNewItem() {
  const content = addContent.value.trim();
  if (!content) {
    addContent.focus();
    return;
  }

  const colId = addColSelect.value;
  const contId = addContSelect.value;
  const title = addTitle.value.trim();
  const note = addNote ? addNote.value.trim() : "";
  const tags = addTags.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const classification = classifyContent(content);

  const newItem = {
    id: generateId(),
    type: classification.type,
    title: title || (classification.type === "youtube" ? "Saved YouTube" : ""),
    content,
    note,
    containerId: contId,
    collectionId: colId,
    previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
    metadata: classification.videoId ? { videoId: classification.videoId } : {},
    sourceUrl: content.startsWith("http") ? content : "",
    tags,
    favorite: false,
    createdAt: Date.now(),
  };

  allItems.unshift(newItem);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeAddModal();
  updateVaultCounters();
  populateVaultBoxFilter();
  renderItems();
  switchToTab("vault");
  showToast("Item saved!");
}

// ── Edit Item Modal Logic ──
function openEditModal(item) {
  editingItemId = item.id;
  populateCollectionSelect(editColSelect, item.collectionId);
  populateContainerSelect(editContSelect, item.collectionId, item.containerId);
  editTitle.value = item.title || "";
  editContent.value = item.content || "";
  if (editNote) editNote.value = item.note || "";
  editTags.value = (item.tags || []).join(", ");
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editingItemId = null;
}

async function handleSaveEditItem() {
  if (!editingItemId) return;
  const content = editContent.value.trim();
  if (!content) return;

  const itemIndex = allItems.findIndex((i) => i.id === editingItemId);
  if (itemIndex === -1) return;

  const colId = editColSelect.value;
  const contId = editContSelect.value;
  const title = editTitle.value.trim();
  const note = editNote ? editNote.value.trim() : "";
  const tags = editTags.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const classification = classifyContent(content);

  allItems[itemIndex] = {
    ...allItems[itemIndex],
    content,
    title,
    note,
    collectionId: colId,
    containerId: contId,
    tags,
    type: classification.type,
    previewImage: classification.thumbnail || (classification.type === "image" ? content : allItems[itemIndex].previewImage),
    updatedAt: Date.now(),
  };

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeEditModal();
  updateVaultCounters();
  populateVaultBoxFilter();
  renderItems();
  showToast("Item updated!");
}

// ── Collection Modal Logic ──
function openCollectionModal() {
  colNameInput.value = "";
  selectedColColor = "#4F46E5";
  collectionModal.classList.remove("hidden");
  colNameInput.focus();
}

function closeCollectionModal() {
  collectionModal.classList.add("hidden");
}

async function handleCreateCollection() {
  const name = colNameInput.value.trim();
  if (!name) return;

  const newCol = {
    id: "col_" + generateId(),
    name,
    color: selectedColColor,
    createdAt: Date.now(),
    order: collections.length,
  };

  collections.push(newCol);

  // Automatically create a default storage box inside this new collection
  const defaultCont = {
    id: "cont_" + generateId(),
    collectionId: newCol.id,
    name: "General",
    icon: "archive",
    description: "Default storage box for " + name,
    createdAt: Date.now(),
    order: 0,
  };
  containers.push(defaultCont);

  activeCollectionId = newCol.id;
  activeContainerId = defaultCont.id;

  await chrome.storage.local.set({
    collections,
    containers,
    activeCollectionId,
    activeContainerId,
  });

  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeCollectionModal();
  populateSaveDestinationSelects();
  populateVaultBoxFilter();
  renderItems();
  showToast(`Created Collection: 📁 ${name}`);
}

// ── Container Modal Logic ──
function openContainerModal() {
  populateCollectionSelect(contParentColSelect, activeCollectionId !== "all" ? activeCollectionId : collections[0]?.id);
  containerNameInput.value = "";
  containerDescInput.value = "";
  containerModal.classList.remove("hidden");
  containerNameInput.focus();
}

function closeContainerModal() {
  containerModal.classList.add("hidden");
}

async function handleCreateContainer() {
  const name = containerNameInput.value.trim();
  const parentColId = contParentColSelect.value;
  if (!name || !parentColId) return;

  const desc = containerDescInput.value.trim();
  const newCont = {
    id: "cont_" + generateId(),
    collectionId: parentColId,
    name,
    icon: "archive",
    color: selectedContColor || "#2563EB",
    note: desc,
    description: desc,
    createdAt: Date.now(),
    order: containers.length,
  };

  containers.push(newCont);
  activeCollectionId = parentColId;
  activeContainerId = newCont.id;

  await chrome.storage.local.set({
    containers,
    activeCollectionId,
    activeContainerId,
    lastActiveContainer: newCont.id,
  });

  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeContainerModal();
  populateSaveDestinationSelects();
  populateVaultBoxFilter();
  renderItems();
  showToast(`Created Box: 📦 ${name}`);
}

// ── Item Actions (Fav, Copy, Delete) ──
async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  renderItems();
  showToast(item.favorite ? "Added to Favorites ★" : "Removed from Favorites");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch (err) {
    showToast("Failed to copy");
  }
}

async function deleteItem(id) {
  allItems = allItems.filter((i) => i.id !== id);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  updateVaultCounters();
  populateVaultBoxFilter();
  renderItems();
  showToast("Item deleted");
}

// ── Export / Import / Clear ──
function handleExport() {
  dropdownMenu.classList.add("hidden");
  const data = {
    collections,
    containers,
    items: allItems,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saveit-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported vault backup!");
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let importedItems = Array.isArray(data) ? data : data.items || [];
    let importedContainers = data.containers || [];
    let importedCollections = data.collections || [];

    const colMap = new Map();
    collections.forEach((c) => colMap.set(c.id, c));
    importedCollections.forEach((c) => { if (c && c.id && !colMap.has(c.id)) colMap.set(c.id, c); });

    const contMap = new Map();
    containers.forEach((c) => contMap.set(c.id, c));
    importedContainers.forEach((c) => { if (c && c.id && !contMap.has(c.id)) contMap.set(c.id, c); });

    const itemMap = new Map();
    allItems.forEach((i) => itemMap.set(i.id, i));
    importedItems.forEach((i) => { if (i && i.id && !itemMap.has(i.id)) itemMap.set(i.id, i); });

    collections = Array.from(colMap.values());
    containers = Array.from(contMap.values());
    allItems = Array.from(itemMap.values());

    await chrome.storage.local.set({ collections, containers, items: allItems });
    await SyncService.ensureInitializedAndMigrated();
    SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

    updateVaultCounters();
    populateSaveDestinationSelects();
    populateVaultBoxFilter();
    renderItems();
    showToast(`Imported ${importedItems.length} items!`);
  } catch (err) {
    showToast("Failed to parse backup file");
  }
}

async function handleClearAll() {
  dropdownMenu.classList.add("hidden");
  if (!confirm("Are you sure you want to clear all saved items? Collections and storage boxes will be kept.")) return;

  allItems = [];
  await chrome.storage.local.set({ items: [] });
  SyncService.pushToCloud([], containers, collections).catch(() => {});
  updateVaultCounters();
  populateVaultBoxFilter();
  renderItems();
  showToast("All items cleared");
}

// ── Auth Modal Logic ──
async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session) {
    if (footerStatusText) footerStatusText.textContent = "Synced with Cloud";
  } else {
    if (footerStatusText) footerStatusText.textContent = "Offline Ready";
  }
}

async function openAuthModal() {
  const session = await SyncService.getUser();
  if (session) {
    authLoggedInView.classList.remove("hidden");
    authLoggedOutView.classList.add("hidden");
    authUserEmail.textContent = session.user.email;
    authModalTitle.textContent = "Cloud Account";
  } else {
    authLoggedInView.classList.add("hidden");
    authLoggedOutView.classList.remove("hidden");
    authModalTitle.textContent = authIsSignUp ? "Create Account" : "Log In to Sync";
  }
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function toggleAuthMode(e) {
  e.preventDefault();
  authIsSignUp = !authIsSignUp;
  authModalTitle.textContent = authIsSignUp ? "Create Account" : "Log In to Sync";
  authSubmitBtn.textContent = authIsSignUp ? "Sign Up" : "Log In";
  authModeText.innerHTML = authIsSignUp
    ? 'Already have an account? <a href="#" id="auth-toggle-mode">Log In</a>'
    : 'Don\'t have an account? <a href="#" id="auth-toggle-mode">Sign Up</a>';
  document.getElementById("auth-toggle-mode").addEventListener("click", toggleAuthMode);
}

async function handleAuthSubmit() {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();
  if (!email || !password) {
    showToast("Enter email and password");
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Connecting...";

  try {
    if (authIsSignUp) {
      await SyncService.signUp(email, password);
      showToast("Account created & synced!");
    } else {
      await SyncService.logIn(email, password);
      showToast("Logged in & syncing!");
    }
    await handleManualSync();
    closeAuthModal();
    checkAuthStatus();
  } catch (err) {
    showToast(err.message || "Authentication failed");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authIsSignUp ? "Sign Up" : "Log In";
  }
}

async function handleManualSync() {
  try {
    showToast("Syncing with cloud...");
    const res = await SyncService.syncNow();
    if (res) {
      collections = res.collections || [];
      containers = res.containers || [];
      allItems = res.items || [];
      updateVaultCounters();
      populateSaveDestinationSelects();
      populateVaultBoxFilter();
      renderItems();
      showToast("Vault synchronized!");
    }
  } catch (err) {
    showToast("Sync error: " + err.message);
  }
}

async function handleLogout() {
  await SyncService.logOut();
  closeAuthModal();
  checkAuthStatus();
  showToast("Logged out of cloud sync");
}

// ── Toast Utility ──
let toastTimer = null;
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

// ── Helpers ──
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Content Classifier Helper ──
function classifyContent(text) {
  if (!text) return { type: "text" };
  const str = text.trim();

  // YouTube
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch) {
    return {
      type: "youtube",
      videoId: ytMatch[1],
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }

  // Image URL
  if (str.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) {
    return { type: "image" };
  }

  // Product URLs
  if (str.match(/(amazon\.[a-z.]+|ebay\.[a-z.]+|etsy\.com|shopify\.com|aliexpress\.com|walmart\.com)/i)) {
    return { type: "product" };
  }

  // Social URLs
  if (str.match(/(twitter\.com|x\.com|reddit\.com|linkedin\.com|instagram\.com|threads\.net)/i)) {
    return { type: "social" };
  }

  // General URL
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return { type: "link" };
  }

  // Quote heuristic: starts and ends with quotation marks or contains quotation
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith('“') && str.endsWith('”'))) {
    return { type: "quote" };
  }

  return { type: "text" };
}
