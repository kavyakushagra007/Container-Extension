// ── SaveIt: Full Workspace Dashboard Controller ──

let collections = [];
let containers = [];
let allItems = [];

// Navigation & View state
let currentView = "all"; // "all" | "favorite" | "quote" | "media" | "link" | "collection" | "container"
let activeCollectionId = null;
let activeContainerId = null;
let expandedCollections = new Set();
let viewMode = "grid"; // "grid" | "list"
let sortMode = "newest";
let searchQuery = "";

let editingItemId = null;
let movingItemId = null;
let editingColId = null;
let editingContId = null;
let selectedColColor = "#4F46E5";
let authIsSignUp = false;

// ── DOM References ──
const sidebarCollectionsTree = document.getElementById("sidebar-collections-tree");
const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
const itemsGrid = document.getElementById("items-grid");
const emptyState = document.getElementById("empty-state");
const pageTitle = document.getElementById("page-title");
const pageDesc = document.getElementById("page-desc");
const dashBreadcrumbs = document.getElementById("dash-breadcrumbs");
const resultsCount = document.getElementById("results-count");
const searchInput = document.getElementById("search-input");
const btnClearSearch = document.getElementById("btn-clear-search");
const sortSelect = document.getElementById("sort-select");
const btnViewGrid = document.getElementById("btn-view-grid");
const btnViewList = document.getElementById("btn-view-list");

// Counts in sidebar
const countAll = document.getElementById("count-all");
const countFav = document.getElementById("count-fav");
const countQuote = document.getElementById("count-quote");
const countMedia = document.getElementById("count-media");
const countLink = document.getElementById("count-link");

// Header actions
const btnQuickAdd = document.getElementById("btn-quick-add");
const btnSidebarAddCol = document.getElementById("btn-sidebar-add-col");
const btnSidebarAddCont = document.getElementById("btn-sidebar-add-cont");
const btnAddItemDash = document.getElementById("btn-add-item-dash");
const btnEmptyAdd = document.getElementById("btn-empty-add");
const btnExportDash = document.getElementById("btn-export-dash");
const btnImportDash = document.getElementById("btn-import-dash");
const importFile = document.getElementById("import-file");

// User card & auth
const userStatusCard = document.getElementById("user-status-card");
const userDisplayEmail = document.getElementById("user-display-email");
const userSyncStatus = document.getElementById("user-sync-status");
const btnOpenAuthModal = document.getElementById("btn-open-auth-modal");

// Item Modal
const itemModal = document.getElementById("item-modal");
const itemModalTitle = document.getElementById("item-modal-title");
const itemModalClose = document.getElementById("item-modal-close");
const itemModalCancel = document.getElementById("item-modal-cancel");
const itemModalSave = document.getElementById("item-modal-save");
const modalColSelect = document.getElementById("modal-col-select");
const modalContSelect = document.getElementById("modal-cont-select");
const modalItemTitle = document.getElementById("modal-item-title");
const modalItemContent = document.getElementById("modal-item-content");
const modalItemSource = document.getElementById("modal-item-source");
const modalItemTags = document.getElementById("modal-item-tags");

// Collection Modal
const colModal = document.getElementById("col-modal");
const colModalTitle = document.getElementById("col-modal-title");
const colModalClose = document.getElementById("col-modal-close");
const colModalCancel = document.getElementById("col-modal-cancel");
const colModalSave = document.getElementById("col-modal-save");
const dashColName = document.getElementById("dash-col-name");
const dashColColors = document.getElementById("dash-col-colors");

// Container Modal
const contModal = document.getElementById("cont-modal");
const contModalTitle = document.getElementById("cont-modal-title");
const contModalClose = document.getElementById("cont-modal-close");
const contModalCancel = document.getElementById("cont-modal-cancel");
const contModalSave = document.getElementById("cont-modal-save");
const dashContParentCol = document.getElementById("dash-cont-parent-col");
const dashContName = document.getElementById("dash-cont-name");
const dashContDesc = document.getElementById("dash-cont-desc");

// Move Modal
const moveModal = document.getElementById("move-modal");
const moveModalClose = document.getElementById("move-modal-close");
const moveModalCancel = document.getElementById("move-modal-cancel");
const moveModalConfirm = document.getElementById("move-modal-confirm");
const moveColSelect = document.getElementById("move-col-select");
const moveContSelect = document.getElementById("move-cont-select");

