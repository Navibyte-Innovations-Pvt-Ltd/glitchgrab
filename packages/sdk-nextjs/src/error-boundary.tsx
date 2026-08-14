"use client";

import * as React from "react";
import type { GlitchgrabSession } from "./types";
import { sendReport } from "./utils";
import { buildCapturedErrorPayload } from "./capture";

interface ErrorBoundaryProps {
  token: string;
  baseUrl?: string;
  session?: GlitchgrabSession | null;
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
      // Same payload shape and dedup as `captureError` — this boundary is just
      // another caught-error source. Config comes from props, not the module
      // registry, so the boundary works standalone (it's exported on its own).
      // No `ignoreErrors` by design: those are a provider prop this component
      // cannot see when mounted directly by a host app.
      const payload = buildCapturedErrorPayload(
        error,
        { componentStack: errorInfo.componentStack ?? undefined },
        {
          token: this.props.token,
          baseUrl: this.props.baseUrl,
          session: this.props.session,
          getVisitedPages: () => this.props.visitedPages,
        },
        "GlitchgrabErrorBoundary"
      );

      if (payload) {
        sendReport(payload, this.props.baseUrl);
      }

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
