# Chrome Web Store Submission & Publishing Guide 🚀

This complete guide prepares your extension for official submission to the Google Chrome Web Store.

---

## 1. Prerequisites

1. **Google Account**: Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **Registration Fee**: Google charges a one-time **$5 USD developer fee** before publishing your first extension.
3. **Privacy Policy Link**: Chrome requires a public URL for your privacy policy. You can:
   - Host `privacy-policy.html` using **GitHub Pages** (free), OR
   - Paste the text of your privacy policy into a **Public GitHub Gist** or Notion page.

---

## 2. Store Listing Copy (Ready to Copy & Paste)

### 📌 Extension Title
> **SaveIt – Your Permanent Clipboard & Web Clipper**

### 📌 Short Summary (max 132 chars)
> Save text snippets, article quotes, links, and notes forever with one click. Your private, searchable forever clipboard.

### 📌 Detailed Description
```markdown
Never lose a great quote, idea, or link while browsing again! 

SaveIt is your personal "forever clipboard" designed for readers, researchers, writers, and curious web surfers. Whenever you are reading an article, blog post, or documentation and spot words, sentences, or links you want to keep, SaveIt preserves them instantly with a simple right-click or shortcut.

✨ KEY FEATURES:
• ✂️ Right-Click Web Clipping: Highlight any phrase or sentence, right-click, and choose "Save to SaveIt".
• 🔗 Instant Link Saver: Right-click any link or web page to bookmark it forever.
• ⌨️ Lightning-Fast Shortcut: Hit ⌘+Shift+S (Mac) or Ctrl+Shift+S (Windows) to capture selections in a split second.
• 📋 Clipboard Importer: Grab whatever is in your system clipboard with one tap.
• 🖥️ Full-Screen Dashboard: Manage all your clippings with a spacious, distraction-free dashboard complete with filters, bulk selection, and stats.
• 🔍 Instant Full-Text Search: Find any past quote, link, or note in milliseconds.
• 🏷️ Tags & Favorites: Organize your knowledge with custom tags and star your most important finds.
• 📤 Easy Backup & Portability: Export and import your entire collection anytime as standard JSON.

🔒 100% PRIVATE & OFFLINE-FIRST:
Your privacy comes first. All saved clippings and notes are stored exclusively on your device using Chrome's local storage. No trackers, no accounts, and no data is ever transmitted to any third-party servers.
```

---

## 3. Chrome Web Store "Privacy & Permissions Justification"
*(Google's review team checks this very carefully. Paste these exact answers to avoid rejection!)*

### Single Purpose Description:
> "To provide a local, permanent clipboard and snippet organizer that allows users to capture, tag, and search text selections and links from webpages."

### Permission Justifications:
| Permission | Justification for Reviewer |
|---|---|
| `storage` | Required to save user snippets, links, tags, and preferences locally on their computer. |
| `contextMenus` | Allows users to right-click on selected text, links, or the active page to save items directly. |
| `activeTab` | Used to retrieve the current page URL and document title as attribution when saving a selection. |
| `scripting` | Enables the ⌘+Shift+S / Ctrl+Shift+S keyboard shortcut to extract the user's selected text without requiring broad host permissions. |
| `clipboardRead` | Allows users to voluntarily click the 'Paste from clipboard' button to quickly save copied text into their permanent clipboard. |

---

## 4. Visual Assets Required

Before hitting "Submit for review", you will need:

1. **Store Icon**: `128x128` PNG (already generated at `icons/icon128.png`).
2. **Screenshots**: At least 1 (recommended 3-5) of size **1280×800** or **640×400** pixels:
   - Screenshot 1: The popup UI showing saved text snippets, links, and tag pills.
   - Screenshot 2: The right-click context menu ("Save to SaveIt") in action on an article.
   - Screenshot 3: The full-page Dashboard with the search bar, statistics, and bulk actions.
3. **Small Promo Tile (Optional but recommended)**: `440×280` PNG featuring the SaveIt icon and tagline.

---

## 5. How to Package the Extension (Create ZIP)

Never zip unnecessary Mac files like `.DS_Store` or git metadata. Run this command in terminal to create a clean store-ready package:

```bash
cd /Users/kushagrasingh/Downloads/Extension
zip -r ../SaveIt-v1.0.0.zip . -x "*.DS_Store" -x "README.md" -x "CHROME_STORE_SUBMISSION_GUIDE.md"
```

Then upload `SaveIt-v1.0.0.zip` directly to the Chrome Developer Dashboard!

