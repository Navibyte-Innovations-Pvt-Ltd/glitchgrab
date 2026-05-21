import { createContext, useContext } from "react";

export interface GlitchgrabUser {
  id: string;
  name: string;
  email?: string;
}

export interface GlitchgrabConfig {
  token: string;
  baseUrl: string;
  user: GlitchgrabUser | null | undefined;
  threeFinger: boolean;
  screenshotDetection: boolean;
}

export interface GlitchgrabContextValue {
  config: GlitchgrabConfig;
  openSheet: (screenshotUri?: string | null) => void;
}

export const GlitchgrabContext = createContext<GlitchgrabContextValue | null>(null);

export function useGlitchgrabContext(): GlitchgrabContextValue {
  const ctx = useContext(GlitchgrabContext);
  if (!ctx) {
    throw new Error("useGlitchgrab must be used inside <GlitchgrabProvider>");
  }
  return ctx;
}
