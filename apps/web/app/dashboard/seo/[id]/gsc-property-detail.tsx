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
  GitPullRequest,
  CheckCheck,
  ChevronLeft,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";

interface GscPropertyData {
  id: string;
  siteUrl: string;
  repoId: string | null;
  repo: { id: string; fullName: string } | null;
  indexedCount: number;
  notIndexedCount: number;
  lastSyncAt: string | null;
  createdAt: string;
  cachedNotIndexedPages: Array<{ url: string; reason?: string }> | null;
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
  noSitemap?: boolean;
}

export function GscPropertyDetail({
  property: initialProperty,
  repos,
  backHref,
}: {
  property: GscPropertyData;
  repos: Repo[];
  backHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [property, setProperty] = useState(initialProperty);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(() => {
    const cached = initialProperty.cachedNotIndexedPages;
    if (!cached) return null;
    return {
      synced: initialProperty.indexedCount + cached.length,
      indexed: initialProperty.indexedCount,
      notIndexed: cached.length,
      notIndexedPages: cached,
    };
  });
  const [selectedRepoId, setSelectedRepoId] = useState(
    initialProperty.repoId ?? "",
  );
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [activeReasonTab, setActiveReasonTab] = useState<string>("all");

  const domain = (() => {
    if (property.siteUrl.startsWith("sc-domain:"))
      return property.siteUrl.replace("sc-domain:", "");
    try {
      return new URL(property.siteUrl).hostname;
    } catch {
      return property.siteUrl;
    }
  })();

  const total = property.indexedCount + property.notIndexedCount;
  const indexedPct =
    total > 0 ? Math.round((property.indexedCount / total) * 100) : 0;

  const {
    data: faviconData,
    isFetching: isFaviconFetching,
    isError: isFaviconError,
    refetch: recheckFavicon,
  } = useQuery<{
    issues: { status: "Error" | "Warning"; id: number; text: string }[];
    errorCount: number;
    warningCount: number;
  }>({
    queryKey: ["favicon-check", domain],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/gsc/favicon-check?domain=${encodeURIComponent(domain)}`,
      );
      if (!data.success) throw new Error(data.error ?? "Favicon check failed");
      return data.data;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const {
    data: ogData,
    isFetching: isOgFetching,
    isError: isOgError,
    refetch: recheckOg,
  } = useQuery<{
    tags: Record<string, string | null>;
    issues: { severity: "error" | "warning"; field: string; message: string }[];
  }>({
    queryKey: ["og-check", domain],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/gsc/og-check?domain=${encodeURIComponent(domain)}`,
      );
      if (!data.success) throw new Error(data.error ?? "OG check failed");
      return data.data;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [copiedHealth, setCopiedHealth] = useState(false);
  const [copiedIndexing, setCopiedIndexing] = useState(false);
  const [healthIssueUrl, setHealthIssueUrl] = useState<string | null>(null);
  const [indexingIssueUrl, setIndexingIssueUrl] = useState<string | null>(null);

  function buildFaviconSection() {
    if (!faviconData || faviconData.issues.length === 0) return null;
    const lines = faviconData.issues
      .map((i) => `- [${i.status}] ${i.text}`)
      .join("\n");
    return `## Favicon\n\nIssues detected by RealFaviconGenerator:\n${lines}\n\nGenerate and add all missing favicon files and correct <link> tags in <head>. Include ICO, PNG (16×16, 32×32, 96×96, 180×180), SVG, and web manifest.`;
  }

  function buildOgSection() {
    if (!ogData || ogData.issues.length === 0) return null;
    const lines = ogData.issues
      .map((i) => `- [${i.severity.toUpperCase()}] ${i.field}: ${i.message}`)
      .join("\n");
    const tagLines = Object.entries(ogData.tags)
      .filter(([, v]) => v)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n");
    return `## Open Graph / Social Tags\n\nCurrent tags:\n${tagLines}\n\nIssues:\n${lines}\n\nAdd or fix missing/incorrect OG and Twitter meta tags in <head>. Use og:image at least 1200×630px. Set twitter:card to 'summary_large_image'.`;
  }

  function buildHealthPrompt() {
    const parts = [buildFaviconSection(), buildOgSection()].filter(Boolean);
    if (parts.length === 0) return null;
    return `Fix SEO health issues for ${property.siteUrl}\n\n${parts.join("\n\n")}`;
  }

  const hasHealthIssues =
    (faviconData?.issues.length ?? 0) > 0 || (ogData?.issues.length ?? 0) > 0;

  const { mutate: createHealthIssue, isPending: isCreatingHealthIssue } =
    useMutation({
      mutationFn: async () => {
        const description = buildHealthPrompt();
        if (!description) throw new Error("No issues");
        if (!selectedRepoId) throw new Error("No repo linked");
        const form = new FormData();
        form.append("repoId", selectedRepoId);
        form.append("description", description);
        const { data } = await axios.post("/api/v1/reports", form);
        if (!data.success)
          throw new Error(data.error ?? "Failed to create issue");
        return data.data as { issueUrl?: string; issueNumber?: number };
      },
      onSuccess: (result) => {
        if (result.issueUrl) {
          setHealthIssueUrl(result.issueUrl);
          toast.success("GitHub issue created");
        } else {
          toast.success("Report submitted");
        }
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to create issue",
        ),
    });

  const { mutate: createIndexingIssue, isPending: isCreatingIndexingIssue } =
    useMutation({
      mutationFn: async () => {
        if (!syncResult || syncResult.notIndexedPages.length === 0)
          throw new Error("No not-indexed pages");
        if (!selectedRepoId) throw new Error("No repo linked");
        const grouped = syncResult.notIndexedPages.reduce<
          Record<string, string[]>
        >((acc, p) => {
          const key = p.reason ?? "Unknown";
          (acc[key] ??= []).push(p.url);
          return acc;
        }, {});
        const lines = Object.entries(grouped)
          .map(
            ([reason, urls]) =>
              `### ${reason} (${urls.length})\n${urls.map((u) => `- ${u}`).join("\n")}`,
          )
          .join("\n\n");
        const description = `Fix indexing issues for ${property.siteUrl}\n\n${syncResult.notIndexedPages.length} pages are not indexed by Google.\n\n${lines}\n\nInvestigate and fix each category. For redirects: check permanent vs temporary redirects and update them. For unknown URLs: ensure pages are accessible and add to sitemap. For canonical issues: verify canonical tags point to the correct URL.`;
        const form = new FormData();
        form.append("repoId", selectedRepoId);
        form.append("description", description);
        const { data } = await axios.post("/api/v1/reports", form);
        if (!data.success)
          throw new Error(data.error ?? "Failed to create issue");
        return data.data as { issueUrl?: string };
      },
      onSuccess: (result) => {
        if (result.issueUrl) {
          setIndexingIssueUrl(result.issueUrl);
          toast.success("GitHub issue created");
        } else {
          toast.success("Report submitted");
        }
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to create issue",
        ),
    });

  const { mutate: syncNow, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `/api/v1/gsc/properties/${property.id}/sync`,
      );
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
      toast.success(
        `Synced ${result.synced} URLs — ${result.indexed} indexed, ${result.notIndexed} not indexed`,
      );
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Sync failed"),
  });

  const { mutate: reindex, isPending: isReindexing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/gsc/reindex", {
        propertyId: property.id,
      });
      if (!data.success) throw new Error(data.error ?? "Reindex failed");
      return data.data as { submitted: number };
    },
    onSuccess: (result) =>
      toast.success(`Submitted ${result.submitted} URLs for re-indexing`),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Reindex failed"),
  });

  const { mutate: checkFix, isPending: isCheckingFix } = useMutation({
    mutationFn: async (urls: string[]) => {
      const { data } = await axios.post(
        `/api/v1/gsc/properties/${property.id}/check-fix`,
        { urls },
      );
      if (!data.success) throw new Error(data.error ?? "Check failed");
      return data.data as {
        nowIndexedCount: number;
        stillNotIndexedCount: number;
        nowIndexed: string[];
        stillNotIndexed: Array<{ url: string; reason?: string }>;
      };
    },
    onSuccess: (result) => {
      if (result.nowIndexedCount > 0) {
        toast.success(
          `${result.nowIndexedCount} page${result.nowIndexedCount > 1 ? "s" : ""} now indexed!`,
        );
        // Remove newly-indexed URLs from local state
        setSyncResult((prev) => {
          if (!prev) return prev;
          const nowIndexedSet = new Set(result.nowIndexed);
          const updatedPages = prev.notIndexedPages.filter(
            (p) => !nowIndexedSet.has(p.url),
          );
          return {
            ...prev,
            indexed: prev.indexed + result.nowIndexedCount,
            notIndexed: updatedPages.length,
            notIndexedPages: updatedPages,
          };
        });
        setProperty((p) => ({
          ...p,
          indexedCount: p.indexedCount + result.nowIndexedCount,
          notIndexedCount: result.stillNotIndexedCount,
        }));
        queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
      } else {
        toast.info(
          `All ${result.stillNotIndexedCount} checked pages still not indexed`,
        );
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Check failed"),
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.delete(
        `/api/v1/gsc/properties/${property.id}`,
      );
      if (!data.success) throw new Error(data.error ?? "Failed to disconnect");
    },
    onSuccess: () => {
      toast.success("Property disconnected");
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
      router.push("/dashboard/seo");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Disconnect failed"),
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
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  // First-time sync: if never synced before, auto-run on mount
  useEffect(() => {
    if (!initialProperty.lastSyncAt) syncNow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const repoAction = (
    <div className="flex items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          disabled={isDisconnecting}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          {isDisconnecting ? "Removing…" : "Disconnect"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect property?</AlertDialogTitle>
            <AlertDialogDescription>Removes the GSC connection for this property.</AlertDialogDescription>
          </AlertDialogHeader>
          <p className="font-mono text-xs break-all text-foreground px-1">{property.siteUrl}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => disconnect()} className="bg-red-600 hover:bg-red-700 text-white">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Popover open={repoPickerOpen} onOpenChange={setRepoPickerOpen}>
      <PopoverTrigger
        disabled={isLinking}
        className={cn(
          "flex items-center gap-2 font-mono text-[11px] bg-background border border-border rounded px-3 py-1.5 text-left transition-colors disabled:opacity-60 max-w-50",
          repoPickerOpen ? "border-primary/50" : "hover:border-primary/30"
        )}
      >
        <GitFork className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className={cn("truncate", selectedRepoId ? "text-foreground" : "text-muted-foreground")}>
          {selectedRepoId ? (repos.find((r) => r.id === selectedRepoId)?.fullName ?? "link repo") : "link repo"}
        </span>
        {isLinking
          ? <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
          : <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search repos…" className="font-mono text-xs h-8" />
          <CommandList>
            <CommandEmpty className="font-mono text-xs text-muted-foreground py-3 text-center">No repo found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { setSelectedRepoId(""); linkRepo(null); setRepoPickerOpen(false); }} className="font-mono text-xs text-muted-foreground">
                <Check className={cn("h-3 w-3 mr-2 shrink-0", selectedRepoId === "" ? "opacity-100" : "opacity-0")} />
                — none —
              </CommandItem>
              {repos.map((r) => (
                <CommandItem key={r.id} value={r.fullName} onSelect={() => { setSelectedRepoId(r.id); linkRepo(r.id); setRepoPickerOpen(false); }} className="font-mono text-xs">
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
  );

  return (
    <div className="space-y-6">

      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
      >
        <ChevronLeft className="h-3 w-3" />
        SEO
      </Link>

      <InnerPageHeader
        title={property.siteUrl}
        subtitle="Google Search Console property"
        meta={
          property.lastSyncAt
            ? `last synced ${new Date(property.lastSyncAt).toLocaleDateString()}`
            : "never synced"
        }
        action={repoAction}
      />

      {/* ── Stats + action cards ── */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Indexed" value={property.indexedCount} accent="green" />
          <StatCard label="Not Indexed" value={property.notIndexedCount} accent="red" />
          <StatCard label="Total Checked" value={total} />
          <StatCard label="Index Rate" value={total > 0 ? `${indexedPct}%` : "—"} />
        </div>

        {total > 0 && (
          <div className="space-y-1">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${indexedPct}%` }} />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">{property.indexedCount} of {total} pages indexed</p>
          </div>
        )}

      </div>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start min-w-0">
        {/* LEFT — Indexing data */}
        <div className="space-y-4 min-w-0">
          {isSyncing && !syncResult && (
            <div className="border border-border rounded bg-card/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="p-4 space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}

          {syncResult &&
            syncResult.notIndexedPages.length === 0 &&
            syncResult.synced > 0 && (
              <div className="border border-green-500/20 rounded bg-green-500/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <p className="font-mono text-[11px] text-green-400">
                  All {syncResult.synced} checked pages are indexed.
                </p>
              </div>
            )}

          {syncResult &&
            syncResult.notIndexedPages.length > 0 &&
            (() => {
              const reasonGroups = syncResult.notIndexedPages.reduce<
                Record<string, typeof syncResult.notIndexedPages>
              >((acc, page) => {
                const key = page.reason ?? "Unknown";
                (acc[key] ??= []).push(page);
                return acc;
              }, {});
              const tabs = ["all", ...Object.keys(reasonGroups)];
              const visiblePages =
                activeReasonTab === "all"
                  ? syncResult.notIndexedPages
                  : (reasonGroups[activeReasonTab] ?? []);

              return (
                <div className="border border-border rounded bg-card/40 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
                    <div className="flex items-center gap-2 shrink-0">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                        Not Indexed — {syncResult.notIndexedPages.length} pages
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => syncNow()}
                        disabled={isSyncing || isReindexing}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {isSyncing ? "Syncing…" : "Sync Now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => reindex()}
                        disabled={isReindexing || isSyncing || property.notIndexedCount === 0}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isReindexing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                        {isReindexing ? "Submitting…" : `Reindex ${property.notIndexedCount}`}
                      </button>
                      <span className="w-px h-3 bg-border/60 shrink-0" />
                      <button
                        type="button"
                        onClick={() => checkFix(visiblePages.map((p) => p.url))}
                        disabled={isCheckingFix || visiblePages.length === 0}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isCheckingFix ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3 w-3" />
                        )}
                        {isCheckingFix ? "Checking…" : "Check Fix"}
                      </button>
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={() => {
                            const grouped = syncResult.notIndexedPages.reduce<Record<string, string[]>>((acc, p) => {
                              const key = p.reason ?? "Unknown";
                              (acc[key] ??= []).push(p.url);
                              return acc;
                            }, {});
                            const lines = Object.entries(grouped).map(([reason, urls]) => `### ${reason} (${urls.length})\n${urls.map((u) => `- ${u}`).join("\n")}`).join("\n\n");
                            const prompt = `Fix indexing issues for ${property.siteUrl}.\n\n${syncResult.notIndexedPages.length} pages are not indexed by Google:\n\n${lines}\n\nInvestigate and fix each category. For redirects: update to permanent 301s or fix the redirect chain. For unknown URLs: ensure pages are accessible and add to sitemap. For canonical issues: verify canonical tags point to the correct URL.`;
                            navigator.clipboard.writeText(prompt).then(() => { setCopiedIndexing(true); setTimeout(() => setCopiedIndexing(false), 2000); toast.success("Copied to clipboard"); });
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedIndexing ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </TooltipTrigger>
                        <TooltipContent>Copy fix prompt</TooltipContent>
                      </Tooltip>
                      {indexingIssueUrl ? (
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            onClick={() => window.open(indexingIssueUrl, "_blank", "noopener,noreferrer")}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                          >
                            <GitPullRequest className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>View GitHub issue</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            onClick={() => createIndexingIssue()}
                            disabled={!selectedRepoId || isCreatingIndexingIssue}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isCreatingIndexingIssue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitPullRequest className="h-3.5 w-3.5" />}
                          </TooltipTrigger>
                          <TooltipContent>{!selectedRepoId ? "Link a repo first" : "Create GitHub issue"}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  {/* Reason tabs */}
                  {tabs.length > 2 && (
                    <div className="flex gap-0 border-b border-border/60 overflow-x-auto">
                      {tabs.map((tab) => {
                        const count =
                          tab === "all"
                            ? syncResult.notIndexedPages.length
                            : (reasonGroups[tab]?.length ?? 0);
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveReasonTab(tab)}
                            className={cn(
                              "shrink-0 px-3 py-2 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap",
                              activeReasonTab === tab
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {tab === "all" ? "All" : tab} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="divide-y divide-border/40">
                    {visiblePages.map(({ url, reason }) => (
                      <div
                        key={url}
                        className="flex items-start justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-foreground break-all">
                            {url}
                          </p>
                          {reason && activeReasonTab === "all" && (
                            <p className="font-mono text-[10px] text-red-400/80 mt-0.5">
                              {reason}
                            </p>
                          )}
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          {syncResult?.noSitemap && (
            <div className="border border-amber-500/20 rounded bg-amber-500/5 p-5 space-y-2">
              <p className="font-mono text-[11px] text-amber-400 font-medium">
                No sitemap registered in Google Search Console
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                Submit your sitemap URL to GSC so we can check indexing status.
              </p>
              <a
                href={`https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(property.siteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400 hover:underline pt-1"
              >
                <ExternalLink className="h-3 w-3" />
                Add sitemap in GSC
              </a>
            </div>
          )}

          {!syncResult && !isSyncing && (
            <div className="border border-dashed border-border rounded p-8 text-center">
              <p className="font-mono text-[11px] text-muted-foreground">
                Run <span className="text-foreground">Sync Now</span> to see
                not-indexed pages
              </p>
            </div>
          )}

        </div>

        {/* RIGHT — Health */}
        <div className="space-y-4">

          {/* SEO Health — combined Favicon + Social/OG */}
          <div className="border border-border rounded bg-card/40 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <ScanSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest truncate">
                  SEO Health
                </span>
              </div>
              <div className="flex items-center gap-1">
                {(isFaviconFetching || isOgFetching) && (
                  <Skeleton className="h-3 w-14" />
                )}
                {hasHealthIssues && (
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        onClick={() => {
                          const prompt = buildHealthPrompt();
                          if (!prompt) return;
                          navigator.clipboard.writeText(prompt).then(() => {
                            setCopiedHealth(true);
                            setTimeout(() => setCopiedHealth(false), 2000);
                            toast.success("Copied to clipboard");
                          });
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedHealth ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Copy fix prompt</TooltipContent>
                    </Tooltip>
                    {healthIssueUrl ? (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={() => window.open(healthIssueUrl, "_blank", "noopener,noreferrer")}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <GitPullRequest className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View GitHub issue</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={() => createHealthIssue()}
                          disabled={!selectedRepoId || isCreatingHealthIssue}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isCreatingHealthIssue ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <GitPullRequest className="h-3.5 w-3.5" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {!selectedRepoId ? "Link a repo first" : "Create GitHub issue"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Favicon subsection */}
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <ScanSearch className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                <span className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest">
                  Favicon
                </span>
              </div>
              <div className="mb-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage({
                      src: `/api/v1/gsc/favicon?domain=${encodeURIComponent(domain)}&size=128`,
                      alt: `${domain} favicon`,
                      title: "Favicon preview",
                    })
                  }
                  className="border border-border rounded p-2 bg-muted/10 hover:bg-muted/30 transition cursor-zoom-in"
                  aria-label="Preview favicon"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/gsc/favicon?domain=${encodeURIComponent(domain)}&size=64`}
                    alt={`${domain} favicon`}
                    className="h-8 w-8 object-contain"
                  />
                </button>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  Click to preview
                </span>
              </div>
              {isFaviconError && !isFaviconFetching && (
                <RetryRow onRetry={recheckFavicon} />
              )}
              {isFaviconFetching && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-3.5 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                </div>
              )}
              {faviconData &&
                !isFaviconFetching &&
                (faviconData.issues.length === 0 ? (
                  <p className="font-mono text-[11px] text-green-400">
                    No issues found.
                  </p>
                ) : (
                  <IssueList
                    issues={faviconData.issues.map((i) => ({
                      severity:
                        i.status === "Error"
                          ? ("error" as const)
                          : ("warning" as const),
                      message: i.text,
                    }))}
                  />
                ))}
            </div>

            {/* Social / OG subsection */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                <span className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest">
                  Social / OG Tags
                </span>
              </div>
              {isOgError && !isOgFetching && <RetryRow onRetry={recheckOg} />}
              {isOgFetching && (
                <div className="space-y-4">
                  <Skeleton className="h-36 w-full rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              )}
              {ogData && !isOgFetching && (
                <div className="space-y-4">
                  {/* OG image preview */}
                  {ogData.tags.ogImage && (
                    <div className="border border-border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            src: ogData.tags.ogImage!,
                            alt: "og:image",
                            title: "Social preview (og:image)",
                          })
                        }
                        className="block w-full cursor-zoom-in"
                        aria-label="Preview social image"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ogData.tags.ogImage}
                          alt="og:image"
                          className="w-full object-cover max-h-36"
                        />
                      </button>
                      <div className="px-3 py-2 bg-muted/20 space-y-0.5">
                        <p className="font-mono text-[11px] text-foreground truncate">
                          {ogData.tags.ogTitle ?? domain}
                        </p>
                        {ogData.tags.ogDescription && (
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            {ogData.tags.ogDescription}
                          </p>
                        )}
                        <p className="font-mono text-[10px] text-muted-foreground/50">
                          {domain}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tag rows */}
                  <div className="space-y-1.5">
                    {(
                      [
                        ["og:title", ogData.tags.ogTitle],
                        ["og:description", ogData.tags.ogDescription],
                        ["og:image", ogData.tags.ogImage],
                        ["og:url", ogData.tags.ogUrl],
                        ["twitter:card", ogData.tags.twitterCard],
                      ] as [string, string | null][]
                    ).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-28 pt-px">
                          {key}
                        </span>
                        {val ? (
                          <span className="font-mono text-[11px] text-foreground break-all leading-relaxed">
                            {val.length > 60 ? `${val.slice(0, 60)}…` : val}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-red-400/70">
                            missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {ogData.issues.length > 0 && (
                    <div className="pt-1 border-t border-border/40">
                      <IssueList
                        issues={ogData.issues.map((i) => ({
                          severity: i.severity,
                          message: i.message,
                        }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs">
              {previewImage?.title}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full bg-muted/20 rounded border border-border flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>
              <a
                href={previewImage.src}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground break-all"
              >
                {previewImage.src}
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RetryRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-mono text-[11px] text-red-400">Check failed.</p>
      <button
        type="button"
        onClick={onRetry}
        className="font-mono text-[11px] text-primary hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

function IssueList({
  issues,
}: {
  issues: { severity: "error" | "warning"; message: string }[];
}) {
  return (
    <ul className="space-y-1.5">
      {issues.map((issue, i) => (
        <li key={i} className="flex items-start gap-2">
          {issue.severity === "error" ? (
            <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-px" />
          )}
          <span className="font-mono text-[11px] text-foreground/80">
            {issue.message}
          </span>
        </li>
      ))}
    </ul>
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
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-xl font-medium",
          accent === "green" && "text-green-400",
          accent === "red" && "text-red-400",
          !accent && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
