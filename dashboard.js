// ── SaveIt: Desktop Icon View & Relevant Sidebar Workspace Controller (Containers Only) ──

let containers = [];
let allItems = [];

// Navigation State
let currentView = "home"; // "home" | "container" | "favorites" | "search"
let currentContId = null;
let contTypeFilter = "all";
let searchQuery = "";

// Modals State
let editingItemId = null;
let editingContId = null;
let selectedContColor = "#2563EB";
let authIsSignUp = false;

// ── DOM References ──
// Sidebar
const sidebarBrandHome = document.getElementById("sidebar-brand-home");
const navLinkHome = document.getElementById("nav-link-home");
const navLinkStarred = document.getElementById("nav-link-starred");
const badgeTotalItems = document.getElementById("badge-total-items");
const badgeStarredItems = document.getElementById("badge-starred-items");
const btnSidebarNewCont = document.getElementById("btn-sidebar-new-cont");
const sidebarContainersList = document.getElementById("sidebar-containers-list");
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
const viewContainer = document.getElementById("view-container");
const viewFavorites = document.getElementById("view-favorites");
const viewSearchResults = document.getElementById("view-search-results");

// Library View (Main Canvas Grid Matching User Sketch)
const libraryItemsGrid = document.getElementById("library-items-grid");
const libraryEmpty = document.getElementById("library-empty");
const libraryCounter = document.getElementById("library-counter");
const libraryContainersStrip = document.getElementById("library-containers-strip");
const btnLibraryAddItem = document.getElementById("btn-library-add-item");
const btnLibraryNewCont = document.getElementById("btn-library-new-cont");
const btnCreateFirstSave = document.getElementById("btn-create-first-save");
const libraryTypeFilters = document.getElementById("library-type-filters");

let activeLibContainerFilter = "all";
let activeLibTypeFilter = "all";

// Container View
const btnBackToHome = document.getElementById("btn-back-to-home");
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
const itemContentInput = document.getElementById("item-content-input");
const itemNoteInput = document.getElementById("item-note-input");
const itemTagsInput = document.getElementById("item-tags-input");
let modalActiveContId = null;

// Container Modal
const contModal = document.getElementById("cont-modal");
const contModalTitle = document.getElementById("cont-modal-title");
const contModalClose = document.getElementById("cont-modal-close");
const contModalCancel = document.getElementById("cont-modal-cancel");
const contModalSave = document.getElementById("cont-modal-save");
const contNameInput = document.getElementById("cont-name-input");
const contNoteInput = document.getElementById("cont-note-input");
const contColorPalette = document.getElementById("cont-color-palette");

// Quick Note Modal
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
  containers = state.containers || [];
  allItems = state.items || [];

  // If no containers exist, create default
  if (containers.length === 0) {
    const defaultCont = {
      id: "cont_" + generateId(),
      name: "General",
      icon: "archive",
      color: "#2563EB",
      note: "Default container for all saves",
      createdAt: Date.now(),
      order: 0,
    };
    containers.push(defaultCont);
    await chrome.storage.local.set({ containers });
  }

  const stored = await chrome.storage.local.get(["lastActiveContainer"]);
  if (stored.lastActiveContainer && containers.some((c) => c.id === stored.lastActiveContainer)) {
    currentContId = stored.lastActiveContainer;
  } else {
    currentContId = containers[0]?.id;
  }

  updateSidebar();
  renderLibraryView();
}

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
      containers = res.containers || [];
      allItems = res.items || [];
      refreshActiveView();
    }
  } catch (err) {
    console.warn("Auto-sync background check:", err);
  }
}

