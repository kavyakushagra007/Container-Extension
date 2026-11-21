// ── SaveIt: Web Memory IndexedDB Storage Engine ──
// Stores visited page digests locally with full-text search capability.
// 100% private & offline - never sent to any external server.

const MemoryStore = (() => {
  const DB_NAME = "SaveItWebMemoryDB";
  const DB_VERSION = 1;
  const STORE_NAME = "memories";
  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("url", "url", { unique: false });
          store.createIndex("normalizedUrl", "normalizedUrl", { unique: false });
          store.createIndex("domain", "domain", { unique: false });
          store.createIndex("visitedAt", "visitedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("IndexedDB open error:", request.error);
        reject(request.error);
      };
    });
    return dbPromise;
  }

  // Normalize URL by stripping tracking parameters, hash, and trailing slashes
  function normalizeUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      const searchParams = new URLSearchParams(u.search);
      const trackingParams = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "ref", "ref_src", "fbclid", "gclid", "_ga", "mc_cid", "mc_eid"
      ];
      trackingParams.forEach((param) => searchParams.delete(param));
      const cleanSearch = searchParams.toString();
      return (u.hostname + u.pathname.replace(/\/+$/, "") + (cleanSearch ? "?" + cleanSearch : "")).toLowerCase();
    } catch {
      return (rawUrl || "").toLowerCase();
    }
  }

  function extractDomain(rawUrl) {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  // Save or update a visited page digest
  async function saveMemory(pageData) {
    if (!pageData || !pageData.url) return null;
    const db = await getDB();
    const normalized = normalizeUrl(pageData.url);
    const domain = pageData.domain || extractDomain(pageData.url);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const normIndex = store.index("normalizedUrl");
      const getReq = normIndex.getAll(normalized);

      getReq.onsuccess = () => {
        const existingList = getReq.result || [];
        const now = Date.now();
        // Check if same URL was visited recently (within 24 hours)
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const recent = existingList.find((item) => (now - item.visitedAt) < TWENTY_FOUR_HOURS);

        let record;
        if (recent) {
          record = {
            ...recent,
            title: pageData.title || recent.title,
            description: pageData.description || recent.description,
            keywords: pageData.keywords || recent.keywords,
            textContent: pageData.textContent || recent.textContent,
            favicon: pageData.favicon || recent.favicon,
            visitedAt: now,
            visitCount: (recent.visitCount || 1) + 1,
          };
        } else {
          record = {
            id: "mem_" + now + "_" + Math.random().toString(36).substr(2, 6),
            url: pageData.url,
            normalizedUrl: normalized,
            domain: domain,
            title: pageData.title || "Untitled Page",
            description: pageData.description || "",
            keywords: pageData.keywords || "",
            textContent: pageData.textContent || "",
            favicon: pageData.favicon || "",
            visitedAt: now,
            visitCount: 1,
          };
        }

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  // Search memories with scoring based on field relevance
  async function searchMemories(query = "", limit = 50) {
    const db = await getDB();
    const trimmed = (query || "").trim().toLowerCase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const visitedIndex = store.index("visitedAt");
      const req = visitedIndex.openCursor(null, "prev"); // newest first
      const results = [];

      if (!trimmed) {
        // Return most recent memories if search is empty
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
        return;
      }

      const terms = trimmed.split(/\s+/).filter(Boolean);

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          const title = (val.title || "").toLowerCase();
          const desc = (val.description || "").toLowerCase();
          const keywords = (val.keywords || "").toLowerCase();
          const text = (val.textContent || "").toLowerCase();
          const domain = (val.domain || "").toLowerCase();
          const url = (val.url || "").toLowerCase();

          let score = 0;
          let allMatch = true;

          for (const term of terms) {
            let termScore = 0;
            if (title.includes(term)) termScore += 15;
            if (domain.includes(term)) termScore += 10;
            if (keywords.includes(term)) termScore += 8;
            if (desc.includes(term)) termScore += 6;
            if (url.includes(term)) termScore += 4;
            if (text.includes(term)) termScore += 2;

            if (termScore === 0) {
              allMatch = false;
              break;
            }
            score += termScore;
          }

          if (allMatch && score > 0) {
            // Boost score slightly for more visits and recent visits
            const hoursAgo = Math.max(0, (Date.now() - val.visitedAt) / (1000 * 60 * 60));
            const recencyBoost = Math.max(0, 5 - (hoursAgo / 24));
            const totalScore = score + (val.visitCount || 1) + recencyBoost;

            results.push({ item: val, score: totalScore });
          }

          cursor.continue();
        } else {
          // Sort by score descending
          results.sort((a, b) => b.score - a.score);
          resolve(results.slice(0, limit).map((r) => r.item));
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  // Natural Language & Time-Filtered Query
  async function queryMemoriesByTimeAndKeywords({ keywords = [], timeRange = null, limit = 40 }) {
    const terms = (keywords || []).map((k) => (k || "").toLowerCase().trim()).filter(Boolean);

    // 1. Search within the time range
    const results = await runSliceQuery(terms, timeRange, limit);
    if (results.length > 0) {
      return { items: results, matchedInTimeRange: true, timeLabel: timeRange?.label || "" };
    }

    // 2. Fallback: if user specified a time cue but no match in that slice, search across all time
    if (timeRange && terms.length > 0) {
      const fallback = await runSliceQuery(terms, null, limit);
      if (fallback.length > 0) {
        return { items: fallback, matchedInTimeRange: false, timeLabel: timeRange.label || "" };
      }
    }

    return { items: [], matchedInTimeRange: false, timeLabel: timeRange?.label || "" };
  }

  async function runSliceQuery(terms, timeRange, limit) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const visitedIndex = store.index("visitedAt");

      let range = null;
      if (timeRange && typeof timeRange.start === "number" && typeof timeRange.end === "number") {
        range = IDBKeyRange.bound(timeRange.start, timeRange.end);
      }

      const req = visitedIndex.openCursor(range, "prev");
      const matches = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          const title = (val.title || "").toLowerCase();
          const desc = (val.description || "").toLowerCase();
          const kws = (val.keywords || "").toLowerCase();
          const text = (val.textContent || "").toLowerCase();
          const domain = (val.domain || "").toLowerCase();
          const url = (val.url || "").toLowerCase();

          let score = 0;
          let matchedCount = 0;

          if (terms.length === 0) {
            score = 10 + (val.visitCount || 1);
            matchedCount = 1;
          } else {
            for (const term of terms) {
              let termScore = 0;
              if (title.includes(term)) termScore += 18;
              if (domain.includes(term)) termScore += 12;
              if (kws.includes(term)) termScore += 9;
              if (desc.includes(term)) termScore += 7;
              if (url.includes(term)) termScore += 5;
              if (text.includes(term)) termScore += 3;

              if (termScore > 0) {
                matchedCount++;
                score += termScore;
              }
            }
          }

          const threshold = terms.length <= 1 ? terms.length : Math.min(2, terms.length);
          if (matchedCount >= threshold && score > 0) {
            if (matchedCount === terms.length && terms.length > 0) score += 25; // All terms matched bonus
            score += (val.visitCount || 1);
            matches.push({ item: val, score });
          }

          cursor.continue();
        } else {
          matches.sort((a, b) => b.score - a.score);
          resolve(matches.slice(0, limit).map((m) => m.item));
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  // Get recent memories sorted by time
  async function getRecentMemories(limit = 100) {
    return searchMemories("", limit);
  }

  // Delete a specific memory item
  async function deleteMemory(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Clear all recorded memories
  async function clearAllMemories() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Purge records older than retentionDays
  async function purgeOldMemories(retentionDays = 14) {
    const db = await getDB();
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("visitedAt");
      const range = IDBKeyRange.upperBound(cutoff);
      const req = index.openCursor(range);
      let purgedCount = 0;

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          purgedCount++;
          cursor.continue();
        } else {
          resolve(purgedCount);
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  // Batch import history items
  async function importHistoryItems(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      let count = 0;

      for (const item of items) {
        if (!item || !item.url) continue;
        const normalized = normalizeUrl(item.url);
        const domain = item.domain || extractDomain(item.url);
        const record = {
          id: item.id || ("mem_" + (item.visitedAt || Date.now()) + "_" + Math.random().toString(36).substr(2, 6)),
          url: item.url,
          normalizedUrl: normalized,
          domain: domain,
          title: item.title || "Untitled Page",
          description: item.description || "",
          keywords: item.keywords || "",
          textContent: item.textContent || "",
          favicon: item.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          visitedAt: item.visitedAt || Date.now(),
          visitCount: item.visitCount || 1,
        };
        store.put(record);
        count++;
      }

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get database stats
  async function getStats() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result || 0;
        // Approximation: ~1.5KB per page digest
        const approxBytes = count * 1500;
        resolve({ count, approxBytes });
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  return {
    saveMemory,
    importHistoryItems,
    searchMemories,
    queryMemoriesByTimeAndKeywords,
    getRecentMemories,
    deleteMemory,
    clearAllMemories,
    purgeOldMemories,
    getStats,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MemoryStore;
}

