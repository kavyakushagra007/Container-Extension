// ── SaveIt: Firebase Auth & Cloud Firestore Sync Module ──
// Uses standard Firebase REST APIs (0 dependencies, Manifest V3 CSP safe)

const FIREBASE_CONFIG = {
  // Configured with your Firebase project credentials
  apiKey: "AIzaSyDo5ZvoQaXyJJWrZzD2VAuye45nUNTfQ6E",
  projectId: "container-extension",
};

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
  async pushToCloud(items, containers) {
    const session = await this.getUser();
    if (!session) return false;

    const token = await this.getValidToken();
    if (!token) return false;

    const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${session.user.uid}/appData/userData`;

    const body = {
      fields: {
        itemsJson: { stringValue: JSON.stringify(items || []) },
        containersJson: { stringValue: JSON.stringify(containers || []) },
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

  // ── Pull Data from Firebase Cloud Firestore & Merge ──
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

      const cloudItems = itemsJson ? JSON.parse(itemsJson) : [];
      const cloudContainers = containersJson ? JSON.parse(containersJson) : [];

      return { items: cloudItems, containers: cloudContainers };
    } catch (err) {
      console.warn("Cloud pull failed:", err);
      throw err;
    }
  },

  // ── Full Bidirectional Sync ──
  async syncNow() {
    const DEFAULT_CONTAINER = { id: "default", name: "Quick Saves", icon: "⚡", createdAt: 0 };
    const { items = [], containers = [] } = await chrome.storage.local.get(["items", "containers"]);

    // Ensure local has at least default container
    const safeLocalContainers = containers && containers.length > 0 ? containers : [DEFAULT_CONTAINER];

    const cloud = await this.pullFromCloud();
    if (!cloud) {
      // If no cloud data yet, push local data up
      await this.pushToCloud(items, safeLocalContainers);
      await chrome.storage.local.set({ containers: safeLocalContainers });
      return { items, containers: safeLocalContainers };
    }

    // Merge items by ID (newer updatedAt/createdAt wins)
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

    // Merge containers
    const containerMap = new Map();
    containerMap.set("default", DEFAULT_CONTAINER);
    safeLocalContainers.forEach((c) => { if (c && c.id) containerMap.set(c.id, c); });
    (cloud.containers || []).forEach((cc) => {
      if (cc && cc.id && !containerMap.has(cc.id)) {
        containerMap.set(cc.id, cc);
      }
    });
    const mergedContainers = Array.from(containerMap.values());

    // Save locally
    await chrome.storage.local.set({ items: mergedItems, containers: mergedContainers });

    // Push unified data back to cloud
    await this.pushToCloud(mergedItems, mergedContainers);

    return { items: mergedItems, containers: mergedContainers };
  },
};

