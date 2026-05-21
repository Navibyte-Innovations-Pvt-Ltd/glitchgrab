const { withDangerousMod } = require("@expo/config-plugins");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const path = require("path");

// expo-share-intent injects sourceURL(for bridge: RCTBridge) which doesn't
// compile in New Architecture (RN 0.76+) — RCTBridge no longer exists in scope
const withFixAppDelegate = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName + "/AppDelegate.swift"
      );
      if (!existsSync(filePath)) return config;

      const original = readFileSync(filePath, "utf8");
      const fixed = original.replace(
        /\n\s+override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{[^}]+\}/,
        ""
      );
      if (fixed !== original) writeFileSync(filePath, fixed);
      return config;
    },
  ]);
};

module.exports = withFixAppDelegate;
