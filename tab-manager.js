/**
 * tab-manager.js - Tab Lifecycle and UI State Manager
 */

class TabManager {
  constructor(viewportEl) {
    this.tabs = [];
    this.activeTabId = null;
    this.viewportEl = viewportEl;
  }

  createTab(initialUrl = "", onSwitchCallback = () => {}) {
    const tabId = "tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

    const tabData = {
      id: tabId,
      title: "New Tab",
      url: initialUrl,
      history: [],
      historyIndex: -1
    };

    this.tabs.push(tabData);

    // Build iframe viewport container
    const frameContainer = document.createElement("div");
    frameContainer.className = "frame-container";
    frameContainer.id = `container_${tabId}`;

    const iframe = document.createElement("iframe");
    iframe.id = `iframe_${tabId}`;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    frameContainer.appendChild(iframe);

    this.viewportEl.appendChild(frameContainer);

    this.switchTab(tabId, onSwitchCallback);
    return tabData;
  }

  switchTab(tabId, callback = () => {}) {
    this.activeTabId = tabId;

    document.querySelectorAll(".frame-container").forEach((el) => {
      el.classList.toggle("active", el.id === `container_${tabId}`);
    });

    callback(this.getActiveTab());
  }

  closeTab(tabId, onSwitchCallback = () => {}) {
    if (this.tabs.length === 1) {
      this.createTab("", onSwitchCallback);
    }

    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) {
      this.tabs.splice(idx, 1);
      const container = document.getElementById(`container_${tabId}`);
      if (container) container.remove();
    }

    if (this.activeTabId === tabId) {
      const nextTab = this.tabs[Math.max(0, idx - 1)];
      this.switchTab(nextTab.id, onSwitchCallback);
    }
  }

  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }
}

// Instantiate globally on DOM container
window.tabManager = new TabManager(document.getElementById("viewport"));
