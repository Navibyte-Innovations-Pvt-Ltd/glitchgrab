import { config as defaultConfig } from "@tamagui/config";
import { createTamagui } from "@tamagui/core";

// Glitchgrab brand — matches the web dashboard CSS vars
const brand = {
  primary: "#22d3ee",
  primaryForeground: "#09090b",
  primarySoft: "rgba(34, 211, 238, 0.10)",
  primaryMid: "rgba(34, 211, 238, 0.18)",

  success: "#22c55e",
  successSoft: "rgba(34, 197, 94, 0.12)",
  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.16)",
  error: "#ef4444",
  errorSoft: "rgba(239, 68, 68, 0.12)",

  bgDark: "#09090b",
  bgSecondaryDark: "#18181b",
  borderDark: "#2c2c2e",
  inputBorderDark: "#3f3f46",
  textDark: "#fafafa",
  mutedDark: "#a1a1aa",

  bgLight: "#ffffff",
  bgSecondaryLight: "#f4f4f5",
  borderLight: "#e4e4e7",
  inputBorderLight: "#d4d4d8",
  textLight: "#18181b",
  mutedLight: "#71717a",
};

const config = createTamagui({
  ...defaultConfig,
  // rc.7 vs rc.42 AnimationDriver types are structurally incompatible — cast needed
  animations: defaultConfig.animations,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      brandPrimary: brand.primary,
      brandPrimaryForeground: brand.primaryForeground,
      brandPrimarySoft: brand.primarySoft,
      brandPrimaryMid: brand.primaryMid,
      brandSuccess: brand.success,
      brandSuccessSoft: brand.successSoft,
      brandWarning: brand.warning,
      brandWarningSoft: brand.warningSoft,
      brandError: brand.error,
      brandErrorSoft: brand.errorSoft,
    },
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: brand.bgLight,
      backgroundStrong: brand.bgLight,
      backgroundSecondary: brand.bgSecondaryLight,
      primary: brand.primary,
      primaryForeground: brand.primaryForeground,
      primarySoft: brand.primarySoft,
      borderColor: brand.borderLight,
      inputBorder: brand.inputBorderLight,
      mutedForeground: brand.mutedLight,
      success: brand.success,
      successSoft: brand.successSoft,
      warning: brand.warning,
      warningSoft: brand.warningSoft,
      error: brand.error,
      errorSoft: brand.errorSoft,
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: brand.bgDark,
      backgroundStrong: brand.bgDark,
      backgroundSecondary: brand.bgSecondaryDark,
      primary: brand.primary,
      primaryForeground: brand.primaryForeground,
      primarySoft: brand.primarySoft,
      borderColor: brand.borderDark,
      inputBorder: brand.inputBorderDark,
      mutedForeground: brand.mutedDark,
      success: brand.success,
      successSoft: brand.successSoft,
      warning: brand.warning,
      warningSoft: brand.warningSoft,
      error: brand.error,
      errorSoft: brand.errorSoft,
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
});

export type AppConfig = typeof config;

declare module "@tamagui/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
