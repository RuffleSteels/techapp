// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
    isCSSEnabled: true, // required for Expo Router v6
});

// Support for SVG transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Custom resolver settings
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Aliases
config.resolver.alias = {
    '@': path.resolve(__dirname), // ✅ alias to project root
};

module.exports = config;