// Auth Modal
const authModal = document.getElementById("auth-modal");
const authModalTitle = document.getElementById("auth-modal-title");
const authModalClose = document.getElementById("auth-modal-close");
const authModalCancel = document.getElementById("auth-modal-cancel");
const authLoggedInView = document.getElementById("auth-logged-in-view");
const authLoggedOutView = document.getElementById("auth-logged-out-view");
const authUserEmail = document.getElementById("auth-user-email");
const authEmailInput = document.getElementById("auth-email-input");
const authPasswordInput = document.getElementById("auth-password-input");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleMode = document.getElementById("auth-toggle-mode");
const authModeText = document.getElementById("auth-mode-text");
const btnSyncNow = document.getElementById("btn-sync-now");
const btnLogout = document.getElementById("btn-logout");

const toast = document.getElementById("toast");

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  setupEventListeners();
  checkAuthStatus();
  autoSyncBackground();
});

async function loadState() {
  const state = await SyncService.ensureInitializedAndMigrated();
  collections = state.collections || [];
  containers = state.containers || [];
  allItems = state.items || [];

  // Expand all collections by default in tree
  collections.forEach((c) => expandedCollections.add(c.id));

  renderSidebarTree();
  updateSidebarCounts();
  renderHeaderMeta();
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
      renderSidebarTree();
      updateSidebarCounts();
      renderHeaderMeta();
      renderItems();
    }
  } catch (err) {
    console.warn("Dashboard sync check:", err);
  }
}

// ── Setup Listeners ──
function setupEventListeners() {
  // System views
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      navItems.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      activeCollectionId = null;
      activeContainerId = null;

      // Deselect collection/container in tree
      document.querySelectorAll(".col-header-row, .cont-item-row").forEach((el) => el.classList.remove("active"));

      renderHeaderMeta();
      renderItems();
    });
  });

  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    btnClearSearch.classList.toggle("hidden", searchQuery.length === 0);
    renderItems();
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    btnClearSearch.classList.add("hidden");
    renderItems();
  });

  // Hotkey: '/' to search, 'Escape' to close modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput && !isModalOpen()) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Escape") {
      closeAllModals();
    }
  });

  // Sort
  sortSelect.addEventListener("change", (e) => {
    sortMode = e.target.value;
    renderItems();
  });

  // View toggle
  btnViewGrid.addEventListener("click", () => {
    viewMode = "grid";
    btnViewGrid.classList.add("active");
    btnViewList.classList.remove("active");
    itemsGrid.className = "items-grid view-mode-grid";
    renderItems();
  });

  btnViewList.addEventListener("click", () => {
    viewMode = "list";
    btnViewList.classList.add("active");
    btnViewGrid.classList.remove("active");
    itemsGrid.className = "items-grid view-mode-list";
    renderItems();
  });

  // Quick Action Buttons
  btnQuickAdd.addEventListener("click", () => openItemModal());
  btnAddItemDash.addEventListener("click", () => openItemModal());
  btnEmptyAdd.addEventListener("click", () => openItemModal());
  btnSidebarAddCol.addEventListener("click", () => openColModal());
  btnSidebarAddCont.addEventListener("click", () => openContModal());

  // Export / Import
  btnExportDash.addEventListener("click", handleExport);
  btnImportDash.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", handleImport);

  // Item Modal Events
  itemModalClose.addEventListener("click", closeItemModal);
  itemModalCancel.addEventListener("click", closeItemModal);
  itemModalSave.addEventListener("click", handleSaveItemModal);
  modalColSelect.addEventListener("change", () => {
    populateContainerSelect(modalContSelect, modalColSelect.value);
  });

  // Collection Modal Events
  colModalClose.addEventListener("click", closeColModal);
  colModalCancel.addEventListener("click", closeColModal);
  colModalSave.addEventListener("click", handleSaveColModal);
  dashColColors.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      dashColColors.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      selectedColColor = swatch.dataset.color;
    });
  });

  // Container Modal Events
  contModalClose.addEventListener("click", closeContModal);
  contModalCancel.addEventListener("click", closeContModal);
  contModalSave.addEventListener("click", handleSaveContModal);

  // Move Modal Events
  moveModalClose.addEventListener("click", closeMoveModal);
  moveModalCancel.addEventListener("click", closeMoveModal);
  moveModalConfirm.addEventListener("click", handleConfirmMove);
  moveColSelect.addEventListener("change", () => {
    populateContainerSelect(moveContSelect, moveColSelect.value);
  });

  // Auth Modal Events
  btnOpenAuthModal.addEventListener("click", openAuthModal);
  userStatusCard.addEventListener("click", openAuthModal);
  authModalClose.addEventListener("click", closeAuthModal);
  authModalCancel.addEventListener("click", closeAuthModal);
  authToggleMode.addEventListener("click", toggleAuthMode);
  authSubmitBtn.addEventListener("click", handleAuthSubmit);
  btnSyncNow.addEventListener("click", handleManualSync);
  btnLogout.addEventListener("click", handleLogout);
}

