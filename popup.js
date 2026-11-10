// ── SaveIt: Popup Controller (Web Vault & Library) ──

let allItems = [];
let currentFilter = "all";          // type filter: "all", "link", "quote", "media", "favorite"
let searchQuery = "";
let editingItemId = null;
let activeDetailItem = null;
let authIsSignUp = false;
let currentTabInfo = null;

// ── DOM References ──
// Segmented Tabs & Views
const tabSavePage = document.getElementById("tab-save-page");
const tabLibrary = document.getElementById("tab-library");
const tabVaultCount = document.getElementById("tab-vault-count");
const viewSavePage = document.getElementById("view-save-page");
const viewLibrary = document.getElementById("view-library");

// Screen A (Save Page)
const savePageTypeChip = document.getElementById("save-page-type-chip");
const savePageTitle = document.getElementById("save-page-title");
const savePageUrl = document.getElementById("save-page-url");
const saveNoteInput = document.getElementById("save-note-input");
const saveTagsInput = document.getElementById("save-tags-input");
const btnSaveCurrentPage = document.getElementById("btn-save-current-page");
const btnSaveText = document.getElementById("btn-save-text");

// Square Drop & Paste Area (Photos / Text / Links)
const quickDropZone = document.getElementById("quick-drop-zone");
const dropZoneIdle = document.getElementById("drop-zone-idle");
const dropZoneActive = document.getElementById("drop-zone-active");
const dropActiveTarget = document.getElementById("drop-active-target");
const dropZoneSuccess = document.getElementById("drop-zone-success");
const dropSuccessTitle = document.getElementById("drop-success-title");
const dropSuccessMeta = document.getElementById("drop-success-meta");
const dropSuccessThumb = document.getElementById("drop-success-thumb");
const dropFileInput = document.getElementById("drop-file-input");

// Screen B (Library)
const vaultSearchInput = document.getElementById("vault-search-input");
const vaultSearchClear = document.getElementById("vault-search-clear");
const typeFilterChips = document.querySelectorAll(".type-filter-chip");
const itemsContainer = document.getElementById("items-container");
const emptyState = document.getElementById("empty-state");

// Header actions & Menu
const btnDashboard = document.getElementById("btn-dashboard");
const btnAdd = document.getElementById("btn-add");
const btnMenu = document.getElementById("btn-menu");
const dropdownMenu = document.getElementById("dropdown-menu");
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
const addModalTitle = document.getElementById("add-modal-title");
const addContent = document.getElementById("add-content");
const addNote = document.getElementById("add-note");
const addTags = document.getElementById("add-tags");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");
const modalCloseX = document.getElementById("modal-close-x");

// Edit Modal
const editModal = document.getElementById("edit-modal");
const editContent = document.getElementById("edit-content");
const editNote = document.getElementById("edit-note");
const editTags = document.getElementById("edit-tags");
const editCancel = document.getElementById("edit-cancel");
const editSave = document.getElementById("edit-save");
const editCloseX = document.getElementById("edit-close-x");

// Detail Modal
const detailModal = document.getElementById("detail-modal");
const detailCloseX = document.getElementById("detail-close-x");
const detailTypeBadge = document.getElementById("detail-type-badge");
const detailDate = document.getElementById("detail-date");
const detailMediaWrap = document.getElementById("detail-media-wrap");
const detailMediaImg = document.getElementById("detail-media-img");
const detailTitle = document.getElementById("detail-title");
const detailContent = document.getElementById("detail-content");
const detailNoteWrap = document.getElementById("detail-note-wrap");
const detailNoteText = document.getElementById("detail-note-text");
const detailTagsWrap = document.getElementById("detail-tags-wrap");
const detailTagsList = document.getElementById("detail-tags-list");
const detailOpenLinkBtn = document.getElementById("detail-open-link-btn");
const detailFavBtn = document.getElementById("detail-fav-btn");
const detailCopyBtn = document.getElementById("detail-copy-btn");
const detailEditBtn = document.getElementById("detail-edit-btn");
const detailDeleteBtn = document.getElementById("detail-delete-btn");

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
  allItems = state.items || [];

  updateVaultCounters();
  renderItems();
}

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
      allItems = res.items || [];
      updateVaultCounters();
      renderItems();
    }
  } catch (err) {
    console.warn("Auto-sync background check:", err);
  }
}

