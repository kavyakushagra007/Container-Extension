// ── SaveIt: Digital Workspace & Web Vault (Library Only) ──

let allItems = [];

// Navigation State
let currentView = "home"; // "home" | "favorites" | "search"
let searchQuery = "";
let activeLibTypeFilter = "all";

// Modals State
let editingItemId = null;
let activeDetailItem = null;
let authIsSignUp = false;

// ── DOM References ──
// Sidebar
const sidebarBrandHome = document.getElementById("sidebar-brand-home");
const navLinkHome = document.getElementById("nav-link-home");
const navLinkStarred = document.getElementById("nav-link-starred");
const badgeTotalItems = document.getElementById("badge-total-items");
const badgeStarredItems = document.getElementById("badge-starred-items");
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
const viewFavorites = document.getElementById("view-favorites");
const viewSearchResults = document.getElementById("view-search-results");

// Library View
const libraryItemsGrid = document.getElementById("library-items-grid");
const libraryEmpty = document.getElementById("library-empty");
const libraryCounter = document.getElementById("library-counter");
const btnLibraryAddItem = document.getElementById("btn-library-add-item");
const btnCreateFirstSave = document.getElementById("btn-create-first-save");
const libraryTypeFilters = document.getElementById("library-type-filters");

// Favorites View
const favoritesItemsGrid = document.getElementById("favorites-items-grid");
const favoritesMeta = document.getElementById("favorites-meta");
const favoritesEmpty = document.getElementById("favorites-empty");

// Search Results View
const searchItemsGrid = document.getElementById("search-items-grid");
const searchResultsMeta = document.getElementById("search-results-meta");
const btnExitSearch = document.getElementById("btn-exit-search");

// Item Edit / Add Modal
const itemModal = document.getElementById("item-modal");
const itemModalTitle = document.getElementById("item-modal-title");
const itemModalClose = document.getElementById("item-modal-close");
const itemModalCancel = document.getElementById("item-modal-cancel");
const itemModalSave = document.getElementById("item-modal-save");
const itemContentInput = document.getElementById("item-content-input");
const itemNoteInput = document.getElementById("item-note-input");
const itemTagsInput = document.getElementById("item-tags-input");

