import type { WaSignupLaunch } from "./types";

/**
 * Opens Meta's Embedded Signup popup.
 *
 * Runs in the browser, holds no credentials, and returns the `code` your server
 * exchanges via `client.completeConnect()`. Nothing is connected until that
 * exchange happens.
 *
 * Meta's JS SDK must already be on the page — Embedded Signup only works
 * through `FB.login` with a `config_id`; a plain OAuth redirect gets a token but
 * skips the WABA creation the owner actually needs.
 */

interface FacebookSdk {
  init(params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }): void;
  login(
    callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
    options: {
      config_id: string;
      response_type: string;
      override_default_response_type: boolean;
      extras?: Record<string, unknown>;
    }
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

export interface SignupOutcome {
  code: string;
  state: string;
}

/** Matches the version the server pins; a mismatch changes the response shape. */
const GRAPH_VERSION = "v23.0";

export function launchSignup(config: WaSignupLaunch): Promise<SignupOutcome> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.FB) {
      reject(
        new Error(
          "Meta's JS SDK is not loaded. Add https://connect.facebook.net/en_US/sdk.js to the page before calling launchSignup()."
        )
      );
      return;
    }

    window.FB.init({ appId: config.appId, cookie: true, xfbml: false, version: GRAPH_VERSION });

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          // Closing the popup is the common case and is not an error worth
          // throwing a stack trace over — but the caller still needs to know.
          reject(new Error("Sign-up was cancelled before a WhatsApp account was connected"));
          return;
        }
        resolve({ code, state: config.state });
      },
      {
        config_id: config.configId,
        response_type: "code",
        // Without this Meta returns an access token to the *browser* instead of
        // a code, which would mean a tenant token in client-side JavaScript.
        override_default_response_type: true,
        extras: { sessionInfoVersion: 3 },
      }
    );
  });
}
