"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, File as FileIcon, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_DOCUMENT_SIZE,
  isAllowedDocumentFile,
} from "@/lib/attachments-constants";

function formatBytes(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} B`;
}

export function PublicReportForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  function addDocuments(files: FileList | File[]) {
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (!isAllowedDocumentFile(file)) {
        toast.error(`${file.name} must be a PDF, DOC, or DOCX file`);
        continue;
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        toast.error(`${file.name} exceeds the 10MB limit`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) setDocuments((prev) => [...prev, ...accepted]);
  }

  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
    if (docInputRef.current) docInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Describe what went wrong");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("description", description);
      for (const file of documents) formData.append("document", file);

      const res = await fetch(`/api/v1/public/report/${slug}`, {
        method: "POST",
        body: formData,
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
        <div className="space-y-1.5">
          <Label>Attach docs (optional)</Label>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) addDocuments(e.target.files);
            }}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => docInputRef.current?.click()}
            className="w-full justify-start text-muted-foreground"
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach PDF, DOC, or DOCX (max 10MB each)
          </Button>
          {documents.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              {documents.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 border border-border rounded-md px-2.5 py-1.5"
                >
                  <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDocument(i)}
                    aria-label={`Remove ${file.name}`}
                    className="text-muted-foreground hover:text-red-400 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
