// ── SaveIt: Desktop Icon View & Relevant Sidebar Workspace Controller ──

let collections = [];
let containers = [];
let allItems = [];

// Navigation State
let currentView = "home"; // "home" | "collection" | "container" | "favorites" | "search"
let currentColId = null;
let currentContId = null;
let contTypeFilter = "all";
let searchQuery = "";

// Modals State
let editingItemId = null;
let editingColId = null;
let editingContId = null;
let selectedColColor = "#4F46E5";
let selectedContColor = "#2563EB";
let authIsSignUp = false;

// ── DOM References ──
// Sidebar
const sidebarBrandHome = document.getElementById("sidebar-brand-home");
const navLinkHome = document.getElementById("nav-link-home");
const navLinkStarred = document.getElementById("nav-link-starred");
const badgeTotalItems = document.getElementById("badge-total-items");
const badgeStarredItems = document.getElementById("badge-starred-items");
const btnSidebarNewCol = document.getElementById("btn-sidebar-new-col");
const sidebarCollectionsList = document.getElementById("sidebar-collections-list");
const btnSidebarAuth = document.getElementById("btn-sidebar-auth");
const sidebarAuthEmail = document.getElementById("sidebar-auth-email");
const sidebarAuthStatus = document.getElementById("sidebar-auth-status");

// Topbar
const breadcrumbTrail = document.getElementById("breadcrumb-trail");
const globalSearchInput = document.getElementById("global-search-input");
const searchClearBtn = document.getElementById("search-clear-btn");
const btnTopAddItem = document.getElementById("btn-top-add-item");
const btnExportBackup = document.getElementById("btn-export-backup");
const btnImportBackup = document.getElementById("btn-import-backup");
const importFile = document.getElementById("import-file");

// Panels
const viewHome = document.getElementById("view-home");
const viewCollection = document.getElementById("view-collection");
const viewContainer = document.getElementById("view-container");
const viewFavorites = document.getElementById("view-favorites");
const viewSearchResults = document.getElementById("view-search-results");

// Home View
const recentsRow = document.getElementById("recents-row");
const recentsEmpty = document.getElementById("recents-empty");
const recentsCounter = document.getElementById("recents-counter");
const btnNewCollectionMain = document.getElementById("btn-new-collection-main");
const desktopFoldersGrid = document.getElementById("desktop-folders-grid");

// Collection View
const btnBackToHome = document.getElementById("btn-back-to-home");
const colViewIcon = document.getElementById("col-view-icon");
const colViewTitle = document.getElementById("col-view-title");
const colViewMeta = document.getElementById("col-view-meta");
const btnEditCurrentCol = document.getElementById("btn-edit-current-col");
const btnNewContainerInCol = document.getElementById("btn-new-container-in-col");
const desktopContainersGrid = document.getElementById("desktop-containers-grid");

// Container View
const btnBackToCollection = document.getElementById("btn-back-to-collection");
const backToColText = document.getElementById("back-to-col-text");
const contHeroStripe = document.getElementById("cont-hero-stripe");
const contHeroTitle = document.getElementById("cont-hero-title");
const contHeroMeta = document.getElementById("cont-hero-meta");
const contHeroNoteText = document.getElementById("cont-hero-note-text");
const btnEditContNote = document.getElementById("btn-edit-cont-note");
const btnEditContDetails = document.getElementById("btn-edit-cont-details");
const btnAddItemToCurrentCont = document.getElementById("btn-add-item-to-current-cont");
const containerItemsGrid = document.getElementById("container-items-grid");
const containerEmptyState = document.getElementById("container-empty-state");
const btnEmptyContAdd = document.getElementById("btn-empty-cont-add");
const containerTypeFilters = document.getElementById("container-type-filters");

// Favorites View
const favoritesItemsGrid = document.getElementById("favorites-items-grid");
const favoritesMeta = document.getElementById("favorites-meta");
const favoritesEmpty = document.getElementById("favorites-empty");

// Search Results View
const searchItemsGrid = document.getElementById("search-items-grid");
const searchResultsMeta = document.getElementById("search-results-meta");
const btnExitSearch = document.getElementById("btn-exit-search");

// Item Modal
const itemModal = document.getElementById("item-modal");
const itemModalTitle = document.getElementById("item-modal-title");
const itemModalClose = document.getElementById("item-modal-close");
const itemModalCancel = document.getElementById("item-modal-cancel");
const itemModalSave = document.getElementById("item-modal-save");
const itemColSelect = document.getElementById("item-col-select");
const itemContSelect = document.getElementById("item-cont-select");
const itemTitleInput = document.getElementById("item-title-input");
const itemContentInput = document.getElementById("item-content-input");
const itemNoteInput = document.getElementById("item-note-input");
const itemSourceInput = document.getElementById("item-source-input");
const itemTagsInput = document.getElementById("item-tags-input");

// Collection Modal
const colModal = document.getElementById("col-modal");
const colModalTitle = document.getElementById("col-modal-title");
const colModalClose = document.getElementById("col-modal-close");
const colModalCancel = document.getElementById("col-modal-cancel");
const colModalSave = document.getElementById("col-modal-save");
const colNameInput = document.getElementById("col-name-input");
const colColorPalette = document.getElementById("col-color-palette");

