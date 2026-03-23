"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github, Loader2 } from "lucide-react";

export function GitHubSignInButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="lg"
      className="w-full gap-2"
      onClick={() => {
        setLoading(true);
        signIn("github", { callbackUrl: "/dashboard" });
      }}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Github className="h-5 w-5" />
      )}
      {loading ? "Redirecting to GitHub..." : "Sign in with GitHub"}
    </Button>
  );
}
