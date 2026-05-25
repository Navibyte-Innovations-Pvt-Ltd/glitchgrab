const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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

// Bump this string any time metro.config.js changes significantly — forces
// Metro to bust its Hermes bytecode cache and rebuild with fresh resolution.
config.cacheVersion = "gg-1";

// RN 0.83 captures global.__turboModuleProxy at module load time (null) and
// blocks NativeModules fallback via RN$Bridgeless. Redirect NativePlatformConstantsIOS
// to a lazy proxy that reads __turboModuleProxy at call time instead.
const proxyFile = path.resolve(projectRoot, "node_modules/.cache/NativePlatformConstantsIOS.js");
fs.mkdirSync(path.dirname(proxyFile), { recursive: true });
fs.writeFileSync(
  proxyFile,
  `
var _mod = null;
function getModule() {
  if (!_mod) {
    var tp = global.__turboModuleProxy;
    if (tp) { _mod = tp('PlatformConstants'); }
    if (!_mod) {
      var NM = require('react-native/Libraries/BatchedBridge/NativeModules');
      _mod = (NM && NM.default ? NM.default : NM)['PlatformConstants'];
    }
    if (!_mod) { throw new Error("'PlatformConstants' not found"); }
  }
  return _mod;
}
var lazyProxy = new Proxy({}, {
  get: function(_, prop) { var m = getModule(); var v = m[prop]; return typeof v === 'function' ? v.bind(m) : v; },
  set: function(_, prop, value) { getModule()[prop] = value; return true; },
  has: function(_, prop) { return prop in getModule(); },
  ownKeys: function() { return Object.keys(getModule()); },
  getOwnPropertyDescriptor: function(_, prop) { return Object.getOwnPropertyDescriptor(getModule(), prop); },
});
module.exports = { __esModule: true, default: lazyProxy };
`.trim()
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "ios" && moduleName.endsWith("NativePlatformConstantsIOS")) {
    return { filePath: proxyFile, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
