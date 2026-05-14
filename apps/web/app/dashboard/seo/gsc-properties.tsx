"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import {
  Globe,
  Loader2,
  RefreshCw,
  UploadCloud,
  GitFork,
  Clock,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronsUpDown,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  ScanSearch,
  ChevronDown,
  ChevronUp,
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

interface GscPropertyWithStats {
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

interface GscPropertiesClientProps {
  initialProperties: GscPropertyWithStats[];
  repos: Repo[];
}

export function GscPropertiesClient({
  initialProperties,
  repos,
}: GscPropertiesClientProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: properties } = useQuery<GscPropertyWithStats[]>({
    queryKey: ["gsc-properties"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/gsc/properties");
      if (!data.success) throw new Error(data.error ?? "Failed to load properties");
      return data.data;
    },
    initialData: initialProperties,
    staleTime: 30_000,
  });

  const { mutate: bulkDelete, isPending: isBulkDeleting } = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          axios.delete(`/api/v1/gsc/properties/${id}`).then(({ data }) => {
            if (!data.success) throw new Error(data.error ?? `Failed to disconnect ${id}`);
          })
        )
      );
    },
    onSuccess: () => {
      const count = selectedIds.size;
      toast.success(`${count} ${count === 1 ? "property" : "properties"} disconnected`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Bulk disconnect failed");
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!properties) return;
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map((p) => p.id)));
    }
  };

  if (!properties || properties.length === 0) {
    return (
      <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-sm text-foreground mb-2">no properties connected</h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-6">
          Connect your Google Search Console account to monitor indexing status and submit
          pages for re-crawling directly from Glitchgrab.
        </p>
        <ConnectButtons />
      </div>
    );
  }

  const allSelected = properties.length > 0 && selectedIds.size === properties.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedProperties = properties.filter((p) => selectedIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "select all"}
          </span>
        </label>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger
                disabled={isBulkDeleting}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                {isBulkDeleting ? "Removing…" : `Disconnect ${selectedIds.size}`}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disconnect {selectedIds.size} {selectedIds.size === 1 ? "property" : "properties"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes the GSC connection and all synced data for the selected properties.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <ul className="space-y-1 max-h-40 overflow-y-auto px-1">
                  {selectedProperties.map((p) => (
                    <li key={p.id} className="font-mono text-xs text-foreground break-all py-0.5">
                      {p.siteUrl}
                    </li>
                  ))}
                </ul>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkDelete(Array.from(selectedIds))}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Disconnect All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ConnectButtons />
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {properties.map((property) => (
          <PropertyRow
            key={property.id}
            property={property}
            repos={repos}
            selected={selectedIds.has(property.id)}
            onToggleSelect={() => toggleSelect(property.id)}
            onMutated={() => {
              queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
              setSelectedIds((prev) => { const next = new Set(prev); next.delete(property.id); return next; });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ConnectButtons() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  async function copyLink() {
    setCopying(true);
    try {
      const { data } = await axios.get("/api/v1/gsc/auth/link");
      if (!data.success) throw new Error(data.error ?? "Failed to get link");
      await navigator.clipboard.writeText(data.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-4 py-2 rounded hover:bg-primary/20 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Connect New Property
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-sm mx-4 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-mono text-sm text-foreground uppercase tracking-widest mb-1">
                Connect Google Account
              </h3>
              <p className="text-xs text-muted-foreground">
                GSC properties from that account will appear in your workspace.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { window.location.href = "/api/v1/gsc/auth"; }}
                className="w-full flex items-start gap-3 border border-border hover:border-primary/40 rounded-md p-3 text-left transition-colors group"
              >
                <Globe className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-[11px] text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                    Connect here
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Opens Google sign-in in this browser. Pick any account.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={copyLink}
                disabled={copying}
                className="w-full flex items-start gap-3 border border-border hover:border-primary/40 rounded-md p-3 text-left transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {copying
                  ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 animate-spin" />
                  : copied
                  ? <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  : <Copy className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                }
                <div>
                  <div className="font-mono text-[11px] text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                    {copying ? "Generating…" : copied ? "Link copied!" : "Copy link"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Paste in incognito or a different browser. Valid 10 min.
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface PropertyRowProps {
  property: GscPropertyWithStats;
  repos: Repo[];
  selected: boolean;
  onToggleSelect: () => void;
  onMutated: () => void;
}

interface FaviconIssue {
  status: "Error" | "Warning";
  id: number;
  text: string;
}

interface FaviconCheckData {
  pageTitle: string;
  currentFavicon: string | null;
  issues: FaviconIssue[];
  errorCount: number;
  warningCount: number;
}

function PropertyRow({ property, repos, selected, onToggleSelect, onMutated }: PropertyRowProps) {
  const [selectedRepoId, setSelectedRepoId] = useState(property.repoId ?? "");
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [faviconOpen, setFaviconOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const domain = getSiteDomain(property.siteUrl);

  const {
    data: faviconData,
    isFetching: isFaviconFetching,
    isError: isFaviconError,
    refetch: checkFavicon,
  } = useQuery<FaviconCheckData>({
    queryKey: ["favicon-check", domain],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/gsc/favicon-check?domain=${encodeURIComponent(domain)}`);
      if (!data.success) throw new Error(data.error ?? "Favicon check failed");
      return data.data;
    },
    enabled: false,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { mutate: syncNow, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/gsc/properties/${property.id}/sync`);
      if (!data.success) throw new Error(data.error ?? "Sync failed");
      return data.data as { synced: number; indexed: number; notIndexed: number };
    },
    onSuccess: (result) => {
      toast.success(`Synced ${result.synced} URLs — ${result.indexed} indexed, ${result.notIndexed} not indexed`);
      onMutated();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    },
  });

  const { mutate: reindex, isPending: isReindexing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/gsc/reindex", { propertyId: property.id });
      if (!data.success) throw new Error(data.error ?? "Reindex failed");
      return data.data as { submitted: number };
    },
    onSuccess: (result) => {
      toast.success(`Submitted ${result.submitted} URLs for re-indexing`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Reindex request failed");
    },
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.delete(`/api/v1/gsc/properties/${property.id}`);
      if (!data.success) throw new Error(data.error ?? "Failed to disconnect");
    },
    onSuccess: () => {
      toast.success("Property disconnected");
      onMutated();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    },
  });

  const { mutate: linkRepo, isPending: isLinking } = useMutation({
    mutationFn: async (repoId: string | null) => {
      const { data } = await axios.patch("/api/v1/gsc/properties", {
        propertyId: property.id,
        repoId,
      });
      if (!data.success) throw new Error(data.error ?? "Failed to update");
      return data;
    },
    onSuccess: () => {
      toast.success("Property updated");
      onMutated();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed");
    },
  });

  const lastSync = property.lastSyncAt
    ? formatRelative(new Date(property.lastSyncAt))
    : "never synced";

  const total = property.indexedCount + property.notIndexedCount;
  const indexedPct = total > 0 ? Math.round((property.indexedCount / total) * 100) : 0;

  return (
    <div className={cn(
      "relative border rounded bg-card/40 p-4 space-y-4 transition-colors",
      selected ? "border-primary/50 bg-primary/5" : "border-border"
    )}>
      <div className="absolute inset-y-3 left-[2px] w-[2px] rounded-r bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="h-3.5 w-3.5 shrink-0 rounded accent-primary cursor-pointer"
            />
            <SiteFavicon siteUrl={property.siteUrl} />
            <Link
              href={`/dashboard/seo/${property.id}`}
              className="font-mono text-sm text-foreground truncate hover:text-primary transition-colors"
            >
              {property.siteUrl}
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-muted-foreground flex-wrap">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{lastSync}</span>
            {total > 0 && (
              <>
                <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                <span>{total} pages checked</span>
                <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                <span>{indexedPct}% indexed</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing || isReindexing}
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-colors",
              isSyncing
                ? "opacity-60 cursor-not-allowed border-border text-muted-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isSyncing ? "Syncing…" : "Sync Now"}
          </button>

          <button
            type="button"
            onClick={() => reindex()}
            disabled={isReindexing || isSyncing || property.notIndexedCount === 0}
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-colors",
              isReindexing || property.notIndexedCount === 0
                ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            )}
          >
            {isReindexing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <UploadCloud className="h-3 w-3" />
            )}
            {isReindexing ? "Submitting…" : "Reindex Not Indexed"}
          </button>

          <AlertDialog>
            <AlertDialogTrigger
              disabled={isDisconnecting}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {isDisconnecting ? "Removing…" : "Disconnect"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect property?</AlertDialogTitle>
                <AlertDialogDescription>
                  Removes the GSC connection and all synced data for this property.
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
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
            <span className="font-mono text-[11px] text-green-400">{property.indexedCount} indexed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
            <span className="font-mono text-[11px] text-red-400">{property.notIndexedCount} not indexed</span>
          </div>
        </div>
      )}

      {/* Repo link */}
      <div className="flex items-center gap-3 pt-1 border-t border-border/40">
        <GitFork className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-[11px] text-muted-foreground shrink-0">Linked repo:</span>
        <Popover open={repoPickerOpen} onOpenChange={setRepoPickerOpen}>
          <PopoverTrigger
            disabled={isLinking}
            className={cn(
              "flex-1 flex items-center justify-between gap-2 font-mono text-[11px] bg-background border border-border rounded px-2 py-1 text-left transition-colors disabled:opacity-60",
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
          <PopoverContent className="w-72 p-0" align="start">
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

      {/* Favicon check */}
      <div className="border-t border-border/40 pt-2">
        <button
          type="button"
          onClick={() => {
            if (!faviconOpen) {
              setFaviconOpen(true);
              if (!faviconData) checkFavicon();
            } else {
              setFaviconOpen(false);
            }
          }}
          className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          <ScanSearch className="h-3.5 w-3.5 shrink-0" />
          <span>Favicon health</span>
          {faviconData && faviconData.errorCount === 0 && faviconData.warningCount === 0 && (
            <span className="ml-1 text-green-400">— ok</span>
          )}
          {faviconData && (faviconData.errorCount > 0 || faviconData.warningCount > 0) && (
            <span className="ml-1 text-red-400">
              {faviconData.errorCount > 0 ? `${faviconData.errorCount} error${faviconData.errorCount > 1 ? "s" : ""}` : ""}
              {faviconData.errorCount > 0 && faviconData.warningCount > 0 ? ", " : ""}
              {faviconData.warningCount > 0 ? `${faviconData.warningCount} warning${faviconData.warningCount > 1 ? "s" : ""}` : ""}
            </span>
          )}
          <span className="ml-auto">
            {isFaviconFetching
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : faviconOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            }
          </span>
        </button>

        {faviconOpen && (
          <div className="mt-2 space-y-2">
            {isFaviconFetching && (
              <p className="font-mono text-[11px] text-muted-foreground">Checking favicon…</p>
            )}

            {isFaviconError && !isFaviconFetching && (
              <div className="flex items-center gap-2">
                <p className="font-mono text-[11px] text-red-400">Check failed.</p>
                <button
                  type="button"
                  onClick={() => checkFavicon()}
                  className="font-mono text-[11px] text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {faviconData && !isFaviconFetching && (
              <>
                {faviconData.issues.length === 0 ? (
                  <p className="font-mono text-[11px] text-green-400">No issues found.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {faviconData.issues.map((issue) => (
                      <li key={issue.id} className="flex items-start gap-2">
                        {issue.status === "Error"
                          ? <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-px" />
                        }
                        <span className="font-mono text-[11px] text-foreground/80">{issue.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {faviconData.issues.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap pt-0.5">
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
                        const issueLines = faviconData.issues
                          .map((i) => `- [${i.status}] ${i.text}`)
                          .join("\n");
                        const prompt = `Fix the favicon issues for ${property.siteUrl}.\n\nIssues detected by RealFaviconGenerator:\n${issueLines}\n\nGenerate and add all missing favicon files and the correct <link> tags in the <head>. Follow best practices: include ICO, PNG (16x16, 32x32, 96x96, 180x180), SVG, and a web manifest if missing.`;
                        navigator.clipboard.writeText(prompt).then(() => {
                          setCopiedPrompt(true);
                          setTimeout(() => setCopiedPrompt(false), 2000);
                        });
                      }}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedPrompt
                        ? <Check className="h-3 w-3 text-green-400" />
                        : <Copy className="h-3 w-3" />}
                      {copiedPrompt ? "Copied!" : "Copy fix prompt"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getSiteDomain(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) return siteUrl.replace("sc-domain:", "");
  try { return new URL(siteUrl).hostname; } catch { return siteUrl; }
}

function SiteFavicon({ siteUrl, className }: { siteUrl: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = getSiteDomain(siteUrl);
  if (failed) return <Globe className={className ?? "h-4 w-4 text-primary shrink-0"} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      width={16}
      height={16}
      className="shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
