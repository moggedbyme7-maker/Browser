/**
 * proxy.js - Client-Side CORS Proxy & Content Processing Engine
 * Handles fetching content without requiring any custom backend server.
 */

class ProxyEngine {
  constructor() {
    // List of public CORS proxy services
    this.proxies = [
      { name: 'corsproxy', url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
      { name: 'allorigins', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
      { name: 'codetabs', url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
    ];
  }

  /**
   * Attempts to fetch page content using auto-failover proxies or standard direct fetch
   */
  async fetchPage(url, selectedMode, onStatus = () => {}) {
    if (selectedMode === "direct") {
      onStatus("Loading directly via standard iframe...");
      return { html: null, mode: "direct" };
    }

    let targets = this.proxies;
    if (selectedMode !== "auto") {
      targets = this.proxies.filter((p) => p.name === selectedMode);
    }

    onStatus("Fetching content through public proxy...");

    for (let proxy of targets) {
      try {
        const proxyUrl = proxy.url(url);
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const rawHtml = await res.text();
          onStatus(`Loaded successfully via ${proxy.name}`);
          const cleanHtml = this.prepareHtmlForIframe(rawHtml, url);
          return { html: cleanHtml, mode: "proxy" };
        }
      } catch (err) {
        console.warn(`Proxy ${proxy.name} request failed:`, err);
      }
    }

    onStatus("Proxies unreachable. Falling back to direct iframe...");
    return { html: null, mode: "direct" };
  }

  /**
   * Fixes relative URLs for assets (CSS, images, JS) and injects link capture scripts
   */
  prepareHtmlForIframe(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Set <base> tag so relative assets load relative to original domain
    let baseTag = doc.querySelector("base");
    if (!baseTag) {
      baseTag = doc.createElement("base");
      doc.head.insertBefore(baseTag, doc.head.firstChild);
    }
    baseTag.href = baseUrl;

    // Inject click handler inside frame to capture link navigation
    const script = doc.createElement("script");
    script.textContent = `
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href) {
          e.preventDefault();
          window.parent.postMessage({ type: 'FRAME_NAVIGATE', url: link.href }, '*');
        }
      }, true);
    `;
    doc.head.appendChild(script);

    return doc.documentElement.outerHTML;
  }
}

// Instantiate globally for browser access
window.proxyEngine = new ProxyEngine();