// Container Modal
const contModal = document.getElementById("cont-modal");
const contModalTitle = document.getElementById("cont-modal-title");
const contModalClose = document.getElementById("cont-modal-close");
const contModalCancel = document.getElementById("cont-modal-cancel");
const contModalSave = document.getElementById("cont-modal-save");
const contColSelect = document.getElementById("cont-col-select");
const contNameInput = document.getElementById("cont-name-input");
const contColorPalette = document.getElementById("cont-color-palette");
const contNoteInput = document.getElementById("cont-note-input");

// Note Quick-Edit Modal
const noteModal = document.getElementById("note-modal");
const noteModalClose = document.getElementById("note-modal-close");
const noteModalCancel = document.getElementById("note-modal-cancel");
const noteModalSave = document.getElementById("note-modal-save");
const quickNoteTextarea = document.getElementById("quick-note-textarea");

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

// ── Lifecycle ──
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

  navigateToHome();
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
      refreshActiveView();
    }
  } catch (err) {
    console.warn("Background auto-sync:", err);
  }
}

// ── Setup Listeners ──
function setupEventListeners() {
  // Sidebar navigation
  sidebarBrandHome.addEventListener("click", navigateToHome);
  navLinkHome.addEventListener("click", navigateToHome);
  navLinkStarred.addEventListener("click", navigateToStarred);
  btnSidebarNewCol.addEventListener("click", () => openColModal());
  btnSidebarAuth.addEventListener("click", openAuthModal);

  // Topbar
  btnTopAddItem.addEventListener("click", () => openItemModal(currentColId, currentContId));
  btnExportBackup.addEventListener("click", handleExportBackup);
  btnImportBackup.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", handleImportBackup);

  // Global Search
  globalSearchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    searchClearBtn.classList.toggle("hidden", searchQuery.length === 0);
    if (searchQuery.length > 0) {
      navigateToSearch();
    } else {
      exitSearch();
    }
  });

  searchClearBtn.addEventListener("click", () => {
    globalSearchInput.value = "";
    searchQuery = "";
    searchClearBtn.classList.add("hidden");
    exitSearch();
  });

  btnExitSearch.addEventListener("click", () => {
    globalSearchInput.value = "";
    searchQuery = "";
    searchClearBtn.classList.add("hidden");
    exitSearch();
  });

  // Hotkeys: '/' to search, 'Escape' to close
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== globalSearchInput && !isModalOpen()) {
      e.preventDefault();
      globalSearchInput.focus();
    } else if (e.key === "Escape") {
      if (isModalOpen()) closeAllModals();
      else if (currentView === "search") exitSearch();
    }
  });

  // Home View Buttons
  btnNewCollectionMain.addEventListener("click", () => openColModal());

  // Collection View Buttons
  btnBackToHome.addEventListener("click", navigateToHome);
  btnEditCurrentCol.addEventListener("click", () => {
    const col = collections.find((c) => c.id === currentColId);
    if (col) openColModal(col);
  });
  btnNewContainerInCol.addEventListener("click", () => openContModal(currentColId));

  // Container View Buttons
  btnBackToCollection.addEventListener("click", () => {
    if (currentColId) navigateToCollection(currentColId);
    else navigateToHome();
  });
  btnEditContNote.addEventListener("click", openQuickNoteModal);
  btnEditContDetails.addEventListener("click", () => {
    const cont = containers.find((c) => c.id === currentContId);
    if (cont) openContModal(currentColId, cont);
  });
  btnAddItemToCurrentCont.addEventListener("click", () => openItemModal(currentColId, currentContId));
  btnEmptyContAdd.addEventListener("click", () => openItemModal(currentColId, currentContId));

  // Container Type Filters
  containerTypeFilters.querySelectorAll(".chip-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      containerTypeFilters.querySelectorAll(".chip-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      contTypeFilter = btn.dataset.filter;
      renderContainerItems();
    });
  });

  // Item Modal Listeners
  itemModalClose.addEventListener("click", closeItemModal);
  itemModalCancel.addEventListener("click", closeItemModal);
  itemModalSave.addEventListener("click", handleSaveItemModal);
  itemColSelect.addEventListener("change", () => {
    populateContainerSelect(itemContSelect, itemColSelect.value);
  });

  // Collection Modal Listeners
  colModalClose.addEventListener("click", closeColModal);
  colModalCancel.addEventListener("click", closeColModal);
  colModalSave.addEventListener("click", handleSaveColModal);
  colColorPalette.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      colColorPalette.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      selectedColColor = swatch.dataset.color;
    });
  });

  // Container Modal Listeners
  contModalClose.addEventListener("click", closeContModal);
  contModalCancel.addEventListener("click", closeContModal);
  contModalSave.addEventListener("click", handleSaveContModal);
  contColorPalette.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      contColorPalette.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      selectedContColor = swatch.dataset.color;
    });
  });

  // Note Modal Listeners
  noteModalClose.addEventListener("click", closeQuickNoteModal);
  noteModalCancel.addEventListener("click", closeQuickNoteModal);
  noteModalSave.addEventListener("click", handleSaveQuickNote);

  // Auth Modal Listeners
  authModalClose.addEventListener("click", closeAuthModal);
  authModalCancel.addEventListener("click", closeAuthModal);
  authToggleMode.addEventListener("click", toggleAuthMode);
  authSubmitBtn.addEventListener("click", handleAuthSubmit);
  btnSyncNow.addEventListener("click", handleManualSync);
  btnLogout.addEventListener("click", handleLogout);
}

// ── Routing & Navigation ──

function navigateToHome() {
  currentView = "home";
  currentColId = null;
  currentContId = null;

  highlightSidebarLink(navLinkHome);
  showPanel(viewHome);
  updateBreadcrumbs([{ label: "Dashboard", id: "home" }]);

  updateSidebar();
  renderRecentsRow();
  renderDesktopFolders();
}

