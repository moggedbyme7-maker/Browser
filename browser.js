/**
 * Custom Iframe Browser Engine
 */

// Proxy Endpoints List
const PROXIES = [
  { name: 'corsproxy', url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  { name: 'allorigins', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { name: 'codetabs', url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
];

// Presets for Speed Dial
const PRESETS = [
  { title: "Wikipedia", url: "https://en.wikipedia.org", icon: "🌐" },
  { title: "OpenStreetMap", url: "https://www.openstreetmap.org", icon: "🗺️" },
  { title: "Archive.org", url: "https://archive.org", icon: "🏛️" },
  { title: "CodePen", url: "https://codepen.io", icon: "💻" },
  { title: "Bing", url: "https://www.bing.com", icon: "🔍" },
  { title: "DuckDuckGo", url: "https://duckduckgo.com", icon: "🦆" }
];

class WebBrowserApp {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;

    // DOM Elements
    this.tabsListEl = document.getElementById("tabsList");
    this.newTabBtn = document.getElementById("newTabBtn");
    this.viewportEl = document.getElementById("viewport");
    this.addressBar = document.getElementById("addressBar");
    this.proxySelect = document.getElementById("proxyEngineSelect");
    this.btnBack = document.getElementById("btnBack");
    this.btnForward = document.getElementById("btnForward");
    this.btnRefresh = document.getElementById("btnRefresh");
    this.btnHome = document.getElementById("btnHome");
    this.statusMsg = document.getElementById("statusMsg");
    this.tabCountLabel = document.getElementById("tabCountLabel");

    this.initEvents();
    this.createTab(); // Open default initial tab
  }

  initEvents() {
    this.newTabBtn.addEventListener("click", () => this.createTab());

    this.addressBar.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        let val = this.addressBar.value.trim();
        if (val) {
          if (!val.startsWith("http://") && !val.startsWith("https://")) {
            if (val.includes(".") && !val.includes(" ")) {
              val = "https://" + val;
            } else {
              val = `https://duckduckgo.com/?q=${encodeURIComponent(val)}`;
            }
          }
          this.loadUrlInActiveTab(val);
        }
      }
    });

    this.btnBack.addEventListener("click", () => this.navigateHistory(-1));
    this.btnForward.addEventListener("click", () => this.navigateHistory(1));
    this.btnRefresh.addEventListener("click", () => this.reloadActiveTab());
    this.btnHome.addEventListener("click", () => this.goHome());

    // Listen for internal frame navigation messages
    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "FRAME_NAVIGATE") {
        this.loadUrlInActiveTab(e.data.url);
      }
    });
  }

  createTab(url = null) {
    const tabId = "tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

    const tabData = {
      id: tabId,
      title: "New Tab",
      url: url || "",
      history: [],
      historyIndex: -1,
      mode: "auto"
    };

    this.tabs.push(tabData);

    // Create Viewport Elements for Tab
    const frameContainer = document.createElement("div");
    frameContainer.className = "frame-container";
    frameContainer.id = `container_${tabId}`;

    const iframe = document.createElement("iframe");
    iframe.id = `iframe_${tabId}`;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    frameContainer.appendChild(iframe);

    // Create Speed Dial overlay
    const speedDial = this.buildSpeedDial(tabId);
    frameContainer.appendChild(speedDial);

    this.viewportEl.appendChild(frameContainer);

    this.switchTab(tabId);

    if (url) {
      this.loadUrlInActiveTab(url);
    }
  }

  switchTab(tabId) {
    this.activeTabId = tabId;

    document.querySelectorAll(".frame-container").forEach((el) => {
      el.classList.toggle("active", el.id === `container_${tabId}`);
    });

    this.renderTabHeaders();
    this.updateToolbar();
  }

  closeTab(tabId, e) {
    if (e) e.stopPropagation();

    if (this.tabs.length === 1) {
      // If closing the last remaining tab, reset it instead of empty UI
      this.createTab();
    }

    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) {
      this.tabs.splice(idx, 1);
      const container = document.getElementById(`container_${tabId}`);
      if (container) container.remove();
    }

    if (this.activeTabId === tabId) {
      const nextTab = this.tabs[Math.max(0, idx - 1)];
      this.switchTab(nextTab.id);
    } else {
      this.renderTabHeaders();
    }
  }

  renderTabHeaders() {
    this.tabsListEl.innerHTML = "";
    this.tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.id === this.activeTabId ? "active" : ""}`;
      tabEl.addEventListener("click", () => this.switchTab(tab.id));

      const titleEl = document.createElement("span");
      titleEl.className = "tab-title";
      titleEl.textContent = tab.title || "New Tab";

      const closeBtn = document.createElement("span");
      closeBtn.className = "tab-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", (e) => this.closeTab(tab.id, e));

      tabEl.appendChild(titleEl);
      tabEl.appendChild(closeBtn);
      this.tabsListEl.appendChild(tabEl);
    });

    this.tabCountLabel.textContent = `Tabs: ${this.tabs.length}`;
  }

  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  updateToolbar() {
    const tab = this.getActiveTab();
    if (!tab) return;

    this.addressBar.value = tab.url || "";
    this.btnBack.disabled = tab.historyIndex <= 0;
    this.btnForward.disabled = tab.historyIndex >= tab.history.length - 1;
  }

  setStatus(msg) {
    this.statusMsg.textContent = msg;
  }

  async loadUrlInActiveTab(url) {
    const tab = this.getActiveTab();
    if (!tab) return;

    tab.url = url;
    if (tab.history[tab.historyIndex] !== url) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }

    tab.title = new URL(url).hostname || url;
    this.renderTabHeaders();
    this.updateToolbar();

    const container = document.getElementById(`container_${tab.id}`);
    const speedDial = container.querySelector(".speed-dial");
    const iframe = document.getElementById(`iframe_${tab.id}`);

    if (speedDial) speedDial.style.display = "none";

    const selectedMode = this.proxySelect.value;

    if (selectedMode === "direct") {
      this.setStatus(`Loading directly in standard iframe...`);
      iframe.removeAttribute("srcdoc");
      iframe.src = url;
      return;
    }

    // Proxy Engine Retrieval Logic
    this.setStatus(`Fetching content via Proxy Engine...`);
    let htmlContent = null;

    // Determine proxies to attempt
    let targets = [];
    if (selectedMode === "auto") {
      targets = PROXIES;
    } else {
      targets = PROXIES.filter((p) => p.name === selectedMode);
    }

    for (let proxy of targets) {
      try {
        const targetProxyUrl = proxy.url(url);
        const res = await fetch(targetProxyUrl);
        if (res.ok) {
          htmlContent = await res.text();
          this.setStatus(`Loaded via ${proxy.name}`);
          break;
        }
      } catch (err) {
        console.warn(`Proxy ${proxy.name} failed:`, err);
      }
    }

    if (htmlContent) {
      const processedHtml = this.processHtmlContent(htmlContent, url);
      iframe.removeAttribute("src");
      iframe.srcdoc = processedHtml;
    } else {
      this.setStatus(`Proxies failed. Falling back to direct iframe...`);
      iframe.removeAttribute("srcdoc");
      iframe.src = url;
    }
  }

  processHtmlContent(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Inject Base URL tag for external image/CSS/JS relative path resolution
    let baseTag = doc.querySelector("base");
    if (!baseTag) {
      baseTag = doc.createElement("base");
      doc.head.insertBefore(baseTag, doc.head.firstChild);
    }
    baseTag.href = baseUrl;

    // Inject Script to hijack link navigation inside iframe
    const hijackScript = doc.createElement("script");
    hijackScript.textContent = `
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href) {
          e.preventDefault();
          window.parent.postMessage({ type: 'FRAME_NAVIGATE', url: link.href }, '*');
        }
      }, true);
    `;
    doc.head.appendChild(hijackScript);

    return doc.documentElement.outerHTML;
  }

  navigateHistory(direction) {
    const tab = this.getActiveTab();
    if (!tab) return;

    const newIdx = tab.historyIndex + direction;
    if (newIdx >= 0 && newIdx < tab.history.length) {
      tab.historyIndex = newIdx;
      const targetUrl = tab.history[newIdx];
      this.loadUrlInActiveTab(targetUrl);
    }
  }

  reloadActiveTab() {
    const tab = this.getActiveTab();
    if (tab && tab.url) {
      this.loadUrlInActiveTab(tab.url);
    }
  }

  goHome() {
    const tab = this.getActiveTab();
    if (!tab) return;

    const container = document.getElementById(`container_${tab.id}`);
    const speedDial = container.querySelector(".speed-dial");
    const iframe = document.getElementById(`iframe_${tab.id}`);

    iframe.removeAttribute("src");
    iframe.removeAttribute("srcdoc");
    tab.url = "";
    tab.title = "New Tab";

    if (speedDial) speedDial.style.display = "flex";
    this.renderTabHeaders();
    this.updateToolbar();
    this.setStatus("Ready");
  }

  buildSpeedDial(tabId) {
    const sd = document.createElement("div");
    sd.className = "speed-dial";

    const title = document.createElement("h1");
    title.textContent = "Web Browser Simulator";

    const grid = document.createElement("div");
    grid.className = "grid";

    PRESETS.forEach((preset) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-icon">${preset.icon}</div>
        <div class="card-title">${preset.title}</div>
      `;
      card.addEventListener("click", () => {
        this.loadUrlInActiveTab(preset.url);
      });
      grid.appendChild(card);
    });

    sd.appendChild(title);
    sd.appendChild(grid);
    return sd;
  }
}

// Start browser app on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.browserApp = new WebBrowserApp();
});