// ── Render Sidebar Collections & Containers Tree ──
function renderSidebarTree() {
  sidebarCollectionsTree.innerHTML = "";

  collections.forEach((col) => {
    const colNode = document.createElement("div");
    colNode.className = `col-tree-node ${expandedCollections.has(col.id) ? "expanded" : ""}`;

    const childContainers = containers.filter((c) => c.collectionId === col.id);
    const colItemCount = allItems.filter((i) => i.collectionId === col.id).length;
    const isColActive = currentView === "collection" && activeCollectionId === col.id;

    // Collection Header Row
    const headerRow = document.createElement("div");
    headerRow.className = `col-header-row ${isColActive ? "active" : ""}`;
    headerRow.innerHTML = `
      <div class="col-header-left">
        <svg class="col-toggle-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span class="col-symbol" style="color: ${col.color || "#4F46E5"}">📁</span>
        <span class="col-name" title="${escapeHTML(col.name)}">${escapeHTML(col.name)}</span>
      </div>
      <div class="col-header-right">
        <span class="col-count">${colItemCount}</span>
        <button class="col-action-trigger" title="Collection Actions">⋯</button>
      </div>
    `;

    // Click caret toggles expansion
    const caret = headerRow.querySelector(".col-toggle-caret");
    caret.addEventListener("click", (e) => {
      e.stopPropagation();
      if (expandedCollections.has(col.id)) {
        expandedCollections.delete(col.id);
      } else {
        expandedCollections.add(col.id);
      }
      renderSidebarTree();
    });

    // Click header selects collection view
    headerRow.addEventListener("click", () => {
      navItems.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".col-header-row, .cont-item-row").forEach((el) => el.classList.remove("active"));
      headerRow.classList.add("active");

      currentView = "collection";
      activeCollectionId = col.id;
      activeContainerId = null;

      renderHeaderMeta();
      renderItems();
    });

    // Collection Options (Edit/Delete)
    const actionTrigger = headerRow.querySelector(".col-action-trigger");
    actionTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      openColContextMenu(e, col);
    });

    colNode.appendChild(headerRow);

    // Sublist of Containers
    const sublist = document.createElement("div");
    sublist.className = "col-containers-sublist";

    childContainers.forEach((cont) => {
      const contCount = allItems.filter((i) => i.containerId === cont.id).length;
      const isContActive = currentView === "container" && activeContainerId === cont.id;

      const contRow = document.createElement("div");
      contRow.className = `cont-item-row ${isContActive ? "active" : ""}`;
      contRow.innerHTML = `
        <div class="cont-item-left">
          <span class="cont-symbol">🗄️</span>
          <span class="cont-name" title="${escapeHTML(cont.name)}">${escapeHTML(cont.name)}</span>
        </div>
        <div class="cont-actions">
          <span class="cont-count">${contCount}</span>
          <button class="btn-cont-action edit-cont" title="Edit Container">✏️</button>
          <button class="btn-cont-action del-cont" title="Delete Container">🗑️</button>
        </div>
      `;

      contRow.addEventListener("click", () => {
        navItems.forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".col-header-row, .cont-item-row").forEach((el) => el.classList.remove("active"));
        contRow.classList.add("active");

        currentView = "container";
        activeCollectionId = col.id;
        activeContainerId = cont.id;

        // Remember as last active container
        chrome.storage.local.set({ lastActiveContainer: cont.id });

        renderHeaderMeta();
        renderItems();
      });

      contRow.querySelector(".edit-cont").addEventListener("click", (e) => {
        e.stopPropagation();
        openEditContModal(cont);
      });

      contRow.querySelector(".del-cont").addEventListener("click", (e) => {
        e.stopPropagation();
        handleDeleteContainer(cont);
      });

      sublist.appendChild(contRow);
    });

    colNode.appendChild(sublist);
    sidebarCollectionsTree.appendChild(colNode);
  });
}