function navigateToStarred() {
  currentView = "favorites";
  currentColId = null;
  currentContId = null;

  highlightSidebarLink(navLinkStarred);
  showPanel(viewFavorites);
  updateBreadcrumbs([
    { label: "Dashboard", action: navigateToHome },
    { label: "★ Starred Saves", active: true },
  ]);

  updateSidebar();
  renderFavorites();
}

function navigateToCollection(colId) {
  const col = collections.find((c) => c.id === colId);
  if (!col) return navigateToHome();

  currentView = "collection";
  currentColId = colId;
  currentContId = null;

  highlightSidebarCollection(colId);
  showPanel(viewCollection);
  updateBreadcrumbs([
    { label: "Dashboard", action: navigateToHome },
    { label: `📁 ${col.name}`, active: true },
  ]);

  updateSidebar();
  renderCollectionHero(col);
  renderDesktopContainers(colId);
}

function navigateToContainer(contId) {
  const cont = containers.find((c) => c.id === contId);
  if (!cont) return navigateToHome();

  const parentCol = collections.find((c) => c.id === cont.collectionId) || collections[0];
  currentView = "container";
  currentColId = parentCol?.id;
  currentContId = contId;

  // Remember as last active container
  chrome.storage.local.set({ lastActiveContainer: contId });

  highlightSidebarCollection(parentCol?.id);
  showPanel(viewContainer);
  updateBreadcrumbs([
    { label: "Dashboard", action: navigateToHome },
    { label: `📁 ${parentCol.name}`, action: () => navigateToCollection(parentCol.id) },
    { label: `📦 ${cont.name}`, active: true },
  ]);

  backToColText.textContent = `Back to 📁 ${parentCol.name}`;
  updateSidebar();
  renderContainerHero(cont);
  renderContainerItems();
}

function navigateToSearch() {
  currentView = "search";
  showPanel(viewSearchResults);
  updateBreadcrumbs([
    { label: "Dashboard", action: navigateToHome },
    { label: `🔍 Search: "${searchQuery}"`, active: true },
  ]);
  renderSearchResults();
}

function exitSearch() {
  if (currentContId) navigateToContainer(currentContId);
  else if (currentColId) navigateToCollection(currentColId);
  else navigateToHome();
}

function showPanel(targetPanel) {
  [viewHome, viewCollection, viewContainer, viewFavorites, viewSearchResults].forEach((panel) => {
    panel.classList.toggle("hidden", panel !== targetPanel);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateBreadcrumbs(crumbs) {
  breadcrumbTrail.innerHTML = "";
  crumbs.forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "crumb-sep";
      sep.textContent = "›";
      breadcrumbTrail.appendChild(sep);
    }

    const btn = document.createElement("button");
    btn.className = `crumb-btn ${crumb.active ? "active" : ""}`;
    btn.textContent = crumb.label;
    if (crumb.action) {
      btn.addEventListener("click", crumb.action);
    }
    breadcrumbTrail.appendChild(btn);
  });
}

function refreshActiveView() {
  updateSidebar();
  if (currentView === "home") navigateToHome();
  else if (currentView === "favorites") navigateToStarred();
  else if (currentView === "collection" && currentColId) navigateToCollection(currentColId);
  else if (currentView === "container" && currentContId) navigateToContainer(currentContId);
  else if (currentView === "search") renderSearchResults();
}

// ── SIDEBAR RENDERING ──

function updateSidebar() {
  badgeTotalItems.textContent = allItems.length;
  badgeStarredItems.textContent = allItems.filter((i) => i.favorite).length;

  sidebarCollectionsList.innerHTML = "";

  if (collections.length === 0) {
    sidebarCollectionsList.innerHTML = `
      <div style="padding: 10px 12px; font-size: 11.5px; color: var(--text-muted); font-style: italic;">
        No folders yet
      </div>
    `;
    return;
  }

  collections.forEach((col) => {
    const colItems = allItems.filter((i) => i.collectionId === col.id);
    const colContainers = containers.filter((c) => c.collectionId === col.id);
    const isCurrentCol = (currentView === "collection" || currentView === "container") && currentColId === col.id;

    const colGroup = document.createElement("div");
    colGroup.className = "sidebar-collection-group";

    const btn = document.createElement("button");
    btn.className = `sidebar-link ${isCurrentCol && currentView === "collection" ? "active" : ""}`;
    btn.dataset.colId = col.id;

    btn.innerHTML = `
      <span class="sidebar-icon" style="color: ${col.color || "#4F46E5"}">📁</span>
      <span class="sidebar-label" title="${escapeHTML(col.name)}">${escapeHTML(col.name)}</span>
      <span class="sidebar-badge">${colItems.length}</span>
    `;

    btn.addEventListener("click", () => navigateToCollection(col.id));
    colGroup.appendChild(btn);

    // If active collection or viewing one of its containers, render its containers
    if (isCurrentCol && colContainers.length > 0) {
      const subList = document.createElement("div");
      subList.className = "sidebar-sub-containers";

      colContainers.forEach((cont) => {
        const contItems = allItems.filter((i) => i.containerId === cont.id);
        const isCurrentCont = currentView === "container" && currentContId === cont.id;
        const contBtn = document.createElement("button");
        contBtn.className = `sidebar-sub-link ${isCurrentCont ? "active" : ""}`;
        contBtn.dataset.contId = cont.id;

        const crateColor = cont.color || "#2563EB";
        contBtn.innerHTML = `
          <span class="sidebar-sub-symbol" style="color: ${crateColor}">📦</span>
          <span class="sidebar-sub-label" title="${escapeHTML(cont.name)}">${escapeHTML(cont.name)}</span>
          <span class="sidebar-sub-badge">${contItems.length}</span>
        `;

        contBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          navigateToContainer(cont.id);
        });

        subList.appendChild(contBtn);
      });

      colGroup.appendChild(subList);
    }

    sidebarCollectionsList.appendChild(colGroup);
  });
}

