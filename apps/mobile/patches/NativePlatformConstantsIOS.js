'use strict';

// Lazy proxy for PlatformConstants TurboModule.
//
// RN 0.83 New Architecture: specs_DEPRECATED/NativePlatformConstantsIOS.js calls
// TurboModuleRegistry.getEnforcing('PlatformConstants') at MODULE LOAD TIME, which
// runs during InitializeCore → LogBox → Platform.ios.js.
// TurboModuleRegistry.js caches global.__turboModuleProxy as a var at its own load
// time. If native hasn't set up the proxy yet, the var is null forever →
// getEnforcing throws "[runtime not ready]".
//
// This replacement defers the lookup to first property access, by which time
// the native side is guaranteed to be initialized.

var _mod = null;

function getModule() {
  if (!_mod) {
    // Access global.__turboModuleProxy directly (bypass TurboModuleRegistry's
    // cached var) to avoid the stale-null problem.
    var tp = global.__turboModuleProxy;
    if (tp) {
      _mod = tp('PlatformConstants');
    }
    if (!_mod) {
      // Legacy bridge fallback
      var NM = require('react-native/Libraries/BatchedBridge/NativeModules');
      _mod = (NM && NM.default ? NM.default : NM)['PlatformConstants'];
    }
    if (!_mod) {
      throw new Error(
        "[NativePlatformConstantsIOS patch] 'PlatformConstants' not in native binary."
      );
    }
  }
  return _mod;
}

var lazyProxy = new Proxy(
  {},
  {
    get: function (_, prop) {
      var mod = getModule();
      var val = mod[prop];
      return typeof val === 'function' ? val.bind(mod) : val;
    },
    set: function (_, prop, value) {
      getModule()[prop] = value;
      return true;
    },
    has: function (_, prop) {
      return prop in getModule();
    },
    ownKeys: function () {
      return Object.keys(getModule());
    },
    getOwnPropertyDescriptor: function (_, prop) {
      return Object.getOwnPropertyDescriptor(getModule(), prop);
    },
  }
);

// Export as CJS with __esModule=true so _interopDefault in the re-exporter
// (Libraries/Utilities/NativePlatformConstantsIOS.js) returns .default correctly.
module.exports = {
  __esModule: true,
  default: lazyProxy,
};
