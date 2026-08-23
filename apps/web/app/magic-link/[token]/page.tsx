"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { decodeMagicSuffix, safeTargetPath } from "@/lib/magic-login";

/**
 * Where a WhatsApp digest's "Open dashboard" button lands.
 *
 * An already-signed-in visitor never gets this far — `proxy.ts` redirects them
 * first — so the single-use token is only ever spent by someone who actually
 * needs it. The check below is a safety net for the case the proxy could not
 * read the session cookie.
 */
export default function MagicLinkPage() {
  const { token: segment } = useParams<{ token: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [failed, setFailed] = useState(false);

  // The destination rides in the same path segment as the token — a query
  // string cannot survive Meta's URL-button encoding. See lib/magic-login.ts.
  const { token, targetPath } = decodeMagicSuffix(segment ?? "");
  const destination = safeTargetPath(targetPath);

  useEffect(() => {
    let cancelled = false;
    if (sessionStatus === "loading") return;

    // No token was minted (rate limit, or a mint that failed). Nothing expired,
    // so do not say it did — send them to log in for the page they wanted.
    if (!token) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(destination)}`);
      return;
    }

    if (sessionStatus === "authenticated") {
      router.replace(destination);
      return;
    }

    async function run() {
      try {
        const result = await signIn("magic-token", { magicToken: token, redirect: false });
        if (cancelled) return;

        if (result?.ok) router.replace(destination);
        else setFailed(true);
      } catch {
        // Network error, or a double-tap racing to consume the same token.
        if (!cancelled) setFailed(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, destination, router, sessionStatus]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-foreground">
          This link has already been used or has expired.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(destination)}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Signing you in…</span>
    </div>
  );
}
