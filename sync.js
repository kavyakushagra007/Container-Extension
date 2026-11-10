// ── SaveIt: Firebase Auth & Cloud Firestore Sync Module (Collections & Containers) ──
// Uses standard Firebase REST APIs (0 dependencies, Manifest V3 CSP safe)

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDo5ZvoQaXyJJWrZzD2VAuye45nUNTfQ6E",
  projectId: "container-extension",
};

// ── Default Hierarchy Constants ──
const DEFAULT_COLLECTIONS = [
  { id: "col_brand", name: "Brand", color: "#4F46E5", createdAt: 1700000001000, order: 0 },
  { id: "col_general", name: "General", color: "#0D9488", createdAt: 1700000002000, order: 1 },
];

const DEFAULT_CONTAINERS = [
  { id: "cont_theme_ideas", collectionId: "col_brand", name: "Theme Ideas", icon: "archive", color: "#2563EB", note: "Design concepts, moodboards & brand aesthetics", description: "Design concepts, moodboards & brand aesthetics", createdAt: 1700000003000, order: 0 },
  { id: "cont_marketing", collectionId: "col_brand", name: "Marketing Materials", icon: "archive", color: "#E11D48", note: "Ad copy, campaigns, landing page inspo", description: "Ad copy, campaigns, landing page inspo", createdAt: 1700000004000, order: 1 },
  { id: "cont_colours", collectionId: "col_brand", name: "Colour Templates", icon: "archive", color: "#F59E0B", note: "Palettes, hex codes, visual identity guidelines", description: "Palettes, hex codes, visual identity guidelines", createdAt: 1700000005000, order: 2 },
  { id: "cont_reading", collectionId: "col_general", name: "Articles & Reading", icon: "archive", color: "#7C3AED", note: "Long-form blogs, research, guides & essays", description: "Long-form blogs, research, guides & essays", createdAt: 1700000006000, order: 3 },
  { id: "cont_notes", collectionId: "col_general", name: "Notes & Snippets", icon: "archive", color: "#0D9488", note: "Ideas, quotes & snippets", description: "Ideas, quotes & snippets", createdAt: 1700000007000, order: 4 },
];

// ── Helper: Smart URL / Content Classification ──
function classifyContent(content, sourceUrl = "") {
  const url = (sourceUrl || content || "").trim();
  const text = (content || "").trim();

  // YouTube detection
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      videoId: ytMatch[1],
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }

  // Image URL detection
  if (url.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?$/i) || text.startsWith("data:image/")) {
    return {
      type: "image",
      imageUrl: url,
    };
  }

  // Social detection
  if (url.match(/twitter\.com|x\.com/i)) return { type: "social", platform: "x" };
  if (url.match(/linkedin\.com/i)) return { type: "social", platform: "linkedin" };
  if (url.match(/reddit\.com/i)) return { type: "social", platform: "reddit" };

  // Quote detection: starts & ends with quotation marks or short highlighted phrase
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”')) || (text.length < 280 && text.includes(" — "))) {
    return { type: "quote" };
  }

  // Product / E-commerce detection
  if (url.match(/amazon\.|shopify\.com|etsy\.com|ebay\.com|aliexpress\.com/i)) {
    return { type: "product" };
  }

  // Generic URL
  if (url.match(/^https?:\/\//i)) {
    return { type: "link" };
  }

  return { type: "text" };
}

