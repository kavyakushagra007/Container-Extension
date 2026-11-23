// ── SaveIt: Dashboard Controller (Cloud Sync & Saved Materials) ──
let allItems = [];
let categories = ["General"];
let currentView = "all"; // "all", "favorite", or "memory"
let searchQuery = "";
let currentSort = "newest";
let selectedIds = new Set();
let editingItemId = null;
let currentDetailItemId = null;
let activePreviewId = null;
let activePreviewMemoryId = null;
let currentMemories = [];
let authIsSignUp = false;

// ── DOM Elements ──
const sidebar = document.getElementById("sidebar");
const btnSidebarToggle = document.getElementById("btn-sidebar-toggle");
const dashboardSplit = document.getElementById("dashboard-split");
const feedColumn = document.getElementById("feed-column");
const itemsGrid = document.getElementById("items-grid");
const emptyState = document.getElementById("empty-state");
const settingsPanel = document.getElementById("settings-panel");
const statsRow = document.getElementById("stats-row");
const statCardTotal = document.getElementById("stat-card-total");
const statCardFavs = document.getElementById("stat-card-favs");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const pageTitle = document.getElementById("page-title");
const bulkBar = document.getElementById("bulk-bar");
const selectedCount = document.getElementById("selected-count");
const btnSelectAll = document.getElementById("btn-select-all");
const btnDeleteSelected = document.getElementById("btn-delete-selected");
const btnCancelSelect = document.getElementById("btn-cancel-select");
const btnAddNew = document.getElementById("btn-add-new");
const btnSettings = document.getElementById("btn-settings");
const toast = document.getElementById("toast");
const importFile = document.getElementById("import-file");

// Preview Pane elements (Outlook / iCloud Mail Style)
const previewPane = document.getElementById("preview-pane");
const previewResizer = document.getElementById("preview-resizer");
const previewEmpty = document.getElementById("preview-empty");
const previewCard = document.getElementById("preview-card");
const previewBadge = document.getElementById("preview-badge");
const previewTitle = document.getElementById("preview-title");
const previewFavBtn = document.getElementById("preview-fav-btn");
const previewCloseBtn = document.getElementById("preview-close-btn");
const previewContent = document.getElementById("preview-content");
const previewSourceRow = document.getElementById("preview-source-row");
const previewSource = document.getElementById("preview-source");
const previewDate = document.getElementById("preview-date");
const previewTagsRow = document.getElementById("preview-tags-row");
const previewTags = document.getElementById("preview-tags");
const previewCopyBtn = document.getElementById("preview-copy-btn");
const previewEditBtn = document.getElementById("preview-edit-btn");
const previewDeleteBtn = document.getElementById("preview-delete-btn");

// Inline Editor inside Preview Pane
const previewEditor = document.getElementById("preview-editor");
const previewEditorBadge = document.getElementById("preview-editor-badge");
const previewEditorTitle = document.getElementById("preview-editor-title");
const previewEditorCloseBtn = document.getElementById("preview-editor-close-btn");
const previewEditorContent = document.getElementById("preview-editor-content");
const previewEditorTags = document.getElementById("preview-editor-tags");
const previewEditorCancelBtn = document.getElementById("preview-editor-cancel-btn");
const previewEditorSaveBtn = document.getElementById("preview-editor-save-btn");

// Add / Edit Modal elements
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalContentInput = document.getElementById("modal-content-input");
const modalTagsInput = document.getElementById("modal-tags-input");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

// Detail View Modal elements (Fallback)
const detailModal = document.getElementById("detail-modal");
const detailTitle = document.getElementById("detail-title");
const detailContent = document.getElementById("detail-content");
const detailSourceRow = document.getElementById("detail-source-row");
const detailSource = document.getElementById("detail-source");
const detailDate = document.getElementById("detail-date");
const detailTagsRow = document.getElementById("detail-tags-row");
const detailTags = document.getElementById("detail-tags");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailCopyBtn = document.getElementById("detail-copy-btn");
const detailEditBtn = document.getElementById("detail-edit-btn");
const detailDeleteBtn = document.getElementById("detail-delete-btn");

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
const countFav = document.getElementById("count-fav");
const countMemory = document.getElementById("count-memory");
const statTotal = document.getElementById("stat-total");
const statFavs = document.getElementById("stat-favs");

// Theme elements
const btnThemeDash = document.getElementById("btn-theme-dash");
const themeIconSunDash = document.getElementById("theme-icon-sun-dash");
const themeIconMoonDash = document.getElementById("theme-icon-moon-dash");
const themeDashLabel = document.getElementById("theme-dash-label");
const settingsThemeSelect = document.getElementById("settings-theme-select");

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  await loadState();

  // Load layout preferences (collapsed sidebar & preview pane width)
  try {
    const { sidebarCollapsed = false, previewPaneWidth } = await chrome.storage.local.get([
      "sidebarCollapsed",
      "previewPaneWidth",
    ]);
    if (sidebarCollapsed && sidebar) {
      sidebar.classList.add("collapsed");
      if (btnSidebarToggle) btnSidebarToggle.title = "Expand sidebar";
    }
    if (previewPaneWidth && previewPane) {
      previewPane.style.width = `${previewPaneWidth}px`;
    }
  } catch (err) {
    console.warn("Layout preference load:", err);
  }

  setupEventListeners();
  checkAuthStatus();
  autoSyncBackground();
  initMemorySettings();
  updateMemoryStats();
});

async function initTheme() {
  const theme = await ThemeController.watch(applyTheme);

  if (settingsThemeSelect) {
    settingsThemeSelect.value = theme;
    settingsThemeSelect.addEventListener("change", async (e) => {
      const selectedTheme = e.target.value;
      await chrome.storage.local.set({ theme: selectedTheme });
      applyTheme(selectedTheme);
    });
  }
}

function applyTheme(theme) {
  const effective = ThemeController.resolve(theme);
  if (btnThemeDash) {
    const label = effective === "light" ? "Switch to dark mode" : "Switch to light mode";
    btnThemeDash.title = label;
    btnThemeDash.setAttribute("aria-label", label);
  }

  if (effective === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    if (themeIconSunDash) themeIconSunDash.classList.add("hidden");
    if (themeIconMoonDash) themeIconMoonDash.classList.remove("hidden");
    if (themeDashLabel) themeDashLabel.textContent = "Dark Mode";
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIconSunDash) themeIconSunDash.classList.remove("hidden");
    if (themeIconMoonDash) themeIconMoonDash.classList.add("hidden");
    if (themeDashLabel) themeDashLabel.textContent = "Light Mode";
  }

  if (settingsThemeSelect && settingsThemeSelect.value !== theme) {
    settingsThemeSelect.value = theme;
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  await chrome.storage.local.set({ theme: next });
}

