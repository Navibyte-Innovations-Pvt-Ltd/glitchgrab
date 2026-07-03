"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function PublicReportForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Describe what went wrong");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/v1/public/report/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, description }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to submit report");
        return;
      }

      setIssueUrl(json.data?.issueUrl ?? null);
      toast.success("Report sent — thanks!");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setPending(false);
    }
  }

  return (
    <SubmittedOr issueUrl={issueUrl}>
      <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-lg p-6 bg-card">
        <div className="space-y-1.5">
          <Label htmlFor="description">What happened? *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the bug you ran into..."
            rows={4}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Report
            </>
          )}
        </Button>
      </form>
    </SubmittedOr>
  );
}

function SubmittedOr({
  issueUrl,
  children,
}: {
  issueUrl: string | null;
  children: React.ReactNode;
}) {
  if (issueUrl === null) return <>{children}</>;

  return (
    <div className="border border-border rounded-lg p-8 bg-card text-center">
      <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
      <h2 className="text-base font-medium text-foreground mb-1">Report sent</h2>
      <p className="text-sm text-muted-foreground">
        Thanks — the team has been notified.
      </p>
    </div>
  );
}