function updateSidebarCounts() {
  countAll.textContent = allItems.length;
  countFav.textContent = allItems.filter((i) => i.favorite).length;
  countQuote.textContent = allItems.filter((i) => i.type === "quote").length;
  countMedia.textContent = allItems.filter((i) => i.type === "youtube" || i.type === "image").length;
  countLink.textContent = allItems.filter((i) => i.type === "link" || i.type === "product" || i.type === "social").length;
}

// ── Header Meta (Breadcrumbs, Title, Desc) ──
function renderHeaderMeta() {
  if (currentView === "all") {
    dashBreadcrumbs.innerHTML = `<span class="b-crumb b-col">📁 All Collections</span> <span class="b-sep">›</span> <span class="b-crumb b-cont">🗄️ All Items</span>`;
    pageTitle.textContent = "All Saved Items";
    pageDesc.textContent = "Browse everything captured across your web browsing sessions";
  } else if (currentView === "favorite") {
    dashBreadcrumbs.innerHTML = `<span class="b-crumb">★ Favorites</span>`;
    pageTitle.textContent = "Favorite Saves";
    pageDesc.textContent = "Your starred web clippings, quotes, and media treasures";
  } else if (currentView === "quote") {
    dashBreadcrumbs.innerHTML = `<span class="b-crumb">💬 Quotes & Snippets</span>`;
    pageTitle.textContent = "Saved Quotes & Text";
    pageDesc.textContent = "Highlighted thoughts, book excerpts, and memorable lines";
  } else if (currentView === "media") {
    dashBreadcrumbs.innerHTML = `<span class="b-crumb">🎬 YouTube & Media</span>`;
    pageTitle.textContent = "Videos & Visual Assets";
    pageDesc.textContent = "YouTube tutorials, design inspirations, and saved images";
  } else if (currentView === "link") {
    dashBreadcrumbs.innerHTML = `<span class="b-crumb">🔗 Links & Articles</span>`;
    pageTitle.textContent = "Articles & Bookmarks";
    pageDesc.textContent = "Reading list, blog posts, and curated internet links";
  } else if (currentView === "collection") {
    const col = collections.find((c) => c.id === activeCollectionId);
    dashBreadcrumbs.innerHTML = `<span class="b-crumb b-col">📁 ${escapeHTML(col?.name || "Collection")}</span>`;
    pageTitle.textContent = `📁 ${col?.name || "Collection"}`;
    pageDesc.textContent = `All containers and items within the ${col?.name || ""} collection`;
  } else if (currentView === "container") {
    const col = collections.find((c) => c.id === activeCollectionId);
    const cont = containers.find((c) => c.id === activeContainerId);
    dashBreadcrumbs.innerHTML = `
      <span class="b-crumb b-col">📁 ${escapeHTML(col?.name || "Collection")}</span>
      <span class="b-sep">›</span>
      <span class="b-crumb b-cont">🗄️ ${escapeHTML(cont?.name || "Container")}</span>
    `;
    pageTitle.textContent = `🗄️ ${cont?.name || "Container"}`;
    pageDesc.textContent = cont?.description || `Saved items inside ${cont?.name || "this container"}`;
  }
}

