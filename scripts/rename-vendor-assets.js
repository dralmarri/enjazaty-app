#!/usr/bin/env node
/**
 * Cloudflare Pages hard-codes an exclusion of any path containing a
 * `node_modules` segment (see cloudflare/workers-sdk#3615 and the Pages
 * "Known issues" docs). Expo/Metro exports some real, needed assets — the
 * icon fonts for @expo/vector-icons, plus a few navigation/router images —
 * under `dist/assets/node_modules/...`. Those files therefore never get
 * uploaded to Cloudflare Pages, so the app renders with empty boxes where
 * icons should be (while EAS Hosting, which has no such exclusion, serves the
 * exact same build fine).
 *
 * This script runs after `expo export` and rewrites that one path segment:
 *   dist/assets/node_modules/...  ->  dist/assets/vendor_modules/...
 * It renames the physical directory and rewrites every reference to the
 * scoped string `assets/node_modules/` inside the exported text files so the
 * app requests the new, upload-safe path. Only the `assets/node_modules/`
 * prefix is touched, so unrelated bundler strings like the regex
 * `"/node_modules/"` are left alone.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const FROM = 'assets/node_modules/';
const TO = 'assets/vendor_modules/';
const REWRITE_EXTS = new Set(['.js', '.html', '.htm', '.json', '.css', '.map', '.txt']);

if (!fs.existsSync(DIST)) {
  console.error('[rename-vendor-assets] dist/ not found — run `expo export` first.');
  process.exit(1);
}

let filesRewritten = 0;
let totalReplacements = 0;

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fn);
    else fn(full);
  }
}

// 1) Rewrite references inside text files.
walk(DIST, (file) => {
  if (!REWRITE_EXTS.has(path.extname(file).toLowerCase())) return;
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes(FROM)) return;
  const count = original.split(FROM).length - 1;
  fs.writeFileSync(file, original.split(FROM).join(TO));
  filesRewritten += 1;
  totalReplacements += count;
});

// 2) Rename the physical directory dist/assets/node_modules -> vendor_modules.
const fromDir = path.join(DIST, 'assets', 'node_modules');
const toDir = path.join(DIST, 'assets', 'vendor_modules');
let dirRenamed = false;
if (fs.existsSync(fromDir)) {
  if (fs.existsSync(toDir)) {
    console.error(`[rename-vendor-assets] ${toDir} already exists; aborting to avoid clobbering.`);
    process.exit(1);
  }
  fs.renameSync(fromDir, toDir);
  dirRenamed = true;
}

console.log(
  `[rename-vendor-assets] rewrote ${totalReplacements} reference(s) across ` +
    `${filesRewritten} file(s); directory renamed: ${dirRenamed}.`
);

if (!dirRenamed && totalReplacements === 0) {
  // Nothing to do can be legitimate (e.g. a build with no vendor assets), but
  // it more likely means the export layout changed — make it visible.
  console.warn('[rename-vendor-assets] no assets/node_modules path found; nothing changed.');
}
