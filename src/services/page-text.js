// Capture readable DOM text locally, including paragraphs deep inside a page.
const PageText = (() => {
  const MAX_CHARACTERS = 200000;
  const MAX_NODES = 50000;
  const excludedTags = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "NAV", "FOOTER", "INPUT",
    "TEXTAREA", "SELECT", "BUTTON", "SVG", "IFRAME", "CANVAS", "TEMPLATE",
  ]);

  function extract(root, readStyle = element => getComputedStyle(element)) {
    if (!root) return "";
    const stack = [root];
    const chunks = [];
    let length = 0;
    let visited = 0;
    while (stack.length && length < MAX_CHARACTERS && visited++ < MAX_NODES) {
      const node = stack.pop();
      if (node.nodeType === 3) {
        const text = (node.nodeValue || "").replace(/\s+/g, " ").trim();
        if (text) {
          const chunk = text.slice(0, MAX_CHARACTERS - length);
          chunks.push(chunk);
          length += chunk.length + 1;
        }
        continue;
      }
      // Shadow roots are document fragments; walk their rendered descendants too.
      if (node.nodeType === 11) {
        for (let child = node.lastChild; child; child = child.previousSibling) stack.push(child);
        continue;
      }
      if (node.nodeType !== 1) continue;
      if (excludedTags.has(node.tagName) || node.hidden || node.isContentEditable ||
          node.getAttribute("aria-hidden") === "true" || node.id?.startsWith("saveit-")) continue;
      const style = readStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") continue;
      // Prefer rendered shadow content and assigned slot nodes over duplicate light DOM.
      if (node.shadowRoot) {
        stack.push(node.shadowRoot);
      } else if (node.tagName === "SLOT" && node.assignedNodes?.({ flatten: true }).length) {
        const assigned = node.assignedNodes({ flatten: true });
        for (let i = assigned.length - 1; i >= 0; i--) stack.push(assigned[i]);
      } else {
        for (let child = node.lastChild; child; child = child.previousSibling) stack.push(child);
      }
    }
    return chunks.join(" ").slice(0, MAX_CHARACTERS);
  }

  return { extract, MAX_CHARACTERS };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PageText;