function updateVaultCounters() {
  const total = allItems.length;
  if (tabVaultCount) tabVaultCount.textContent = total;
  if (footerItemCount) footerItemCount.textContent = `${total} ${total === 1 ? "item" : "items"} in library`;
}

// ── Event Listeners ──
function setupEventListeners() {
  // Segmented Tabs
  if (tabSavePage && tabLibrary) {
    tabSavePage.addEventListener("click", () => switchToTab("save"));
    tabLibrary.addEventListener("click", () => switchToTab("library"));
  }

  // Active Tab Save Action
  if (btnSaveCurrentPage) {
    btnSaveCurrentPage.addEventListener("click", handleSaveCurrentTab);
  }

  // Square Drop & Paste Engine (Photos, Texts, Links)
  setupSquareDropZone();

  // Library: Search
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

  // Library: Type filter chips
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

  // Edit Item Modal
  if (editCloseX) editCloseX.addEventListener("click", closeEditModal);
  if (editCancel) editCancel.addEventListener("click", closeEditModal);
  if (editSave) editSave.addEventListener("click", handleSaveEditItem);

  // Detail Modal
  if (detailCloseX) detailCloseX.addEventListener("click", closeDetailModal);
  if (detailModal) {
    const backdrop = detailModal.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeDetailModal);
  }
  if (detailFavBtn) {
    detailFavBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        toggleFavorite(activeDetailItem.id);
        openDetailModal(activeDetailItem);
      }
    });
  }
  if (detailCopyBtn) {
    detailCopyBtn.addEventListener("click", () => {
      if (activeDetailItem) copyToClipboard(activeDetailItem.content);
    });
  }
  if (detailEditBtn) {
    detailEditBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        const itemToEdit = activeDetailItem;
        closeDetailModal();
        openEditModal(itemToEdit);
      }
    });
  }
  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener("click", () => {
      if (activeDetailItem) {
        const idToDelete = activeDetailItem.id;
        closeDetailModal();
        deleteItem(idToDelete);
      }
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
    tabLibrary.classList.remove("active");
    viewSavePage.classList.remove("hidden");
    viewLibrary.classList.add("hidden");
    populateActiveTabPreview();
  } else {
    tabLibrary.classList.add("active");
    tabSavePage.classList.remove("active");
    viewLibrary.classList.remove("hidden");
    viewSavePage.classList.add("hidden");
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
    } else {
      if (btnSaveText) btnSaveText.textContent = "Save Page to Library";
    }

    if (footerStatusText) {
      footerStatusText.textContent = existing ? "Saved in Library" : "Ready to Save";
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

  const title = savePageTitle ? savePageTitle.value.trim() : (currentTabInfo?.title || "");
  const note = saveNoteInput ? saveNoteInput.value.trim() : "";
  const rawTags = saveTagsInput ? saveTagsInput.value : "";
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const classification = classifyContent(url);
  const existingIndex = allItems.findIndex((i) => i.sourceUrl === url || i.content === url);

  if (existingIndex !== -1) {
    // Update existing item
    allItems[existingIndex] = {
      ...allItems[existingIndex],
      title: title || allItems[existingIndex].title,
      note,
      tags,
      updatedAt: Date.now(),
    };
    showToast("Updated in Library!");
  } else {
    // Create new item
    const newItem = {
      id: generateId(),
      type: classification.type,
      title: title || classification.title || "Saved Web Page",
      content: url,
      note,
      previewImage: classification.thumbnail || "",
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: url,
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

  updateVaultCounters();
  renderItems();

  // Switch to Library tab to show the new card immediately
  switchToTab("library");
}

// ── Screen B: Render Items (Cards Feed) ──
function renderItems() {
  if (!itemsContainer) return;
  let filtered = [...allItems];

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
      openEditModal(item);
    });
  }

  const deleteBtn = card.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteItem(item.id);
    });
  }

  const sourceLink = card.querySelector(".card-source-link");
  if (sourceLink) {
    sourceLink.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Clicking card opens detailed view (not direct link navigation!)
  card.addEventListener("click", (e) => {
    if (e.target.closest(".card-action-btn") || e.target.closest(".card-source-link")) {
      return;
    }
    openDetailModal(item);
  });

  return card;
}

