"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

/**
 * Silent extension login for the logged-in dashboard user (#297) — fires
 * once per authenticated page load, site-wide (mounted in the root layout).
 * Same postMessage handshake the QA magic-link page uses; the extension's
 * content script picks it up if installed, no-op otherwise.
 */
export function ExtensionAutoLogin() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    axios
      .post("/api/v1/extension/auto-auth")
      .then(({ data }) => {
        if (cancelled || !data?.success) return;
        window.postMessage(
          {
            source: "glitchgrab-auth",
            type: "GG_AUTO_LOGIN",
            sessionId: data.data.sessionId,
            name: data.data.testerName,
            email: data.data.testerEmail,
          },
          window.location.origin
        );
      })
      .catch(() => { /* extension not installed — silent */ });
    return () => { cancelled = true; };
  }, [status]);

  return null;
}
