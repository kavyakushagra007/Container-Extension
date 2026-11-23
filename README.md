# SaveIt – Your Permanent Clipboard ⚡

A sleek, offline-first Chrome extension that lets you capture text snippets, article quotes, and links from any webpage. Styled in a high-contrast **Black & Neon Lime (`#000000` & `#BEFA4F`)** aesthetic. Think of it as a clipboard that **never clears** — deliberate saves remain until you delete them or remove the extension; export backups to protect them.

---

## ✨ Features

- 🧠 **Conversational Web Memory & Time-Aware Search**: Ask in plain English (e.g. *"Two days ago, I saw a black Nike shoes. Can you tell me which one was that?"*). SaveIt parses relative time (*"yesterday"*, *"2 days ago"*, *"last week"*), extracts subjects, and ranks matches in locally captured page text. Search uses local keyword rules, not an AI model, and may miss synonyms or uncaptured content.
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
- 🔒 **Local-first storage**: Search runs locally. Automatic Web Memory capture is enabled by default and skips pages containing password fields, listed sensitive domains, and your blacklist. These filters cannot detect every sensitive page. Disable capture in Settings whenever needed.

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

## Data and sync behavior

- Web Memory stores page URLs, titles, headings, and readable page text of up to 200,000 characters per record in IndexedDB. It is enabled by default and has a default 14-day retention period. It is separate from deliberate saves and is not uploaded by cloud sync.
- JSON export includes deliberate saves and categories, not Web Memory or account credentials.
- Signing in enables Firebase sync of deliberate saves, categories, and deletion markers. Signing out stops sync; uninstalling does not delete cloud data.
- Sync merges edits using `updatedAt`, retains deletion markers to prevent older copies from returning, and retries concurrent cloud writes. All profiles should run the updated extension; older versions do not understand deletion markers.
- Browsing-memory cards use a bundled icon and do not request remote favicons.
- Date searches use local calendar boundaries; “last week” means the previous Monday–Sunday. If no keyword match exists in that interval, the UI can show explicitly labeled matches from other dates.

### Searching inside pages

Web Memory searches captured body text as well as titles, headings, summaries, and URLs. Matching body text is shown as a highlighted excerpt. Text is refreshed shortly after page changes, periodically while visible, when switching away, and on request before a popup search. This captures streamed answers and delayed article content. Open shadow components and rendered text inside form containers are included; input fields and drafts remain excluded. Form fields, editable regions, hidden elements, and navigation are excluded. Capture is limited to 200,000 characters and 50,000 DOM nodes per pass; image-only text, PDFs, and iframe content are not indexed.

Existing short captures and imported Chrome history do not contain the full page text. Reload the extension, refresh or revisit those pages, and allow a few seconds for capture. Pages do not need to remain open afterward.

### Search, import, and cloud recovery

- Local search recognizes simple singular/plural forms, triples/triplets, and one-character mistakes in words of at least five characters. Matching excerpts highlight the original page words. It is not semantic AI search.
- Opening a Web Memory result asks the destination content script to highlight matching text and scroll to a passage. It retries for up to 30 seconds while dynamic content loads. Pages must still contain the text; closed shadow roots, PDFs, and iframe-only text are not supported.
- JSON imports are validated completely before storage, capped at 10 MB / 10,000 items, and deduplicated by ID or matching content/source/category. Existing records win over duplicate imports. Only HTTP(S) links are imported.
- Cloud requests have 20-second timeouts. Transient errors retry using Chrome alarms with a 1–30 minute backoff; an alarm also recovers interrupted syncs. Authentication and permission failures require user action.
- Cloud settings include separate cloud-copy and account-deletion controls. Both require confirmation, and account deletion requires password reauthentication. Local saves remain. Cloud-copy deletion signs out this profile; other signed-in profiles may upload their copies again.

Firebase endpoints follow the official [Auth REST API](https://firebase.google.com/docs/reference/rest/auth) and [Firestore document deletion API](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/delete).