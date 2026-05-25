import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Glitchgrab",
  slug: "glitchgrab",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: "#09090b",
  scheme: "glitchgrab",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#09090b",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.glitchgrab.app",
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  android: {
    package: "dev.glitchgrab.app",
    adaptiveIcon: {
      backgroundColor: "#09090b",
      foregroundImage: "./assets/icon.png",
    },
    permissions: ["INTERNET", "READ_MEDIA_IMAGES", "READ_EXTERNAL_STORAGE"],
    // @ts-ignore - valid Expo Android option, missing from type defs
    usesClearTextTraffic: true,
    intentFilters: [
      {
        action: "SEND",
        category: ["DEFAULT"],
        data: [{ mimeType: "image/*" }],
      },
      {
        action: "VIEW",
        autoVerify: true,
        category: ["DEFAULT", "BROWSABLE"],
        data: [
          {
            scheme: "https",
            host: "glitchgrab.dev",
            pathPrefix: "/collaborate",
          },
        ],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-media-library",
      {
        photosPermission: "Allow Glitchgrab to detect screenshots for bug reporting.",
        savePhotosPermission: "Allow Glitchgrab to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-share-intent",
      {
        androidIntentFilters: ["image/*"],
        androidMultiIntentFilters: ["image/*"],
      },
    ],
  ],
  extra: {
    APP_ENV: process.env.APP_ENV ?? "development",
    BASE_URL: process.env.BASE_URL ?? "",
    eas: {
      projectId: "6166832f-68fa-4680-a312-99030a7e9d5c",
    },
    router: {
      origin: false,
    },
  },
});