// ── Event Listeners ──
function setupEventListeners() {
  // Navigation
  sidebarBrandHome.addEventListener("click", navigateToHome);
  navLinkHome.addEventListener("click", navigateToHome);
  navLinkStarred.addEventListener("click", navigateToStarred);

  if (btnSidebarNewCont) {
    btnSidebarNewCont.addEventListener("click", () => openContModal());
  }

  // Auth Button in Sidebar
  btnSidebarAuth.addEventListener("click", openAuthModal);

  // Topbar Actions
  btnTopAddItem.addEventListener("click", () => openItemModal(currentContId));
  btnExportBackup.addEventListener("click", handleExportBackup);
  btnImportBackup.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", handleImportBackup);

  // Search Input
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

  // Hotkeys
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== globalSearchInput && !isModalOpen()) {
      e.preventDefault();
      globalSearchInput.focus();
    } else if (e.key === "Escape") {
      if (isModalOpen()) closeAllModals();
      else if (currentView === "search") exitSearch();
    }
  });

  // Library View Actions & Filters
  if (btnLibraryAddItem) {
    btnLibraryAddItem.addEventListener("click", () => openItemModal());
  }
  if (btnLibraryNewCont) {
    btnLibraryNewCont.addEventListener("click", () => openContModal());
  }
  if (btnCreateFirstSave) {
    btnCreateFirstSave.addEventListener("click", () => openItemModal());
  }
  if (libraryTypeFilters) {
    libraryTypeFilters.querySelectorAll(".chip-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        libraryTypeFilters.querySelectorAll(".chip-filter").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeLibTypeFilter = btn.dataset.filter;
        renderLibraryView();
      });
    });
  }

  // Container View Buttons
  btnBackToHome.addEventListener("click", navigateToHome);
  btnEditContNote.addEventListener("click", () => openQuickNoteModal(currentContId));
  btnEditContDetails.addEventListener("click", () => {
    const cont = containers.find((c) => c.id === currentContId);
    if (cont) openContModal(cont);
  });
  btnAddItemToCurrentCont.addEventListener("click", () => openItemModal(currentContId));
  btnEmptyContAdd.addEventListener("click", () => openItemModal(currentContId));

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
  currentContId = null;

  highlightSidebarLink(navLinkHome);
  showPanel(viewHome);
  updateBreadcrumbs([{ label: "Library", id: "library" }]);

  updateSidebar();
  renderLibraryView();
}

function navigateToStarred() {
  currentView = "favorites";
  currentContId = null;

  highlightSidebarLink(navLinkStarred);
  showPanel(viewFavorites);
  updateBreadcrumbs([
    { label: "Library", action: navigateToHome },
    { label: "★ Starred Saves", active: true },
  ]);

  updateSidebar();
  renderFavorites();
}

function navigateToContainer(contId) {
  const cont = containers.find((c) => c.id === contId);
  if (!cont) return navigateToHome();

  currentView = "container";
  currentContId = contId;

  chrome.storage.local.set({ lastActiveContainer: contId });

  highlightSidebarContainer(contId);
  showPanel(viewContainer);
  updateBreadcrumbs([
    { label: "Library", action: navigateToHome },
    { label: `📦 ${cont.name}`, active: true },
  ]);

  updateSidebar();
  renderContainerHero(cont);
  renderContainerItems();
}

function navigateToSearch() {
  currentView = "search";
  showPanel(viewSearchResults);
  updateBreadcrumbs([
    { label: "Library", action: navigateToHome },
    { label: `🔍 Search: "${searchQuery}"`, active: true },
  ]);
  renderSearchResults();
}

function exitSearch() {
  if (currentContId) navigateToContainer(currentContId);
  else navigateToHome();
}

