"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { getAiConfig, updateAiConfig, deleteAiKey } from "./actions";

type Provider = "PLATFORM" | "OPENAI" | "ANTHROPIC";

const PROVIDERS: { value: Provider; label: string; description: string }[] = [
  {
    value: "PLATFORM",
    label: "Platform AI",
    description: "Use Glitchgrab's built-in AI — no API key needed",
  },
  {
    value: "OPENAI",
    label: "OpenAI",
    description: "Bring your own OpenAI API key",
  },
  {
    value: "ANTHROPIC",
    label: "Anthropic",
    description: "Bring your own Anthropic (Claude) API key",
  },
];

export function AiConfigForm() {
  const [provider, setProvider] = useState<Provider>("PLATFORM");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    getAiConfig()
      .then((config) => {
        setProvider(config.provider);
        setHasKey(config.hasKey);
      })
      .catch(() => {
        toast.error("Failed to load AI configuration");
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    if (provider !== "PLATFORM" && !hasKey && !apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    startSave(async () => {
      try {
        await updateAiConfig(provider, apiKey.trim() || undefined);
        setHasKey(provider !== "PLATFORM" && (!!apiKey.trim() || hasKey));
        setApiKey("");
        toast.success("AI configuration saved");
      } catch {
        toast.error("Failed to save AI configuration");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteAiKey();
        setProvider("PLATFORM");
        setHasKey(false);
        setApiKey("");
        toast.success("API key removed");
      } catch {
        toast.error("Failed to remove API key");
      }
    });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const isByok = provider !== "PLATFORM";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          AI Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider selection */}
        <div className="space-y-3">
          <Label>AI Provider</Label>
          <div className="grid gap-3">
            {PROVIDERS.map((p) => (
              <label
                key={p.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  provider === p.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="ai-provider"
                  value={p.value}
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">{p.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* API Key input (only for BYOK providers) */}
        {isByok && (
          <div className="space-y-3">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              API Key
            </Label>

            {hasKey && !apiKey ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs py-1 px-2.5">
                  Key saved
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setApiKey("")}
                  className="text-xs h-7"
                >
                  Update key
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs h-7 text-destructive hover:text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Remove
                </Button>
              </div>
            ) : (
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === "OPENAI" ? "sk-..." : "sk-ant-..."
                }
              />
            )}

            <p className="text-xs text-muted-foreground">
              Your key is encrypted with AES-256-GCM before storage. We never
              store it in plaintext.
            </p>
          </div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