// ── Square Drop & Paste Engine (Photos / Texts / Links) ──

function setupSquareDropZone() {
  if (!quickDropZone) return;

  // 1. Drag & Drop events on quickDropZone
  quickDropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropActiveTarget) dropActiveTarget.textContent = "Into Library";
    quickDropZone.classList.add("drag-over");
    if (dropZoneIdle) dropZoneIdle.classList.add("hidden");
    if (dropZoneActive) dropZoneActive.classList.remove("hidden");
    if (dropZoneSuccess) dropZoneSuccess.classList.add("hidden");
  });

  quickDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!quickDropZone.classList.contains("drag-over")) {
      quickDropZone.classList.add("drag-over");
    }
  });

  quickDropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickDropZone.contains(e.relatedTarget)) {
      resetDropZoneUI();
    }
  });

  quickDropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetDropZoneUI();
    if (e.dataTransfer) {
      await handleDropOrPaste(e.dataTransfer);
    }
  });

  // 2. Click on square: trigger clipboard paste or file selector
  quickDropZone.addEventListener("click", async () => {
    try {
      // First try reading image or text directly from modern clipboard API
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith("image/"));
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = async (ev) => {
                await saveDirectItem({
                  type: "image",
                  title: "Pasted Screenshot",
                  content: ev.target.result,
                  previewImage: ev.target.result,
                  sourceTitle: "Clipboard Photo",
                });
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch (clipErr) {
          // Fall back to readText
        }
      }

      // Check text clipboard
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const classification = classifyContent(text.trim());
          await saveDirectItem({
            type: classification.type,
            title: classification.type === "youtube" ? "YouTube Video" : classification.type === "quote" ? "Saved Quote" : "",
            content: text.trim(),
            previewImage: classification.thumbnail || (classification.type === "image" ? text.trim() : ""),
            metadata: classification.videoId ? { videoId: classification.videoId } : {},
            sourceUrl: text.trim().startsWith("http") ? text.trim() : "",
          });
          return;
        }
      }

      // If clipboard empty or denied, trigger file picker
      if (dropFileInput) dropFileInput.click();
    } catch (err) {
      if (dropFileInput) dropFileInput.click();
    }
  });

  // 3. File Input Change Handler (Photo / Text file picker)
  if (dropFileInput) {
    dropFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          await saveDirectItem({
            type: "image",
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: ev.target.result,
            previewImage: ev.target.result,
            sourceTitle: file.name,
          });
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          await saveDirectItem({
            type: "text",
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: ev.target.result,
            sourceTitle: file.name,
          });
        };
        reader.readAsText(file);
      }
      dropFileInput.value = "";
    });
  }

  // 4. Keyboard navigation: Space or Enter on focused square triggers action
  quickDropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      quickDropZone.click();
    }
  });

  // 5. Global Paste Listener: ⌘V anywhere in popup unless typing in an input
  document.addEventListener("paste", async (e) => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable);
    if (isTyping && activeEl !== quickDropZone) {
      return; // Allow normal native paste into inputs
    }

    if (e.clipboardData) {
      e.preventDefault();
      await handleDropOrPaste(e.clipboardData);
    }
  });
}

