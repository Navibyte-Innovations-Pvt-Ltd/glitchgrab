"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteToken } from "./actions";

export function DeleteTokenButton({ tokenId }: { tokenId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteToken(tokenId);
        toast.success("Token revoked");
      } catch {
        toast.error("Failed to delete token");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label="Revoke token"
      className="inline-flex items-center justify-center h-7 w-7 rounded border border-transparent text-muted-foreground hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
