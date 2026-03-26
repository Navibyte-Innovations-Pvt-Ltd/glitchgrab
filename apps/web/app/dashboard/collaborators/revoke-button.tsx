"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
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
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";

interface RevokeButtonProps {
  collaboratorId: string;
  email: string;
}

export function RevokeButton({ collaboratorId, email }: RevokeButtonProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(`/api/v1/collaborators/${collaboratorId}/revoke`);
      if (!data.success) throw new Error(data.error ?? "Failed to remove");
      return data;
    },
    onSuccess: () => {
      toast.success(`Removed ${email}`);
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive shrink-0"
          />
        }
      >
        <UserX className="h-4 w-4 mr-1" />
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke <strong>{email}</strong>&apos;s access to your
            repositories. They won&apos;t be able to report bugs anymore. You can
            always invite them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate()}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Removing...
              </>
            ) : (
              "Remove"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
