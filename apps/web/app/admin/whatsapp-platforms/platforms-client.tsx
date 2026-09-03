"use client";

import { useState, useTransition } from "react";
import type { WaTemplateCategory } from "@prisma/client";
import { AlertTriangle, Check, Copy, KeyRound, Plus, Power, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPlatform,
  creditPlatformWallet,
  getPlatformPrices,
  listTenants,
  rotatePlatformKey,
  setPlatformActive,
  updatePlatformPrices,
  type PlatformRow,
} from "./actions";

const CATEGORIES: WaTemplateCategory[] = ["UTILITY", "MARKETING", "AUTHENTICATION", "SERVICE"];

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

/**
 * A key is shown exactly once, because only its hash is stored and there is no
 * way to recover it afterwards. Making that unmissable is the whole design of
 * this panel — a dismissed banner means rotating.
 */
function KeyReveal({ apiKey, onDone }: { apiKey: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Copy this key now — it is never shown again
          </p>
          <code className="block overflow-x-auto rounded border bg-background p-2 font-mono text-xs">
            {apiKey}
          </code>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(apiKey);
                setCopied(true);
              }}
            >
              {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDone}>
              I have saved it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: (key: string) => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold">Add a platform</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="slug" className="text-xs">Slug</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="abhyasika" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Abhyasika" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="callback" className="text-xs">Callback URL (optional)</Label>
            <Input id="callback" value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          size="sm"
          disabled={pending || !slug.trim() || !name.trim()}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await createPlatform({ slug, name, callbackUrl });
              if (result.ok) {
                onCreated(result.key);
                setSlug("");
                setName("");
                setCallbackUrl("");
              } else {
                setError(result.error);
              }
            })
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {pending ? "Creating…" : "Create platform"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Seeds all four price categories. A category with no price rule fails every send.
        </p>
      </CardContent>
    </Card>
  );
}

interface PriceRow {
  category: WaTemplateCategory;
  metaCostPaise: number;
  platformPricePaise: number;
  tenantPricePaise: number;
}

function PriceEditor({ platformId }: { platformId: string }) {
  const [rows, setRows] = useState<PriceRow[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      const prices = await getPlatformPrices(platformId);
      setRows(
        CATEGORIES.map((category) => {
          const found = prices.find((p) => p.category === category);
          return {
            category,
            metaCostPaise: found?.metaCostPaise ?? 0,
            platformPricePaise: found?.platformPricePaise ?? 0,
            tenantPricePaise: found?.tenantPricePaise ?? 0,
          };
        })
      );
    });

  if (!rows) {
    return (
      <Button size="sm" variant="outline" onClick={load} disabled={pending}>
        {pending ? "Loading…" : "Prices"}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border p-3">
      <p className="text-xs font-semibold">Prices in paise — Meta&apos;s cost · what they pay us · what they charge</p>
      {rows.map((row, i) => (
        <div key={row.category} className="grid grid-cols-4 items-center gap-2">
          <span className="text-xs text-muted-foreground">{row.category}</span>
          {(["metaCostPaise", "platformPricePaise", "tenantPricePaise"] as const).map((field) => (
            <Input
              key={field}
              type="number"
              value={row[field]}
              className="h-8 text-xs"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, [field]: Number(e.target.value) };
                setRows(next);
              }}
            />
          ))}
        </div>
      ))}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await updatePlatformPrices(platformId, rows);
              setMessage(result.ok ? "Saved — applies to sends from now on" : (result.error ?? "Failed"));
            })
          }
        >
          {pending ? "Saving…" : "Save prices"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Marketing costs a multiple of utility. A flat rate loses money on broadcasts.
        </p>
      </div>
    </div>
  );
}