function showPanel(targetPanel) {
  [viewHome, viewContainer, viewFavorites, viewSearchResults].forEach((panel) => {
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
  else if (currentView === "container" && currentContId) navigateToContainer(currentContId);
  else if (currentView === "search") renderSearchResults();
}

// ── SIDEBAR RENDERING ──

function updateSidebar() {
  badgeTotalItems.textContent = allItems.length;
  badgeStarredItems.textContent = allItems.filter((i) => i.favorite).length;

  sidebarContainersList.innerHTML = "";

  if (containers.length === 0) {
    sidebarContainersList.innerHTML = `
      <div style="padding: 10px 12px; font-size: 11.5px; color: var(--text-muted); font-style: italic;">
        No containers yet
      </div>
    `;
    return;
  }

  containers.forEach((cont) => {
    const contItems = allItems.filter((i) => i.containerId === cont.id);
    const isCurrentCont = currentView === "container" && currentContId === cont.id;

    const btn = document.createElement("button");
    btn.className = `sidebar-link ${isCurrentCont ? "active" : ""}`;
    btn.dataset.contId = cont.id;

    const crateColor = cont.color || "#2563EB";
    btn.innerHTML = `
      <span class="sidebar-icon" style="color: ${crateColor}">📦</span>
      <span class="sidebar-label" title="${escapeHTML(cont.name)}">${escapeHTML(cont.name)}</span>
      <span class="sidebar-badge">${contItems.length}</span>
    `;

    btn.addEventListener("click", () => navigateToContainer(cont.id));
    sidebarContainersList.appendChild(btn);
  });
}

function highlightSidebarLink(activeBtn) {
  document.querySelectorAll(".workspace-sidebar .sidebar-link").forEach((btn) => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

function highlightSidebarContainer(contId) {
  document.querySelectorAll(".workspace-sidebar .sidebar-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.contId === contId);
  });
}

// ── VIEW 1: LIBRARY (Expansive Grid of Uniform Cards Matching Sketch) ──

function renderLibraryContainersStrip() {
  if (!libraryContainersStrip) return;
  libraryContainersStrip.innerHTML = "";

  // 1. "All" Pill
  const allBtn = document.createElement("button");
  allBtn.className = `lib-cont-pill ${activeLibContainerFilter === "all" ? "active" : ""}`;
  allBtn.innerHTML = `
    <span>📦 All</span>
    <span class="lib-pill-count">${allItems.length}</span>
  `;
  allBtn.addEventListener("click", () => {
    activeLibContainerFilter = "all";
    renderLibraryView();
  });
  libraryContainersStrip.appendChild(allBtn);

  // 2. Individual Container Pills
  containers.forEach((cont) => {
    const contItems = allItems.filter((i) => i.containerId === cont.id);
    const crateColor = cont.color || "#2563EB";
    const isActive = activeLibContainerFilter === cont.id;

    const pill = document.createElement("button");
    pill.className = `lib-cont-pill ${isActive ? "active" : ""}`;
    pill.innerHTML = `
      <span class="lib-cont-dot" style="background: ${crateColor};"></span>
      <span class="lib-cont-name" title="${escapeHTML(cont.name)}">${escapeHTML(cont.name)}</span>
      <span class="lib-pill-count">${contItems.length}</span>
    `;

    pill.addEventListener("click", () => {
      if (activeLibContainerFilter === cont.id) {
        activeLibContainerFilter = "all";
      } else {
        activeLibContainerFilter = cont.id;
      }
      renderLibraryView();
    });

    pill.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      navigateToContainer(cont.id);
    });

    libraryContainersStrip.appendChild(pill);
  });
}

function renderLibraryView() {
  if (!libraryItemsGrid) return;

  renderLibraryContainersStrip();

  let items = [...allItems];

  // Container Filter
  if (activeLibContainerFilter !== "all") {
    items = items.filter((i) => i.containerId === activeLibContainerFilter);
  }

  // Type Filter
  if (activeLibTypeFilter !== "all") {
    if (activeLibTypeFilter === "favorite") {
      items = items.filter((i) => i.favorite);
    } else {
      items = items.filter((i) => i.type === activeLibTypeFilter);
    }
  }

  // Sort descending by creation date
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Update counter
  if (libraryCounter) {
    if (activeLibContainerFilter === "all" && activeLibTypeFilter === "all") {
      libraryCounter.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    } else {
      libraryCounter.textContent = `${items.length} of ${allItems.length} items`;
    }
  }

  // Empty state handling
  if (items.length === 0) {
    libraryItemsGrid.innerHTML = "";
    if (libraryEmpty) {
      libraryEmpty.classList.remove("hidden");
      const emptyTitle = libraryEmpty.querySelector("h3");
      const emptyText = libraryEmpty.querySelector("p");
      if (allItems.length === 0) {
        if (emptyTitle) emptyTitle.textContent = "Your library is empty";
        if (emptyText) emptyText.textContent = "Save articles, quotes, YouTube videos, and images to build your personal knowledge vault.";
      } else {
        if (emptyTitle) emptyTitle.textContent = "No matching items found";
        if (emptyText) emptyText.textContent = "Try selecting a different container or type filter.";
      }
    }
    return;
  }

  if (libraryEmpty) libraryEmpty.classList.add("hidden");
  libraryItemsGrid.innerHTML = "";

  items.forEach((item) => {
    const card = createUniformCard(item);
    libraryItemsGrid.appendChild(card);
  });
}

const renderDesktopContainers = renderLibraryView;

// ── VIEW 2: CONTAINER (Inside Container - Uniform Grid & Note Hero) ──

function renderContainerHero(cont) {
  const crateColor = cont.color || "#2563EB";
  contHeroStripe.style.background = crateColor;
  contHeroTitle.textContent = cont.name;

  const contItems = allItems.filter((i) => i.containerId === cont.id);
  contHeroMeta.textContent = `${contItems.length} saved items`;

  const noteText = (cont.note || cont.description || "").trim();
  if (noteText) {
    contHeroNoteText.textContent = noteText;
    contHeroNoteText.classList.remove("empty-note");
  } else {
    contHeroNoteText.textContent = "(No note yet. Click 'Edit Note' to add guidelines or hex palettes)";
    contHeroNoteText.classList.add("empty-note");
  }
}

function renderContainerItems() {
  containerItemsGrid.innerHTML = "";
  let items = allItems.filter((i) => i.containerId === currentContId);

  // Type Filter
  if (contTypeFilter !== "all") {
    if (contTypeFilter === "favorite") {
      items = items.filter((i) => i.favorite);
    } else {
      items = items.filter((i) => i.type === contTypeFilter);
    }
  }

  if (items.length === 0) {
    containerEmptyState.classList.remove("hidden");
    return;
  }
  containerEmptyState.classList.add("hidden");

  items.forEach((item) => {
    const card = createUniformCard(item);
    containerItemsGrid.appendChild(card);
  });
}

// ── VIEW 3: FAVORITES ──

function renderFavorites() {
  favoritesItemsGrid.innerHTML = "";
  const favItems = allItems.filter((i) => i.favorite);

  favoritesMeta.textContent = `${favItems.length} starred items`;

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

// ── VIEW 4: SEARCH RESULTS ──

function renderSearchResults() {
  searchItemsGrid.innerHTML = "";
  if (!searchQuery) {
    searchResultsMeta.textContent = "Type to search";
    return;
  }

  const matches = allItems.filter((i) => {
    const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
    const contentMatch = (i.content || "").toLowerCase().includes(searchQuery);
    const noteMatch = (i.note || "").toLowerCase().includes(searchQuery);
    const tagMatch = (i.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
    const sourceMatch = (i.sourceTitle || i.sourceUrl || "").toLowerCase().includes(searchQuery);
    return titleMatch || contentMatch || noteMatch || tagMatch || sourceMatch;
  });

  searchResultsMeta.textContent = `${matches.length} matching saves found for "${searchQuery}"`;

  if (matches.length === 0) {
    searchItemsGrid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-icon-box">🔍</div>
        <h3>No matching saves</h3>
        <p>Try searching for different keywords, URLs, or notes.</p>
      </div>
    `;
    return;
  }

  matches.forEach((item) => {
    const card = createUniformCard(item);
    searchItemsGrid.appendChild(card);
  });
}

// ── UNIFORM CARD BUILDER FACTORY (STRICT SAME SIZE) ──

function createUniformCard(item) {
  const card = document.createElement("div");
  card.className = `uniform-save-card type-${item.type || "text"}`;
  card.dataset.id = item.id;

  const parentCont = containers.find((c) => c.id === item.containerId);
  const contName = parentCont ? parentCont.name : "Container";
  const contColor = parentCont ? parentCont.color || "#2563EB" : "#2563EB";

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
  const timeStr = formatRelativeTime(item.createdAt);
  const targetUrl = item.sourceUrl || (item.content.startsWith("http") ? item.content : "");

  let visualSnippetHtml = "";
  if (item.type === "youtube") {
    const thumb = item.previewImage || (item.metadata?.videoId ? `https://img.youtube.com/vi/${item.metadata.videoId}/hqdefault.jpg` : "");
    if (thumb) {
      visualSnippetHtml = `
        <div class="uniform-card-media">
          <img src="${thumb}" alt="YouTube Thumbnail" loading="lazy" />
          <div class="uniform-play-badge">▶</div>
        </div>
      `;
    }
  } else if (item.type === "image") {
    const imgSrc = item.previewImage || item.content;
    visualSnippetHtml = `
      <div class="uniform-card-media">
        <img src="${escapeHTML(imgSrc)}" alt="Saved Image" loading="lazy" />
      </div>
    `;
  }

  let textSnippet = item.content || "";
  if (item.type === "quote") {
    textSnippet = `“${textSnippet}”`;
  }

  card.innerHTML = `
    <!-- Top Row: Type Pill + Container Badge + Quick Hover Actions -->
    <div class="uniform-card-header">
      <div class="uniform-header-left">
        <span class="uniform-type-chip ${item.type || "text"}">${typeText}</span>
        <button class="uniform-cont-tag" title="Container: ${escapeHTML(contName)}" data-cont-id="${item.containerId}">
          <span class="cont-tag-dot" style="background: ${contColor};"></span>
          <span>${escapeHTML(contName)}</span>
        </button>
      </div>

      <div class="uniform-hover-actions">
        <button class="u-action-btn fav-btn ${item.favorite ? "active" : ""}" title="${item.favorite ? "Unfavorite" : "Favorite"}">
          ★
        </button>
        <button class="u-action-btn copy-btn" title="Copy Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="u-action-btn edit-btn" title="Edit Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="u-action-btn delete-btn" title="Delete Item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Media or Title Banner -->
    ${visualSnippetHtml}

    <!-- Title & Body Content -->
    <div class="uniform-card-body">
      ${item.title ? `<h4 class="uniform-card-title">${escapeHTML(item.title)}</h4>` : ""}
      <p class="uniform-card-snippet ${item.type === "quote" ? "quote-font" : ""}">${escapeHTML(textSnippet)}</p>
    </div>

    <!-- Swayed / Curled Note on Item if present -->
    ${
      item.note && item.note.trim()
        ? `
        <div class="uniform-card-note" title="Personal note: ${escapeHTML(item.note)}">
          <span class="note-pin">📌</span>
          <span class="note-text">${escapeHTML(item.note)}</span>
        </div>
        `
        : ""
    }

    <!-- Bottom Footer Row: Source Hostname + Timestamp -->
    <div class="uniform-card-footer">
      ${
        targetUrl
          ? `<a href="${escapeHTML(targetUrl)}" target="_blank" class="uniform-source-link" title="${escapeHTML(targetUrl)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>${escapeHTML(extractHostname(targetUrl))}</span>
            </a>`
          : `<span></span>`
      }
      <span class="uniform-time">${timeStr}</span>
    </div>
  `;

  // Event Handlers
  const favBtn = card.querySelector(".fav-btn");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  });

  const copyBtn = card.querySelector(".copy-btn");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(item.content);
  });

  const editBtn = card.querySelector(".edit-btn");
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openItemModal(item.containerId, item);
  });

  const deleteBtn = card.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });

  const contTag = card.querySelector(".uniform-cont-tag");
  contTag.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateToContainer(item.containerId);
  });

  card.addEventListener("click", () => {
    if (targetUrl) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      openItemModal(item.containerId, item);
    }
  });

  return card;
}

