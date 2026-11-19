// ── SaveIt: Popup Controller (Cloud Sync, Tags & Categories, Web Memory) ──
let allItems = [];
let categories = ["General", "Study", "Reading", "Ideas"];
let activeCategory = "all";
let currentFilter = "all";
let searchQuery = "";
let editingItemId = null;
let authIsSignUp = false;
let activeMode = "saves"; // "saves" or "memory"
let allMemories = [];
let memorySearchDebounce = null;

// ── DOM Elements ──
const tabSaves = document.getElementById("tab-saves");
const tabMemory = document.getElementById("tab-memory");
const savesToolbar = document.getElementById("saves-toolbar");
const itemsContainer = document.getElementById("items-container");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const categoriesBar = document.getElementById("categories-bar");
const categoryDatalist = document.getElementById("category-datalist");
const btnAdd = document.getElementById("btn-add");
const btnPaste = document.getElementById("btn-paste");
const btnMenu = document.getElementById("btn-menu");
const dropdownMenu = document.getElementById("dropdown-menu");
const countBar = document.getElementById("count-bar");
const itemCount = document.getElementById("item-count");

// Add item modal
const addModal = document.getElementById("add-modal");
const addContent = document.getElementById("add-content");
const addCategory = document.getElementById("add-category");
const addTags = document.getElementById("add-tags");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

// Edit modal
const editModal = document.getElementById("edit-modal");
const editContent = document.getElementById("edit-content");
const editCategory = document.getElementById("edit-category");
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

// Theme elements
const btnTheme = document.getElementById("btn-theme");
const themeIconSun = document.getElementById("theme-icon-sun");
const themeIconMoon = document.getElementById("theme-icon-moon");
const menuTheme = document.getElementById("menu-theme");
const menuThemeLabel = document.getElementById("menu-theme-label");

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  await loadState();
  setupEventListeners();
  checkAuthStatus();
  autoSyncBackground();
});

async function initTheme() {
  const { theme = "dark" } = await chrome.storage.local.get("theme");
  applyTheme(theme);

  // Sync across windows
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.theme) {
      applyTheme(changes.theme.newValue);
    }
  });
}

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    if (themeIconSun) themeIconSun.classList.remove("hidden");
    if (themeIconMoon) themeIconMoon.classList.add("hidden");
    if (menuThemeLabel) menuThemeLabel.textContent = "Switch to Dark Mode";
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIconSun) themeIconSun.classList.add("hidden");
    if (themeIconMoon) themeIconMoon.classList.remove("hidden");
    if (menuThemeLabel) menuThemeLabel.textContent = "Switch to Light Mode";
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  await chrome.storage.local.set({ theme: next });
  showToast(next === "light" ? "☀️ Light mode activated" : "🌙 Dark mode activated");
}

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
      renderCategoriesBar();
      renderItems();
    }
  } catch (err) {
    console.warn("Background auto-sync:", err);
  }
}

async function loadState() {
  const data = await chrome.storage.local.get(["items", "categories", "activeCategory"]);
  allItems = data.items || [];
  if (data.categories && data.categories.length > 0) {
    categories = data.categories;
  }
  if (data.activeCategory) {
    activeCategory = data.activeCategory;
  }
  updateCategoryDatalist();
  renderCategoriesBar();
  renderItems();
}

// ── Category Datalist & Pills ──
function updateCategoryDatalist() {
  if (!categoryDatalist) return;
  categoryDatalist.innerHTML = categories
    .map((c) => `<option value="${escapeHTML(c)}">`)
    .join("");
}

function renderCategoriesBar() {
  if (!categoriesBar) return;

  let html = `
    <button class="category-pill ${activeCategory === "all" ? "active" : ""}" data-category="all">
      All Topics
    </button>
  `;

  categories.forEach((cat) => {
    const isAct = activeCategory.toLowerCase() === cat.toLowerCase();
    const count = allItems.filter(
      (i) => (i.category || "General").toLowerCase() === cat.toLowerCase()
    ).length;
    html += `
      <button class="category-pill ${isAct ? "active" : ""}" data-category="${escapeHTML(cat)}">
        ${escapeHTML(cat)} <span style="opacity:0.6; font-size:10px;">${count}</span>
      </button>
    `;
  });

  html += `<button class="category-pill category-pill-add" id="btn-add-category-quick" title="Add Category">+</button>`;

  categoriesBar.innerHTML = html;

  categoriesBar.querySelectorAll(".category-pill[data-category]").forEach((pill) => {
    pill.addEventListener("click", () => {
      activeCategory = pill.dataset.category;
      chrome.storage.local.set({ activeCategory });
      renderCategoriesBar();
      renderItems();
    });
  });

  const btnAddCat = document.getElementById("btn-add-category-quick");
  if (btnAddCat) {
    btnAddCat.addEventListener("click", () => {
      const newCat = prompt("Enter new category name (e.g. Poems, Movies, Study):");
      if (newCat && newCat.trim()) {
        const trimmed = newCat.trim();
        if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          categories.push(trimmed);
          activeCategory = trimmed;
          chrome.storage.local.set({ categories, activeCategory }, () => {
            updateCategoryDatalist();
            renderCategoriesBar();
            renderItems();
            SyncService.pushToCloud(allItems, categories);
          });
        }
      }
    });
  }
}

