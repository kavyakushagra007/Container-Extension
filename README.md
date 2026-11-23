# SaveIt – Your Permanent Clipboard ⚡

A sleek, offline-first Chrome extension that lets you capture text snippets, article quotes, and links from any webpage. Styled in a high-contrast **Black & Neon Lime (`#000000` & `#BEFA4F`)** aesthetic. Think of it as a clipboard that **never clears** — everything you save stays forever.

---

## ✨ Features

- 🧠 **Conversational Web Memory & Time-Aware Search**: Ask in plain English (e.g. *"Two days ago, I saw a black Nike shoes. Can you tell me which one was that?"*). SaveIt parses relative time (*"yesterday"*, *"2 days ago"*, *"last week"*), extracts subjects, and spotlights the exact page or product match in an instant answer card. 100% offline, zero-latency, private.
- 🗂️ **Content Categories & Topics**: Separate studying, poems, movie lists, ideas, and notes with clean category pills, inline creation, and instant filtering
- ✂️ **Save Selected Text**: Highlight text on any page → Right-click → **"Save to SaveIt"**
- 🔗 **Save Links & Pages**: Right-click any link or webpage to bookmark it instantly
- ⌨️ **Keyboard Shortcut**: `⌘+Shift+S` (Mac) or `Ctrl+Shift+S` (Windows) to capture selections in a millisecond
- 📋 **Paste from Clipboard**: One-click quick-save button right in the popup header
- 🏷️ **Clickable Tag Filters**: Organize saves with custom `#tags` — click any tag to filter your collection immediately
- ⭐ **Star Favorites**: Pin your most valuable quotes, links, and snippets
- 🖥️ **Full-Page Dashboard**: Dedicated desktop manager tab with timeline view for Web Memory, adaptive card sizing, category filters, sorting, bulk selection/deletion, and real-time statistics
- 🔍 **Real-Time Dual Search**: Instant search through your deliberate saves or your passive browsing trail
- ☁️ **Cross-Profile Cloud Sync**: Optional Firebase Auth & Cloud Firestore sync for deliberate saves across different Chrome profiles (Web Memory stays strictly local)
- 🔔 **In-Page Feedback**: Sleek floating neon toast notification whenever you save from any website
- 📤 **Export & Import**: Download your entire knowledge base as standard JSON anytime for easy backup and restore
- 🔒 **100% Private & Secure**: Works completely offline by default; passwords, auth sites, and blacklisted domains are automatically ignored

---

## 🚀 Installation (Local Testing)

1. Open Google Chrome and navigate to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select this directory: `/Users/kushagrasingh/Downloads/Extension`
5. Pin **SaveIt** from the Chrome toolbar puzzle icon (🧩)

---

## 🎨 Design Theme

- **Background**: `#000000` (Pitch Black) & `#0e1208` (Dark Cards)
- **Primary Accent**: `#BEFA4F` (Neon Lime / Chartreuse)
- **Border Accents**: `rgba(190, 250, 79, 0.25)` with neon glow on hover
- **App Icons**: Glowing neon emblem squircle (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`)

---

## 📁 Clean Modular Architecture

```
Extension/
├── manifest.json                  # Manifest V3 extension configuration
├── icons/                         # Extension icons (16x16, 48x48, 128x128)
├── src/                           # Modular extension source code
│   ├── background/
│   │   └── background.js          # Service worker (context menus, shortcuts, badge)
│   ├── content/
│   │   └── content.js             # 1-Click floating quick-save button & selection capture
│   ├── popup/
│   │   ├── popup.html             # Action popup UI
│   │   ├── popup.css              # Popup styling (Dark & pure Light mode)
│   │   └── popup.js               # Popup controller (Saves & Memory views, CRUD, search)
│   ├── dashboard/
│   │   ├── dashboard.html         # Full-page desktop dashboard & manager
│   │   ├── dashboard.css          # Dashboard responsive styling
│   │   └── dashboard.js           # Dashboard controller (timeline view, bulk actions, settings)
│   └── services/
│       ├── memory-store.js        # IndexedDB full-text search engine for Web Memory
│       ├── nlp-parser.js          # Offline natural language & temporal query parser
│       └── sync.js                # Firebase Auth & Cloud Firestore sync service
├── privacy-policy.html            # In-app and public privacy policy
├── .gitignore                     # Git ignore rules for clean repo management
└── README.md                      # Documentation
```

---

## 📦 Publishing to the Chrome Web Store

When you are ready to publish:
1. Compress the extension files into a `.zip` (excluding `.git`) and upload directly to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
