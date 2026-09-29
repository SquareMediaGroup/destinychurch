// Destiny One lives inside the destinychurch repo but is NOT one of its npm
// workspaces (the website's Vercel build shouldn't install React Native).
// It depends on ../../packages/shared through a `file:` link, so Metro has to
// be told to watch that folder and to resolve its imports from this app's
// node_modules.
const path = require("path");
// getSentryExpoConfig is Expo's default config plus the ids Sentry uses to
// match crash reports to source maps.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../packages/shared");

const config = getSentryExpoConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