// Item Detailed View Modal
const itemDetailModal = document.getElementById("item-detail-modal");
const dashDetailCloseX = document.getElementById("dash-detail-close-x");
const dashDetailTypeBadge = document.getElementById("dash-detail-type-badge");
const dashDetailDate = document.getElementById("dash-detail-date");
const dashDetailMediaWrap = document.getElementById("dash-detail-media-wrap");
const dashDetailMediaImg = document.getElementById("dash-detail-media-img");
const dashDetailTitle = document.getElementById("dash-detail-title");
const dashDetailContent = document.getElementById("dash-detail-content");
const dashDetailNoteWrap = document.getElementById("dash-detail-note-wrap");
const dashDetailNoteText = document.getElementById("dash-detail-note-text");
const dashDetailTagsWrap = document.getElementById("dash-detail-tags-wrap");
const dashDetailTagsList = document.getElementById("dash-detail-tags-list");
const dashDetailLinkBtn = document.getElementById("dash-detail-link-btn");
const dashDetailFavBtn = document.getElementById("dash-detail-fav-btn");
const dashDetailCopyBtn = document.getElementById("dash-detail-copy-btn");
const dashDetailEditBtn = document.getElementById("dash-detail-edit-btn");
const dashDetailDeleteBtn = document.getElementById("dash-detail-delete-btn");

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
  allItems = state.items || [];

  updateSidebar();
  renderLibraryView();
}

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
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
  if (sidebarBrandHome) sidebarBrandHome.addEventListener("click", navigateToHome);
  if (navLinkHome) navLinkHome.addEventListener("click", navigateToHome);
  if (navLinkStarred) navLinkStarred.addEventListener("click", navigateToStarred);

  // Auth Button in Sidebar
  if (btnSidebarAuth) btnSidebarAuth.addEventListener("click", openAuthModal);

  // Topbar Actions
  if (btnTopAddItem) btnTopAddItem.addEventListener("click", () => openItemModal());
  if (btnExportBackup) btnExportBackup.addEventListener("click", handleExportBackup);
  if (btnImportBackup) btnImportBackup.addEventListener("click", () => importFile.click());
  if (importFile) importFile.addEventListener("change", handleImportBackup);

  // Search Input
  if (globalSearchInput) {
    globalSearchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) searchClearBtn.classList.toggle("hidden", searchQuery.length === 0);
      if (searchQuery.length > 0) {
        navigateToSearch();
      } else {
        exitSearch();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      globalSearchInput.value = "";
      searchQuery = "";
      searchClearBtn.classList.add("hidden");
      exitSearch();
    });
  }

  if (btnExitSearch) {
    btnExitSearch.addEventListener("click", () => {
      globalSearchInput.value = "";
      searchQuery = "";
      if (searchClearBtn) searchClearBtn.classList.add("hidden");
      exitSearch();
    });
  }

  // Hotkeys
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== globalSearchInput && !isModalOpen()) {
      e.preventDefault();
      if (globalSearchInput) globalSearchInput.focus();
    } else if (e.key === "Escape") {
      if (isModalOpen()) closeAllModals();
      else if (currentView === "search") exitSearch();
    }
  });

  // Library View Actions & Filters
  if (btnLibraryAddItem) {
    btnLibraryAddItem.addEventListener("click", () => openItemModal());
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

  // Item Modal Listeners
  if (itemModalClose) itemModalClose.addEventListener("click", closeItemModal);
  if (itemModalCancel) itemModalCancel.addEventListener("click", closeItemModal);
  if (itemModalSave) itemModalSave.addEventListener("click", handleSaveItemModal);

  // Item Detailed View Modal Listeners
  if (dashDetailCloseX) dashDetailCloseX.addEventListener("click", closeItemDetailModal);
  if (itemDetailModal) {
    const backdrop = itemDetailModal.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeItemDetailModal);
  }
  if (dashDetailFavBtn) {
    dashDetailFavBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        toggleFavorite(activeDetailItem.id);
        openItemDetailModal(activeDetailItem);
      }
    });
  }
  if (dashDetailCopyBtn) {
    dashDetailCopyBtn.addEventListener("click", () => {
      if (activeDetailItem) copyToClipboard(activeDetailItem.content);
    });
  }
  if (dashDetailEditBtn) {
    dashDetailEditBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        const itemToEdit = activeDetailItem;
        closeItemDetailModal();
        openItemModal(itemToEdit);
      }
    });
  }
  if (dashDetailDeleteBtn) {
    dashDetailDeleteBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        const idToDelete = activeDetailItem.id;
        closeItemDetailModal();
        deleteItem(idToDelete);
      }
    });
  }

  // Auth Modal Listeners
  if (authModalClose) authModalClose.addEventListener("click", closeAuthModal);
  if (authModalCancel) authModalCancel.addEventListener("click", closeAuthModal);
  if (authToggleMode) authToggleMode.addEventListener("click", toggleAuthMode);
  if (authSubmitBtn) authSubmitBtn.addEventListener("click", handleAuthSubmit);
  if (btnSyncNow) btnSyncNow.addEventListener("click", handleManualSync);
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);
}

// ── Routing & Navigation ──

function navigateToHome() {
  currentView = "home";

  highlightSidebarLink(navLinkHome);
  showPanel(viewHome);
  updateBreadcrumbs([{ label: "Library", id: "library" }]);

  updateSidebar();
  renderLibraryView();
}

function navigateToStarred() {
  currentView = "favorites";

  highlightSidebarLink(navLinkStarred);
  showPanel(viewFavorites);
  updateBreadcrumbs([
    { label: "Library", action: navigateToHome },
    { label: "★ Starred Saves", active: true },
  ]);

  updateSidebar();
  renderFavorites();
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
  navigateToHome();
}

