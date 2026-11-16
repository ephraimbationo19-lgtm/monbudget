/** @type {import('expo/metro-config').MetroConfig} */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Nécessaire pour expo-sqlite sur le web (WebAssembly + SharedArrayBuffer).
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
