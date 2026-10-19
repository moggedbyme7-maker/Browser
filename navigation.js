/**
 * navigation.js - Navigation, History, and Link Interception Logic
 */

class NavigationController {
  /**
   * Formats raw user input into a valid HTTP/HTTPS URL or DuckDuckGo search query
   */
  formatUrl(input) {
    let cleanInput = input.trim();
    if (!cleanInput) return "";

    if (!cleanInput.startsWith("http://") && !cleanInput.startsWith("https://")) {
      if (cleanInput.includes(".") && !cleanInput.includes(" ")) {
        return "https://" + cleanInput;
      }
      return `https://duckduckgo.com/?q=${encodeURIComponent(cleanInput)}`;
    }
    return cleanInput;
  }

  /**
   * Pushes a new URL into a tab's navigation history stack
   */
  pushHistory(tab, url) {
    tab.url = url;
    if (tab.history[tab.historyIndex] !== url) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }

    try {
      tab.title = new URL(url).hostname || url;
    } catch {
      tab.title = url;
    }
  }

  /**
   * Moves forward or backward in tab history
   */
  stepHistory(tab, direction) {
    if (!tab) return null;

    const targetIdx = tab.historyIndex + direction;
    if (targetIdx >= 0 && targetIdx < tab.history.length) {
      tab.historyIndex = targetIdx;
      tab.url = tab.history[targetIdx];
      return tab.url;
    }
    return null;
  }
}

// Instantiate globally
window.navigationController = new NavigationController();
/**
 * navigation.js - Navigation, History, and Link Interception Logic
 */

class NavigationController {
  /**
   * Formats raw user input into internal protocol, valid HTTP/HTTPS URL, or search query
   */
  formatUrl(input) {
    let cleanInput = input.trim();
    if (!cleanInput) return "";

    // 1. Intercept custom internal URI scheme
    if (cleanInput.startsWith("browser://") || cleanInput.startsWith("about:")) {
      return cleanInput.toLowerCase();
    }

    // 2. Standard web URL handling
    if (!cleanInput.startsWith("http://") && !cleanInput.startsWith("https://")) {
      if (cleanInput.includes(".") && !cleanInput.includes(" ")) {
        return "https://" + cleanInput;
      }
      return `https://duckduckgo.com/?q=${encodeURIComponent(cleanInput)}`;
    }
    return cleanInput;
  }

  // Rest of navigation.js remains unchanged...
}