function highlightSidebarLink(activeBtn) {
  document.querySelectorAll(".workspace-sidebar .sidebar-link, .workspace-sidebar .sidebar-sub-link").forEach((btn) => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

function highlightSidebarCollection(colId) {
  document.querySelectorAll(".workspace-sidebar .sidebar-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.colId === colId);
  });
}

// ── VIEW 1: HOME (Uniform Recents + Desktop Icon View Folders) ──

function renderRecentsRow() {
  recentsRow.innerHTML = "";
  const sorted = [...allItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const recentItems = sorted.slice(0, 10);

  recentsCounter.textContent = `${allItems.length} total saved`;

  if (recentItems.length === 0) {
    recentsEmpty.classList.remove("hidden");
    return;
  }
  recentsEmpty.classList.add("hidden");

  recentItems.forEach((item) => {
    const card = createUniformCard(item);
    recentsRow.appendChild(card);
  });
}

// Render Folders like in Desktop Icon View!
function renderDesktopFolders() {
  desktopFoldersGrid.innerHTML = "";

  if (collections.length === 0) {
    desktopFoldersGrid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-icon-box">📁</div>
        <h3>No collections yet</h3>
        <p>Create your first folder to start organizing your storage containers and saved discoveries.</p>
        <button class="btn btn-primary" id="btn-create-first-col">+ Create Folder</button>
      </div>
    `;
    desktopFoldersGrid.querySelector("#btn-create-first-col").addEventListener("click", () => openColModal());
    return;
  }

  collections.forEach((col) => {
    const colContainers = containers.filter((c) => c.collectionId === col.id);
    const colItems = allItems.filter((i) => i.collectionId === col.id);
    const folderColor = col.color || "#4F46E5";

    const tile = document.createElement("div");
    tile.className = "desktop-folder-tile";
    tile.dataset.colId = col.id;

    // Desktop SVG Folder Icon with realistic geometry and color
    tile.innerHTML = `
      <div class="enlarged-folder-graphic">
        <svg class="desktop-folder-svg" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: ${folderColor};">
          <!-- Ground soft shadow -->
          <ellipse cx="50" cy="74" rx="40" ry="4" fill="#000000" fill-opacity="0.1" />
          <!-- Back flap with folder tab -->
          <path d="M8 18C8 13.5817 11.5817 10 16 10H38C41.5 10 44 13.5 46.5 16.5L49.5 20H86C90.4183 20 94 23.5817 94 28V64C94 68.4183 90.4183 72 86 72H16C11.5817 72 8 68.4183 8 64V18Z" fill="currentColor" fill-opacity="0.82"/>
          <!-- Folder inner sheet -->
          <rect x="18" y="16" width="64" height="24" rx="3" fill="#FFFFFF" fill-opacity="0.6" />
          <!-- Front folder flap -->
          <path d="M8 30C8 26.6863 10.6863 24 14 24H86C89.3137 24 92 26.6863 92 30V64C92 68.4183 88.4183 72 84 72H16C11.5817 72 8 68.4183 8 64V30Z" fill="currentColor"/>
          <!-- Specular highlight line -->
          <path d="M14 25H86C88.7614 25 91 27.2386 91 30V31C91 28.2386 88.7614 26 86 26H14C11.2386 26 9 28.2386 9 31V30C9 27.2386 11.2386 25 14 25Z" fill="#FFFFFF" fill-opacity="0.35"/>
        </svg>
      </div>
      <div class="folder-tile-name" title="${escapeHTML(col.name)}">${escapeHTML(col.name)}</div>
      <div class="folder-tile-count">${colContainers.length} 📦 • ${colItems.length} items</div>
    `;

    // Click on tile opens folder
    tile.addEventListener("click", () => navigateToCollection(col.id));

    desktopFoldersGrid.appendChild(tile);
  });
}

// ── VIEW 2: COLLECTION (Containers in Desktop Crate View) ──

function renderCollectionHero(col) {
  colViewIcon.style.color = col.color || "#4F46E5";
  colViewTitle.textContent = col.name;

  const colContainers = containers.filter((c) => c.collectionId === col.id);
  const colItems = allItems.filter((i) => i.collectionId === col.id);
  colViewMeta.textContent = `${colContainers.length} 📦 • ${colItems.length} saved items`;
}

// Render Literal Storage Containers in Desktop Icon View!
function renderDesktopContainers(colId) {
  desktopContainersGrid.innerHTML = "";
  const childContainers = containers.filter((c) => c.collectionId === colId);

  if (childContainers.length === 0) {
    desktopContainersGrid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-icon-box">📦</div>
        <h3>No storage boxes in this folder yet</h3>
        <p>Create storage boxes to store your design inspirations, notes, and links.</p>
        <button class="btn btn-primary" id="btn-create-first-cont">+ Create Box</button>
      </div>
    `;
    desktopContainersGrid.querySelector("#btn-create-first-cont").addEventListener("click", () => openContModal(colId));
    return;
  }

  childContainers.forEach((cont) => {
    const contItems = allItems.filter((i) => i.containerId === cont.id);
    const crateColor = cont.color || "#2563EB";
    const noteText = (cont.note || cont.description || "").trim();

    const tile = document.createElement("div");
    tile.className = "desktop-crate-tile";
    tile.dataset.contId = cont.id;

    // Modern Archive Storage Box Graphic (Frosted Tub + Snap Lid + Swayed Sticky Note)
    tile.innerHTML = `
      <div class="enlarged-container-graphic">
        <svg class="archive-storage-box-svg" viewBox="0 0 160 115" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="boxBodyGrad_${cont.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
              <stop offset="45%" stop-color="#F8FAFC" stop-opacity="0.84" />
              <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.75" />
            </linearGradient>
            <linearGradient id="boxTintGrad_${cont.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${crateColor}" stop-opacity="0.04" />
              <stop offset="100%" stop-color="${crateColor}" stop-opacity="0.18" />
            </linearGradient>
            <linearGradient id="lidBevel_${cont.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0.12" />
            </linearGradient>
          </defs>

          <!-- Ground drop shadow -->
          <ellipse cx="80" cy="107" rx="58" ry="6" fill="#0F172A" fill-opacity="0.12" />

          <!-- Inside Stacked Bookmarks / Document Cards Silhouettes (visible through frosted tub) -->
          <g class="inner-cards-preview" opacity="0.6">
            <!-- Back Card -->
            <rect x="36" y="38" width="52" height="48" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" transform="rotate(-6 36 38)" />
            <line x1="42" y1="46" x2="72" y2="43" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" transform="rotate(-6 36 38)" />
            <line x1="42" y1="52" x2="80" y2="49" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" transform="rotate(-6 36 38)" />

            <!-- Front Card -->
            <rect x="68" y="42" width="56" height="52" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" transform="rotate(4 68 42)" />
            <rect x="73" y="48" width="46" height="6" rx="2" fill="${crateColor}" fill-opacity="0.25" transform="rotate(4 68 42)" />
            <line x1="73" y1="60" x2="114" y2="60" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round" transform="rotate(4 68 42)" />
            <line x1="73" y1="66" x2="106" y2="66" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" transform="rotate(4 68 42)" />
            <line x1="73" y1="72" x2="98" y2="72" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" transform="rotate(4 68 42)" />
          </g>

          <!-- Main Frosted Container Tub Body (Rectangular with rounded bottom corners matching Image 3) -->
          <path d="M 21 30 L 139 30 L 135 94 A 10 10 0 0 1 125 104 L 35 104 A 10 10 0 0 1 25 94 Z" fill="url(#boxBodyGrad_${cont.id})" />
          <path d="M 21 30 L 139 30 L 135 94 A 10 10 0 0 1 125 104 L 35 104 A 10 10 0 0 1 25 94 Z" fill="url(#boxTintGrad_${cont.id})" />
          <path d="M 21 30 L 139 30 L 135 94 A 10 10 0 0 1 125 104 L 35 104 A 10 10 0 0 1 25 94 Z" stroke="${crateColor}" stroke-opacity="0.28" stroke-width="1.5" />

          <!-- Acrylic wall specular edge reflections -->
          <path d="M 23 32 L 27 94 A 8 8 0 0 0 35 102" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="2.5" stroke-linecap="round" />
          <path d="M 137 32 L 133 94 A 8 8 0 0 1 125 102" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" />
          <path d="M 37 101 L 123 101" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.5" stroke-linecap="round" />

          <!-- Soft shadow cast under lid -->
          <path d="M 21 30 L 139 30 L 138 36 L 22 36 Z" fill="#000000" fill-opacity="0.14" />

          <!-- ── STORAGE BOX TOP LID (Snap-on rim + lid matching Image 3 & Gmail Archive) ── -->
          <!-- Lid Under-Rim / Lip -->
          <rect x="15" y="24" width="130" height="8" rx="3.5" fill="${crateColor}" />
          <rect x="15" y="24" width="130" height="8" rx="3.5" fill="#000000" fill-opacity="0.12" />

          <!-- Main Top Lid Cap -->
          <rect x="17" y="16" width="126" height="12" rx="4" fill="${crateColor}" />
          <rect x="17" y="16" width="126" height="12" rx="4" fill="url(#lidBevel_${cont.id})" />
          <rect x="17" y="16" width="126" height="12" rx="4" stroke="#0F172A" stroke-opacity="0.18" stroke-width="1" />

          <!-- Lid Right-side Pull Tab (as in Image 3!) -->
          <path d="M 143 25 C 146.5 25 149 26.5 149 28 C 149 29.5 146.5 31 143 31 Z" fill="${crateColor}" />
          <path d="M 143 25 C 146.5 25 149 26.5 149 28 C 149 29.5 146.5 31 143 31 Z" fill="#000000" fill-opacity="0.12" />

          <!-- Beveled top rim highlight line -->
          <path d="M 20 18 H 140 C 141.5 18 142.5 19 142.5 20 C 142.5 19.5 141.5 18.5 140 18.5 H 20 C 18.5 18.5 17.5 19.5 17.5 20 C 17.5 19 18.5 18 20 18 Z" fill="#FFFFFF" fill-opacity="0.45" />

          <!-- Center Recessed Seal Groove -->
          <rect x="42" y="19" width="76" height="5" rx="2" fill="#FFFFFF" fill-opacity="0.18" />

          <!-- Front Center Archive Slot (Gmail Archive Box style) -->
          <rect x="68" y="26" width="24" height="4" rx="2" fill="#000000" fill-opacity="0.22" />
          <rect x="69" y="26" width="22" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.32" />
        </svg>

        <!-- Swayed / Curled Sticky Note on Top Right -->
        <div class="swayed-sticky-note ${noteText ? "has-note" : "empty-note"}" data-cont-id="${cont.id}" title="${escapeHTML(noteText ? 'Box Note: ' + noteText + ' (Click to edit)' : 'Click to add sticky note')}">
          <div class="sticky-pin"></div>
          <div class="sticky-note-text">${escapeHTML(noteText || "+ Note")}</div>
        </div>
      </div>

      <!-- Strictly Name and Items Count Underneath -->
      <div class="crate-tile-name" title="${escapeHTML(cont.name)}">${escapeHTML(cont.name)}</div>
      <div class="crate-tile-count">${contItems.length} items</div>
    `;

    // Clicking the sticky note opens note editor directly
    const stickyNote = tile.querySelector(".swayed-sticky-note");
    stickyNote.addEventListener("click", (e) => {
      e.stopPropagation();
      openQuickNoteModal(cont.id);
    });

    // Clicking the container tile opens container
    tile.addEventListener("click", () => navigateToContainer(cont.id));
    desktopContainersGrid.appendChild(tile);
  });
}

// ── VIEW 3: CONTAINER (Uniform Cards Grid + Container Note) ──

function renderContainerHero(cont) {
  const crateColor = cont.color || "#2563EB";
  contHeroStripe.style.backgroundColor = crateColor;
  contHeroTitle.textContent = cont.name;

  const contItems = allItems.filter((i) => i.containerId === cont.id);
  contHeroMeta.textContent = `${contItems.length} items saved`;

  if (cont.note && cont.note.trim()) {
    contHeroNoteText.textContent = cont.note.trim();
  } else {
    contHeroNoteText.textContent = "(No container note yet. Click 'Edit Note' to add guidelines or hex palettes)";
  }
}

function renderContainerItems() {
  containerItemsGrid.innerHTML = "";
  let itemsInCont = allItems.filter((i) => i.containerId === currentContId);

  // Filter by type
  if (contTypeFilter === "quote") {
    itemsInCont = itemsInCont.filter((i) => i.type === "quote");
  } else if (contTypeFilter === "youtube") {
    itemsInCont = itemsInCont.filter((i) => i.type === "youtube");
  } else if (contTypeFilter === "image") {
    itemsInCont = itemsInCont.filter((i) => i.type === "image");
  } else if (contTypeFilter === "link") {
    itemsInCont = itemsInCont.filter((i) => i.type === "link" || i.type === "product" || i.type === "social");
  } else if (contTypeFilter === "favorite") {
    itemsInCont = itemsInCont.filter((i) => i.favorite);
  }

  if (itemsInCont.length === 0) {
    containerEmptyState.classList.remove("hidden");
    return;
  }
  containerEmptyState.classList.add("hidden");

  itemsInCont.forEach((item) => {
    const card = createUniformCard(item);
    containerItemsGrid.appendChild(card);
  });
}

// ── VIEW 4: FAVORITES (Uniform Cards Grid) ──

function renderFavorites() {
  favoritesItemsGrid.innerHTML = "";
  const favItems = allItems.filter((i) => i.favorite);

  favoritesMeta.textContent = `${favItems.length} starred saves`;

  if (favItems.length === 0) {
    favoritesEmpty.classList.remove("hidden");
    return;
  }
  favoritesEmpty.classList.add("hidden");

  favItems.forEach((item) => {
    const card = createUniformCard(item);
    favoritesItemsGrid.appendChild(card);
  });
}

// ── VIEW 5: SEARCH RESULTS (Uniform Cards Grid) ──

function renderSearchResults() {
  searchItemsGrid.innerHTML = "";
  if (!searchQuery) return;

  const matching = allItems.filter((i) => {
    const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
    const contentMatch = (i.content || "").toLowerCase().includes(searchQuery);
    const noteMatch = (i.note || "").toLowerCase().includes(searchQuery);
    const tagMatch = (i.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
    const sourceMatch = (i.sourceUrl || "").toLowerCase().includes(searchQuery);
    return titleMatch || contentMatch || noteMatch || tagMatch || sourceMatch;
  });

  searchResultsMeta.textContent = `${matching.length} items matching "${searchQuery}"`;

  if (matching.length === 0) {
    searchItemsGrid.innerHTML = `<div class="empty-state-card" style="grid-column: 1 / -1;"><p>No items found for "${escapeHTML(searchQuery)}"</p></div>`;
    return;
  }

  matching.forEach((item) => {
    const card = createUniformCard(item);
    searchItemsGrid.appendChild(card);
  });
}

// ── UNIFORM SAVED ITEM CARD FACTORY (Strictly 255px × 165px) ──

function createUniformCard(item) {
  const card = document.createElement("div");
  card.className = `uniform-card type-${item.type || "text"}`;
  card.dataset.id = item.id;

  const typeLabels = {
    youtube: "🎬 Video",
    quote: "💬 Quote",
    image: "🖼️ Image",
    product: "🛍️ Product",
    social: "📱 Social",
    link: "🔗 Link",
    text: "📝 Note",
  };
  const typeText = typeLabels[item.type] || "📄 Clip";
  const targetUrl = item.sourceUrl || (item.content.startsWith("http") ? item.content : "");

  // Determine thumbnail
  let thumbSrc = "";
  if (item.type === "youtube") {
    thumbSrc = item.previewImage || (item.metadata?.videoId ? `https://img.youtube.com/vi/${item.metadata.videoId}/hqdefault.jpg` : "");
  } else if (item.type === "image") {
    thumbSrc = item.previewImage || item.content;
  }

  const titleText = item.title ? item.title : item.type === "quote" ? "Saved Quote" : extractHostname(targetUrl) || "Saved Snippet";
  const snippetText = item.content || "";

  const noteBadgeHtml = item.note && item.note.trim()
    ? `<div class="card-note-chip" title="Note: ${escapeHTML(item.note)}">💡 ${escapeHTML(item.note)}</div>`
    : "";

  card.innerHTML = `
    <div class="card-top">
      <span class="type-pill ${item.type || "text"}">${typeText}</span>
      <div class="card-tools">
        <button class="card-mini-btn fav-btn ${item.favorite ? "active" : ""}" title="Favorite">
          <svg viewBox="0 0 24 24" fill="${item.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="card-mini-btn copy-btn" title="Copy Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="card-mini-btn edit-btn" title="Edit Item & Note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="card-mini-btn delete-btn" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="card-center">
      ${thumbSrc ? `<img src="${escapeHTML(thumbSrc)}" class="card-thumb-sq" alt="Thumb" loading="lazy" />` : ""}
      <div class="card-text-block">
        <div class="card-item-title">${escapeHTML(titleText)}</div>
        <div class="card-item-snippet">${escapeHTML(snippetText)}</div>
        ${noteBadgeHtml}
      </div>
    </div>

    <div class="card-bottom">
      ${
        targetUrl
          ? `<a href="${escapeHTML(targetUrl)}" target="_blank" class="card-domain-link" title="${escapeHTML(targetUrl)}">
              ${escapeHTML(extractHostname(targetUrl))} ↗
            </a>`
          : `<span></span>`
      }
      <span>${formatRelativeTime(item.createdAt)}</span>
    </div>
  `;

  card.querySelector(".fav-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  });
  card.querySelector(".copy-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(item.content);
  });
  card.querySelector(".edit-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openItemModal(item.collectionId, item.containerId, item);
  });
  card.querySelector(".delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });

  return card;
}

// ── Item Actions ──

async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  refreshActiveView();
  showToast(item.favorite ? "Favorited ★" : "Unfavorited");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch {
    showToast("Copy failed");
  }
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this saved item?")) return;
  allItems = allItems.filter((i) => i.id !== id);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});
  refreshActiveView();
  showToast("Item deleted");
}

