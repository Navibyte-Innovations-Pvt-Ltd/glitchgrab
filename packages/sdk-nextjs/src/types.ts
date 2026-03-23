import type { ReactNode } from "react";

export interface GlitchgrabConfig {
  token: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
}

export interface ReportPayload {
  token: string;
  source: "SDK_AUTO" | "SDK_USER_REPORT";
  description?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  pageUrl?: string;
  userAgent?: string;
  metadata?: Record<string, string>;
}

export interface GlitchgrabProviderProps {
  token: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ReportButtonProps {
  /** Button position on screen */
  position?: "bottom-right" | "bottom-left";
  /** Button label text */
  label?: string;
  /** Additional CSS class name */
  className?: string;
}

export interface CapturedContext {
  url: string;
  userAgent: string;
  timestamp: string;
  visitedPages: string[];
}

export interface UseGlitchgrabReturn {
  /** Report a bug programmatically */
  reportBug: (description: string, metadata?: Record<string, string>) => void;
  /** The token being used */
  token: string;
  /** The base URL of the Glitchgrab API */
  baseUrl: string;
}
