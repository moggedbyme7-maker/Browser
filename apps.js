/**
 * app.js - Main Application Orchestrator
 */

const SPEED_DIAL_PRESETS = [
  { title: "Wikipedia", url: "https://en.wikipedia.org", icon: "🌐" },
  { title: "OpenStreetMap", url: "https://www.openstreetmap.org", icon: "🗺️" },
  { title: "Archive.org", url: "https://archive.org", icon: "🏛️" },
  { title: "CodePen", url: "https://codepen.io", icon: "💻" },
  { title: "Bing", url: "https://www.bing.com", icon: "🔍" },
  { title: "DuckDuckGo", url: "https://duckduckgo.com", icon: "🦆" }
];

class App {
  constructor() {
    // UI References
    this.tabsListEl = document.getElementById("tabsList");
    this.newTabBtn = document.getElementById("newTabBtn");
    this.addressBar = document.getElementById("addressBar");
    this.proxySelect = document.getElementById("proxyEngineSelect");
    this.btnBack = document.getElementById("btnBack");
    this.btnForward = document.getElementById("btnForward");
    this.btnRefresh = document.getElementById("btnRefresh");
    this.btnHome = document.getElementById("btnHome");
    this.statusMsg = document.getElementById("statusMsg");
    this.tabCountLabel = document.getElementById("tabCountLabel");

    this.bindEvents();
    this.openNewTab();
  }

  bindEvents() {
    this.newTabBtn.addEventListener("click", () => this.openNewTab());

    this.addressBar.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const targetUrl = window.navigationController.formatUrl(this.addressBar.value);
        if (targetUrl) this.loadPage(targetUrl);
      }
    });

    this.btnBack.addEventListener("click", () => {
      const activeTab = window.tabManager.getActiveTab();
      const prevUrl = window.navigationController.stepHistory(activeTab, -1);
      if (prevUrl) this.loadPage(prevUrl, false);
    });

    this.btnForward.addEventListener("click", () => {
      const activeTab = window.tabManager.getActiveTab();
      const nextUrl = window.navigationController.stepHistory(activeTab, 1);
      if (nextUrl) this.loadPage(nextUrl, false);
    });

    this.btnRefresh.addEventListener("click", () => {
      const activeTab = window.tabManager.getActiveTab();
      if (activeTab && activeTab.url) this.loadPage(activeTab.url, false);
    });

    this.btnHome.addEventListener("click", () => this.showSpeedDial());

    // Listen for frame navigation events posted by inner frame link hijacker
    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "FRAME_NAVIGATE") {
        this.loadPage(e.data.url);
      }
    });
  }

  openNewTab(url = "") {
    const tab = window.tabManager.createTab(url, () => this.syncUI());
    this.renderSpeedDialOverlay(tab.id);

    if (url) {
      this.loadPage(url);
    } else {
      this.showSpeedDial();
    }
  }

  async loadPage(url, isNewEntry = true) {
    const tab = window.tabManager.getActiveTab();
    if (!tab) return;

    if (isNewEntry) {
      window.navigationController.pushHistory(tab, url);
    }

    this.syncUI();

    const container = document.getElementById(`container_${tab.id}`);
    const speedDial = container.querySelector(".speed-dial");
    const iframe = document.getElementById(`iframe_${tab.id}`);

    if (speedDial) speedDial.style.display = "none";

    const fetchResult = await window.proxyEngine.fetchPage(
      url,
      this.proxySelect.value,
      (statusText) => (this.statusMsg.textContent = statusText)
    );

    if (fetchResult.mode === "proxy" && fetchResult.html) {
      iframe.removeAttribute("src");
      iframe.srcdoc = fetchResult.html;
    } else {
      iframe.removeAttribute("srcdoc");
      iframe.src = url;
    }
  }

  syncUI() {
    const activeTab = window.tabManager.getActiveTab();

    // Render Tab Headers
    this.tabsListEl.innerHTML = "";
    window.tabManager.tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.id === activeTab.id ? "active" : ""}`;
      tabEl.addEventListener("click", () => {
        window.tabManager.switchTab(tab.id, () => this.syncUI());
      });

      const titleEl = document.createElement("span");
      titleEl.className = "tab-title";
      titleEl.textContent = tab.title || "New Tab";

      const closeBtn = document.createElement("span");
      closeBtn.className = "tab-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.tabManager.closeTab(tab.id, () => this.syncUI());
      });

      tabEl.appendChild(titleEl);
      tabEl.appendChild(closeBtn);
      this.tabsListEl.appendChild(tabEl);
    });

    // Update controls state
    if (activeTab) {
      this.addressBar.value = activeTab.url || "";
      this.btnBack.disabled = activeTab.historyIndex <= 0;
      this.btnForward.disabled = activeTab.historyIndex >= activeTab.history.length - 1;
    }

    this.tabCountLabel.textContent = `Tabs: ${window.tabManager.tabs.length}`;
  }

  showSpeedDial() {
    const activeTab = window.tabManager.getActiveTab();
    if (!activeTab) return;

    const container = document.getElementById(`container_${activeTab.id}`);
    const speedDial = container.querySelector(".speed-dial");
    const iframe = document.getElementById(`iframe_${activeTab.id}`);

    iframe.removeAttribute("src");
    iframe.removeAttribute("srcdoc");
    activeTab.url = "";
    activeTab.title = "New Tab";

    if (speedDial) speedDial.style.display = "flex";
    this.syncUI();
    this.statusMsg.textContent = "Ready";
  }

  renderSpeedDialOverlay(tabId) {
    const container = document.getElementById(`container_${tabId}`);
    const sd = document.createElement("div");
    sd.className = "speed-dial";

    const title = document.createElement("h1");
    title.textContent = "Web Browser Simulator";

    const grid = document.createElement("div");
    grid.className = "grid";

    SPEED_DIAL_PRESETS.forEach((preset) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-icon">${preset.icon}</div>
        <div class="card-title">${preset.title}</div>
      `;
      card.addEventListener("click", () => this.loadPage(preset.url));
      grid.appendChild(card);
    });

    sd.appendChild(title);
    sd.appendChild(grid);
    container.appendChild(sd);
  }
}

// App Bootstrap on DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