// ── Modals Logic ──

// 1. Item Modal (Save / Edit with Note)
function openItemModal(defaultColId = null, defaultContId = null, editItem = null) {
  if (collections.length === 0) {
    showToast("Please create a folder first");
    openColModal();
    return;
  }
  if (containers.length === 0) {
    showToast("Please create a container crate first");
    openContModal(collections[0].id);
    return;
  }

  editingItemId = editItem ? editItem.id : null;
  itemModalTitle.textContent = editItem ? "Edit Item & Note" : "Save to Container";

  populateCollectionSelect(itemColSelect, editItem ? editItem.collectionId : defaultColId || collections[0]?.id);
  populateContainerSelect(itemContSelect, itemColSelect.value, editItem ? editItem.containerId : defaultContId);

  itemTitleInput.value = editItem ? editItem.title || "" : "";
  itemContentInput.value = editItem ? editItem.content || "" : "";
  itemNoteInput.value = editItem ? editItem.note || "" : "";
  itemSourceInput.value = editItem ? editItem.sourceUrl || "" : "";
  itemTagsInput.value = editItem ? (editItem.tags || []).join(", ") : "";

  itemModal.classList.remove("hidden");
  itemContentInput.focus();
}

function closeItemModal() {
  itemModal.classList.add("hidden");
  editingItemId = null;
}

