/**
 * Injects PWA tags (manifest, icons, theme-color, service worker
 * registration) into dist/index.html after `expo export --platform web`.
 *
 * Why this exists: app.json has `web.output: "single"` (required — see
 * CLAUDE.md — switching to "static" breaks EAS Hosting routing). In
 * "single" mode, Expo Router does NOT use app/+html.tsx to generate the
 * document; it emits a fixed generic index.html. So this script patches
 * the exported file directly instead. Safe to re-run (idempotent).
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[inject-pwa] dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa] Already injected, skipping.');
  process.exit(0);
}

html = html.replace('<html lang="en">', '<html lang="ar" dir="rtl">');

const headInjection = `
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#F4B000" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="إنجازاتي" />
</head>`;

html = html.replace('</head>', headInjection);

const swInjection = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  </script>
</body>`;

html = html.replace('</body>', swInjection);

fs.writeFileSync(indexPath, html);
console.log('[inject-pwa] dist/index.html patched with PWA tags.');
