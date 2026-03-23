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

export interface ReportButtonProps {
  position?: "bottom-right" | "bottom-left";
  label?: string;
  className?: string;
}

export interface GlitchgrabProviderProps {
  token: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface CapturedContext {
  url: string;
  userAgent: string;
  timestamp: string;
  visitedPages: string[];
}
