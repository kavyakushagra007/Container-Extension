# SaveIt – Your Permanent Clipboard ⚡

A sleek, offline-first Chrome extension that lets you save text snippets, article quotes, and links from any webpage. Styled in a high-contrast **Black & Neon Lime (`#000000` & `#BEFA4F`)** aesthetic. Think of it as a clipboard that **never clears** — everything you save stays forever.

---

## ✨ Features

- 🗂️ **Multiple Containers**: Organize snippets into custom folders (e.g. `⚡ Quick Saves`, `📚 Reading`, `💼 Work`, `💡 Ideas`) with custom emoji icons
- ☁️ **Cross-Profile Cloud Sync & Login**: Sign in with Email/Password to sync items across different Chrome profiles and computers via Cloud Firestore (100% offline-first fallback)
- ✂️ **Save Selected Text**: Highlight text on any page → Right-click → **"Save to SaveIt"**
- 🔗 **Save Links**: Right-click any link or page to bookmark it instantly
- ⌨️ **Keyboard Shortcut**: `⌘+Shift+S` (Mac) or `Ctrl+Shift+S` (Windows) to capture selections in a millisecond
- 📋 **Paste from Clipboard**: One-click quick-save button right in the popup header
- 🖥️ **Full-Page Dashboard**: Dedicated manager tab with category filters, containers sidebar, sorting, bulk actions, and stats
- 🔍 **Real-Time Search**: Search through snippets and tags instantly
- 🏷️ **Clickable Tag Filters**: Organize with `#tags` — click any tag to filter your collection immediately
- ⭐ **Star Favorites**: Pin your most valuable quotes and links
- 📤 **Export & Import**: Download your entire knowledge base as standard JSON anytime
- 🔔 **In-Page Feedback**: Sleek floating neon toast notification when saving from any website
- 🔒 **100% Private & Secure**: Works completely offline; cloud sync uses your own isolated Firebase database

---

## 🚀 Installation (Local Testing)

1. Open Google Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select this directory: `/Users/kushagrasingh/Downloads/Extension`
5. Pin **SaveIt** from the toolbar puzzle icon (🧩)

---

## 🎨 Design Theme

- **Background**: `#000000` (Pitch Black)
- **Primary Accent**: `#BEFA4F` (Neon Lime / Chartreuse)
- **App Icons**: Glowing neon emblem squircle (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`)

---

## 📁 File Structure

```
Extension/
├── manifest.json                  # Manifest V3 configuration
├── background.js                  # Service worker (context menus, storage, badge counter)
├── content.js                     # In-page neon notification toast
├── popup.html                     # Popup window structure
├── popup.css                      # Black & #BEFA4F popup styling
├── popup.js                       # Popup controller (containers, search, tags, CRUD)
├── dashboard.html                 # Full-page desktop dashboard
├── dashboard.css                  # Dashboard Black & #BEFA4F layout
├── dashboard.js                   # Dashboard controller (containers, stats, bulk delete, sort)
├── sync.js                        # Firebase Auth & Cloud Firestore REST API sync module
├── privacy-policy.html            # Offline privacy policy (required for store)
├── CHROME_STORE_SUBMISSION_GUIDE.md # Copy-paste ready text for Chrome Web Store
└── icons/                         # 16x16, 48x48, 128x128 icons
```

---

## 📦 Publishing to the Chrome Web Store

When you are ready to publish:
1. Refer to [CHROME_STORE_SUBMISSION_GUIDE.md](file:///Users/kushagrasingh/Downloads/Extension/CHROME_STORE_SUBMISSION_GUIDE.md) for the exact description, permission justifications, and single-purpose text.
2. Upload the pre-built [`SaveIt-v1.0.0.zip`](file:///Users/kushagrasingh/Downloads/Extension/SaveIt-v1.0.0.zip) to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
