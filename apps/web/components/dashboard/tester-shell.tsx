"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, FlaskConical } from "lucide-react";

/**
 * The whole app chrome a tester gets.
 *
 * Deliberately not the owner Sidebar: a tester has no repos, no billing, no
 * tokens and no org, so every nav entry that shell renders would either 404 or
 * leak the existence of surfaces they can't open. proxy.ts already bounces a
 * tester off every /dashboard sub-path — this shell simply never offers one.
 */
export function TesterShell({
  name,
  orgName,
  children,
}: {
  name: string;
  orgName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const logout = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/logout"),
    onSuccess: () => {
      router.replace("/login");
      router.refresh();
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        {/* max-w-2xl matches the QA list below it — a wider header would start
            its text left of every card on the page. */}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Image src="/original.png" alt="Glitchgrab" width={28} height={28} className="rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <FlaskConical className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{name}</span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">Testing for {orgName}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="shrink-0"
          >
            {logout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
