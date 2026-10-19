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
/**
 * proxy.js - Client-Side CORS Proxy & Internal URI Handler
 */

class ProxyEngine {
  constructor() {
    this.proxies = [
      { name: 'corsproxy', url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
      { name: 'allorigins', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
      { name: 'codetabs', url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
    ];
  }

  /**
   * Attempts to fetch page content or render internal system pages
   */
  async fetchPage(url, selectedMode, onStatus = () => {}) {
    // Check if request is an internal browser:// URI
    if (url.startsWith("browser://") || url.startsWith("about:")) {
      onStatus("Loading internal browser system page...");
      const internalHtml = this.renderInternalPage(url);
      return { html: internalHtml, mode: "proxy" };
    }

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
   * Renders built-in system pages for internal URIs
   */
  renderInternalPage(url) {
    const page = url.replace("mogger://", "").replace("about:", "");

    switch (page) {
      case "settings":
      case "config":
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 32px; }
              h1 { color: #89b4fa; margin-bottom: 16px; }
              .card { background: #252538; border: 1px solid #45475a; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
            </style>
          </head>
          <body>
            <h1>⚙️ Customize your Mog, Settings</h1>
            <div class="card">
              <h3>Proxy Mode</h3>
              <p>Current setting managed via top toolbar controls.</p>
            </div>
            <div class="card">
              <h3>Custom Protocol Engine</h3>
              <p>Registered handler for <code>mogger://</code> and <code>about:</code> URIs.</p>
            </div>
          </body>
          </html>
        `;

      case "about":
      case "version":
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 32px; text-align: center; }
              h1 { color: #89b4fa; }
              p { color: #a6adc8; margin-top: 8px; }
            </style>
          </head>
          <body>
            <h1>🌐 Browser by Mogger</h1>
            <p>Version 2.0 (Client-Side Architecture)</p>
            <p>Running multi-proxy failover & isolated frame viewports.</p>
          </body>
          </html>
        `;

      case "blank":
        return `<!DOCTYPE html><html><body style="background:#1e1e2e;"></body></html>`;

      default:
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; background: #1e1e2e; color: #f38ba8; padding: 32px; }
              h1 { font-size: 24px; }
              p { color: #cdd6f4; }
            </style>
          </head>
          <body>
            <h1>404 - Internal Page Not Found</h1>
            <p>The system page <code>${url}</code> does not exist, oopsies!.</p>
          </body>
          </html>
        `;
    }
  }

  // PrepareHtmlForIframe method remains unchanged...
}
