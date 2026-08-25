"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function CancelButton({ expiresAt }: { expiresAt: Date | null }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/billing/cancel");
      if (data.success) {
        toast.success("Subscription cancelled. You have access until the end of your billing period.");
        window.location.reload();
      } else {
        toast.error(data.error ?? "Failed to cancel subscription");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-mono text-[11px] uppercase tracking-widest gap-2 rounded"
          />
        }
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Cancel subscription
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Cancel subscription?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your Pro access will continue until{" "}
            <strong className="font-mono text-foreground">
              {expiresAt ? expiresAt.toLocaleDateString() : "the end of your billing period"}
            </strong>
            . After that, you won&apos;t be able to create new issues or use AI features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-mono text-[11px] uppercase tracking-widest">
            Keep subscription
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading}
            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-mono text-[11px] uppercase tracking-widest gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Cancelling..." : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