// ── MODALS LOGIC ──

// 1. Item Modal (Save / Edit with Note)
function openItemModal(contId = null, editItem = null) {
  if (containers.length === 0) {
    showToast("Please create a container first");
    openContModal();
    return;
  }

  editingItemId = editItem ? editItem.id : null;
  modalActiveContId = editItem ? editItem.containerId : (contId || currentContId || containers[0]?.id);
  const targetCont = containers.find((c) => c.id === modalActiveContId);

  itemModalTitle.textContent = editItem ? "Edit Saved Item" : (targetCont ? `Save to 📦 ${targetCont.name}` : "Save Item");

  itemContentInput.value = editItem ? editItem.content || "" : "";
  itemNoteInput.value = editItem ? editItem.note || "" : "";
  itemTagsInput.value = editItem && editItem.tags ? editItem.tags.join(", ") : "";

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

  const contId = modalActiveContId || (containers.length > 0 ? containers[0].id : "");
  const targetCont = containers.find((c) => c.id === contId);
  const note = itemNoteInput.value.trim();
  const tags = itemTagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const isUrl = /^https?:\/\//i.test(content);
  const classification = classifyContent(content, isUrl ? content : "");

  let title = "";
  if (classification.type === "youtube") {
    title = "YouTube Video";
  } else if (classification.type === "quote") {
    title = "Saved Quote";
  } else if (isUrl) {
    title = extractHostname(content) || "Web Link";
  } else {
    title = content.length > 40 ? content.slice(0, 40) + "…" : content;
  }

  const sourceUrl = isUrl ? content : "";

  if (editingItemId) {
    const idx = allItems.findIndex((i) => i.id === editingItemId);
    if (idx !== -1) {
      allItems[idx] = {
        ...allItems[idx],
        content,
        title: allItems[idx].title || title,
        note,
        sourceUrl: allItems[idx].sourceUrl || sourceUrl,
        tags,
        containerId: contId,
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
      title,
      content,
      note,
      containerId: contId,
      previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl,
      sourceTitle: title,
      tags,
      favorite: false,
      createdAt: Date.now(),
    };
    allItems.unshift(newItem);
    showToast(`Saved to 📦 ${targetCont ? targetCont.name : "Container"}!`);
  }

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, []).catch(() => {});

  closeItemModal();
  refreshActiveView();
}

