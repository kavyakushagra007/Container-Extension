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
    await chrome.storage.local.remove(["authUser", "authToken", "authRefreshToken", "authExpiresAt", "cloudSyncStatus"]);
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

  // All local writes and syncs run in the service worker's single queue.
  _queue: Promise.resolve(),
  _enqueue(work) {
    const result = this._queue.then(work);
    this._queue = result.catch(() => {});
    return result;
  },

  async _request(action, data = {}) {
    const result = await chrome.runtime.sendMessage({ action, ...data });
    if (!result?.success) throw new Error(result?.error || "SaveIt operation failed");
    return result.result;
  },

  rememberItems(items) {
    this._knownItems = JSON.parse(JSON.stringify(items));
  },

  saveLocal(data, callback) {
    if (typeof importScripts !== "function" && this._knownItems) {
      data = { ...data, baseItems: this._knownItems };
    }
    const operation = typeof importScripts === "function"
      ? this._enqueue(() => this._saveLocal(data))
      : this._request("persistSaves", { data });
    if (callback) operation.then(result => { this.rememberItems(result.items); callback(result); }).catch((error) => console.error("Save failed:", error));
    return operation;
  },

  async _saveLocal(data) {
    const previous = await chrome.storage.local.get(["items", "deletedItems"]);
    const oldItems = new Map((previous.items || []).map(item => [item.id, item]));
    const deletedItems = { ...(previous.deletedItems || {}) };
    const now = Date.now();
    const comparable = value => JSON.stringify({ ...value, updatedAt: undefined });
    let requested = data.items;
    if (data.baseItems) {
      // Apply only the changes made in this UI, preserving unseen background saves.
      const baseline = new Map(data.baseItems.map(item => [item.id, item]));
      const desired = new Map(requested.map(item => [item.id, item]));
      const combined = new Map(oldItems);
      for (const id of baseline.keys()) if (!desired.has(id)) combined.delete(id);
      for (const item of requested) {
        if (!baseline.has(item.id) || comparable(baseline.get(item.id)) !== comparable(item)) combined.set(item.id, item);
      }
      requested = [...combined.values()];
    }
    const items = requested.map(item => {
      const old = oldItems.get(item.id);
      const changed = !old || comparable(old) !== comparable(item);
      // An intentional import may restore a deleted item.
      delete deletedItems[item.id];
      return { ...item, updatedAt: changed ? Math.max(now, (old?.updatedAt || 0) + 1) : (old.updatedAt || old.createdAt || now) };
    });
    const ids = new Set(items.map(item => item.id));
    for (const old of oldItems.values()) {
      if (!ids.has(old.id)) deletedItems[old.id] = Math.max(now, (old.updatedAt || old.createdAt || 0) + 1);
    }
    const { baseItems, ...settings } = data;
    await chrome.storage.local.set({ ...settings, items, deletedItems });
    return { items, categories: data.categories };
  },

  // Legacy callers request a merge instead of uploading a stale UI snapshot.
  pushToCloud() {
    return this.syncNow().catch(error => {
      console.warn("Cloud sync deferred:", error);
      return false;
    });
  },

  syncNow() {
    if (typeof importScripts !== "function") return this._request("syncSaves");
    return this._enqueue(async () => {
      const session = await this.getUser();
      if (!session) return null;
      const { cloudSyncStatus } = await chrome.storage.local.get(["cloudSyncStatus"]);
      const previous = cloudSyncStatus?.uid === session.user.uid ? cloudSyncStatus : {};
      const status = { uid: session.user.uid, lastSuccess: previous.lastSuccess || null };
      await chrome.storage.local.set({ cloudSyncStatus: { ...status, state: "syncing" } });
      try {
        const result = await this._syncNow();
        if (result) await chrome.storage.local.set({ cloudSyncStatus: { ...status, state: "success", lastSuccess: Date.now() } });
        return result;
      } catch (error) {
        await chrome.storage.local.set({ cloudSyncStatus: { ...status, state: "error", message: error.message } });
        throw error;
      }
    });
  },

  mergeStates(local, cloud) {
    const deletedItems = { ...(local.deletedItems || {}) };
    for (const [id, time] of Object.entries(cloud.deletedItems || {})) {
      deletedItems[id] = Math.max(deletedItems[id] || 0, time);
    }
    const itemMap = new Map();
    for (const item of [...(local.items || []), ...(cloud.items || [])]) {
      if (!item || !item.id) continue;
      const version = item.updatedAt || item.createdAt || 0;
      if ((deletedItems[item.id] || 0) >= version && deletedItems[item.id]) continue;
      const old = itemMap.get(item.id);
      if (!old || version > (old.updatedAt || old.createdAt || 0)) itemMap.set(item.id, item);
    }
    return {
      items: [...itemMap.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      categories: [...new Set([...(local.categories || []), ...(cloud.categories || [])])],
      deletedItems,
    };
  },

  async _syncNow() {
    const session = await this.getUser();
    if (!session) return null;
    const token = await this.getValidToken();
    if (!token) throw new Error("Please sign in again to sync.");
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${session.user.uid}/appData/userData`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Retry if another profile changes the document between our read and write.
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url, { headers });
      if (!response.ok && response.status !== 404) throw new Error(`Cloud read failed (HTTP ${response.status})`);
      const document = response.status === 404 ? null : await response.json();
      const fields = document?.fields || {};
      const cloud = {
        items: JSON.parse(fields.itemsJson?.stringValue || "[]"),
        categories: JSON.parse(fields.categoriesJson?.stringValue || "[]"),
        deletedItems: JSON.parse(fields.deletedItemsJson?.stringValue || "{}"),
      };
      const local = await chrome.storage.local.get(["items", "categories", "deletedItems"]);
      const merged = this.mergeStates(local, cloud);
      const condition = document
        ? `currentDocument.updateTime=${encodeURIComponent(document.updateTime)}`
        : "currentDocument.exists=false";
      const write = await fetch(`${url}?${condition}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ fields: {
          itemsJson: { stringValue: JSON.stringify(merged.items) },
          categoriesJson: { stringValue: JSON.stringify(merged.categories) },
          deletedItemsJson: { stringValue: JSON.stringify(merged.deletedItems) },
          lastSyncedAt: { integerValue: Date.now().toString() },
        } }),
      });
      if ([409, 412].includes(write.status)) continue;
      if (!write.ok) {
        const error = await write.json().catch(() => ({}));
        if (["FAILED_PRECONDITION", "ABORTED", "ALREADY_EXISTS"].includes(error.error?.status)) continue;
        throw new Error(`Cloud sync failed (HTTP ${write.status})`);
      }
      await chrome.storage.local.set(merged);
      return merged;
    }
    throw new Error("Another profile is syncing. Please try again.");
  },
};
