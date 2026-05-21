const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Patch specs_DEPRECATED/NativePlatformConstantsIOS.js to be lazy.
// RN 0.83 New Architecture: the original calls TurboModuleRegistry.getEnforcing
// at module-load time (during InitializeCore → LogBox), before the native
// TurboModule proxy is guaranteed to be ready → "[runtime not ready]" crash.
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "ios" &&
    moduleName.includes("specs_DEPRECATED") &&
    moduleName.includes("NativePlatformConstantsIOS")
  ) {
    return {
      filePath: path.resolve(__dirname, "patches/NativePlatformConstantsIOS.js"),
      type: "sourceFile",
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