// 2. Container Modal (Create / Edit with color and note)
function openContModal(editCont = null) {
  editingContId = editCont ? editCont.id : null;
  contModalTitle.textContent = editCont ? "Edit Container (📦)" : "New Container (📦)";

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
  const note = contNoteInput.value.trim();
  if (!name) return;

  if (editingContId) {
    const idx = containers.findIndex((c) => c.id === editingContId);
    if (idx !== -1) {
      containers[idx] = {
        ...containers[idx],
        name,
        color: selectedContColor,
        note,
        description: note,
      };
      showToast("Container updated!");
    }
  } else {
    const newCont = {
      id: "cont_" + generateId(),
      name,
      icon: "archive",
      color: selectedContColor,
      note,
      description: note,
      createdAt: Date.now(),
      order: containers.length,
    };
    containers.push(newCont);
    showToast(`Created container: 📦 ${name}`);
  }

  await chrome.storage.local.set({ containers, items: allItems });
  SyncService.pushToCloud(allItems, containers, []).catch(() => {});

  closeContModal();
  refreshActiveView();
}

// 3. Quick Note Modal
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
  SyncService.pushToCloud(allItems, containers, []).catch(() => {});

  closeQuickNoteModal();
  if (currentView === "container" && currentContId === cont.id) {
    renderContainerHero(cont);
  } else {
    renderLibraryView();
  }
  showToast("Container note updated!");
}

