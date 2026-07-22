"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, SkipForward, Loader2, ExternalLink, LogOut, Pencil } from "lucide-react";
import type { QaCheckView } from "@/lib/qa-view";

export function QaClient({
  token,
  testerName,
  testerEmail = null,
  testerPhone = null,
  orgName,
  checks,
  showLogout = false,
}: {
  token?: string;
  testerName: string;
  testerEmail?: string | null;
  testerPhone?: string | null;
  orgName: string;
  checks: QaCheckView[];
  showLogout?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [failingId, setFailingId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");
  const [failScreenshot, setFailScreenshot] = useState<string | null>(null);
  // Optimistically hidden from "To verify" the instant a Pass/Fail/Skip is clicked,
  // put back if the request fails — the row shouldn't wait on GitHub/S3/WhatsApp round-trips.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: async ({
      checkId,
      result,
      reason,
      screenshot,
    }: {
      checkId: string;
      result: "PASS" | "FAIL" | "SKIP";
      reason?: string;
      screenshot?: string;
    }) => {
      const { data } = await axios.post(`/api/v1/qa/checks/${checkId}`, { result, reason, screenshot, token });
      return data;
    },
    onMutate: ({ checkId }) => {
      setPendingId(checkId);
      setHiddenIds((prev) => new Set(prev).add(checkId));
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.result === "PASS"
          ? "Marked as passed"
          : vars.result === "FAIL"
          ? "Marked as failed — developer notified"
          : "Skipped"
      );
      setFailingId(null);
      setFailReason("");
      setFailScreenshot(null);
      router.refresh();
    },
    onError: (err, vars) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Something went wrong";
      toast.error(msg ?? "Something went wrong");
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(vars.checkId);
        return next;
      });
    },
    onSettled: () => setPendingId(null),
  });

  const logout = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/logout"),
    onSuccess: () => router.refresh(),
  });

  // Silent extension auto-login (#297) — no token paste. Fires once per page
  // load, for BOTH entry points: the magic-link page (token prop) and the
  // OTP-session login (no token — the API falls back to the gg_tester
  // cookie). The extension's content script picks up the postMessage if it's
  // installed, and does nothing (harmlessly) if it isn't.
  useEffect(() => {
    let cancelled = false;
    axios
      .post("/api/v1/qa/extension-auth", token ? { token } : {})
      .then(({ data }) => {
        if (cancelled || !data?.success) return;
        window.postMessage(
          {
            source: "glitchgrab-qa",
            type: "GG_AUTO_LOGIN",
            sessionId: data.data.sessionId,
            name: data.data.testerName,
            email: data.data.testerEmail,
          },
          window.location.origin
        );
      })
      .catch(() => { /* extension not installed, or nothing assigned — silent */ });
    return () => { cancelled = true; };
  }, [token]);

  const pending = checks.filter((c) => c.status === "PENDING" && !hiddenIds.has(c.id));
  const done = checks.filter((c) => c.status !== "PENDING");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">QA Verification</div>
            {showLogout && (
              <Button size="sm" variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
                {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Log out
              </Button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
              {testerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight">Hi {testerName} 👋</h1>
              <p className="text-xs text-muted-foreground">
                Testing for <span className="font-medium text-foreground">{orgName}</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto shrink-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Try each fix below, then mark it Pass or Fail. Failing an item reopens the issue and pings the
            developer. Skip one if you can&apos;t verify it right now.
          </p>
        </header>

        <EditProfileSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          token={token}
          name={testerName}
          email={testerEmail}
          phone={testerPhone}
        />

        {pending.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            🎉 Nothing to verify right now. You&apos;re all caught up.
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">To verify ({pending.length})</h2>
            {pending.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <a
                    href={c.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                  >
                    #{c.githubNumber} {c.title}
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                  </a>
                  <div className="mt-0.5 text-[11px] font-mono text-muted-foreground/70">
                    {c.repoFullName}
                    {c.prNumber && <> · PR #{c.prNumber}</>}
                    {c.developerLogin && <> · by @{c.developerLogin}</>}
                    {!!c.commentCount && (
                      <>
                        {" "}
                        · 💬 {c.commentCount} comment{c.commentCount === 1 ? "" : "s"}
                      </>
                    )}
                  </div>
                </div>

                {failingId === c.id ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`fail-reason-${c.id}`} className="text-xs text-muted-foreground">
                      What&apos;s not working?
                    </Label>
                    <textarea
                      id={`fail-reason-${c.id}`}
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      placeholder="e.g. still throws the same error when I submit the form"
                      rows={3}
                      autoFocus
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />
                    <Label htmlFor={`fail-screenshot-${c.id}`} className="text-xs text-muted-foreground">
                      Screenshot (required)
                    </Label>
                    {failScreenshot ? (
                      <div className="relative w-fit">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={failScreenshot} alt="Fail screenshot" className="h-24 rounded-md border border-border" />
                        <button
                          type="button"
                          onClick={() => setFailScreenshot(null)}
                          className="absolute -right-2 -top-2 rounded-full bg-background border border-border p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Input
                        id={`fail-screenshot-${c.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setFailScreenshot(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }}
                        className="text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          mutation.mutate({
                            checkId: c.id,
                            result: "FAIL",
                            reason: failReason.trim(),
                            screenshot: failScreenshot ?? undefined,
                          })
                        }
                        disabled={mutation.isPending || !failReason.trim() || !failScreenshot}
                        className="flex-1"
                      >
                        {pendingId === c.id && mutation.variables?.result === "FAIL" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Confirm fail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFailingId(null);
                          setFailReason("");
                          setFailScreenshot(null);
                        }}
                        disabled={mutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => mutation.mutate({ checkId: c.id, result: "PASS" })}
                      disabled={mutation.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {pendingId === c.id && mutation.variables?.result === "PASS" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setFailingId(c.id);
                        setFailReason("");
                      }}
                      disabled={mutation.isPending}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mutation.mutate({ checkId: c.id, result: "SKIP" })}
                      disabled={mutation.isPending}
                      title="Not testable right now — leaves the issue untouched, no notifications"
                    >
                      {pendingId === c.id && mutation.variables?.result === "SKIP" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SkipForward className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-8 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">History</h2>
            {done.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-card/50 px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <a
                  href={c.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm truncate hover:underline"
                >
                  #{c.githubNumber} {c.title}
                  {!!c.commentCount && (
                    <span className="ml-1.5 text-[11px] font-mono text-muted-foreground/70">
                      💬 {c.commentCount}
                    </span>
                  )}
                </a>
                <span
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
                    c.status === "PASS"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : c.status === "FAIL"
                      ? "text-red-500 border-red-500/30 bg-red-500/10"
                      : "text-muted-foreground border-border bg-muted"
                  )}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileSheet({
  open,
  onOpenChange,
  token,
  name: initialName,
  email: initialEmail,
  phone: initialPhone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token?: string;
  name: string;
  email: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState<string | undefined>(initialPhone ? `+${initialPhone}` : "");

  const editMutation = useMutation({
    mutationFn: async () =>
      axios.patch("/api/v1/qa/profile", {
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        token,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      onOpenChange(false);
      router.refresh();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to update profile";
      toast.error(msg ?? "Failed to update profile");
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName(initialName);
          setEmail(initialEmail ?? "");
          setPhone(initialPhone ? `+${initialPhone}` : "");
        }
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Keep your name and contact details up to date.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="qa-profile-name">Name</Label>
            <Input id="qa-profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-profile-phone">WhatsApp number</Label>
            <PhoneInput id="qa-profile-phone" value={phone} onChange={setPhone} />
            <p className="text-[11px] text-muted-foreground">Used for OTP login + notifications.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-profile-email">Email (optional)</Label>
            <Input
              id="qa-profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-2 border-t border-border">
          <Button
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || !name.trim()}
            className="w-full"
          >
            {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
