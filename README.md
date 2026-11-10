# SaveIt – Web Vault & Collections 📁🗄️

A modern, light-mode Chrome extension for capturing, curating, and organizing your favorite web discoveries into **Collections** and **Containers**.

SaveIt goes far beyond a simple clipboard: it is your personal visual scrapbook and second brain for the web — organizing articles, quotes, YouTube videos, social posts, product links, code, and images into structured workspaces.

---

## 🏛️ The Architecture: Collections & Containers

SaveIt organizes your digital life into a clean 3-tier hierarchy:

1. **📁 Collections (Folders)**: Top-level domains and projects (e.g., `Brand`, `Personal Growth`, `Tech & Dev`, `Travel`).
2. **🗄️ Containers (Archives)**: Topic-focused workspaces residing inside a collection (e.g., inside `Brand`: `Theme Ideas`, `Marketing Materials`, `Colour Templates`).
3. **Saved Items (Polymorphic Cards)**: The actual captured artifacts (YouTube thumbnails, styled quotes, images, articles, products, snippets).

```
📁 Collection: "Brand"
 ├── 🗄️ Container: "Theme Ideas"
 │    ├── 🖼️ Moodboard image pins
 │    ├── 🎬 YouTube branding tutorial
 │    └── 💬 Design philosophy quotes
 ├── 🗄️ Container: "Marketing Materials"
 │    ├── 📱 Ad copy tweets & social clips
 │    └── 🔗 Product & landing page links
 └── 🗄️ Container: "Colour Templates"
      └── 📝 Hex palettes & typography guidelines
```

---

## ✨ Features

- 📁 **Collections (Folders)**: Create and color-code broad project folders.
- 🗄️ **Containers (Archives)**: Create topic-specific archive drawers inside any collection.
- 🎬 **YouTube Auto-Detection**: Paste or bookmark any YouTube video to automatically extract video IDs and high-resolution thumbnail cards.
- 💬 **Editorial Quote Styling**: Highlight text to capture quotes with serif typography and source page attribution.
- 🖼️ **Image Capturing**: Right-click any web image to save directly into your target container.
- 🛍️ **Product & Web Links**: Rich bookmark cards with site domains, favicons, and clickable titles.
- ☀️ **Clean Light Mode Design**: Refined surfaces (`#F8F9FA`, `#FFFFFF`), crisp borders, subtle shadows, and royal blue accents.
- 🖥️ **Full-Page Workspace Dashboard**:
  - Two-level interactive tree: Expand collections (📁) to reveal containers (🗄️) with live counts.
  - View toggle: **Masonry Grid View** (visual board) vs. **Compact List View** (dense catalog).
  - Move items between containers and collections with 1 click.
  - Real-time search (`/` hotkey) and sorting (`Newest`, `Oldest`, `A → Z`, `Type`).
- ☁️ **Cloud Sync & Auth**: Back up and synchronize collections, containers, and items across Chrome browsers with Firebase Cloud Firestore (works 100% offline-first).
- 📤 **Full Backup & Restore**: Export and import your entire vault as JSON.

---

## 🚀 How to Load in Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **"Load unpacked"**.
4. Select this directory: `Container-Extension`
5. Pin **SaveIt** from the Chrome extension puzzle icon (🧩).

---

## ⌨️ Shortcuts

- **<kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>S</kbd>** (Mac) or **<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>** (Windows): Save selected text to your current active container.
- **<kbd>/</kbd>** (in Dashboard): Jump straight to search.
- **<kbd>Esc</kbd>**: Dismiss open modals.