// ── Select Helpers ──

function populateContainerSelect(selectEl, selectedContId) {
  selectEl.innerHTML = "";
  if (containers.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(No containers created)";
    selectEl.appendChild(opt);
    return;
  }

  containers.forEach((cont) => {
    const opt = document.createElement("option");
    opt.value = cont.id;
    opt.textContent = `📦 ${cont.name}`;
    if (cont.id === selectedContId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ── Quick Item Actions ──

async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, []).catch(() => {});
  refreshActiveView();
  showToast(item.favorite ? "Added to Starred Saves ★" : "Removed from Starred");
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
  if (!confirm("Delete this saved item?")) return;
  allItems = allItems.filter((i) => i.id !== id);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, containers, []).catch(() => {});
  refreshActiveView();
  showToast("Item deleted");
}

// ── Export / Import ──

function handleExportBackup() {
  const data = {
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

async function handleImportBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let importedItems = Array.isArray(data) ? data : data.items || [];
    let importedContainers = data.containers || [];

    const contMap = new Map();
    containers.forEach((c) => contMap.set(c.id, c));
    importedContainers.forEach((c) => { if (c && c.id && !contMap.has(c.id)) contMap.set(c.id, c); });

    const itemMap = new Map();
    allItems.forEach((i) => itemMap.set(i.id, i));
    importedItems.forEach((i) => { if (i && i.id && !itemMap.has(i.id)) itemMap.set(i.id, i); });

    containers = Array.from(contMap.values());
    allItems = Array.from(itemMap.values());

    await chrome.storage.local.set({ containers, items: allItems });
    await SyncService.ensureInitializedAndMigrated();
    SyncService.pushToCloud(allItems, containers, []).catch(() => {});

    refreshActiveView();
    showToast(`Imported ${importedItems.length} items!`);
  } catch (err) {
    showToast("Failed to parse backup file");
  }
}

// ── Auth Modal Logic ──

async function checkAuthStatus() {
  const session = await SyncService.getUser();
  if (session) {
    sidebarAuthEmail.textContent = session.user.email;
    sidebarAuthStatus.textContent = "🟢 Synced with Cloud";
    sidebarAuthStatus.style.color = "#059669";
  } else {
    sidebarAuthEmail.textContent = "Local Vault";
    sidebarAuthStatus.textContent = "● Offline Ready";
    sidebarAuthStatus.style.color = "var(--text-muted)";
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
      containers = res.containers || [];
      allItems = res.items || [];
      refreshActiveView();
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

// ── Modals Helper ──

function isModalOpen() {
  return [itemModal, contModal, noteModal, authModal].some((m) => !m.classList.contains("hidden"));
}

function closeAllModals() {
  closeItemModal();
  closeContModal();
  closeQuickNoteModal();
  closeAuthModal();
}

// ── Helpers ──

let toastTimer = null;
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

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