const SyncService = {
  // ── Auth State ──
  async getUser() {
    const data = await chrome.storage.local.get(["authUser", "authToken", "authRefreshToken"]);
    return data.authUser ? { user: data.authUser, token: data.authToken } : null;
  },

  // ── Sign Up ──
  async signUp(email, password) {
    if (FIREBASE_CONFIG.apiKey.includes("YOUR_FIREBASE_API_KEY")) {
      throw new Error("Please set your Firebase API Key in sync.js first.");
    }
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Sign up failed");
    }
    await this._saveSession(data);
    return data;
  },

  // ── Log In ──
  async logIn(email, password) {
    if (FIREBASE_CONFIG.apiKey.includes("YOUR_FIREBASE_API_KEY")) {
      throw new Error("Please set your Firebase API Key in sync.js first.");
    }
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Login failed");
    }
    await this._saveSession(data);
    return data;
  },

  // ── Log Out ──
  async logOut() {
    await chrome.storage.local.remove(["authUser", "authToken", "authRefreshToken", "authExpiresAt"]);
  },

  async _saveSession(data) {
    const user = { uid: data.localId, email: data.email };
    const expiresAt = Date.now() + parseInt(data.expiresIn, 10) * 1000;
    await chrome.storage.local.set({
      authUser: user,
      authToken: data.idToken,
      authRefreshToken: data.refreshToken,
      authExpiresAt: expiresAt,
    });
  },

  // ── Refresh Token if expired ──
  async getValidToken() {
    const { authToken, authRefreshToken, authExpiresAt } = await chrome.storage.local.get([
      "authToken",
      "authRefreshToken",
      "authExpiresAt",
    ]);
    if (!authToken) return null;

    if (Date.now() > (authExpiresAt || 0) - 60000 && authRefreshToken) {
      try {
        const res = await fetch(
          `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=refresh_token&refresh_token=${authRefreshToken}`,
          }
        );
        const data = await res.json();
        if (res.ok) {
          const expiresAt = Date.now() + parseInt(data.expires_in, 10) * 1000;
          await chrome.storage.local.set({
            authToken: data.id_token,
            authRefreshToken: data.refresh_token,
            authExpiresAt: expiresAt,
          });
          return data.id_token;
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
    return authToken;
  },

  // ── Push Local Data to Firebase Cloud Firestore ──
  async pushToCloud(items, containers, collections) {
    const session = await this.getUser();
    if (!session) return false;

    const token = await this.getValidToken();
    if (!token) return false;

    const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${session.user.uid}/appData/userData`;

    const body = {
      fields: {
        itemsJson: { stringValue: JSON.stringify(items || []) },
        containersJson: { stringValue: JSON.stringify(containers || []) },
        collectionsJson: { stringValue: JSON.stringify(collections || []) },
        lastSyncedAt: { integerValue: Date.now().toString() },
      },
    };

    const res = await fetch(documentUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Sync failed (HTTP ${res.status})`);
    }
    return true;
  },

  // ── Pull Data from Firebase Cloud Firestore ──
  async pullFromCloud() {
    const session = await this.getUser();
    if (!session) return null;

    const token = await this.getValidToken();
    if (!token) return null;

    const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${session.user.uid}/appData/userData`;

    try {
      const res = await fetch(documentUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `Cloud read failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      const itemsJson = data.fields?.itemsJson?.stringValue;
      const containersJson = data.fields?.containersJson?.stringValue;
      const collectionsJson = data.fields?.collectionsJson?.stringValue;

      const cloudItems = itemsJson ? JSON.parse(itemsJson) : [];
      const cloudContainers = containersJson ? JSON.parse(containersJson) : [];
      const cloudCollections = collectionsJson ? JSON.parse(collectionsJson) : [];

      return {
        items: cloudItems,
        containers: cloudContainers,
        collections: cloudCollections,
      };
    } catch (err) {
      console.warn("Cloud pull failed:", err);
      throw err;
    }
  },

  // ── Full Bidirectional Sync ──
  async syncNow() {
    const state = await this.ensureInitializedAndMigrated();
    const { items, containers, collections } = state;

    const cloud = await this.pullFromCloud();
    if (!cloud) {
      await this.pushToCloud(items, containers, collections);
      return state;
    }

    // Merge collections
    const colMap = new Map();
    DEFAULT_COLLECTIONS.forEach((c) => colMap.set(c.id, c));
    collections.forEach((c) => { if (c && c.id) colMap.set(c.id, c); });
    (cloud.collections || []).forEach((cc) => {
      if (cc && cc.id && !colMap.has(cc.id)) colMap.set(cc.id, cc);
    });
    const mergedCollections = Array.from(colMap.values());

    // Merge containers
    const contMap = new Map();
    DEFAULT_CONTAINERS.forEach((c) => contMap.set(c.id, c));
    containers.forEach((c) => { if (c && c.id) contMap.set(c.id, c); });
    (cloud.containers || []).forEach((cc) => {
      if (cc && cc.id && !contMap.has(cc.id)) contMap.set(cc.id, cc);
    });
    const mergedContainers = Array.from(contMap.values());

    // Merge items
    const itemMap = new Map();
    items.forEach((i) => { if (i && i.id) itemMap.set(i.id, i); });
    (cloud.items || []).forEach((ci) => {
      if (ci && ci.id) {
        if (!itemMap.has(ci.id) || (ci.createdAt || 0) > (itemMap.get(ci.id).createdAt || 0)) {
          itemMap.set(ci.id, ci);
        }
      }
    });
    const mergedItems = Array.from(itemMap.values());

    // Save locally
    await chrome.storage.local.set({
      collections: mergedCollections,
      containers: mergedContainers,
      items: mergedItems,
    });

    // Push back unified
    await this.pushToCloud(mergedItems, mergedContainers, mergedCollections);

    return {
      collections: mergedCollections,
      containers: mergedContainers,
      items: mergedItems,
    };
  },

  // ── State Initialization & Schema Migration ──
  async ensureInitializedAndMigrated() {
    const data = await chrome.storage.local.get(["collections", "containers", "items", "activeContainerId", "activeCollectionId", "lastActiveContainer"]);
    let collections = data.collections || [];
    let containers = data.containers || [];
    let items = data.items || [];
    let modified = false;

    // 0. Remove "Quick Saves" entirely from collections & containers
    collections = collections.map((col) => {
      if ((col.name || "").includes("Quick Saves")) {
        modified = true;
        return { ...col, name: col.name.replace(/ & Quick Saves|Quick Saves/gi, "").trim() || "General" };
      }
      return col;
    });

    const quickCont = containers.find((c) => c.id === "default" || (c.name || "").toLowerCase() === "quick saves");
    if (quickCont) {
      modified = true;
      const fallbackCont = containers.find((c) => c.id !== quickCont.id) || DEFAULT_CONTAINERS[0];
      items = items.map((item) => {
        if (item.containerId === quickCont.id) {
          return {
            ...item,
            containerId: fallbackCont.id,
            collectionId: fallbackCont.collectionId,
          };
        }
        return item;
      });
      containers = containers.filter((c) => c.id !== quickCont.id);
    }

    // 1. Initialize Collections if missing
    if (!collections || collections.length === 0) {
      collections = [...DEFAULT_COLLECTIONS];
      modified = true;
    }

    // 2. Initialize Containers if missing
    if (!containers || containers.length === 0) {
      containers = [...DEFAULT_CONTAINERS];
      modified = true;
    } else {
      // Ensure all containers are mapped to a collectionId
      const primaryColId = collections[0]?.id || "col_brand";
      const secondaryColId = collections[1]?.id || primaryColId;

      const palette = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#E11D48", "#0891B2"];
      containers = containers.map((c, index) => {
        const color = c.color || palette[index % palette.length];
        const note = c.note || c.description || "";
        if (!c.collectionId) {
          modified = true;
          return {
            ...c,
            collectionId: primaryColId,
            icon: c.icon || "archive",
            color,
            note,
            order: c.order ?? index,
          };
        }
        if (!c.color || c.note === undefined) {
          modified = true;
          return {
            ...c,
            icon: c.icon || "archive",
            color,
            note,
            order: c.order ?? index,
          };
        }
        return {
          ...c,
          icon: c.icon || "archive",
          color: c.color || color,
          note: c.note || note,
          order: c.order ?? index,
        };
      });
    }

    // 3. Migrate items to include containerId, collectionId, and enriched types
    const containerCollectionMap = new Map();
    containers.forEach((c) => containerCollectionMap.set(c.id, c.collectionId));

    const defaultContId = containers[0]?.id || "cont_theme_ideas";
    const defaultColId = containers[0]?.collectionId || collections[0]?.id || "col_brand";

    items = items.map((item) => {
      let itemChanged = false;
      const cId = item.containerId || defaultContId;
      const parentColId = containerCollectionMap.get(cId) || item.collectionId || defaultColId;

      const newItem = { ...item };
      if (!newItem.containerId) {
        newItem.containerId = cId;
        itemChanged = true;
      }
      if (!newItem.collectionId || newItem.collectionId !== parentColId) {
        newItem.collectionId = parentColId;
        itemChanged = true;
      }

      // Check for type enrichment (e.g. YouTube, Quote)
      if (newItem.type === "link" || newItem.type === "text" || !newItem.type) {
        const classified = classifyContent(newItem.content, newItem.sourceUrl);
        if (classified.type !== newItem.type) {
          newItem.type = classified.type;
          if (classified.thumbnail && !newItem.previewImage) {
            newItem.previewImage = classified.thumbnail;
          }
          if (classified.videoId) {
            newItem.metadata = { ...(newItem.metadata || {}), videoId: classified.videoId };
          }
          itemChanged = true;
        }
      }

      if (itemChanged) modified = true;
      return newItem;
    });

    if (modified) {
      await chrome.storage.local.set({
        collections,
        containers,
        items,
        schemaVersion: 2,
      });
    }

    return { collections, containers, items };
  },
};