async function handleSaveItemModal() {
  const content = itemContentInput.value.trim();
  if (!content) {
    itemContentInput.focus();
    return;
  }

  const colId = itemColSelect.value;
  const contId = itemContSelect.value;
  const title = itemTitleInput.value.trim();
  const note = itemNoteInput.value.trim();
  const sourceUrl = itemSourceInput.value.trim();
  const tags = itemTagsInput.value.split(",").map((t) => t.trim()).filter(Boolean);

  const classification = classifyContent(content, sourceUrl);

  if (editingItemId) {
    const idx = allItems.findIndex((i) => i.id === editingItemId);
    if (idx !== -1) {
      allItems[idx] = {
        ...allItems[idx],
        title,
        content,
        note,
        sourceUrl,
        collectionId: colId,
        containerId: contId,
        tags,
        type: classification.type,
        previewImage: classification.thumbnail || (classification.type === "image" ? content : allItems[idx].previewImage),
        updatedAt: Date.now(),
      };
      showToast("Item updated!");
    }
  } else {
    const newItem = {
      id: generateId(),
      type: classification.type,
      title: title || (classification.type === "youtube" ? "Saved YouTube" : ""),
      content,
      note,
      containerId: contId,
      collectionId: colId,
      sourceUrl,
      previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      tags,
      favorite: false,
      createdAt: Date.now(),
    };
    allItems.unshift(newItem);
    showToast("Item saved to container!");
  }

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeItemModal();
  refreshActiveView();
}