// ── Render Items ──
function renderItems() {
  const filtered = allItems.filter((item) => {
    // Filter by Category
    if (activeCategory !== "all") {
      const itemCat = (item.category || "General").toLowerCase();
      if (itemCat !== activeCategory.toLowerCase()) return false;
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
      const matchCategory = (item.category || "General").toLowerCase().includes(q);
      const matchSource = item.sourceTitle?.toLowerCase().includes(q);
      if (!matchContent && !matchTags && !matchCategory && !matchSource) return false;
    }

    return true;
  });

  // Count bar
  if (allItems.length > 0) {
    countBar.classList.remove("hidden");
    const catLabel = activeCategory === "all" ? "" : ` in ${activeCategory}`;
    itemCount.textContent = `${filtered.length} saved item${filtered.length === 1 ? "" : "s"}${catLabel}`;
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

  // Clickable category badges
  itemsContainer.querySelectorAll(".item-category-badge").forEach((catBadge) => {
    catBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      const cat = catBadge.dataset.category;
      if (cat) {
        activeCategory = cat;
        chrome.storage.local.set({ activeCategory });
        renderCategoriesBar();
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
  const categoryName = item.category || "General";

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
          <span class="item-category-badge" data-category="${escapeHTML(categoryName)}" title="Filter by category">${escapeHTML(categoryName)}</span>
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
      SyncService.pushToCloud(allItems, categories);
    });
  }

  if (action === "edit") {
    editingItemId = id;
    editContent.value = item.content;
    editCategory.value = item.category || "General";
    editTags.value = (item.tags || []).join(", ");
    editModal.classList.remove("hidden");
    editContent.focus();
  }

  if (action === "delete") {
    chrome.runtime.sendMessage({ action: "deleteItem", id }, () => {
      allItems = allItems.filter((i) => i.id !== id);
      renderCategoriesBar();
      renderItems();
      showToast("Item deleted");
      SyncService.pushToCloud(allItems, categories);
    });
  }
}

// ── Web Memory Renderer ──
let currentNlpResult = null;

async function loadAndRenderMemories() {
  try {
    currentNlpResult = null;
    const trimmed = (searchQuery || "").trim();

    if (trimmed && typeof NLPParser !== "undefined") {
      const parsed = NLPParser.parseQuery(trimmed);

      if (parsed.isConversational || parsed.timeRange) {
        if (typeof MemoryStore !== "undefined" && MemoryStore.queryMemoriesByTimeAndKeywords) {
          const res = await MemoryStore.queryMemoriesByTimeAndKeywords({
            keywords: parsed.cleanKeywords,
            timeRange: parsed.timeRange,
            limit: 40,
          });
          currentNlpResult = { ...res, parsed };
          allMemories = res.items || [];
          renderMemories();
          return;
        }
      }
    }

    // Standard search
    let results = [];
    if (typeof MemoryStore !== "undefined" && MemoryStore.searchMemories) {
      results = await MemoryStore.searchMemories(searchQuery, 40);
    } else {
      results = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "searchMemories", query: searchQuery, limit: 40 }, (res) => {
          resolve(res || []);
        });
      });
    }
    allMemories = results || [];
    renderMemories();
  } catch (err) {
    console.error("Error loading memories:", err);
    renderMemories();
  }
}