// ── Render Items Viewport ──
function renderItems() {
  let filtered = [...allItems];

  // View filtering
  if (currentView === "favorite") {
    filtered = filtered.filter((i) => i.favorite);
  } else if (currentView === "quote") {
    filtered = filtered.filter((i) => i.type === "quote");
  } else if (currentView === "media") {
    filtered = filtered.filter((i) => i.type === "youtube" || i.type === "image");
  } else if (currentView === "link") {
    filtered = filtered.filter((i) => i.type === "link" || i.type === "product" || i.type === "social");
  } else if (currentView === "collection" && activeCollectionId) {
    filtered = filtered.filter((i) => i.collectionId === activeCollectionId);
  } else if (currentView === "container" && activeContainerId) {
    filtered = filtered.filter((i) => i.containerId === activeContainerId);
  }

  // Search query filter
  if (searchQuery) {
    filtered = filtered.filter((i) => {
      const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
      const contentMatch = (i.content || "").toLowerCase().includes(searchQuery);
      const tagMatch = (i.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
      const sourceMatch = (i.sourceTitle || i.sourceUrl || "").toLowerCase().includes(searchQuery);
      return titleMatch || contentMatch || tagMatch || sourceMatch;
    });
  }

  // Sorting
  if (sortMode === "newest") {
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else if (sortMode === "oldest") {
    filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } else if (sortMode === "alpha") {
    filtered.sort((a, b) => (a.title || a.content || "").localeCompare(b.title || b.content || ""));
  } else if (sortMode === "type") {
    filtered.sort((a, b) => (a.type || "").localeCompare(b.type || ""));
  }

  resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;

  // Empty state check
  if (filtered.length === 0) {
    itemsGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  // Render cards
  itemsGrid.innerHTML = "";
  filtered.forEach((item) => {
    const card = buildDashboardCard(item);
    itemsGrid.appendChild(card);
  });
}

// ── Card Builder for Dashboard ──
function buildDashboardCard(item) {
  const card = document.createElement("div");
  card.className = `dash-card type-${item.type || "text"}`;
  card.dataset.id = item.id;

  const parentCol = collections.find((c) => c.id === item.collectionId);
  const parentCont = containers.find((c) => c.id === item.containerId);
  const colName = parentCol ? parentCol.name : "Collection";
  const contName = parentCont ? parentCont.name : "Container";

  const typeLabels = {
    youtube: "🎬 YouTube",
    quote: "💬 Quote",
    image: "🖼️ Image",
    product: "🛍️ Product",
    social: "📱 Social",
    link: "🔗 Link",
    text: "📝 Note",
  };
  const typeText = typeLabels[item.type] || "📄 Clip";
  const targetUrl = item.sourceUrl || (item.content.startsWith("http") ? item.content : "");

  let cardHtml = `
    <div class="dash-card-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="dash-type-badge ${item.type || "text"}">${typeText}</span>
        <span class="dash-path-badge" title="📁 ${escapeHTML(colName)} › 🗄️ ${escapeHTML(contName)}">
          📁 ${escapeHTML(colName)} › 🗄️ ${escapeHTML(contName)}
        </span>
      </div>
      <div class="dash-card-actions">
        <button class="dash-tool-btn fav-btn ${item.favorite ? "active" : ""}" title="Favorite">
          <svg viewBox="0 0 24 24" fill="${item.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="dash-tool-btn copy-btn" title="Copy Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="dash-tool-btn move-btn" title="Move to Container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </button>
        <button class="dash-tool-btn edit-btn" title="Edit Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="dash-tool-btn delete-btn" title="Delete Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;

  if (item.title && item.title.trim()) {
    cardHtml += `<div class="dash-card-title">${escapeHTML(item.title)}</div>`;
  }

  // Polymorphic display
  if (item.type === "youtube") {
    const thumb = item.previewImage || (item.metadata?.videoId ? `https://img.youtube.com/vi/${item.metadata.videoId}/hqdefault.jpg` : "");
    if (thumb) {
      cardHtml += `
        <div class="dash-media-banner">
          <img src="${thumb}" alt="YouTube Thumbnail" loading="lazy" />
          <div class="dash-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      `;
    }
  } else if (item.type === "image") {
    const imgSrc = item.previewImage || item.content;
    cardHtml += `
      <div class="dash-image-box">
        <img src="${escapeHTML(imgSrc)}" alt="Image Preview" loading="lazy" />
      </div>
    `;
  } else if (item.type === "quote") {
    cardHtml += `<div class="dash-quote-body">“${escapeHTML(item.content)}”</div>`;
  } else {
    cardHtml += `<div class="dash-card-text">${escapeHTML(item.content)}</div>`;
  }

  // Tags
  if (item.tags && item.tags.length > 0) {
    cardHtml += `
      <div class="dash-card-tags">
        ${item.tags.map((t) => `<span class="dash-tag">#${escapeHTML(t)}</span>`).join("")}
      </div>
    `;
  }

  // Footer Row
  const timeStr = formatRelativeTime(item.createdAt);
  cardHtml += `
    <div class="dash-card-footer">
      ${
        targetUrl
          ? `<a href="${escapeHTML(targetUrl)}" target="_blank" class="dash-source-link" title="${escapeHTML(targetUrl)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>${escapeHTML(extractHostname(targetUrl))}</span>
            </a>`
          : `<span></span>`
      }
      <span class="dash-card-time">${timeStr}</span>
    </div>
  `;

  card.innerHTML = cardHtml;

  // Event wiring
  card.querySelector(".fav-btn").addEventListener("click", () => toggleFavorite(item.id));
  card.querySelector(".copy-btn").addEventListener("click", () => copyToClipboard(item.content));
  card.querySelector(".move-btn").addEventListener("click", () => openMoveModal(item));
  card.querySelector(".edit-btn").addEventListener("click", () => openEditItemModal(item));
  card.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item.id));

  const mediaBanner = card.querySelector(".dash-media-banner, .dash-image-box");
  if (mediaBanner && targetUrl) {
    mediaBanner.addEventListener("click", () => chrome.tabs.create({ url: targetUrl }));
  }

  return card;
}

// ── Modals & Actions ──

// 1. Item Modal (Add / Edit)
function openItemModal(defaultColId, defaultContId) {
  editingItemId = null;
  itemModalTitle.textContent = "Save to Container";
  populateCollectionSelect(modalColSelect, defaultColId || activeCollectionId || collections[0]?.id);
  populateContainerSelect(modalContSelect, modalColSelect.value, defaultContId || activeContainerId || undefined);
  modalItemTitle.value = "";
  modalItemContent.value = "";
  modalItemSource.value = "";
  modalItemTags.value = "";
  itemModal.classList.remove("hidden");
  modalItemContent.focus();
}

function openEditItemModal(item) {
  editingItemId = item.id;
  itemModalTitle.textContent = "Edit Item";
  populateCollectionSelect(modalColSelect, item.collectionId);
  populateContainerSelect(modalContSelect, item.collectionId, item.containerId);
  modalItemTitle.value = item.title || "";
  modalItemContent.value = item.content || "";
  modalItemSource.value = item.sourceUrl || "";
  modalItemTags.value = (item.tags || []).join(", ");
  itemModal.classList.remove("hidden");
}

function closeItemModal() {
  itemModal.classList.add("hidden");
  editingItemId = null;
}

async function handleSaveItemModal() {
  const content = modalItemContent.value.trim();
  if (!content) {
    modalItemContent.focus();
    return;
  }

  const colId = modalColSelect.value;
  const contId = modalContSelect.value;
  const title = modalItemTitle.value.trim();
  const sourceUrl = modalItemSource.value.trim();
  const tags = modalItemTags.value.split(",").map((t) => t.trim()).filter(Boolean);

  const classification = classifyContent(content, sourceUrl);

  if (editingItemId) {
    // Edit existing
    const idx = allItems.findIndex((i) => i.id === editingItemId);
    if (idx !== -1) {
      allItems[idx] = {
        ...allItems[idx],
        title,
        content,
        sourceUrl,
        collectionId: colId,
        containerId: contId,
        tags,
        type: classification.type,
        previewImage: classification.thumbnail || (classification.type === "image" ? content : allItems[idx].previewImage),
        metadata: classification.videoId ? { videoId: classification.videoId } : allItems[idx].metadata,
        updatedAt: Date.now(),
      };
      showToast("Item updated!");
    }
  } else {
    // Create new
    const newItem = {
      id: generateId(),
      type: classification.type,
      title: title || (classification.type === "youtube" ? "Saved YouTube" : ""),
      content,
      containerId: contId,
      collectionId: colId,
      sourceUrl,
      sourceTitle: "",
      previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      tags,
      favorite: false,
      createdAt: Date.now(),
    };
    allItems.unshift(newItem);
    showToast("Saved to container!");
  }

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeItemModal();
  renderSidebarTree();
  updateSidebarCounts();
  renderItems();
}

// 2. Collection Modal
function openColModal(editCol = null) {
  editingColId = editCol ? editCol.id : null;
  colModalTitle.textContent = editCol ? "Edit Collection (📁)" : "Create Collection (📁)";
  dashColName.value = editCol ? editCol.name : "";
  selectedColColor = editCol ? editCol.color || "#4F46E5" : "#4F46E5";

  dashColColors.querySelectorAll(".color-swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === selectedColColor);
  });

  colModal.classList.remove("hidden");
  dashColName.focus();
}

function closeColModal() {
  colModal.classList.add("hidden");
  editingColId = null;
}

async function handleSaveColModal() {
  const name = dashColName.value.trim();
  if (!name) return;

  if (editingColId) {
    const idx = collections.findIndex((c) => c.id === editingColId);
    if (idx !== -1) {
      collections[idx] = { ...collections[idx], name, color: selectedColColor };
      showToast("Collection updated!");
    }
  } else {
    const newCol = {
      id: "col_" + generateId(),
      name,
      color: selectedColColor,
      createdAt: Date.now(),
      order: collections.length,
    };
    collections.push(newCol);
    expandedCollections.add(newCol.id);

    // Add initial container inside new collection
    const defaultCont = {
      id: "cont_" + generateId(),
      collectionId: newCol.id,
      name: "General",
      icon: "archive",
      description: "Default container for " + name,
      createdAt: Date.now(),
      order: 0,
    };
    containers.push(defaultCont);

    currentView = "collection";
    activeCollectionId = newCol.id;
    activeContainerId = null;
    showToast(`Created collection: 📁 ${name}`);
  }

  await chrome.storage.local.set({ collections, containers });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeColModal();
  renderSidebarTree();
  renderHeaderMeta();
  renderItems();
}

// 3. Container Modal
function openContModal(parentColId = null) {
  editingContId = null;
  contModalTitle.textContent = "Create Container (🗄️)";
  populateCollectionSelect(dashContParentCol, parentColId || activeCollectionId || collections[0]?.id);
  dashContName.value = "";
  dashContDesc.value = "";
  contModal.classList.remove("hidden");
  dashContName.focus();
}

function openEditContModal(cont) {
  editingContId = cont.id;
  contModalTitle.textContent = "Edit Container (🗄️)";
  populateCollectionSelect(dashContParentCol, cont.collectionId);
  dashContName.value = cont.name || "";
  dashContDesc.value = cont.description || "";
  contModal.classList.remove("hidden");
  dashContName.focus();
}

function closeContModal() {
  contModal.classList.add("hidden");
  editingContId = null;
}

async function handleSaveContModal() {
  const name = dashContName.value.trim();
  const parentColId = dashContParentCol.value;
  const desc = dashContDesc.value.trim();
  if (!name || !parentColId) return;

  if (editingContId) {
    const idx = containers.findIndex((c) => c.id === editingContId);
    if (idx !== -1) {
      containers[idx] = {
        ...containers[idx],
        name,
        collectionId: parentColId,
        description: desc,
      };
      // Update any items inside if collectionId changed
      allItems.forEach((item) => {
        if (item.containerId === editingContId) item.collectionId = parentColId;
      });
      showToast("Container updated!");
    }
  } else {
    const newCont = {
      id: "cont_" + generateId(),
      collectionId: parentColId,
      name,
      icon: "archive",
      description: desc,
      createdAt: Date.now(),
      order: containers.length,
    };
    containers.push(newCont);
    expandedCollections.add(parentColId);

    currentView = "container";
    activeCollectionId = parentColId;
    activeContainerId = newCont.id;
    chrome.storage.local.set({ lastActiveContainer: newCont.id });
    showToast(`Created container: 🗄️ ${name}`);
  }

  await chrome.storage.local.set({ containers, items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeContModal();
  renderSidebarTree();
  renderHeaderMeta();
  renderItems();
}

async function handleDeleteContainer(cont) {
  if (!confirm(`Delete container "${cont.name}"? Items inside will be moved to Quick Saves.`)) return;

  const fallbackCont = containers.find((c) => c.id !== cont.id) || DEFAULT_CONTAINERS[0];
  containers = containers.filter((c) => c.id !== cont.id);

  allItems.forEach((i) => {
    if (i.containerId === cont.id) {
      i.containerId = fallbackCont.id;
      i.collectionId = fallbackCont.collectionId;
    }
  });

  if (activeContainerId === cont.id) {
    activeContainerId = fallbackCont.id;
    activeCollectionId = fallbackCont.collectionId;
  }

  await chrome.storage.local.set({ containers, items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  renderSidebarTree();
  updateSidebarCounts();
  renderHeaderMeta();
  renderItems();
  showToast("Container removed");
}

function openColContextMenu(e, col) {
  const action = prompt(`Collection "${col.name}":\nType "rename" to rename\nType "delete" to delete\nType "add" to add container`, "add");
  if (!action) return;

  if (action.toLowerCase() === "rename") {
    openColModal(col);
  } else if (action.toLowerCase() === "add") {
    openContModal(col.id);
  } else if (action.toLowerCase() === "delete") {
    if (collections.length <= 1) {
      alert("You must have at least one collection.");
      return;
    }
    if (confirm(`Delete collection "${col.name}" and its containers?`)) {
      collections = collections.filter((c) => c.id !== col.id);
      containers = containers.filter((c) => c.collectionId !== col.id);
      allItems = allItems.filter((i) => i.collectionId !== col.id);

      currentView = "all";
      activeCollectionId = null;
      activeContainerId = null;

      chrome.storage.local.set({ collections, containers, items: allItems });
      SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

      renderSidebarTree();
      updateSidebarCounts();
      renderHeaderMeta();
      renderItems();
      showToast("Collection deleted");
    }
  }
}

// 4. Move Modal
function openMoveModal(item) {
  movingItemId = item.id;
  populateCollectionSelect(moveColSelect, item.collectionId);
  populateContainerSelect(moveContSelect, item.collectionId, item.containerId);
  moveModal.classList.remove("hidden");
}

function closeMoveModal() {
  moveModal.classList.add("hidden");
  movingItemId = null;
}

async function handleConfirmMove() {
  if (!movingItemId) return;
  const colId = moveColSelect.value;
  const contId = moveContSelect.value;
  if (!colId || !contId) return;

  const item = allItems.find((i) => i.id === movingItemId);
  if (!item) return;

  item.collectionId = colId;
  item.containerId = contId;

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeMoveModal();
  renderSidebarTree();
  updateSidebarCounts();
  renderItems();
  showToast("Item moved successfully!");
}

// ── Select Helpers ──
function populateCollectionSelect(selectEl, selectedColId) {
  selectEl.innerHTML = "";
  collections.forEach((col) => {
    const opt = document.createElement("option");
    opt.value = col.id;
    opt.textContent = `📁 ${col.name}`;
    if (col.id === selectedColId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function populateContainerSelect(selectEl, colId, selectedContId) {
  selectEl.innerHTML = "";
  const matching = containers.filter((c) => c.collectionId === colId);
  if (matching.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(No containers in this collection)";
    selectEl.appendChild(opt);
    return;
  }

  matching.forEach((cont) => {
    const opt = document.createElement("option");
    opt.value = cont.id;
    opt.textContent = `🗄️ ${cont.name}`;
    if (cont.id === selectedContId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ── Item Actions ──
async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  updateSidebarCounts();
  renderItems();
  showToast(item.favorite ? "Added to Favorites ★" : "Removed from Favorites");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch (err) {
    showToast("Copy failed");
  }
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this saved item?")) return;
  allItems = allItems.filter((i) => i.id !== id);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  renderSidebarTree();
  updateSidebarCounts();
  renderItems();
  showToast("Item deleted");
}

// ── Export / Import ──
function handleExport() {
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
  a.download = `saveit-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported workspace JSON!");
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

    renderSidebarTree();
    updateSidebarCounts();
    renderHeaderMeta();
    renderItems();
    showToast(`Imported ${importedItems.length} items!`);
  } catch (err) {
    showToast("Error importing backup");
  }
}

// ── Auth Modal Logic ──
async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session) {
    userDisplayEmail.textContent = session.user.email;
    userSyncStatus.textContent = "Synced with Cloud";
    userSyncStatus.style.color = "#059669";
  } else {
    userDisplayEmail.textContent = "Local Vault";
    userSyncStatus.textContent = "Not Synced";
    userSyncStatus.style.color = "#6B7280";
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
    authModalTitle.textContent = authIsSignUp ? "Create Cloud Account" : "Log In to Sync";
  }
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function toggleAuthMode(e) {
  e.preventDefault();
  authIsSignUp = !authIsSignUp;
  authModalTitle.textContent = authIsSignUp ? "Create Cloud Account" : "Log In to Sync";
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
    showToast(err.message || "Auth error");
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
      renderSidebarTree();
      updateSidebarCounts();
      renderHeaderMeta();
      renderItems();
      showToast("Workspace synced!");
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

// ── General Modal Helpers ──
function isModalOpen() {
  return (
    !itemModal.classList.contains("hidden") ||
    !colModal.classList.contains("hidden") ||
    !contModal.classList.contains("hidden") ||
    !moveModal.classList.contains("hidden") ||
    !authModal.classList.contains("hidden")
  );
}

function closeAllModals() {
  closeItemModal();
  closeColModal();
  closeContModal();
  closeMoveModal();
  closeAuthModal();
}

// ── Toast ──
let toastTimer = null;
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

// ── Utilities ──
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