async function handleDropOrPaste(dataTransfer) {
  // A. Check for files (Images or Text documents)
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    const file = dataTransfer.files[0];
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await saveDirectItem({
          type: "image",
          title: file.name ? file.name.replace(/\.[^/.]+$/, "") : "Dropped Photo",
          content: ev.target.result,
          previewImage: ev.target.result,
          sourceTitle: file.name || "Photo",
        });
      };
      reader.readAsDataURL(file);
      return;
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await saveDirectItem({
          type: "text",
          title: file.name ? file.name.replace(/\.[^/.]+$/, "") : "Dropped File",
          content: ev.target.result,
          sourceTitle: file.name || "Document",
        });
      };
      reader.readAsText(file);
      return;
    }
  }

  // B. Check for clipboard image blobs (e.g. pasted screenshots)
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            await saveDirectItem({
              type: "image",
              title: "Pasted Screenshot",
              content: ev.target.result,
              previewImage: ev.target.result,
              sourceTitle: "Clipboard Image",
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
  }

  // C. Check for dragged HTML image from webpage
  const html = dataTransfer.getData ? dataTransfer.getData("text/html") : "";
  if (html) {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      const imgSrc = match[1];
      await saveDirectItem({
        type: "image",
        title: "Web Image",
        content: imgSrc,
        previewImage: imgSrc,
        sourceUrl: imgSrc,
        sourceTitle: "Dragged Image",
      });
      return;
    }
  }

  // D. Check for URI / Link URL
  let uri = dataTransfer.getData ? dataTransfer.getData("text/uri-list") : "";
  if (!uri && dataTransfer.getData) {
    const plain = dataTransfer.getData("text/plain") || "";
    if (/^https?:\/\//i.test(plain.trim())) {
      uri = plain.trim();
    }
  }
  if (uri) {
    const cleanUrl = uri.split("\r\n")[0].split("\n")[0].trim();
    const classification = classifyContent(cleanUrl);
    await saveDirectItem({
      type: classification.type,
      title: classification.type === "youtube" ? "YouTube Video" : (cleanUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "Web Link"),
      content: cleanUrl,
      previewImage: classification.thumbnail || (classification.type === "image" ? cleanUrl : ""),
      metadata: classification.videoId ? { videoId: classification.videoId } : {},
      sourceUrl: cleanUrl,
      sourceTitle: "Dropped Link",
    });
    return;
  }

  // E. Plain text snippet or quote
  const text = dataTransfer.getData ? dataTransfer.getData("text/plain") : "";
  if (text && text.trim()) {
    const classification = classifyContent(text.trim());
    await saveDirectItem({
      type: classification.type === "quote" ? "quote" : "text",
      title: classification.type === "quote" ? "Saved Quote" : "Note Snippet",
      content: text.trim(),
      sourceTitle: "Pasted Text",
    });
    return;
  }

  showToast("No photos, text, or links detected");
}

async function saveDirectItem(itemPartial) {
  // Attach optional memo & tags if user entered any in the inputs
  const note = saveNoteInput ? saveNoteInput.value.trim() : "";
  const rawTags = saveTagsInput ? saveTagsInput.value : "";
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const fullItem = {
    id: generateId(),
    type: itemPartial.type || "text",
    title: itemPartial.title || "Saved Item",
    content: itemPartial.content || "",
    note: note || "",
    tags: tags,
    previewImage: itemPartial.previewImage || "",
    metadata: itemPartial.metadata || {},
    sourceUrl: itemPartial.sourceUrl || "",
    sourceTitle: itemPartial.sourceTitle || "",
    favorite: false,
    createdAt: Date.now(),
  };

  allItems.unshift(fullItem);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});

  // Clear memo / tags after saving
  if (saveNoteInput) saveNoteInput.value = "";
  if (saveTagsInput) saveTagsInput.value = "";

  updateVaultCounters();
  renderItems();

  // Visual success feedback on square drop zone
  showDropSuccessState(fullItem);
  showToast("Saved to Library!");
}

