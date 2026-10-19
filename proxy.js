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
  renderInternalPage(url) {
  const page = url.replace("mogger://", "").replace("about:", "").replace(/\/$/, "");

  switch (page) {
    case "games":
    case "arcade":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
            body { background: #1e1e2e; color: #cdd6f4; padding: 24px; min-height: 100vh; }
            h1 { color: #89b4fa; margin-bottom: 8px; font-size: 28px; }
            p.sub { color: #a6adc8; margin-bottom: 24px; font-size: 14px; }
            
            .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
            .game-card { background: #252538; border: 1px solid #45475a; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
            .game-card h3 { color: #a6e3a1; font-size: 18px; }
            .game-card p { color: #a6adc8; font-size: 13px; }
            
            canvas { background: #11111b; border: 2px solid #45475a; border-radius: 8px; margin-top: 8px; }
            .controls { display: flex; gap: 8px; margin-top: 8px; }
            button { background: #89b4fa; color: #11111b; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; }
            button:hover { background: #b4befe; }
          </style>
        </head>
        <body>
          <h1>🎮 mogger://games</h1>
          <p class="sub">Built-in unblocked mini-games running fully client-side.</p>

          <div class="games-grid">
            <!-- Snake Game Card -->
            <div class="game-card">
              <h3>🐍 Snake</h3>
              <p>Use Arrow Keys to eat food and grow.</p>
              <canvas id="snakeCanvas" width="200" height="200"></canvas>
              <div class="controls">
                <button id="startSnake">Play / Reset</button>
              </div>
            </div>

            <!-- Tic Tac Toe Card -->
            <div class="game-card">
              <h3>❌ Tic-Tac-Toe ⭕</h3>
              <p>Play against local opponent or AI.</p>
              <div id="tttBoard" style="display:grid; grid-template-columns:repeat(3,60px); gap:6px; margin:12px 0;"></div>
              <button id="resetTTT">Reset Game</button>
            </div>
          </div>

          <script>
            // --- Snake Logic ---
            const canvas = document.getElementById('snakeCanvas');
            const ctx = canvas.getContext('2d');
            let snake, food, dx, dy, gameInterval;

            function initSnake() {
              clearInterval(gameInterval);
              snake = [{x: 100, y: 100}, {x: 90, y: 100}, {x: 80, y: 100}];
              food = {x: 50, y: 50};
              dx = 10; dy = 0;
              gameInterval = setInterval(updateSnake, 100);
            }

            function updateSnake() {
              const head = {x: snake[0].x + dx, y: snake[0].y + dy};
              if (head.x < 0 || head.x >= 200 || head.y < 0 || head.y >= 200 || snake.some(s => s.x === head.x && s.y === head.y)) {
                clearInterval(gameInterval);
                ctx.fillStyle = "#f38ba8";
                ctx.font = "16px sans-serif";
                ctx.fillText("Game Over!", 50, 100);
                return;
              }

              snake.unshift(head);
              if (head.x === food.x && head.y === food.y) {
                food = {
                  x: Math.floor(Math.random() * 20) * 10,
                  y: Math.floor(Math.random() * 20) * 10
                };
              } else {
                snake.pop();
              }

              ctx.fillStyle = "#11111b";
              ctx.fillRect(0, 0, 200, 200);

              ctx.fillStyle = "#f38ba8";
              ctx.fillRect(food.x, food.y, 10, 10);

              ctx.fillStyle = "#a6e3a1";
              snake.forEach(part => ctx.fillRect(part.x, part.y, 10, 10));
            }

            window.addEventListener('keydown', e => {
              if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -10; }
              if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 10; }
              if (e.key === 'ArrowLeft' && dx === 0) { dx = -10; dy = 0; }
              if (e.key === 'ArrowRight' && dx === 0) { dx = 10; dy = 0; }
            });

            document.getElementById('startSnake').addEventListener('click', initSnake);

            // --- Tic Tac Toe Logic ---
            const boardEl = document.getElementById('tttBoard');
            let board = Array(9).fill('');
            let turn = 'X';

            function renderTTT() {
              boardEl.innerHTML = '';
              board.forEach((cell, idx) => {
                const btn = document.createElement('button');
                btn.style.cssText = "width:60px; height:60px; font-size:20px; background:#313244; color:#cdd6f4;";
                btn.textContent = cell;
                btn.addEventListener('click', () => {
                  if (!board[idx]) {
                    board[idx] = turn;
                    turn = turn === 'X' ? 'O' : 'X';
                    renderTTT();
                  }
                });
                boardEl.appendChild(btn);
              });
            }

            document.getElementById('resetTTT').addEventListener('click', () => {
              board = Array(9).fill('');
              turn = 'X';
              renderTTT();
            });

            renderTTT();
          </script>
        </body>
        </html>
      `;

    // Existing cases...
    case "settings":
    case "config":
      // ...
      break;
  }
}

  // PrepareHtmlForIframe method remains unchanged...
}
