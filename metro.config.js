// Metro configuration for Expo (supports native + web bundling).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files (used by some Supabase deps) resolve correctly.
config.resolver.sourceExts.push('cjs');

// @supabase/supabase-js performs an optional dynamic import of
// "@opentelemetry/api" for tracing. We don't use telemetry, so map it to a
// tiny empty shim to keep Metro (web + native) bundling happy.
const otelShim = path.resolve(__dirname, 'shims/empty.js');
// jsPDF / html2canvas ship Node/AMD builds that Metro can't parse; force their
// ESM builds (used only on web for sharing the report as a PDF).
const aliases = {
  '@opentelemetry/api': otelShim,
  jspdf: path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.es.min.js'),
  html2canvas: path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.esm.js'),
};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (aliases[moduleName]) {
    return { type: 'sourceFile', filePath: aliases[moduleName] };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