function showDropSuccessState(item) {
  if (!quickDropZone) return;
  quickDropZone.classList.remove("drag-over");
  quickDropZone.classList.add("drop-success-active");

  if (dropZoneIdle) dropZoneIdle.classList.add("hidden");
  if (dropZoneActive) dropZoneActive.classList.add("hidden");
  if (dropZoneSuccess) dropZoneSuccess.classList.remove("hidden");

  if (dropSuccessTitle) {
    const typeLabels = {
      image: "Photo Saved!",
      quote: "Quote Saved!",
      youtube: "Video Saved!",
      link: "Link Saved!",
      text: "Snippet Saved!",
    };
    dropSuccessTitle.textContent = typeLabels[item.type] || "Saved!";
  }

  if (dropSuccessMeta) {
    dropSuccessMeta.textContent = "Saved to Library";
  }

  if (dropSuccessThumb) {
    if (item.type === "image" && item.previewImage) {
      dropSuccessThumb.src = item.previewImage;
      dropSuccessThumb.classList.remove("hidden");
    } else {
      dropSuccessThumb.classList.add("hidden");
    }
  }

  // Smoothly revert to idle state after 2.3 seconds
  setTimeout(() => {
    resetDropZoneUI();
  }, 2300);
}

function resetDropZoneUI() {
  if (!quickDropZone) return;
  quickDropZone.classList.remove("drag-over", "drop-success-active");
  if (dropZoneIdle) dropZoneIdle.classList.remove("hidden");
  if (dropZoneActive) dropZoneActive.classList.add("hidden");
  if (dropZoneSuccess) dropZoneSuccess.classList.add("hidden");
}

// ── Add Item Modal Logic ──
function openAddModal() {
  if (addModalTitle) {
    addModalTitle.textContent = "Save Item to Library";
  }

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

  const note = addNote ? addNote.value.trim() : "";
  const tags = addTags.value
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
    title = content.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "Web Link";
  } else {
    title = content.length > 40 ? content.slice(0, 40) + "…" : content;
  }

  const newItem = {
    id: generateId(),
    type: classification.type,
    title,
    content,
    note,
    previewImage: classification.thumbnail || (classification.type === "image" ? content : ""),
    metadata: classification.videoId ? { videoId: classification.videoId } : {},
    sourceUrl: isUrl ? content : "",
    sourceTitle: title,
    tags,
    favorite: false,
    createdAt: Date.now(),
  };

  allItems.unshift(newItem);
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});

  closeAddModal();
  updateVaultCounters();
  renderItems();
  switchToTab("library");
  showToast("Saved to Library!");
}

// ── Edit Item Modal Logic ──
function openEditModal(item) {
  editingItemId = item.id;
  editContent.value = item.content || "";
  if (editNote) editNote.value = item.note || "";
  editTags.value = (item.tags || []).join(", ");
  editModal.classList.remove("hidden");
  editContent.focus();
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

  const note = editNote ? editNote.value.trim() : "";
  const tags = editTags.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const isUrl = /^https?:\/\//i.test(content);
  const classification = classifyContent(content, isUrl ? content : "");

  allItems[itemIndex] = {
    ...allItems[itemIndex],
    content,
    note,
    tags,
    type: classification.type,
    previewImage: classification.thumbnail || (classification.type === "image" ? content : allItems[itemIndex].previewImage),
    sourceUrl: isUrl ? content : (allItems[itemIndex].sourceUrl || ""),
    updatedAt: Date.now(),
  };

  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});

  closeEditModal();
  updateVaultCounters();
  renderItems();
  showToast("Item updated!");
}