function renderMemories() {
  if (allMemories.length === 0) {
    itemsContainer.classList.add("hidden");
    emptyState.classList.remove("hidden");
    const emptyP = emptyState.querySelector("p");
    const emptySpan = emptyState.querySelector("span");
    if (searchQuery) {
      if (emptyP) emptyP.textContent = "No memories found";
      if (emptySpan) emptySpan.textContent = `Nothing matched "${searchQuery}". Try different words or dates.`;
    } else {
      if (emptyP) emptyP.textContent = "No browsing memories yet";
      if (emptySpan) {
        emptySpan.innerHTML = `Pages you browse will appear here automatically.<br/><button id="btn-popup-sync" style="margin-top:10px; background:rgba(190,250,79,0.12); border:1px solid var(--neon); color:var(--neon); padding:5px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">⚡ Sync Past 14 Days History</button>`;
        const btnSync = document.getElementById("btn-popup-sync");
        if (btnSync) {
          btnSync.addEventListener("click", () => {
            btnSync.textContent = "⏳ Syncing...";
            btnSync.disabled = true;
            chrome.runtime.sendMessage({ action: "importChromeHistory", days: 14 }, (res) => {
              if (res && res.success) {
                showToast(`Imported ${res.count} pages!`);
                loadAndRenderMemories();
              } else {
                showToast(res?.error || "Could not sync history");
                btnSync.textContent = "⚡ Sync Past 14 Days History";
                btnSync.disabled = false;
              }
            });
          });
        }
      }
    }
    return;
  }

  emptyState.classList.add("hidden");
  itemsContainer.classList.remove("hidden");

  let html = "";

  // If we have an AI conversational spotlight match
  if (currentNlpResult && currentNlpResult.items && currentNlpResult.items.length > 0) {
    const topMatch = currentNlpResult.items[0];
    html += createSpotlightCardHTML(topMatch, currentNlpResult.parsed, currentNlpResult.matchedInTimeRange);

    const remaining = currentNlpResult.items.slice(1);
    if (remaining.length > 0) {
      html += `<div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin: 10px 0 6px; letter-spacing:0.5px;">Other Relevant Visits</div>`;
      html += remaining.map((mem) => createMemoryHTML(mem)).join("");
    }
  } else {
    html = allMemories.map((mem) => createMemoryHTML(mem)).join("");
  }

  itemsContainer.innerHTML = html;

  // Attach memory card events
  itemsContainer.querySelectorAll(".memory-title-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const url = link.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });

  itemsContainer.querySelectorAll("[data-action='promote-memory']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      promoteMemoryToSave(id, btn);
    });
  });

  itemsContainer.querySelectorAll("[data-action='delete-memory']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      deleteMemoryRecord(id);
    });
  });
}

