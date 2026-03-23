"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
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
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