// ── Item Detailed View Modal Logic ──
function openDetailModal(item) {
  activeDetailItem = item;
  if (!detailModal) return;

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
  if (detailTypeBadge) {
    detailTypeBadge.textContent = typeText;
    detailTypeBadge.className = `card-type-chip ${item.type || "text"}`;
  }

  if (detailDate) {
    detailDate.textContent = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "";
  }

  // Media Preview
  const mediaSrc = item.previewImage || (item.type === "image" ? item.content : "");
  if (mediaSrc && (item.type === "image" || item.type === "youtube")) {
    if (detailMediaImg) detailMediaImg.src = mediaSrc;
    if (detailMediaWrap) detailMediaWrap.classList.remove("hidden");
  } else {
    if (detailMediaWrap) detailMediaWrap.classList.add("hidden");
  }

  // Title
  if (detailTitle) {
    if (item.title && item.title.trim()) {
      detailTitle.textContent = item.title;
      detailTitle.classList.remove("hidden");
    } else {
      detailTitle.classList.add("hidden");
    }
  }

  // Full Content
  if (detailContent) {
    if (item.type === "quote") {
      detailContent.textContent = `“${item.content}”`;
    } else {
      detailContent.textContent = item.content || "";
    }
  }

  // Personal Note
  if (detailNoteWrap && detailNoteText) {
    if (item.note && item.note.trim()) {
      detailNoteText.textContent = item.note;
      detailNoteWrap.classList.remove("hidden");
    } else {
      detailNoteWrap.classList.add("hidden");
    }
  }

  // Tags
  if (detailTagsWrap && detailTagsList) {
    if (item.tags && item.tags.length > 0) {
      detailTagsList.innerHTML = item.tags.map((t) => `<span class="tag-badge">#${escapeHTML(t)}</span>`).join("");
      detailTagsWrap.classList.remove("hidden");
    } else {
      detailTagsWrap.classList.add("hidden");
    }
  }

  // Visit Link Button
  const targetUrl = item.sourceUrl || (item.content && item.content.startsWith("http") ? item.content : "");
  if (detailOpenLinkBtn) {
    if (targetUrl) {
      detailOpenLinkBtn.href = targetUrl;
      detailOpenLinkBtn.classList.remove("hidden");
    } else {
      detailOpenLinkBtn.classList.add("hidden");
    }
  }

  // Favorite button state
  if (detailFavBtn) {
    detailFavBtn.textContent = item.favorite ? "★" : "☆";
    detailFavBtn.title = item.favorite ? "Unfavorite" : "Favorite";
    detailFavBtn.style.color = item.favorite ? "#F59E0B" : "inherit";
  }

  detailModal.classList.remove("hidden");
}

function closeDetailModal() {
  if (detailModal) detailModal.classList.add("hidden");
  activeDetailItem = null;
}

// ── Item Actions (Fav, Copy, Delete) ──
async function toggleFavorite(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await chrome.storage.local.set({ items: allItems });
  SyncService.pushToCloud(allItems, [], []).catch(() => {});
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
  SyncService.pushToCloud(allItems, [], []).catch(() => {});
  updateVaultCounters();
  renderItems();
  showToast("Item deleted");
}

// ── Export / Import / Clear ──
function handleExport() {
  dropdownMenu.classList.add("hidden");
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

async function handleImport(e) {
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

    updateVaultCounters();
    renderItems();
    showToast(`Imported ${importedItems.length} items!`);
  } catch (err) {
    showToast("Failed to parse backup file");
  }
}

async function handleClearAll() {
  dropdownMenu.classList.add("hidden");
  if (!confirm("Are you sure you want to clear all saved items from your library?")) return;

  allItems = [];
  await chrome.storage.local.set({ items: [] });
  SyncService.pushToCloud([], [], []).catch(() => {});
  updateVaultCounters();
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
      allItems = res.items || [];
      updateVaultCounters();
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

  // Quote heuristic
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith('“') && str.endsWith('”'))) {
    return { type: "quote" };
  }

  return { type: "text" };
}