function showPanel(targetPanel) {
  [viewHome, viewFavorites, viewSearchResults].forEach((panel) => {
    if (panel) panel.classList.toggle("hidden", panel !== targetPanel);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateBreadcrumbs(crumbs) {
  if (!breadcrumbTrail) return;
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
  if (currentView === "home") renderLibraryView();
  else if (currentView === "favorites") renderFavorites();
  else if (currentView === "search") renderSearchResults();
}

// ── SIDEBAR RENDERING ──

function updateSidebar() {
  if (badgeTotalItems) badgeTotalItems.textContent = allItems.length;
  if (badgeStarredItems) badgeStarredItems.textContent = allItems.filter((i) => i.favorite).length;
}

function highlightSidebarLink(activeBtn) {
  document.querySelectorAll(".workspace-sidebar .sidebar-link").forEach((btn) => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

// ── VIEW 1: LIBRARY (Expansive Grid of Uniform Cards) ──

function renderLibraryView() {
  if (!libraryItemsGrid) return;

  let items = [...allItems];

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
    if (activeLibTypeFilter === "all") {
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
        if (emptyText) emptyText.textContent = "Try selecting a different type filter.";
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

// ── VIEW 2: FAVORITES / STARRED ──

function renderFavorites() {
  if (!favoritesItemsGrid) return;
  const starred = allItems.filter((i) => i.favorite);
  starred.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (favoritesMeta) {
    favoritesMeta.textContent = `${starred.length} ${starred.length === 1 ? "item" : "items"} marked as favorite`;
  }

  if (starred.length === 0) {
    favoritesItemsGrid.innerHTML = "";
    if (favoritesEmpty) favoritesEmpty.classList.remove("hidden");
    return;
  }

  if (favoritesEmpty) favoritesEmpty.classList.add("hidden");
  favoritesItemsGrid.innerHTML = "";

  starred.forEach((item) => {
    const card = createUniformCard(item);
    favoritesItemsGrid.appendChild(card);
  });
}

// ── VIEW 3: SEARCH RESULTS ──

function renderSearchResults() {
  if (!searchItemsGrid) return;

  if (!searchQuery) {
    exitSearch();
    return;
  }

  const results = allItems.filter((i) => {
    const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
    const contentMatch = (i.content || "").toLowerCase().includes(searchQuery);
    const noteMatch = (i.note || "").toLowerCase().includes(searchQuery);
    const tagMatch = (i.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
    const sourceMatch = (i.sourceTitle || i.sourceUrl || "").toLowerCase().includes(searchQuery);
    return titleMatch || contentMatch || noteMatch || tagMatch || sourceMatch;
  });

  results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (searchResultsMeta) {
    searchResultsMeta.textContent = `Found ${results.length} ${results.length === 1 ? "result" : "results"} for "${searchQuery}"`;
  }

  if (results.length === 0) {
    searchItemsGrid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-icon-box">🔍</div>
        <h3>No matches found</h3>
        <p>No saved items matched "${escapeHTML(searchQuery)}". Try searching with different keywords.</p>
      </div>
    `;
    return;
  }

  searchItemsGrid.innerHTML = "";
  results.forEach((item) => {
    const card = createUniformCard(item);
    searchItemsGrid.appendChild(card);
  });
}

// ── UNIFORM CARD BUILDER FACTORY ──

function createUniformCard(item) {
  const card = document.createElement("div");
  card.className = `uniform-save-card type-${item.type || "text"}`;
  card.dataset.id = item.id;

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
    <!-- Top Row: Type Pill + Quick Hover Actions -->
    <div class="uniform-card-header">
      <div class="uniform-header-left">
        <span class="uniform-type-chip ${item.type || "text"}">${typeText}</span>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
    ${item.note && item.note.trim()
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
      ${targetUrl
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
  if (favBtn) {
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item.id);
    });
  }

  const copyBtn = card.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyToClipboard(item.content);
    });
  }

  const editBtn = card.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openItemModal(item);
    });
  }

  const deleteBtn = card.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteItem(item.id);
    });
  }

  const sourceLink = card.querySelector(".uniform-source-link");
  if (sourceLink) {
    sourceLink.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Click card opens detailed view (not direct link navigation!)
  card.addEventListener("click", () => {
    openItemDetailModal(item);
  });

  return card;
}

// ── MODALS LOGIC ──

// 1. Item Modal (Save / Edit with Note)
function openItemModal(editItem = null) {
  editingItemId = editItem ? editItem.id : null;

  if (itemModalTitle) {
    itemModalTitle.textContent = editItem ? "Edit Saved Item" : "Save Item to Library";
  }

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
      previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl,
      sourceTitle: title,
      tags,
      favorite: false,
      createdAt: Date.now(),
    };
    allItems.unshift(newItem);
    showToast("Saved to Library!");
  }

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});

  closeItemModal();
  refreshActiveView();
}

// 2. Item Detailed View Modal
function openItemDetailModal(item) {
  activeDetailItem = item;
  if (!itemDetailModal) return;

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

  if (dashDetailTypeBadge) {
    dashDetailTypeBadge.textContent = typeText;
    dashDetailTypeBadge.className = `uniform-type-chip ${item.type || "text"}`;
  }

  if (dashDetailDate) {
    dashDetailDate.textContent = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  }

  // Media preview
  const mediaSrc = item.previewImage || (item.type === "image" ? item.content : "");
  if (mediaSrc && (item.type === "image" || item.type === "youtube")) {
    if (dashDetailMediaImg) dashDetailMediaImg.src = mediaSrc;
    if (dashDetailMediaWrap) dashDetailMediaWrap.classList.remove("hidden");
  } else {
    if (dashDetailMediaWrap) dashDetailMediaWrap.classList.add("hidden");
  }

  // Title
  if (dashDetailTitle) {
    if (item.title && item.title.trim()) {
      dashDetailTitle.textContent = item.title;
      dashDetailTitle.classList.remove("hidden");
    } else {
      dashDetailTitle.classList.add("hidden");
    }
  }

  // Content
  if (dashDetailContent) {
    if (item.type === "quote") {
      dashDetailContent.textContent = `“${item.content}”`;
    } else {
      dashDetailContent.textContent = item.content || "";
    }
  }

  // Personal Note
  if (dashDetailNoteWrap && dashDetailNoteText) {
    if (item.note && item.note.trim()) {
      dashDetailNoteText.textContent = item.note;
      dashDetailNoteWrap.classList.remove("hidden");
    } else {
      dashDetailNoteWrap.classList.add("hidden");
    }
  }

  // Tags
  if (dashDetailTagsWrap && dashDetailTagsList) {
    if (item.tags && item.tags.length > 0) {
      dashDetailTagsList.innerHTML = item.tags.map((t) => `<span class="uniform-type-chip">#${escapeHTML(t)}</span>`).join("");
      dashDetailTagsWrap.classList.remove("hidden");
    } else {
      dashDetailTagsWrap.classList.add("hidden");
    }
  }

  // Visit Link Button
  const targetUrl = item.sourceUrl || (item.content && item.content.startsWith("http") ? item.content : "");
  if (dashDetailLinkBtn) {
    if (targetUrl) {
      dashDetailLinkBtn.href = targetUrl;
      dashDetailLinkBtn.classList.remove("hidden");
    } else {
      dashDetailLinkBtn.classList.add("hidden");
    }
  }

  // Favorite button
  if (dashDetailFavBtn) {
    dashDetailFavBtn.textContent = item.favorite ? "★ Starred" : "☆ Star";
    dashDetailFavBtn.style.color = item.favorite ? "#F59E0B" : "inherit";
  }

  itemDetailModal.classList.remove("hidden");
}

function closeItemDetailModal() {
  if (itemDetailModal) itemDetailModal.classList.add("hidden");
  activeDetailItem = null;
}

// ── Quick Item Actions ──

async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});
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
  if (!confirm("Delete this saved item from your library?")) return;
  allItems = allItems.filter((i) => i.id !== id);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});
  refreshActiveView();
  showToast("Item deleted");
}

// ── Export / Import ──

function handleExportBackup() {
  const data = {
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

    const itemMap = new Map();
    allItems.forEach((i) => itemMap.set(i.id, i));
    importedItems.forEach((i) => { if (i && i.id && !itemMap.has(i.id)) itemMap.set(i.id, i); });

    allItems = Array.from(itemMap.values());

    await chrome.storage.local.set({ items: allItems });
    SyncService.pushToCloud(allItems, [], []).catch(() => {});

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
    if (sidebarAuthEmail) sidebarAuthEmail.textContent = session.user.email;
    if (sidebarAuthStatus) {
      sidebarAuthStatus.textContent = "🟢 Synced with Cloud";
      sidebarAuthStatus.style.color = "#059669";
    }
  } else {
    if (sidebarAuthEmail) sidebarAuthEmail.textContent = "Local Vault";
    if (sidebarAuthStatus) {
      sidebarAuthStatus.textContent = "● Offline Ready";
      sidebarAuthStatus.style.color = "var(--text-muted)";
    }
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
  return [itemModal, itemDetailModal, authModal].some((m) => m && !m.classList.contains("hidden"));
}

function closeAllModals() {
  closeItemModal();
  closeItemDetailModal();
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

// ── Content Classifier Helper ──
function classifyContent(text = "", url = "") {
  const target = (url || text).trim();

  // YouTube detection
  const ytMatch = target.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    return {
      type: "youtube",
      videoId: ytMatch[1],
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }

  // Image URL detection
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(target)) {
    return {
      type: "image",
      thumbnail: target,
    };
  }

  // Quote detection
  if (text.startsWith('"') && text.endsWith('"') && text.length > 10) {
    return {
      type: "quote",
    };
  }

  // Product detection
  if (/amazon\.|ebay\.|etsy\.|walmart\./i.test(target)) {
    return {
      type: "product",
    };
  }

  // Social detection
  if (/twitter\.com|x\.com|instagram\.com|linkedin\.com|reddit\.com/i.test(target)) {
    return {
      type: "social",
    };
  }

  // General Link
  if (/^https?:\/\//i.test(target)) {
    return {
      type: "link",
    };
  }

  return {
    type: "text",
  };
}
