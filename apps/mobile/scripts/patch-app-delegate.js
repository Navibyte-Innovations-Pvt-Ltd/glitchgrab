#!/usr/bin/env node
// Removes sourceURL(for bridge: RCTBridge) — not available in New Architecture (RN 0.83+)
// expo-share-intent injects this method but RCTBridge no longer exists in New Arch scope
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../ios/Glitchgrab/AppDelegate.swift");
if (!fs.existsSync(file)) {
  console.log("AppDelegate.swift not found, skipping patch");
  process.exit(0);
}

const original = fs.readFileSync(file, "utf8");
const patched = original.replace(
  /\n\s+override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{[\s\S]*?\n  \}/,
  ""
);

if (patched === original) {
  console.log("patch-app-delegate: nothing to patch");
} else {
  fs.writeFileSync(file, patched);
  console.log("patch-app-delegate: removed sourceURL(for bridge: RCTBridge)");
}