// 2. Collection Modal (Create / Edit)
function openColModal(editCol = null) {
  editingColId = editCol ? editCol.id : null;
  colModalTitle.textContent = editCol ? "Edit Folder (📁)" : "New Collection Folder (📁)";
  colNameInput.value = editCol ? editCol.name : "";
  selectedColColor = editCol ? editCol.color || "#4F46E5" : "#4F46E5";

  colColorPalette.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === selectedColColor);
  });

  colModal.classList.remove("hidden");
  colNameInput.focus();
}

function closeColModal() {
  colModal.classList.add("hidden");
  editingColId = null;
}

async function handleSaveColModal() {
  const name = colNameInput.value.trim();
  if (!name) return;

  if (editingColId) {
    const idx = collections.findIndex((c) => c.id === editingColId);
    if (idx !== -1) {
      collections[idx] = { ...collections[idx], name, color: selectedColColor };
      showToast("Folder updated!");
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

    const defaultCont = {
      id: "cont_" + generateId(),
      collectionId: newCol.id,
      name: "General",
      icon: "archive",
      color: selectedColColor,
      note: "Storage container for " + name,
      createdAt: Date.now(),
      order: 0,
    };
    containers.push(defaultCont);
    showToast(`Created folder: 📁 ${name}`);
  }

  await chrome.storage.local.set({ collections, containers });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeColModal();
  refreshActiveView();
}

// 3. Container Modal (Create / Edit with color and note)
function openContModal(parentColId = null, editCont = null) {
  editingContId = editCont ? editCont.id : null;
  contModalTitle.textContent = editCont ? "Edit Container (🗄️)" : "New Container (🗄️)";

  populateCollectionSelect(contColSelect, editCont ? editCont.collectionId : parentColId || collections[0]?.id);
  contNameInput.value = editCont ? editCont.name : "";
  contNoteInput.value = editCont ? editCont.note || editCont.description || "" : "";
  selectedContColor = editCont ? editCont.color || "#2563EB" : "#2563EB";

  contColorPalette.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === selectedContColor);
  });

  contModal.classList.remove("hidden");
  contNameInput.focus();
}

