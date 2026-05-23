/**
 * Safely sanitizes HTML content in the browser to prevent XSS (Cross-Site Scripting) attacks.
 * It uses the native browser DOMParser to parse the input HTML, and then traverses
 * the DOM tree, removing any elements that are not in the safe allowlist, and
 * any attributes that are not in the safe allowlist or have dangerous values (like javascript: URIs).
 *
 * @param html The raw HTML string to sanitize
 * @returns The sanitized, safe HTML string
 */
export function sanitizeDangerousHtml(html: string): string {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Allowed tags in markdown/help content
    const allowedTags = new Set([
      'a', 'p', 'b', 'i', 'u', 'em', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'br', 'hr', 'div', 'span', 'img', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ]);

    // Allowed attributes per tag
    const allowedAttributes: Record<string, string[]> = {
      'a': ['href', 'target', 'rel', 'title', 'class'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
      '*': ['class', 'id', 'style'] // general safe styling attributes allowed globally
    };

    // Traverse and sanitize elements
    const sanitizeNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // 1. Remove non-allowed tags
        if (!allowedTags.has(tagName)) {
          const parent = el.parentNode;
          if (parent) {
            // Keep the children but remove the wrapping element
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
          return;
        }

        // 2. Filter attributes
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          const allowedAttrsForTag = allowedAttributes[tagName] || [];
          const allowedGlobalAttrs = allowedAttributes['*'] || [];

          if (!allowedAttrsForTag.includes(attrName) && !allowedGlobalAttrs.includes(attrName)) {
            el.removeAttribute(attr.name);
            continue;
          }

          // 3. Inspect attribute values for potential javascript: URLs
          const val = attr.value.trim().toLowerCase();
          if (
            (attrName === 'href' || attrName === 'src') &&
            (val.startsWith('javascript:') || val.startsWith('data:text/html') || val.includes('vbscript:'))
          ) {
            el.removeAttribute(attr.name);
          }
        }
      }

      // Recursively process child nodes
      // Copy array first because NodeList can mutate if child elements are removed
      const children = Array.from(node.childNodes);
      children.forEach(sanitizeNode);
    };

    // Sanitize everything inside the body element
    Array.from(body.childNodes).forEach(sanitizeNode);

    return body.innerHTML;
  } catch (error) {
    console.error('Error during HTML sanitization:', error);
    // Strict fallback: strip all HTML tags
    return html.replace(/<[^>]*>/g, '');
  }
}