async function autoSyncBackground() {
  const session = await SyncService.getUser();
  if (!session) return;
  try {
    const res = await SyncService.syncNow();
    if (res) {
      allItems = res.items || [];
      SyncService.rememberItems(allItems);
      if (res.categories && res.categories.length > 0) {
        categories = res.categories;
      }
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
      SyncService.rememberItems(allItems);
  if (data.categories && data.categories.length > 0) {
    categories = data.categories;
  }
  updateBulkBar();
  updateStats();
  render();
}

// ── Stats ──
function updateStats() {
  const total = allItems.length;
  const favs = allItems.filter((i) => i.favorite).length;

  if (statTotal) statTotal.textContent = total;
  if (statFavs) statFavs.textContent = favs;

  if (countAll) countAll.textContent = total;
  if (countFav) countFav.textContent = favs;
}

// ── Filter & Sort ──
function getFilteredItems() {
  let items = allItems.filter((item) => {
    if (currentView === "favorite" && !item.favorite) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = (item.content || "").toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchSource = item.sourceTitle?.toLowerCase().includes(q);
      if (!matchContent && !matchTags && !matchSource) return false;
    }

    return true;
  });

  // Sort
  if (currentSort === "newest") {
    items.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === "oldest") {
    items.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === "alpha") {
    items.sort((a, b) => (a.content || "").localeCompare(b.content || ""));
  }

  return items;
}

// ── Render Items Grid ──
function render() {
  if (!settingsPanel.classList.contains("hidden")) return;

  if (currentView === "memory") {
    statsRow.classList.add("hidden");
    bulkBar.classList.add("hidden");
    if (previewPane) previewPane.classList.add("hidden");
    renderMemoryView();
    return;
  }

  if (previewPane) previewPane.classList.remove("hidden");

  const items = getFilteredItems();

  if (items.length === 0) {
    itemsGrid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    if (bulkBar) bulkBar.classList.add("hidden");
    closePreview();
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

  // Card click opens Preview Pane (Outlook/iCloud Mail style)
  itemsGrid.querySelectorAll(".item-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".item-checkbox") || e.target.closest(".card-actions") || e.target.closest(".tag")) {
        return;
      }
      const id = card.dataset.id;
      const item = allItems.find((i) => i.id === id);
      if (item) {
        showPreview(item);
      }
    });
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

  // Synchronize active preview state
  if (activePreviewId) {
    const activeItem = items.find((i) => i.id === activePreviewId);
    if (activeItem) {
      showPreview(activeItem);
    } else {
      closePreview();
    }
  } else {
    closePreview();
  }
}