function createSpotlightCardHTML(mem, parsed, matchedInTime) {
  const isSaved = allItems.some(
    (i) => i.content === mem.url || (i.sourceUrl && i.sourceUrl === mem.url)
  );

  const timeAgo = getTimeAgo(new Date(mem.visitedAt));
  const domain = escapeHTML(mem.domain || "web");
  const title = escapeHTML(mem.title || mem.url);
  const snippet = escapeHTML(mem.description || mem.keywords || mem.textContent || "").slice(0, 160);
  const favicon = mem.favicon || `https://www.google.com/s2/favicons?domain=${mem.domain}&sz=32`;

  const timeBadge = matchedInTime && parsed.timeRange?.label
    ? `From ${escapeHTML(parsed.timeRange.label)}`
    : `Visited ${timeAgo}`;

  const saveBtn = isSaved
    ? `<span class="btn-promote-save saved">✓ Saved</span>`
    : `<button class="btn-promote-save" data-action="promote-memory" data-id="${mem.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Save
       </button>`;

  const promptEcho = parsed.promptText
    ? `Found matching <strong>"${escapeHTML(parsed.promptText)}"</strong> ${parsed.timeRange?.label ? `from <strong>${escapeHTML(parsed.timeRange.label)}</strong>` : ""}:`
    : "Best direct answer:";

  return `
    <div class="ai-answer-card" data-id="${mem.id}">
      <div class="ai-answer-top">
        <span class="ai-answer-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Direct Match
        </span>
        <span class="ai-answer-time-tag">${timeBadge}</span>
      </div>
      <div class="ai-answer-prompt-echo">${promptEcho}</div>
      <a class="ai-answer-title memory-title-link" href="#" data-url="${escapeHTML(mem.url)}" title="${title}">${title}</a>
      ${snippet ? `<div class="ai-answer-snippet">${snippet}…</div>` : ""}
      <div class="ai-answer-actions">
        <div style="display:flex; align-items:center; gap:6px;">
          <img class="memory-favicon" src="${escapeHTML(favicon)}" onerror="this.style.display='none'" alt="" />
          <span class="memory-domain">${domain}</span>
        </div>
        <div class="memory-actions">
          ${saveBtn}
          <button class="memory-del-btn" data-action="delete-memory" data-id="${mem.id}" title="Remove memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function createMemoryHTML(mem) {
  const isSaved = allItems.some(
    (i) => i.content === mem.url || (i.sourceUrl && i.sourceUrl === mem.url)
  );

  const timeAgo = getTimeAgo(new Date(mem.visitedAt));
  const domain = escapeHTML(mem.domain || "web");
  const title = escapeHTML(mem.title || mem.url);
  const snippet = escapeHTML(mem.description || mem.keywords || mem.textContent || "").slice(0, 140);
  const favicon = mem.favicon || `https://www.google.com/s2/favicons?domain=${mem.domain}&sz=32`;
  const visits = mem.visitCount > 1 ? ` · Visited ${mem.visitCount}x` : "";

  const saveBtn = isSaved
    ? `<span class="btn-promote-save saved">✓ Saved</span>`
    : `<button class="btn-promote-save" data-action="promote-memory" data-id="${mem.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Save
       </button>`;

  return `
    <div class="memory-card" data-id="${mem.id}">
      <div class="memory-header">
        <div class="memory-origin">
          <img class="memory-favicon" src="${escapeHTML(favicon)}" onerror="this.style.display='none'" alt="" />
          <span class="memory-domain">${domain}</span>
        </div>
        <span class="memory-time">${timeAgo}${visits}</span>
      </div>
      <a class="memory-title-link" href="#" data-url="${escapeHTML(mem.url)}" title="${title}">${title}</a>
      ${snippet ? `<div class="memory-snippet">${snippet}…</div>` : ""}
      <div class="memory-footer">
        <div class="memory-visits">
          <span style="color:var(--text-muted); font-size:10px;">${escapeHTML(mem.url.slice(0, 38))}…</span>
        </div>
        <div class="memory-actions">
          ${saveBtn}
          <button class="memory-del-btn" data-action="delete-memory" data-id="${mem.id}" title="Remove memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function promoteMemoryToSave(memId, btnElement) {
  const mem = allMemories.find((m) => m.id === memId);
  if (!mem) return;

  const cat = activeCategory !== "all" ? activeCategory : "General";
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    type: "link",
    content: mem.url,
    category: cat,
    sourceUrl: mem.url,
    sourceTitle: mem.title || "Web Memory Save",
    createdAt: Date.now(),
    tags: ["from-memory"],
    favorite: false,
  };

  chrome.runtime.sendMessage({ action: "saveItem", item }, () => {
    allItems.unshift(item);
    renderCategoriesBar();
    showToast(`Saved to ${cat}!`);
    SyncService.pushToCloud(allItems, categories);

    if (btnElement) {
      btnElement.outerHTML = `<span class="btn-promote-save saved">✓ Saved</span>`;
    }
  });
}

async function deleteMemoryRecord(memId) {
  if (typeof MemoryStore !== "undefined" && MemoryStore.deleteMemory) {
    await MemoryStore.deleteMemory(memId);
  } else {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "deleteMemory", id: memId }, resolve);
    });
  }

  allMemories = allMemories.filter((m) => m.id !== memId);
  renderMemories();
  showToast("Memory removed");
}

// ── Event Listeners Setup ──
function setupEventListeners() {
  // Theme Toggle Buttons
  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }
  if (menuTheme) {
    menuTheme.addEventListener("click", () => {
      toggleTheme();
      dropdownMenu.classList.add("hidden");
    });
  }

  // Mode Switch Tabs (My Saves vs Web Memory)
  if (tabSaves && tabMemory) {
    tabSaves.addEventListener("click", () => {
      if (activeMode === "saves") return;
      activeMode = "saves";
      tabSaves.classList.add("active");
      tabMemory.classList.remove("active");
      if (savesToolbar) savesToolbar.classList.remove("hidden");
      if (categoriesBar) categoriesBar.classList.remove("hidden");
      searchInput.placeholder = "Search your saves...";
      searchQuery = searchInput.value;
      renderItems();
    });

    tabMemory.addEventListener("click", () => {
      if (activeMode === "memory") return;
      activeMode = "memory";
      tabMemory.classList.add("active");
      tabSaves.classList.remove("active");
      if (savesToolbar) savesToolbar.classList.add("hidden");
      if (categoriesBar) categoriesBar.classList.add("hidden");
      searchInput.placeholder = "Search browsing memory (e.g. Nike, Python, tutorial)...";
      searchQuery = searchInput.value;
      loadAndRenderMemories();
    });
  }

  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    if (activeMode === "saves") {
      renderItems();
    } else {
      if (memorySearchDebounce) clearTimeout(memorySearchDebounce);
      memorySearchDebounce = setTimeout(() => {
        loadAndRenderMemories();
      }, 180);
    }
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
      const cat = activeCategory !== "all" ? activeCategory : "General";

      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        type: isUrl ? "link" : "text",
        content: text.trim(),
        category: cat,
        sourceUrl: "",
        sourceTitle: "",
        createdAt: Date.now(),
        tags: [],
        favorite: false,
      };

      chrome.runtime.sendMessage({ action: "saveItem", item }, () => {
        allItems.unshift(item);
        renderCategoriesBar();
        renderItems();
        showToast(`${isUrl ? "Link" : "Text"} saved to ${cat}!`);
        SyncService.pushToCloud(allItems, categories);
      });
    } catch {
      showToast("Cannot read clipboard – permission needed");
    }
  });

  // Add Item Modal
  btnAdd.addEventListener("click", () => {
    addModal.classList.remove("hidden");
    addContent.value = "";
    addCategory.value = activeCategory !== "all" ? activeCategory : "General";
    addTags.value = "";
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

    const cat = addCategory.value.trim() || "General";
    if (!categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      categories.push(cat);
      chrome.storage.local.set({ categories });
      updateCategoryDatalist();
    }

    const tags = addTags.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const isUrl = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content);

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: isUrl ? "link" : "text",
      content,
      category: cat,
      sourceUrl: "",
      sourceTitle: "",
      createdAt: Date.now(),
      tags,
      favorite: false,
    };

    chrome.runtime.sendMessage({ action: "saveItem", item }, () => {
      allItems.unshift(item);
      renderCategoriesBar();
      renderItems();
      addModal.classList.add("hidden");
      showToast("Item saved!");
      SyncService.pushToCloud(allItems, categories);
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

    const cat = editCategory.value.trim() || "General";
    if (!categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      categories.push(cat);
      chrome.storage.local.set({ categories });
      updateCategoryDatalist();
    }

    const tags = editTags.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const item = allItems.find((i) => i.id === editingItemId);
    if (item) {
      item.content = content;
      item.category = cat;
      item.tags = tags;
      item.type = /^https?:\/\//i.test(content) || /^(www\.)/i.test(content) ? "link" : "text";

      chrome.runtime.sendMessage({ action: "updateItem", item }, () => {
        renderCategoriesBar();
        renderItems();
        editModal.classList.add("hidden");
        editingItemId = null;
        showToast("Item updated!");
        SyncService.pushToCloud(allItems, categories);
      });
    }
  });

  // Auth / Cloud Sync Modal
  btnAuth.addEventListener("click", () => {
    checkAuthStatus();
    authModal.classList.remove("hidden");
  });

  authModalCancel.addEventListener("click", () => authModal.classList.add("hidden"));
  authModal.querySelector(".modal-backdrop").addEventListener("click", () => authModal.classList.add("hidden"));

  function toggleAuthMode(e) {
    if (e) e.preventDefault();
    authIsSignUp = !authIsSignUp;
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
        allItems = synced.items || [];
        if (synced.categories && synced.categories.length > 0) {
          categories = synced.categories;
        }
        updateCategoryDatalist();
        renderCategoriesBar();
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
        if (res.categories && res.categories.length > 0) {
          categories = res.categories;
        }
        updateCategoryDatalist();
        renderCategoriesBar();
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

  const menuDashboard = document.getElementById("menu-dashboard");
  if (menuDashboard) {
    menuDashboard.addEventListener("click", () => {
      dropdownMenu.classList.add("hidden");
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
  }

  // Export
  document.getElementById("menu-export").addEventListener("click", () => {
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
        const importedCategories = parsed.categories || [];

        allItems = [...importedItems, ...allItems];
        if (importedCategories.length > 0) {
          categories = Array.from(new Set([...categories, ...importedCategories]));
        }

        chrome.storage.local.set({ items: allItems, categories }, () => {
          updateCategoryDatalist();
          renderCategoriesBar();
          renderItems();
          showToast(`Imported ${importedItems.length} items!`);
          SyncService.pushToCloud(allItems, categories);
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
        renderCategoriesBar();
        renderItems();
        showToast("All items cleared");
        SyncService.pushToCloud([], categories);
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
