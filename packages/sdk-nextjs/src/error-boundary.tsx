"use client";

import React from "react";
import type { ReportPayload } from "./types";
import { captureContext, sendReport } from "./utils";

interface ErrorBoundaryProps {
  token: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  visitedPages: string[];
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class GlitchgrabErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      const context = captureContext(this.props.visitedPages);

      const payload: ReportPayload = {
        token: this.props.token,
        source: "SDK_AUTO",
        type: "BUG",
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack ?? undefined,
        pageUrl: context.url,
        userAgent: context.userAgent,
        breadcrumbs: context.breadcrumbs,
        deviceInfo: context.deviceInfo ?? undefined,
        metadata: {
          timestamp: context.timestamp,
          visitedPages: JSON.stringify(context.visitedPages),
        },
      };

      sendReport(payload, this.props.baseUrl);

      if (this.props.onError) {
        this.props.onError(error);
      }
    } catch {
      // Never crash the host app
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Re-render children — allows recovery from transient errors
      return this.props.children;
    }

    return this.props.children;
  }
}
