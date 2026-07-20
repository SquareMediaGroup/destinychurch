// Metro config for the isolated Expo app.
//
// `mobile/` is deliberately NOT part of the repo's npm workspaces — it keeps its
// own node_modules so React Native's dependency resolution can't clash with the
// web app's React version or disturb the Next.js build. The one thing it reaches
// out of its own tree for is the shared package, which it consumes by source.
//
// We therefore:
//  - watch `packages/shared` so edits there hot-reload the app, and
//  - alias `@destiny/shared` straight to that package's directory,
// WITHOUT adding the monorepo-root node_modules to the resolver (which would
// risk pulling the web app's copy of React into the bundle).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");
const sharedPkg = path.resolve(monorepoRoot, "packages/shared");

const config = getDefaultConfig(projectRoot);

// Watch the shared package for changes (it ships raw TS, transpiled by Metro).
config.watchFolders = [sharedPkg];

// Resolve the app's own node_modules only; alias the shared package by path.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@destiny/shared": sharedPkg,
};

// The shared package exposes its entry via the "exports" map (./src/index.ts).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
