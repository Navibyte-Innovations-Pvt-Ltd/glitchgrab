"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  UploadCloud,
  GitFork,
  Trash2,
  Check,
  ChevronsUpDown,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  ScanSearch,
  Share2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

interface GscPropertyData {
  id: string;
  siteUrl: string;
  repoId: string | null;
  repo: { id: string; fullName: string } | null;
  indexedCount: number;
  notIndexedCount: number;
  lastSyncAt: string | null;
  createdAt: string;
}

interface Repo {
  id: string;
  fullName: string;
}

interface NotIndexedPage {
  url: string;
  reason?: string;
}

interface SyncResult {
  synced: number;
  indexed: number;
  notIndexed: number;
  notIndexedPages: NotIndexedPage[];
}

export function GscPropertyDetail({
  property: initialProperty,
  repos,
}: {
  property: GscPropertyData;
  repos: Repo[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [property, setProperty] = useState(initialProperty);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState(initialProperty.repoId ?? "");
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);

  const domain = (() => {
    if (property.siteUrl.startsWith("sc-domain:")) return property.siteUrl.replace("sc-domain:", "");
    try { return new URL(property.siteUrl).hostname; } catch { return property.siteUrl; }
  })();

  const total = property.indexedCount + property.notIndexedCount;
  const indexedPct = total > 0 ? Math.round((property.indexedCount / total) * 100) : 0;

  const { data: faviconData, isFetching: isFaviconFetching, isError: isFaviconError, refetch: recheckFavicon } =
    useQuery<{ issues: { status: "Error" | "Warning"; id: number; text: string }[]; errorCount: number; warningCount: number }>({
      queryKey: ["favicon-check", domain],
      queryFn: async () => {
        const { data } = await axios.get(`/api/v1/gsc/favicon-check?domain=${encodeURIComponent(domain)}`);
        if (!data.success) throw new Error(data.error ?? "Favicon check failed");
        return data.data;
      },
      staleTime: 5 * 60_000,
      retry: false,
    });

  const { data: ogData, isFetching: isOgFetching, isError: isOgError, refetch: recheckOg } =
    useQuery<{
      tags: Record<string, string | null>;
      issues: { severity: "error" | "warning"; field: string; message: string }[];
    }>({
      queryKey: ["og-check", domain],
      queryFn: async () => {
        const { data } = await axios.get(`/api/v1/gsc/og-check?domain=${encodeURIComponent(domain)}`);
        if (!data.success) throw new Error(data.error ?? "OG check failed");
        return data.data;
      },
      staleTime: 5 * 60_000,
      retry: false,
    });

  const [copiedFavicon, setCopiedFavicon] = useState(false);
  const [copiedOg, setCopiedOg] = useState(false);

  const { mutate: syncNow, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/gsc/properties/${property.id}/sync`);
      if (!data.success) throw new Error(data.error ?? "Sync failed");
      return data.data as SyncResult;
    },
    onSuccess: (result) => {
      setSyncResult(result);
      setProperty((p) => ({
        ...p,
        indexedCount: result.indexed,
        notIndexedCount: result.notIndexed,
        lastSyncAt: new Date().toISOString(),
      }));
      toast.success(`Synced ${result.synced} URLs — ${result.indexed} indexed, ${result.notIndexed} not indexed`);
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Sync failed"),
  });

  const { mutate: reindex, isPending: isReindexing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/gsc/reindex", { propertyId: property.id });
      if (!data.success) throw new Error(data.error ?? "Reindex failed");
      return data.data as { submitted: number };
    },
    onSuccess: (result) => toast.success(`Submitted ${result.submitted} URLs for re-indexing`),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reindex failed"),
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.delete(`/api/v1/gsc/properties/${property.id}`);
      if (!data.success) throw new Error(data.error ?? "Failed to disconnect");
    },
    onSuccess: () => {
      toast.success("Property disconnected");
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
      router.push("/dashboard/seo");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Disconnect failed"),
  });

  const { mutate: linkRepo, isPending: isLinking } = useMutation({
    mutationFn: async (repoId: string | null) => {
      const { data } = await axios.patch("/api/v1/gsc/properties", {
        propertyId: property.id,
        repoId,
      });
      if (!data.success) throw new Error(data.error ?? "Failed to update");
    },
    onSuccess: () => {
      toast.success("Repo linked");
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  // Auto-sync on mount so not-indexed pages show immediately
  useEffect(() => { syncNow(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Indexed" value={property.indexedCount} accent="green" />
        <StatCard label="Not Indexed" value={property.notIndexedCount} accent="red" />
        <StatCard label="Total Checked" value={total} />
        <StatCard label="Index Rate" value={total > 0 ? `${indexedPct}%` : "—"} />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: `${indexedPct}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            {property.indexedCount} of {total} pages indexed
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => syncNow()}
          disabled={isSyncing || isReindexing}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded border transition-colors",
            isSyncing
              ? "opacity-60 cursor-not-allowed border-border text-muted-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
          )}
        >
          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {isSyncing ? "Syncing…" : "Sync Now"}
        </button>

        <button
          type="button"
          onClick={() => reindex()}
          disabled={isReindexing || isSyncing || property.notIndexedCount === 0}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded border transition-colors",
            isReindexing || property.notIndexedCount === 0
              ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
              : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
          )}
        >
          {isReindexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          {isReindexing ? "Submitting…" : `Reindex ${property.notIndexedCount} pages`}
        </button>

        <AlertDialog>
          <AlertDialogTrigger
            disabled={isDisconnecting}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {isDisconnecting ? "Removing…" : "Disconnect"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect property?</AlertDialogTitle>
              <AlertDialogDescription>
                Removes the GSC connection for this property.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="font-mono text-xs break-all text-foreground px-1">{property.siteUrl}</p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnect()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Repo link */}
      <div className="border border-border rounded bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GitFork className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">Linked Repository</span>
        </div>
        <Popover open={repoPickerOpen} onOpenChange={setRepoPickerOpen}>
          <PopoverTrigger
            disabled={isLinking}
            className={cn(
              "w-full flex items-center justify-between gap-2 font-mono text-[11px] bg-background border border-border rounded px-3 py-2 text-left transition-colors disabled:opacity-60",
              repoPickerOpen ? "border-primary/50" : "hover:border-primary/30"
            )}
          >
            <span className={selectedRepoId ? "text-foreground truncate" : "text-muted-foreground"}>
              {selectedRepoId
                ? (repos.find((r) => r.id === selectedRepoId)?.fullName ?? "— none —")
                : "— none —"}
            </span>
            {isLinking
              ? <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
              : <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search repos…" className="font-mono text-xs h-8" />
              <CommandList>
                <CommandEmpty className="font-mono text-xs text-muted-foreground py-3 text-center">
                  No repo found.
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      setSelectedRepoId("");
                      linkRepo(null);
                      setRepoPickerOpen(false);
                    }}
                    className="font-mono text-xs text-muted-foreground"
                  >
                    <Check className={cn("h-3 w-3 mr-2 shrink-0", selectedRepoId === "" ? "opacity-100" : "opacity-0")} />
                    — none —
                  </CommandItem>
                  {repos.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={r.fullName}
                      onSelect={() => {
                        setSelectedRepoId(r.id);
                        linkRepo(r.id);
                        setRepoPickerOpen(false);
                      }}
                      className="font-mono text-xs"
                    >
                      <Check className={cn("h-3 w-3 mr-2 shrink-0", selectedRepoId === r.id ? "opacity-100" : "opacity-0")} />
                      {r.fullName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Not indexed pages — populated after sync */}
      {syncResult && syncResult.notIndexedPages.length > 0 && (
        <div className="border border-border rounded bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              Not Indexed Pages ({syncResult.notIndexedPages.length})
            </span>
          </div>
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {syncResult.notIndexedPages.map(({ url, reason }) => (
              <div
                key={url}
                className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-foreground break-all">{url}</p>
                  {reason && (
                    <p className="font-mono text-[10px] text-red-400/80 mt-0.5">{reason}</p>
                  )}
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncResult && syncResult.notIndexedPages.length === 0 && syncResult.synced > 0 && (
        <div className="border border-green-500/20 rounded bg-green-500/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <p className="font-mono text-[11px] text-green-400">
            All {syncResult.synced} checked pages are indexed.
          </p>
        </div>
      )}

      {!syncResult && isSyncing && (
        <div className="border border-dashed border-border rounded p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="font-mono text-[11px] text-muted-foreground">Fetching indexing data…</p>
        </div>
      )}

      {/* Favicon Health */}
      <div className="border border-border rounded bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">Favicon Health</span>
          </div>
          {isFaviconFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {!isFaviconFetching && faviconData && (
            <span className={cn("font-mono text-[11px]",
              faviconData.errorCount > 0 ? "text-red-400" :
              faviconData.warningCount > 0 ? "text-amber-400" : "text-green-400"
            )}>
              {faviconData.errorCount > 0
                ? `${faviconData.errorCount} error${faviconData.errorCount > 1 ? "s" : ""}`
                : faviconData.warningCount > 0
                  ? `${faviconData.warningCount} warning${faviconData.warningCount > 1 ? "s" : ""}`
                  : "All good"}
            </span>
          )}
        </div>

        {isFaviconError && !isFaviconFetching && (
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] text-red-400">Check failed.</p>
            <button type="button" onClick={() => recheckFavicon()} className="font-mono text-[11px] text-primary hover:underline">Retry</button>
          </div>
        )}

        {faviconData && !isFaviconFetching && (
          faviconData.issues.length === 0
            ? <p className="font-mono text-[11px] text-green-400">No favicon issues found.</p>
            : (
              <div className="space-y-3">
                <ul className="space-y-1.5">
                  {faviconData.issues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2">
                      {issue.status === "Error"
                        ? <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-px" />}
                      <span className="font-mono text-[11px] text-foreground/80">{issue.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-4 flex-wrap">
                  <a
                    href={`https://realfavicongenerator.net/?site=${encodeURIComponent(domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fix with RealFaviconGenerator
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const lines = faviconData.issues.map((i) => `- [${i.status}] ${i.text}`).join("\n");
                      const prompt = `Fix the favicon issues for ${property.siteUrl}.\n\nIssues detected by RealFaviconGenerator:\n${lines}\n\nGenerate and add all missing favicon files and the correct <link> tags in the <head>. Follow best practices: include ICO, PNG (16x16, 32x32, 96x96, 180x180), SVG, and a web manifest if missing.`;
                      navigator.clipboard.writeText(prompt).then(() => { setCopiedFavicon(true); setTimeout(() => setCopiedFavicon(false), 2000); });
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedFavicon ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copiedFavicon ? "Copied!" : "Copy fix prompt"}
                  </button>
                </div>
              </div>
            )
        )}
      </div>

      {/* Social / OG Preview */}
      <div className="border border-border rounded bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">Social / OG Tags</span>
          </div>
          {isOgFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {!isOgFetching && ogData && (
            <span className={cn("font-mono text-[11px]",
              ogData.issues.some((i) => i.severity === "error") ? "text-red-400" :
              ogData.issues.length > 0 ? "text-amber-400" : "text-green-400"
            )}>
              {ogData.issues.filter((i) => i.severity === "error").length > 0
                ? `${ogData.issues.filter((i) => i.severity === "error").length} error${ogData.issues.filter((i) => i.severity === "error").length > 1 ? "s" : ""}`
                : ogData.issues.length > 0
                  ? `${ogData.issues.length} warning${ogData.issues.length > 1 ? "s" : ""}`
                  : "All good"}
            </span>
          )}
        </div>

        {isOgError && !isOgFetching && (
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] text-red-400">Check failed.</p>
            <button type="button" onClick={() => recheckOg()} className="font-mono text-[11px] text-primary hover:underline">Retry</button>
          </div>
        )}

        {ogData && !isOgFetching && (
          <div className="space-y-4">
            {/* Tag table */}
            <div className="grid gap-2">
              {(([
                ["og:title", ogData.tags.ogTitle],
                ["og:description", ogData.tags.ogDescription],
                ["og:image", ogData.tags.ogImage],
                ["og:url", ogData.tags.ogUrl],
                ["twitter:card", ogData.tags.twitterCard],
              ]) as [string, string | null][]).map(([key, val]) => (
                <div key={key} className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-36 pt-px">{key}</span>
                  {val
                    ? <span className="font-mono text-[11px] text-foreground break-all">{val.length > 90 ? `${val.slice(0, 90)}…` : val}</span>
                    : <span className="font-mono text-[11px] text-red-400/70">missing</span>}
                </div>
              ))}
            </div>

            {/* OG image preview card */}
            {ogData.tags.ogImage && (
              <div className="border border-border rounded overflow-hidden max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ogData.tags.ogImage} alt="og:image" className="w-full h-auto object-cover max-h-48" />
                <div className="px-3 py-2 bg-muted/30 space-y-0.5">
                  <p className="font-mono text-[11px] text-foreground truncate">{ogData.tags.ogTitle ?? domain}</p>
                  {ogData.tags.ogDescription && (
                    <p className="font-mono text-[10px] text-muted-foreground truncate">{ogData.tags.ogDescription}</p>
                  )}
                  <p className="font-mono text-[10px] text-muted-foreground/60 truncate">{domain}</p>
                </div>
              </div>
            )}

            {/* Issues + copy prompt */}
            {ogData.issues.length > 0 && (
              <div className="space-y-3">
                <ul className="space-y-1.5">
                  {ogData.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {issue.severity === "error"
                        ? <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-px" />}
                      <span className="font-mono text-[11px] text-foreground/80">{issue.message}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    const lines = ogData.issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.field}: ${i.message}`).join("\n");
                    const tagLines = Object.entries(ogData.tags).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`).join("\n");
                    const prompt = `Fix the Open Graph / social meta tag issues for ${property.siteUrl}.\n\nCurrent tags:\n${tagLines}\n\nIssues:\n${lines}\n\nAdd or fix the missing/incorrect OG and Twitter meta tags in the <head>. Use og:image dimensions of at least 1200x630px. Set twitter:card to 'summary_large_image'.`;
                    navigator.clipboard.writeText(prompt).then(() => { setCopiedOg(true); setTimeout(() => setCopiedOg(false), 2000); });
                  }}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedOg ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  {copiedOg ? "Copied!" : "Copy fix prompt"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "green" | "red";
}) {
  return (
    <div className="border border-border rounded bg-card/40 p-3 space-y-1">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={cn(
        "font-mono text-xl font-medium",
        accent === "green" && "text-green-400",
        accent === "red" && "text-red-400",
        !accent && "text-foreground"
      )}>
        {value}
      </p>
    </div>
  );
}
