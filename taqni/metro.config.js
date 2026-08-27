// Metro configuration for Expo (supports native + web bundling).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files (used by some Supabase deps) resolve correctly.
config.resolver.sourceExts.push('cjs');

module.exports = config;
