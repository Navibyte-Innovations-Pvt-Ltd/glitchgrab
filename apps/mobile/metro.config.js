const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from both the project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Disable hierarchical lookup to avoid duplicates
config.resolver.disableHierarchicalLookup = true;

// RN 0.83 loads NativePlatformConstantsIOS eagerly before turbo proxy is ready.
// Redirect to lazy proxy to prevent [runtime not ready] crash on iOS.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes("PlatformConstants")) {
    console.log("[METRO RESOLVER]", platform, moduleName);
  }
  if (platform === "ios" && moduleName.endsWith("NativePlatformConstantsIOS")) {
    return {
      filePath: path.resolve(__dirname, "patches/NativePlatformConstantsIOS.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
