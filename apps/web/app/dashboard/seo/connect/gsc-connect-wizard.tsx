"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Site {
  siteUrl: string;
  permissionLevel: string;
}

interface Repo {
  id: string;
  fullName: string;
}

interface Selection {
  checked: boolean;
  repoId: string;
  repoPickerOpen: boolean;
}

export function GscConnectWizard({
  sessionId,
  sites,
  repos,
}: {
  sessionId: string;
  sites: Site[];
  repos: Repo[];
}) {
  const router = useRouter();

  const [selections, setSelections] = useState<Record<string, Selection>>(
    Object.fromEntries(sites.map((s) => [s.siteUrl, { checked: false, repoId: "", repoPickerOpen: false }]))
  );

  const checkedSites = sites.filter((s) => selections[s.siteUrl]?.checked);
  const allValid = checkedSites.length > 0 && checkedSites.every((s) => selections[s.siteUrl]?.repoId);

  const { mutate: connect, isPending } = useMutation({
    mutationFn: async () => {
      const payload = checkedSites.map((s) => ({
        siteUrl: s.siteUrl,
        repoId: selections[s.siteUrl].repoId,
      }));
      const { data } = await axios.post("/api/v1/gsc/connect", { sessionId, selections: payload });
      if (!data.success) throw new Error(data.error ?? "Failed to connect");
      return data.data as { connected: number };
    },
    onSuccess: (result) => {
      toast.success(`${result.connected} propert${result.connected === 1 ? "y" : "ies"} connected`);
      router.push("/dashboard/seo?connected=true");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to connect"),
  });

  function toggle(siteUrl: string) {
    setSelections((prev) => ({
      ...prev,
      [siteUrl]: { ...prev[siteUrl], checked: !prev[siteUrl].checked },
    }));
  }

  function setRepo(siteUrl: string, repoId: string) {
    setSelections((prev) => ({
      ...prev,
      [siteUrl]: { ...prev[siteUrl], repoId, repoPickerOpen: false },
    }));
  }

  function setPickerOpen(siteUrl: string, open: boolean) {
    setSelections((prev) => ({
      ...prev,
      [siteUrl]: { ...prev[siteUrl], repoPickerOpen: open },
    }));
  }

  return (
    <div className="space-y-4">
      <div className="border border-border rounded bg-card/40 divide-y divide-border/50">
        {sites.map((site) => {
          const sel = selections[site.siteUrl];
          const selectedRepo = repos.find((r) => r.id === sel.repoId);

          return (
            <div key={site.siteUrl} className={cn("p-4 transition-colors", sel.checked && "bg-primary/5")}>
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggle(site.siteUrl)}
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center",
                    sel.checked ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  {sel.checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </button>

                <div className="flex-1 space-y-2 min-w-0">
                  <div>
                    <p className="font-mono text-[12px] text-foreground break-all">{site.siteUrl}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/60">{site.permissionLevel}</p>
                  </div>

                  {/* Repo picker — only shown when checked */}
                  {sel.checked && (
                    <Popover open={sel.repoPickerOpen} onOpenChange={(open) => setPickerOpen(site.siteUrl, open)}>
                      <PopoverTrigger className={cn(
                        "w-full flex items-center justify-between gap-2 font-mono text-[11px] bg-background border rounded px-3 py-2 text-left transition-colors",
                        !sel.repoId ? "border-red-500/40 text-muted-foreground" : "border-border text-foreground",
                        sel.repoPickerOpen ? "border-primary/50" : "hover:border-primary/30"
                      )}>
                        <span className={sel.repoId ? "truncate" : "text-red-400/80"}>
                          {selectedRepo ? selectedRepo.fullName : "Select repo (required)"}
                        </span>
                        <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search repos…" className="font-mono text-xs h-8" />
                          <CommandList>
                            <CommandEmpty className="font-mono text-xs text-muted-foreground py-3 text-center">
                              No repo found.
                            </CommandEmpty>
                            <CommandGroup>
                              {repos.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  value={r.fullName}
                                  onSelect={() => setRepo(site.siteUrl, r.id)}
                                  className="font-mono text-xs"
                                >
                                  <Check className={cn("h-3 w-3 mr-2 shrink-0", sel.repoId === r.id ? "opacity-100" : "opacity-0")} />
                                  {r.fullName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted-foreground">
          {checkedSites.length} of {sites.length} selected
          {checkedSites.length > 0 && !allValid && (
            <span className="text-red-400 ml-2">— select a repo for each</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => connect()}
          disabled={!allValid || isPending}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-5 py-2 rounded border transition-colors",
            allValid && !isPending
              ? "border-primary text-primary hover:bg-primary/10"
              : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
          )}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {isPending ? "Connecting…" : `Connect ${checkedSites.length || ""} ${checkedSites.length === 1 ? "property" : "properties"}`}
        </button>
      </div>
    </div>
  );
}