function createCardHTML(item) {
  const isSelected = selectedIds.has(item.id);
  const isActivePreview = activePreviewId === item.id;
  const timeAgo = getTimeAgo(new Date(item.createdAt));
  const contentHTML = escapeHTML(item.content);

  const tagsHTML =
    item.tags?.length > 0
      ? `<div class="card-tags">${item.tags.map((t) => `<span class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`).join("")}</div>`
      : "";

  const sourceHTML = item.sourceTitle
    ? `<span class="card-source" title="${escapeHTML(item.sourceUrl)}">from ${escapeHTML(item.sourceTitle)}</span>`
    : "";

  return `
    <div class="item-card ${isSelected ? "selected" : ""} ${isActivePreview ? "active-preview" : ""}" data-id="${item.id}" style="cursor:pointer;">
      <div class="item-checkbox" data-id="${item.id}"></div>
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

// ── Contextual Search & Snippet Match Extraction ──
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text, query) {
  if (!text) return "";
  if (!query || typeof query !== "string") return escapeHTML(text);
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return escapeHTML(text);

  const escapedTerms = terms.map(escapeRegex).join("|");
  const regex = new RegExp(`(${escapedTerms})`, "gi");
  const checkRegex = new RegExp(`^(?:${escapedTerms})$`, "i");

  const parts = text.split(regex);
  return parts
    .map((part) => {
      if (checkRegex.test(part)) {
        return `<mark class="search-match">${escapeHTML(part)}</mark>`;
      }
      return escapeHTML(part);
    })
    .join("");
}

function getContextSnippet(mem, query) {
  // Show the meaningful body match rather than a conversational filler word.
  if (query && typeof NLPParser !== "undefined") {
    const parsed = NLPParser.parseQuery(query);
    if (parsed.isConversational) query = parsed.cleanKeywords.join(" ");
  }
  const defaultSnippet = (mem.textContent || mem.description || mem.keywords || "Page text not captured yet. Revisit this page to search its contents.").slice(0, 160);
  if (!query || typeof query !== "string") {
    return {
      snippetHTML: escapeHTML(defaultSnippet),
      matchBadge: null,
    };
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    return {
      snippetHTML: escapeHTML(defaultSnippet),
      matchBadge: null,
    };
  }

  const textContent = mem.textContent || "";
  const keywords = mem.keywords || "";
  const description = mem.description || "";
  const title = mem.title || "";
  const url = mem.url || "";

  function findFirstTermIndex(sourceText) {
    const lower = sourceText.toLowerCase();
    let bestIdx = -1;
    for (const t of terms) {
      const idx = lower.indexOf(t);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  // 1. In Page Body Text
  const textIdx = findFirstTermIndex(textContent);
  if (textIdx !== -1) {
    const start = Math.max(0, textIdx - 45);
    const end = Math.min(textContent.length, textIdx + 120);
    let excerpt = textContent.slice(start, end).trim();
    if (start > 0) excerpt = "…" + excerpt;
    if (end < textContent.length) excerpt = excerpt + "…";

    return {
      snippetHTML: highlightMatches(excerpt, query),
      matchBadge: `<span class="memory-match-badge" title="Found inside indexed page text">🎯 In Page Body</span>`,
    };
  }

  // 2. In Headings
  const kwIdx = findFirstTermIndex(keywords);
  if (kwIdx !== -1) {
    const start = Math.max(0, kwIdx - 35);
    const end = Math.min(keywords.length, kwIdx + 120);
    let excerpt = keywords.slice(start, end).trim();
    if (start > 0) excerpt = "…" + excerpt;
    if (end < keywords.length) excerpt = excerpt + "…";

    return {
      snippetHTML: highlightMatches(excerpt, query),
      matchBadge: `<span class="memory-match-badge" title="Found in page headings">🏷️ In Headings</span>`,
    };
  }

  // 3. In Description
  const descIdx = findFirstTermIndex(description);
  if (descIdx !== -1) {
    return {
      snippetHTML: highlightMatches(description.slice(0, 160), query),
      matchBadge: `<span class="memory-match-badge" title="Found in page summary">📝 In Summary</span>`,
    };
  }

  // 4. In Title
  if (findFirstTermIndex(title) !== -1) {
    return {
      snippetHTML: highlightMatches(defaultSnippet, query),
      matchBadge: `<span class="memory-match-badge" title="Found in page title">📌 In Title</span>`,
    };
  }

  // 5. In URL
  if (findFirstTermIndex(url) !== -1) {
    return {
      snippetHTML: highlightMatches(defaultSnippet, query),
      matchBadge: `<span class="memory-match-badge" title="Found in web address">🌐 In URL</span>`,
    };
  }

  return {
    snippetHTML: highlightMatches(defaultSnippet, query),
    matchBadge: null,
  };
}

// ── Preview Pane Controller (Outlook / iCloud Mail Style) ──
function showPreview(item) {
  if (!item) {
    closePreview();
    return;
  }
  activePreviewId = item.id;
  activePreviewMemoryId = null;

  // Highlight active card in grid
  itemsGrid.querySelectorAll(".item-card").forEach((card) => {
    if (card.dataset.id === item.id) {
      card.classList.add("active-preview");
    } else {
      card.classList.remove("active-preview");
    }
  });
  itemsGrid.querySelectorAll(".dash-memory-card, .dash-ai-spotlight").forEach((card) => {
    card.classList.remove("active-preview");
  });

  if (previewEditor) previewEditor.classList.add("hidden");
  if (previewEmpty) previewEmpty.classList.add("hidden");
  if (previewCard) previewCard.classList.remove("hidden");

  if (previewTitle) {
    previewTitle.textContent = item.sourceTitle || "Saved Material";
    previewTitle.title = item.sourceTitle || "Saved Material";
  }

  if (previewBadge) {
    previewBadge.textContent = "SAVED";
  }

  // Restore Favorite button for deliberate saves
  if (previewFavBtn) {
    previewFavBtn.style.display = "inline-flex";
    previewFavBtn.classList.toggle("fav-active", !!item.favorite);
    const starSvg = previewFavBtn.querySelector("svg");
    if (starSvg) {
      starSvg.setAttribute("fill", item.favorite ? "var(--favorite)" : "none");
      starSvg.setAttribute("stroke", item.favorite ? "var(--favorite)" : "currentColor");
    }
  }

  // Restore Edit button for deliberate saves
  if (previewEditBtn) {
    previewEditBtn.style.display = "inline-flex";
    previewEditBtn.disabled = false;
    previewEditBtn.className = "btn btn-secondary btn-sm";
    previewEditBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    `;
  }

  // Content rendering
  if (previewContent) {
    const trimmed = (item.content || "").trim();
    const isUrl = /^https?:\/\//i.test(trimmed) || /^(www\.)/i.test(trimmed);
    if (isUrl) {
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      previewContent.innerHTML = `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(item.content)}</a>`;
    } else {
      previewContent.textContent = item.content;
    }
  }

  // Source Row
  if (previewSourceRow) {
    if (item.sourceTitle || item.sourceUrl) {
      previewSourceRow.style.display = "flex";
      if (item.sourceUrl) {
        previewSource.innerHTML = `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(item.sourceTitle || item.sourceUrl)}</a>`;
      } else {
        previewSource.textContent = item.sourceTitle;
      }
    } else {
      previewSourceRow.style.display = "none";
    }
  }

  // Date
  if (previewDate) {
    previewDate.textContent = new Date(item.createdAt).toLocaleString();
  }

  // Tags
  if (previewTagsRow) {
    if (item.tags && item.tags.length > 0) {
      previewTagsRow.style.display = "flex";
      previewTags.innerHTML = item.tags
        .map((t) => `<span class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`)
        .join("");

      previewTags.querySelectorAll(".tag").forEach((tagEl) => {
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
    } else {
      previewTagsRow.style.display = "none";
    }
  }
}

function showMemoryPreview(mem) {
  if (!mem) {
    closePreview();
    return;
  }
  activePreviewMemoryId = mem.id;
  activePreviewId = null;

  // Highlight active memory card
  itemsGrid.querySelectorAll(".dash-memory-card, .dash-ai-spotlight").forEach((card) => {
    card.classList.toggle("active-preview", card.dataset.id === mem.id);
  });
  itemsGrid.querySelectorAll(".item-card").forEach((card) => {
    card.classList.remove("active-preview");
  });

  if (!previewPane) return;
  previewPane.classList.remove("hidden");
  if (previewResizer) previewResizer.classList.remove("hidden");
  if (previewEmpty) previewEmpty.classList.add("hidden");
  if (previewEditor) previewEditor.classList.add("hidden");
  if (previewCard) previewCard.classList.remove("hidden");

  // Badge & Title
  if (previewBadge) {
    previewBadge.textContent = "WEB MEMORY";
  }
  if (previewTitle) {
    previewTitle.textContent = mem.title || mem.domain || "Web Memory";
    previewTitle.title = mem.title || mem.domain || "Web Memory";
  }

  // Hide favorite star for web memories
  if (previewFavBtn) {
    previewFavBtn.style.display = "none";
  }

  // Content rendering: full body text with highlights if query exists
  if (previewContent) {
    const rawBody = mem.textContent || mem.description || mem.keywords || "Page text not captured yet. Revisit this page to search its contents.";
    const highlightedBody = searchQuery ? highlightMatches(rawBody, searchQuery) : escapeHTML(rawBody);

    let headingsHTML = "";
    if (mem.keywords) {
      const kwList = mem.keywords.split(" • ").map((s) => s.trim()).filter((s) => s.length > 0);
      if (kwList.length > 0) {
        headingsHTML = `
          <div class="memory-preview-headings">
            <div class="memory-preview-headings-title">📑 Page Headings & Topics</div>
            <div class="memory-preview-headings-list">
              ${kwList.map((h) => `<span class="memory-heading-chip">${searchQuery ? highlightMatches(h, searchQuery) : escapeHTML(h)}</span>`).join("")}
            </div>
          </div>
        `;
      }
    }

    previewContent.innerHTML = `
      <div class="memory-preview-text" style="font-size:13.5px; line-height:1.7; color:var(--text);">${highlightedBody}</div>
      ${headingsHTML}
    `;
  }

  // Source Row
  if (previewSourceRow) {
    previewSourceRow.style.display = "flex";
    if (previewSource) {
      previewSource.innerHTML = `<a href="${escapeHTML(mem.url)}" target="_blank" rel="noopener" style="color:var(--neon); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">${escapeHTML(mem.domain || mem.url)} ↗</a>`;
    }
  }

  // Date Row
  if (previewDate) {
    const visits = mem.visitCount > 1 ? ` · Visited ${mem.visitCount} times` : "";
    previewDate.textContent = `${new Date(mem.visitedAt).toLocaleString()}${visits}`;
  }

  // Tags Row
  if (previewTagsRow) {
    previewTagsRow.style.display = "flex";
    if (previewTags) {
      previewTags.innerHTML = `
        <span class="tag">#web-memory</span>
        <span class="tag">#${escapeHTML(mem.domain || "web")}</span>
      `;
    }
  }

  // Customize Edit button as "Save to My Saves"
  if (previewEditBtn) {
    previewEditBtn.style.display = "inline-flex";
    const isSaved = allItems.some(
      (i) => i.content === mem.url || (i.sourceUrl && i.sourceUrl === mem.url)
    );
    if (isSaved) {
      previewEditBtn.innerHTML = `✓ Saved`;
      previewEditBtn.disabled = true;
      previewEditBtn.className = "btn btn-secondary btn-sm";
    } else {
      previewEditBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Save to My Saves
      `;
      previewEditBtn.disabled = false;
      previewEditBtn.className = "btn btn-primary btn-sm";
    }
  }
}

function closePreview() {
  activePreviewId = null;
  activePreviewMemoryId = null;
  itemsGrid.querySelectorAll(".item-card, .dash-memory-card, .dash-ai-spotlight").forEach((card) => {
    card.classList.remove("active-preview");
  });
  if (previewCard) previewCard.classList.add("hidden");
  if (previewEditor) previewEditor.classList.add("hidden");
  if (previewEmpty) previewEmpty.classList.remove("hidden");
}

// ── Inline Editor Controller (inside Sidebar Preview Pane) ──
function openEditorInSidebar(item = null) {
  if (currentView === "settings" || currentView === "memory") {
    switchView("all");
  }

  if (item) {
    editingItemId = item.id;
    activePreviewId = item.id;
    if (previewEditorBadge) previewEditorBadge.textContent = "EDITING";
    if (previewEditorTitle) previewEditorTitle.textContent = "Edit Item";
    if (previewEditorContent) previewEditorContent.value = item.content || "";
    if (previewEditorTags) previewEditorTags.value = (item.tags || []).join(", ");
  } else {
    editingItemId = null;
    if (previewEditorBadge) previewEditorBadge.textContent = "NEW";
    if (previewEditorTitle) previewEditorTitle.textContent = "Add New Item";
    if (previewEditorContent) previewEditorContent.value = "";
    if (previewEditorTags) previewEditorTags.value = "";
  }

  // Highlight active card in grid if editing
  itemsGrid.querySelectorAll(".item-card").forEach((card) => {
    if (editingItemId && card.dataset.id === editingItemId) {
      card.classList.add("active-preview");
    } else {
      card.classList.remove("active-preview");
    }
  });

  if (previewEmpty) previewEmpty.classList.add("hidden");
  if (previewCard) previewCard.classList.add("hidden");
  if (previewEditor) previewEditor.classList.remove("hidden");

  // Focus textarea
  if (previewEditorContent) {
    previewEditorContent.focus();
    previewEditorContent.setSelectionRange(previewEditorContent.value.length, previewEditorContent.value.length);
  }
}

function closeEditorInSidebar() {
  if (previewEditor) previewEditor.classList.add("hidden");
  if (editingItemId) {
    const item = allItems.find((i) => i.id === editingItemId);
    editingItemId = null;
    if (item) {
      showPreview(item);
      return;
    }
  } else if (activePreviewId) {
    const item = allItems.find((i) => i.id === activePreviewId);
    if (item) {
      showPreview(item);
      return;
    }
  }
  closePreview();
}

function saveEditorInSidebar() {
  const content = previewEditorContent ? previewEditorContent.value.trim() : "";
  if (!content) {
    if (previewEditorContent) {
      previewEditorContent.style.borderColor = "var(--neon-red)";
      setTimeout(() => (previewEditorContent.style.borderColor = ""), 1200);
      previewEditorContent.focus();
    }
    showToast("Content cannot be empty");
    return;
  }

  const tags = previewEditorTags
    ? previewEditorTags.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const isUrl = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content);
  const detectedType = isUrl ? "link" : "text";

  if (editingItemId) {
    const item = allItems.find((i) => i.id === editingItemId);
    if (item) {
      item.content = content;
      item.tags = tags;
      item.type = detectedType;
    }
    editingItemId = null;
    SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
      if (previewEditor) previewEditor.classList.add("hidden");
      updateStats();
      render();
      if (item) showPreview(item);
      showToast("Item updated!");
      SyncService.pushToCloud(allItems, categories);
    });
  } else {
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: detectedType,
      content,
      category: "General",
      sourceUrl: "",
      sourceTitle: "",
      createdAt: Date.now(),
      tags,
      favorite: false,
    };
    allItems.unshift(newItem);
    SyncService.saveLocal({ items: allItems, categories }, (saved) => {
      allItems = saved.items;
      if (previewEditor) previewEditor.classList.add("hidden");
      updateStats();
      render();
      showPreview(newItem);
      showToast("Item saved!");
      SyncService.pushToCloud(allItems, categories);
    });
  }
}

// ── Detail View Modal Logic (Fallback Modal) ──
function showDetailModal(item) {
  currentDetailItemId = item.id;
  if (!detailModal) return;

  detailTitle.textContent = "Saved Material";

  // Check if content is a URL
  const trimmed = (item.content || "").trim();
  const isUrl = /^https?:\/\//i.test(trimmed) || /^(www\.)/i.test(trimmed);
  if (isUrl) {
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    detailContent.innerHTML = `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(item.content)}</a>`;
  } else {
    detailContent.textContent = item.content;
  }

  // Source
  if (item.sourceTitle || item.sourceUrl) {
    detailSourceRow.style.display = "flex";
    if (item.sourceUrl) {
      detailSource.innerHTML = `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(item.sourceTitle || item.sourceUrl)}</a>`;
    } else {
      detailSource.textContent = item.sourceTitle;
    }
  } else {
    detailSourceRow.style.display = "none";
  }

  // Date
  detailDate.textContent = new Date(item.createdAt).toLocaleString();

  // Tags
  if (item.tags && item.tags.length > 0) {
    detailTagsRow.style.display = "flex";
    detailTags.innerHTML = item.tags.map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join("");
  } else {
    detailTagsRow.style.display = "none";
  }

  detailModal.classList.remove("hidden");
}

function hideDetailModal() {
  if (detailModal) detailModal.classList.add("hidden");
  currentDetailItemId = null;
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
    SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
      updateStats();
      render();
      if (activePreviewId === id) {
        showPreview(item);
      }
      SyncService.pushToCloud(allItems, categories);
    });
  }

  if (action === "edit") {
    openEditorInSidebar(item);
  }

  if (action === "delete") {
    allItems = allItems.filter((i) => i.id !== id);
    selectedIds.delete(id);
    if (activePreviewId === id) {
      closePreview();
    }
    SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
      updateBulkBar();
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

// ── Web Memory Dashboard View ──
async function renderMemoryView() {
  await chrome.runtime.sendMessage({ action: "refreshActiveMemory" }).catch(() => {});
  itemsGrid.classList.remove("hidden");
  let memories = [];
  let nlpResult = null;

  const trimmed = (searchQuery || "").trim();

  if (trimmed && typeof NLPParser !== "undefined") {
    const parsed = NLPParser.parseQuery(trimmed);

    if (parsed.isConversational || parsed.timeRange) {
      if (typeof MemoryStore !== "undefined" && MemoryStore.queryMemoriesByTimeAndKeywords) {
        nlpResult = await MemoryStore.queryMemoriesByTimeAndKeywords({
          keywords: parsed.cleanKeywords,
          timeRange: parsed.timeRange,
          limit: 100,
        });
        nlpResult.parsed = parsed;
        memories = nlpResult.items || [];
      }
    }
  }

  if (!nlpResult) {
    try {
      if (typeof MemoryStore !== "undefined" && MemoryStore.searchMemories) {
        memories = await MemoryStore.searchMemories(searchQuery, 120);
      } else {
        memories = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "searchMemories", query: searchQuery, limit: 120 }, (res) => {
            resolve(res || []);
          });
        });
      }
    } catch (err) {
      console.error("Error loading memories for dashboard:", err);
    }
  }

  // Sorting
  if (currentSort === "alpha") {
    memories.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (currentSort === "oldest") {
    memories.sort((a, b) => a.visitedAt - b.visitedAt);
  }

  if (memories.length === 0) {
    itemsGrid.innerHTML = "";
    itemsGrid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    const h3 = emptyState.querySelector("h3");
    const p = emptyState.querySelector("p");
    if (searchQuery) {
      if (h3) h3.textContent = "No web memories found";
      if (p) p.innerHTML = `No pages in your browsing history matched "<b>${escapeHTML(searchQuery)}</b>".`;
    } else {
      if (h3) h3.textContent = "No web memories recorded yet";
      if (p) p.innerHTML = "Browse normally — SaveIt automatically indexes page titles, topics, and excerpts locally so you can search them anytime.";
    }
    return;
  }

  emptyState.classList.add("hidden");

  currentMemories = memories;
  let html = "";
  let remainingMemories = memories;

  // If conversational spotlight match exists
  if (nlpResult && nlpResult.items && nlpResult.items.length > 0) {
    const topMatch = nlpResult.items[0];
    html += createDashSpotlightHTML(topMatch, nlpResult.parsed, nlpResult.matchedInTimeRange);
    remainingMemories = nlpResult.items.slice(1);
  }

  // Group by date buckets
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - (6 * 86400000);

  const groups = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  remainingMemories.forEach((mem) => {
    if (mem.visitedAt >= startOfToday) {
      groups[0].items.push(mem);
    } else if (mem.visitedAt >= startOfYesterday) {
      groups[1].items.push(mem);
    } else if (mem.visitedAt >= startOfWeek) {
      groups[2].items.push(mem);
    } else {
      groups[3].items.push(mem);
    }
  });

  groups.forEach((group) => {
    if (group.items.length === 0) return;
    html += `
      <div class="timeline-section">
        <div class="timeline-header">
          <span>${group.label}</span>
          <span style="font-weight:400; opacity:0.6; font-size:11px;">(${group.items.length})</span>
        </div>
      </div>
    `;
    group.items.forEach((mem) => {
      html += createDashMemoryCardHTML(mem);
    });
  });

  itemsGrid.innerHTML = html;

  // Attach Card Click to Preview
  itemsGrid.querySelectorAll(".dash-memory-card, .dash-ai-spotlight").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      const id = card.dataset.id;
      const mem = currentMemories.find((m) => m.id === id);
      if (mem) {
        showMemoryPreview(mem);
      }
    });
  });

  // Events
  itemsGrid.querySelectorAll(".dash-memory-title").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      let url = link.dataset.url;
      if (!url) return;
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
        showToast("Cannot open internal browser pages");
        return;
      }
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      try {
        chrome.tabs.create({ url }).catch((err) => {
          console.warn("Could not open tab:", err);
        });
      } catch (err) {
        console.warn("Could not open tab:", err);
      }
    });
  });

  itemsGrid.querySelectorAll("[data-action='dash-promote-memory']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const mem = currentMemories.find((m) => m.id === id);
      if (mem) promoteDashMemory(mem, btn);
    });
  });

  itemsGrid.querySelectorAll("[data-action='dash-open-memory']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      let url = btn.dataset.url;
      if (!url) return;
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
        showToast("Cannot open internal browser pages");
        return;
      }
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      try {
        chrome.tabs.create({ url }).catch((err) => {
          console.warn("Could not open tab:", err);
        });
      } catch (err) {
        console.warn("Could not open tab:", err);
      }
    });
  });

  itemsGrid.querySelectorAll("[data-action='dash-del-memory']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      deleteDashMemory(id);
    });
  });
}

function createDashSpotlightHTML(mem, parsed, matchedInTime) {
  const isSaved = allItems.some(
    (i) => i.content === mem.url || (i.sourceUrl && i.sourceUrl === mem.url)
  );

  const timeAgo = getTimeAgo(new Date(mem.visitedAt));
  const domain = escapeHTML(mem.domain || "web");
  const rawTitle = mem.title || mem.url;
  const title = escapeHTML(rawTitle);
  const snippetInfo = getContextSnippet(mem, searchQuery);
  const highlightedTitle = highlightMatches(rawTitle, searchQuery);
  const favicon = chrome.runtime.getURL("icons/icon16.png");
  const timeBadge = matchedInTime && parsed.timeRange?.label
    ? `From ${escapeHTML(parsed.timeRange.label)}`
    : `Visited ${timeAgo}`;

  const saveBtn = isSaved
    ? `<span class="btn-dash-promote saved">✓ Saved</span>`
    : `<button class="btn-dash-promote" data-action="dash-promote-memory" data-id="${mem.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Save to Saves
       </button>`;

  const promptEcho = parsed.promptText
    ? `Direct match for <strong>"${escapeHTML(parsed.promptText)}"</strong> ${parsed.timeRange?.label ? `from <strong>${escapeHTML(parsed.timeRange.label)}</strong>` : ""}:`
    : "Best direct answer:";

  const isActive = activePreviewMemoryId === mem.id ? " active-preview" : "";

  return `
    <div class="dash-ai-spotlight${isActive}" data-id="${mem.id}">
      <div class="dash-ai-spotlight-top">
        <span class="dash-ai-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Direct Memory Match
        </span>
        ${snippetInfo.matchBadge || ""}
        <span class="dash-memory-time" style="color:var(--neon); font-weight:700;">${timeBadge}</span>
      </div>
      <div class="dash-ai-echo">${promptEcho}</div>
      <a class="dash-memory-title" href="#" data-url="${escapeHTML(mem.url)}" title="${title}" style="font-size:17px;">${highlightedTitle}</a>
      ${snippetInfo.snippetHTML ? `<div class="dash-memory-snippet" style="font-size:13.5px;">${snippetInfo.snippetHTML}</div>` : ""}
      <div class="dash-memory-footer" style="padding-top:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <img class="dash-memory-favicon" src="${escapeHTML(favicon)}" alt="" />
          <span class="dash-memory-domain" style="font-size:13px;">${domain}</span>
        </div>
        <div class="dash-memory-actions">
          ${saveBtn}
          <button class="btn-dash-icon" data-action="dash-open-memory" data-url="${escapeHTML(mem.url)}" title="Open URL">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="btn-dash-icon danger" data-action="dash-del-memory" data-id="${mem.id}" title="Delete memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function createDashMemoryCardHTML(mem) {
  const isSaved = allItems.some(
    (i) => i.content === mem.url || (i.sourceUrl && i.sourceUrl === mem.url)
  );

  const timeAgo = getTimeAgo(new Date(mem.visitedAt));
  const domain = escapeHTML(mem.domain || "web");
  const rawTitle = mem.title || mem.url;
  const title = escapeHTML(rawTitle);
  const snippetInfo = getContextSnippet(mem, searchQuery);
  const highlightedTitle = highlightMatches(rawTitle, searchQuery);
  const favicon = chrome.runtime.getURL("icons/icon16.png");
  const visits = mem.visitCount > 1 ? `<span class="dash-memory-visits">Visited ${mem.visitCount}x</span>` : "";

  const saveBtn = isSaved
    ? `<span class="btn-dash-promote saved">✓ Saved</span>`
    : `<button class="btn-dash-promote" data-action="dash-promote-memory" data-id="${mem.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Save
       </button>`;

  const isActive = activePreviewMemoryId === mem.id ? " active-preview" : "";

  return `
    <div class="dash-memory-card${isActive}" data-id="${mem.id}">
      <div class="dash-memory-header">
        <div class="dash-memory-meta">
          <img class="dash-memory-favicon" src="${escapeHTML(favicon)}" alt="" />
          <span class="dash-memory-domain">${domain}</span>
          ${snippetInfo.matchBadge || ""}
          ${visits}
        </div>
        <span class="dash-memory-time">${timeAgo}</span>
      </div>
      <a class="dash-memory-title" href="#" data-url="${escapeHTML(mem.url)}" title="${title}">${highlightedTitle}</a>
      ${snippetInfo.snippetHTML ? `<div class="dash-memory-snippet">${snippetInfo.snippetHTML}</div>` : ""}
      <div class="dash-memory-footer">
        <div style="color:var(--text-muted); font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;">
          ${escapeHTML(mem.url)}
        </div>
        <div class="dash-memory-actions">
          ${saveBtn}
          <button class="btn-dash-icon" data-action="dash-open-memory" data-url="${escapeHTML(mem.url)}" title="Open URL">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="btn-dash-icon danger" data-action="dash-del-memory" data-id="${mem.id}" title="Delete memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function promoteDashMemory(mem, btnElement) {
  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    type: "link",
    content: mem.url,
    category: "General",
    sourceUrl: mem.url,
    sourceTitle: mem.title || "Web Memory Save",
    createdAt: Date.now(),
    tags: ["from-memory"],
    favorite: false,
  };

  chrome.runtime.sendMessage({ action: "saveItem", item: newItem }, () => {
    allItems.unshift(newItem);
    updateStats();
    showToast("Saved to your collection!");
    SyncService.pushToCloud(allItems, categories);

    if (btnElement) {
      btnElement.outerHTML = `<span class="btn-dash-promote saved">✓ Saved</span>`;
    }
  });
}

async function deleteDashMemory(id) {
  if (typeof MemoryStore !== "undefined" && MemoryStore.deleteMemory) {
    await MemoryStore.deleteMemory(id);
  } else {
    await new Promise((r) => chrome.runtime.sendMessage({ action: "deleteMemory", id }, r));
  }
  showToast("Memory deleted");
  updateMemoryStats();
  renderMemoryView();
}

async function initMemorySettings() {
  const settingMemoryEnabled = document.getElementById("setting-memory-enabled");
  const settingMemoryRetention = document.getElementById("setting-memory-retention");
  const settingMemoryBlacklist = document.getElementById("setting-memory-blacklist");
  const btnClearMemory = document.getElementById("btn-clear-memory");

  const settings = await chrome.storage.local.get(["memoryEnabled", "memoryRetentionDays", "memoryBlacklist"]);

  if (settingMemoryEnabled) {
    settingMemoryEnabled.checked = settings.memoryEnabled !== false;
    settingMemoryEnabled.addEventListener("change", () => {
      chrome.storage.local.set({ memoryEnabled: settingMemoryEnabled.checked });
      showToast(settingMemoryEnabled.checked ? "Web Memory enabled" : "Web Memory disabled");
    });
  }

  if (settingMemoryRetention) {
    if (settings.memoryRetentionDays) {
      settingMemoryRetention.value = String(settings.memoryRetentionDays);
    }
    settingMemoryRetention.addEventListener("change", () => {
      chrome.storage.local.set({ memoryRetentionDays: Number(settingMemoryRetention.value) });
      showToast(`Retention set to ${settingMemoryRetention.value} days`);
    });
  }

  if (settingMemoryBlacklist) {
    if (Array.isArray(settings.memoryBlacklist)) {
      settingMemoryBlacklist.value = settings.memoryBlacklist.join(", ");
    }
    settingMemoryBlacklist.addEventListener("change", () => {
      const list = settingMemoryBlacklist.value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      chrome.storage.local.set({ memoryBlacklist: list });
      showToast("Ignored domains updated");
    });
  }

  const btnSyncHistory = document.getElementById("btn-sync-history");
  if (btnSyncHistory) {
    btnSyncHistory.addEventListener("click", async () => {
      const originalText = btnSyncHistory.textContent;
      btnSyncHistory.textContent = "⏳ Syncing Chrome history...";
      btnSyncHistory.disabled = true;

      chrome.runtime.sendMessage({ action: "importChromeHistory", days: 14 }, (res) => {
        btnSyncHistory.textContent = originalText;
        btnSyncHistory.disabled = false;
        if (res && res.success) {
          showToast(`Imported ${res.count} pages from Chrome history!`);
          updateMemoryStats();
          if (currentView === "memory") {
            renderMemoryView();
          }
        } else {
          showToast(res?.error || "Could not sync Chrome history");
        }
      });
    });
  }

  if (btnClearMemory) {
    btnClearMemory.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear all recorded web memories? Your saved items will NOT be deleted.")) {
        if (typeof MemoryStore !== "undefined" && MemoryStore.clearAllMemories) {
          await MemoryStore.clearAllMemories();
        } else {
          await new Promise((r) => chrome.runtime.sendMessage({ action: "clearAllMemories" }, r));
        }
        showToast("Web memories cleared!");
        updateMemoryStats();
        if (currentView === "memory") {
          renderMemoryView();
        }
      }
    });
  }

  // Quick save floating pill setting
  const settingQuickSave = document.getElementById("setting-quick-save");
  if (settingQuickSave) {
    const { quickSaveEnabled = true } = await chrome.storage.local.get("quickSaveEnabled");
    settingQuickSave.checked = quickSaveEnabled !== false;
    settingQuickSave.addEventListener("change", () => {
      chrome.storage.local.set({ quickSaveEnabled: settingQuickSave.checked });
      showToast(settingQuickSave.checked ? "⚡ 1-Click floating save button enabled" : "1-Click floating save button disabled");
    });
  }
}

async function updateMemoryStats() {
  try {
    let stats = { count: 0, approxBytes: 0 };
    if (typeof MemoryStore !== "undefined" && MemoryStore.getStats) {
      stats = await MemoryStore.getStats();
    } else {
      stats = await new Promise((r) => chrome.runtime.sendMessage({ action: "getMemoryStats" }, r));
    }
    const countMemEl = document.getElementById("count-memory");
    if (countMemEl) countMemEl.textContent = stats.count || 0;

    const statsTextEl = document.getElementById("memory-stats-text");
    if (statsTextEl) {
      const kb = Math.round((stats.approxBytes || 0) / 1024);
      statsTextEl.textContent = `${stats.count || 0} pages remembered (~${kb} KB)`;
    }
  } catch (err) {
    console.warn("Memory stats update:", err);
  }
}

// ── View Switcher ──
function switchView(view) {
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
  if (btnSettings) btnSettings.classList.remove("active");

  if (view === "settings") {
    if (btnSettings) btnSettings.classList.add("active");
    currentView = "settings";
    pageTitle.textContent = "Settings";
    if (dashboardSplit) dashboardSplit.classList.add("hidden");
    if (bulkBar) bulkBar.classList.add("hidden");
    if (settingsPanel) settingsPanel.classList.remove("hidden");
    closePreview();
    return;
  }

  const navBtn = document.querySelector(`.sidebar-nav .nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add("active");

  currentView = view;
  pageTitle.textContent = view === "all" ? "All Items" : view === "favorite" ? "Favorites" : view === "memory" ? "Web Memory" : "All Items";

  if (settingsPanel) settingsPanel.classList.add("hidden");
  if (dashboardSplit) dashboardSplit.classList.remove("hidden");

  if (view === "memory") {
    if (statsRow) statsRow.classList.add("hidden");
    if (bulkBar) bulkBar.classList.add("hidden");
    if (previewPane) previewPane.classList.remove("hidden");
    if (previewResizer) previewResizer.classList.remove("hidden");
    renderMemoryView();
    if (activePreviewMemoryId) {
      const activeMem = currentMemories.find((m) => m.id === activePreviewMemoryId);
      if (activeMem) {
        showMemoryPreview(activeMem);
      } else {
        closePreview();
      }
    } else {
      closePreview();
    }
  } else {
    if (statsRow) statsRow.classList.remove("hidden");
    if (previewPane) previewPane.classList.remove("hidden");
    if (previewResizer) previewResizer.classList.remove("hidden");
    render();
  }
}

// ── Setup Event Listeners ──
function setupEventListeners() {
  // Left Sidebar Collapse / Expand Toggle
  if (btnSidebarToggle && sidebar) {
    btnSidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      btnSidebarToggle.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
      chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
    });
  }

  // Right Preview Pane Draggable Resizer
  if (previewResizer && previewPane) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    previewResizer.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = previewPane.getBoundingClientRect().width;
      previewResizer.classList.add("is-resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const diff = startX - e.clientX;
      const minWidth = 300;
      const maxWidth = Math.min(window.innerWidth * 0.65, 800);
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff));
      previewPane.style.width = `${newWidth}px`;
    });

    window.addEventListener("mouseup", () => {
      if (!isResizing) return;
      isResizing = false;
      previewResizer.classList.remove("is-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const currentWidth = Math.round(previewPane.getBoundingClientRect().width);
      chrome.storage.local.set({ previewPaneWidth: currentWidth });
    });
  }

  // Navigation
  document.querySelectorAll(".sidebar-nav > .nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });

  // Settings nav
  if (btnSettings) {
    btnSettings.addEventListener("click", () => switchView("settings"));
  }

  // Clickable Stat Cards (Total Saves & Favorites)
  if (statCardTotal) {
    statCardTotal.addEventListener("click", () => switchView("all"));
    statCardTotal.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchView("all");
      }
    });
  }

  if (statCardFavs) {
    statCardFavs.addEventListener("click", () => switchView("favorite"));
    statCardFavs.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchView("favorite");
      }
    });
  }

  // Preview Pane Actions
  if (previewCloseBtn) {
    previewCloseBtn.addEventListener("click", closePreview);
  }

  if (previewFavBtn) {
    previewFavBtn.addEventListener("click", () => {
      if (!activePreviewId) return;
      const item = allItems.find((i) => i.id === activePreviewId);
      if (!item) return;

      item.favorite = !item.favorite;
      SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
        updateStats();
        showPreview(item);
        const cardFavBtn = itemsGrid.querySelector(`.item-card[data-id="${item.id}"] [data-action="favorite"]`);
        if (cardFavBtn) {
          cardFavBtn.classList.toggle("fav-active", item.favorite);
          const svg = cardFavBtn.querySelector("svg");
          if (svg) svg.setAttribute("fill", item.favorite ? "currentColor" : "none");
        }
        SyncService.pushToCloud(allItems, categories);
      });
    });
  }

  if (previewCopyBtn) {
    previewCopyBtn.addEventListener("click", () => {
      if (activePreviewId) {
        const item = allItems.find((i) => i.id === activePreviewId);
        if (!item) return;
        navigator.clipboard.writeText(item.content);
      } else if (activePreviewMemoryId) {
        const mem = currentMemories.find((m) => m.id === activePreviewMemoryId);
        if (!mem) return;
        const textToCopy = `${mem.title || ""}\n${mem.url}\n\n${mem.textContent || mem.description || ""}`;
        navigator.clipboard.writeText(textToCopy);
      } else {
        return;
      }

      showToast("Copied to clipboard!");
      const originalHTML = previewCopyBtn.innerHTML;
      previewCopyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--neon);" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => (previewCopyBtn.innerHTML = originalHTML), 1200);
    });
  }

  if (previewEditBtn) {
    previewEditBtn.addEventListener("click", () => {
      if (activePreviewId) {
        const item = allItems.find((i) => i.id === activePreviewId);
        if (item) openEditorInSidebar(item);
      } else if (activePreviewMemoryId) {
        const mem = currentMemories.find((m) => m.id === activePreviewMemoryId);
        if (mem) {
          promoteDashMemory(mem);
          showMemoryPreview(mem);
        }
      }
    });
  }

  // Sidebar Inline Editor Actions
  if (previewEditorCloseBtn) {
    previewEditorCloseBtn.addEventListener("click", closeEditorInSidebar);
  }
  if (previewEditorCancelBtn) {
    previewEditorCancelBtn.addEventListener("click", closeEditorInSidebar);
  }
  if (previewEditorSaveBtn) {
    previewEditorSaveBtn.addEventListener("click", saveEditorInSidebar);
  }
  [previewEditorContent, previewEditorTags].forEach((inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        saveEditorInSidebar();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeEditorInSidebar();
      }
    });
  });

  if (previewDeleteBtn) {
    previewDeleteBtn.addEventListener("click", () => {
      if (activePreviewId) {
        const id = activePreviewId;
        allItems = allItems.filter((i) => i.id !== id);
        selectedIds.delete(id);
        closePreview();
        SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
          updateBulkBar();
          updateStats();
          render();
          showToast("Item deleted");
          SyncService.pushToCloud(allItems, categories);
        });
      } else if (activePreviewMemoryId) {
        const id = activePreviewMemoryId;
        closePreview();
        deleteDashMemory(id);
      }
    });
  }

  // Theme Toggle Button
  if (btnThemeDash) {
    btnThemeDash.addEventListener("click", toggleTheme);
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

  // Add New Item Button (opens sidebar editor directly)
  btnAddNew.addEventListener("click", () => {
    openEditorInSidebar(null);
  });

  modalCancel.addEventListener("click", () => modal.classList.add("hidden"));
  modal.querySelector(".modal-backdrop").addEventListener("click", () => modal.classList.add("hidden"));
  modalSave.addEventListener("click", handleModalSave);

  // Detail Modal Actions
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener("click", hideDetailModal);
  }
  if (detailModal) {
    const backdrop = detailModal.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", hideDetailModal);
  }
  if (detailCopyBtn) {
    detailCopyBtn.addEventListener("click", () => {
      if (!currentDetailItemId) return;
      const item = allItems.find((i) => i.id === currentDetailItemId);
      if (item) {
        navigator.clipboard.writeText(item.content);
        showToast("Copied to clipboard!");
      }
    });
  }
  if (detailEditBtn) {
    detailEditBtn.addEventListener("click", () => {
      if (!currentDetailItemId) return;
      const item = allItems.find((i) => i.id === currentDetailItemId);
      hideDetailModal();
      if (item) openEditorInSidebar(item);
    });
  }
  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener("click", () => {
      if (!currentDetailItemId) return;
      const id = currentDetailItemId;
      allItems = allItems.filter((i) => i.id !== id);
      selectedIds.delete(id);
      hideDetailModal();
      SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
        updateBulkBar();
        updateStats();
        render();
        showToast("Item deleted");
        SyncService.pushToCloud(allItems, categories);
      });
    });
  }

  // Bulk Actions
  btnSelectAll.addEventListener("click", () => {
    const visible = getFilteredItems();
    visible.forEach((i) => selectedIds.add(i.id));
    updateBulkBar();
    render();
  });

  btnDeleteSelected.addEventListener("click", () => {
    if (confirm(`Delete ${selectedIds.size} selected items?`)) {
      allItems = allItems.filter((i) => !selectedIds.has(i.id));
      SyncService.saveLocal({ items: allItems }, (saved) => {
      allItems = saved.items;
        selectedIds.clear();
        updateBulkBar();
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

  function toggleAuthMode(e) {
    if (e) e.preventDefault();
    if (authSubmitBtn.disabled) return;
    CloudSyncUI.feedback("");
    authIsSignUp = !authIsSignUp;
    authPasswordInput.autocomplete = authIsSignUp ? "new-password" : "current-password";
    authSubmitBtn.textContent = authIsSignUp ? "Create Account" : "Log In";
    authModeText.innerHTML = authIsSignUp
      ? `Already have an account? <a href="#" id="auth-toggle-mode" style="color:var(--neon);">Log In</a>`
      : `Don't have an account? <a href="#" id="auth-toggle-mode" style="color:var(--neon);">Sign Up</a>`;
    const toggleLink = document.getElementById("auth-toggle-mode");
    if (toggleLink) toggleLink.addEventListener("click", toggleAuthMode);
  }

  if (authToggleMode) {
    authToggleMode.addEventListener("click", toggleAuthMode);
  }

  authSubmitBtn.addEventListener("click", async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (!email || !password) {
      CloudSyncUI.feedback("Enter your email and password to continue.", "error");
      return;
    }

    if (!authEmailInput.reportValidity()) return;
    CloudSyncUI.feedback("Connecting to your account…");
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

      authPasswordInput.value = "";
      await checkAuthStatus();
      CloudSyncUI.feedback("");
      showToast("Syncing with cloud...");
      const synced = await SyncService.syncNow();
      if (synced) {
        allItems = synced.items || [];
      SyncService.rememberItems(allItems);
        if (synced.categories && synced.categories.length > 0) {
          categories = synced.categories;
        }
        updateStats();
        render();
      }
      checkAuthStatus();
    } catch (err) {
      CloudSyncUI.feedback(CloudSyncUI.errorMessage(err.message), "error");
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
      SyncService.rememberItems(allItems);
        if (res.categories && res.categories.length > 0) {
          categories = res.categories;
        }
        updateStats();
        render();
        showToast("Cloud sync complete!");
      }
    } catch (err) {
      showToast("Sync failed: " + err.message);
    } finally {
      btnSyncNow.disabled = false;
      await CloudSyncUI.refresh();
    }
  });

  btnLogout.addEventListener("click", async () => {
    await SyncService.logOut();
    CloudSyncUI.feedback("");
    authPasswordInput.value = "";
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
    modalContentInput.style.borderColor = "var(--neon-red)";
    setTimeout(() => (modalContentInput.style.borderColor = ""), 1000);
    return;
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
      item.tags = tags;
      item.type = detectedType;
    }
    showToast("Item updated!");
  } else {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: detectedType,
      content,
      category: "General",
      sourceUrl: "",
      sourceTitle: "",
      createdAt: Date.now(),
      tags,
      favorite: false,
    };
    allItems.unshift(item);
    showToast("Item saved!");
  }

  SyncService.saveLocal({ items: allItems, categories }, (saved) => {
      allItems = saved.items;
    modal.classList.add("hidden");
    editingItemId = null;
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
    dashAuthLabel.textContent = "Cloud Sync";
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

      SyncService.saveLocal({ items: allItems, categories }, (saved) => {
      allItems = saved.items;
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
    SyncService.saveLocal({ items: [] }, (saved) => {
      allItems = saved.items;
      allItems = [];
      selectedIds.clear();
      updateBulkBar();
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