function TopUp({ platformId }: { platformId: string }) {
  const [rupeeAmount, setRupeeAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="number"
        value={rupeeAmount}
        onChange={(e) => setRupeeAmount(e.target.value)}
        placeholder="₹ amount"
        className="h-8 w-28 text-xs"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !rupeeAmount}
        onClick={() =>
          start(async () => {
            // Entered in rupees, stored in paise — money is an integer here, and
            // a float would drift a fraction of a paisa per message.
            const paise = Math.round(Number(rupeeAmount) * 100);
            const result = await creditPlatformWallet(platformId, paise);
            setMessage(result.ok ? `Balance ${rupees(result.balancePaise ?? 0)}` : (result.error ?? "Failed"));
            if (result.ok) setRupeeAmount("");
          })
        }
      >
        <Wallet className="mr-1 h-3.5 w-3.5" />
        {pending ? "Adding…" : "Top up"}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}

interface TenantRow {
  id: string;
  externalOwnerId: string;
  name: string;
  status: string;
  balancePaise: number;
  connectedAt: string | null;
  numbers: { displayNumber: string; verifiedName: string; status: string; qualityRating: string | null }[];
}

function Tenants({ platformId }: { platformId: string }) {
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [pending, start] = useTransition();

  if (!tenants) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => setTenants((await listTenants(platformId)) as TenantRow[]))}
      >
        {pending ? "Loading…" : "Tenants"}
      </Button>
    );
  }

  if (tenants.length === 0) {
    return <p className="text-xs text-muted-foreground">No businesses have connected under this platform yet.</p>;
  }

  return (
    <div className="w-full space-y-2 rounded-lg border p-3">
      {tenants.map((tenant) => (
        <div key={tenant.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0 last:pb-0">
          <span className="text-xs font-medium">{tenant.name}</span>
          <Badge variant="outline" className="text-[10px]">{tenant.status.toLowerCase()}</Badge>
          <span className="text-[11px] text-muted-foreground">{rupees(tenant.balancePaise)}</span>
          {tenant.numbers.map((n) => (
            <span key={n.displayNumber} className="text-[11px] text-muted-foreground">
              {n.displayNumber} · {n.verifiedName}
              {n.qualityRating ? ` · ${n.qualityRating.toLowerCase()}` : ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PlatformsClient({ initialPlatforms }: { initialPlatforms: PlatformRow[] }) {
  const [platforms] = useState(initialPlatforms);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">WhatsApp platforms</h1>
        <p className="text-sm text-muted-foreground">
          Products reselling our WhatsApp infra. Each gets an API key and its own prices.
        </p>
      </div>

      {revealedKey && <KeyReveal apiKey={revealedKey} onDone={() => setRevealedKey(null)} />}

      <CreateForm onCreated={setRevealedKey} />

      {platforms.length === 0 && (
        <p className="text-sm text-muted-foreground">No platforms yet.</p>
      )}

      {platforms.map((platform) => (
        <Card key={platform.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{platform.name}</span>
              <Badge variant="secondary" className="text-[10px]">{platform.slug}</Badge>
              {!platform.active && <Badge variant="destructive" className="text-[10px]">disabled</Badge>}
              <span className="text-xs text-muted-foreground">
                {platform.tenantCount} tenant{platform.tenantCount === 1 ? "" : "s"} · {rupees(platform.balancePaise)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PriceEditor platformId={platform.id} />
              <Tenants platformId={platform.id} />
              <TopUp platformId={platform.id} />

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  start(async () => {
                    // The remedy for a leaked key. Immediate: the old one stops
                    // working the moment this returns, so their integration is
                    // down until the new key is deployed.
                    if (!confirm(`Rotate ${platform.name}'s key? Their integration breaks until the new key is deployed.`)) return;
                    const result = await rotatePlatformKey(platform.id);
                    if (result.ok) setRevealedKey(result.key);
                  })
                }
              >
                <KeyRound className="mr-1 h-3.5 w-3.5" />
                Rotate key
              </Button>

              <Button
                size="sm"
                variant={platform.active ? "outline" : "default"}
                onClick={() =>
                  start(async () => {
                    if (
                      platform.active &&
                      !confirm(`Disable ${platform.name}? Every call from them fails immediately.`)
                    )
                      return;
                    await setPlatformActive(platform.id, !platform.active);
                  })
                }
              >
                <Power className="mr-1 h-3.5 w-3.5" />
                {platform.active ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