function closeContModal() {
  contModal.classList.add("hidden");
  editingContId = null;
}

async function handleSaveContModal() {
  const name = contNameInput.value.trim();
  const parentColId = contColSelect.value;
  const note = contNoteInput.value.trim();
  if (!name || !parentColId) return;

  if (editingContId) {
    const idx = containers.findIndex((c) => c.id === editingContId);
    if (idx !== -1) {
      containers[idx] = {
        ...containers[idx],
        name,
        collectionId: parentColId,
        color: selectedContColor,
        note,
        description: note,
      };
      allItems.forEach((i) => {
        if (i.containerId === editingContId) i.collectionId = parentColId;
      });
      showToast("Container updated!");
    }
  } else {
    const newCont = {
      id: "cont_" + generateId(),
      collectionId: parentColId,
      name,
      icon: "archive",
      color: selectedContColor,
      note,
      description: note,
      createdAt: Date.now(),
      order: containers.length,
    };
    containers.push(newCont);
    showToast(`Created container: 🗄️ ${name}`);
  }

  await chrome.storage.local.set({ containers, items: allItems });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeContModal();
  refreshActiveView();
}

// 4. Quick Note Modal
let activeNoteContId = null;

function openQuickNoteModal(targetContId) {
  activeNoteContId = targetContId || currentContId;
  const cont = containers.find((c) => c.id === activeNoteContId);
  if (!cont) return;
  quickNoteTextarea.value = cont.note || cont.description || "";
  noteModal.classList.remove("hidden");
  quickNoteTextarea.focus();
}

function closeQuickNoteModal() {
  noteModal.classList.add("hidden");
  activeNoteContId = null;
}

async function handleSaveQuickNote() {
  const note = quickNoteTextarea.value.trim();
  const contId = activeNoteContId || currentContId;
  const cont = containers.find((c) => c.id === contId);
  if (!cont) return;

  cont.note = note;
  cont.description = note;

  await chrome.storage.local.set({ containers });
  SyncService.pushToCloud(allItems, containers, collections).catch(() => {});

  closeQuickNoteModal();
  if (currentView === "container" && currentContId === cont.id) {
    renderContainerHero(cont);
  } else if (currentView === "collection" && currentColId) {
    renderDesktopContainers(currentColId);
  }
  showToast("Container note updated!");
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
    opt.textContent = "(No containers in this folder)";
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

// ── Export / Import Backup ──

function handleExportBackup() {
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
  showToast("Vault backup exported!");
}

async function handleImportBackup(e) {
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

    refreshActiveView();
    showToast(`Imported ${importedItems.length} items!`);
  } catch {
    showToast("Error importing backup");
  }
}

// ── Auth Modal Logic ──

async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session) {
    sidebarAuthEmail.textContent = session.user.email;
    sidebarAuthStatus.textContent = "● Synced with Cloud";
    sidebarAuthStatus.style.color = "#059669";
  } else {
    sidebarAuthEmail.textContent = "Local Vault";
    sidebarAuthStatus.textContent = "● Offline Ready";
    sidebarAuthStatus.style.color = "#6B7280";
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
      refreshActiveView();
      showToast("Vault synced!");
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
    !noteModal.classList.contains("hidden") ||
    !authModal.classList.contains("hidden")
  );
}

function closeAllModals() {
  closeItemModal();
  closeColModal();
  closeContModal();
  closeQuickNoteModal();
  closeAuthModal();
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
