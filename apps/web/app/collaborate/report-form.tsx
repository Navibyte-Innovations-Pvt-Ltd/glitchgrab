"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, X, CheckCircle2, ExternalLink, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: string;
  fullName: string;
}

interface CollaborateReportFormProps {
  repos: Repo[];
}

export function CollaborateReportForm({ repos }: CollaborateReportFormProps) {
  const [selectedRepoId, setSelectedRepoId] = useState(repos.length === 1 ? repos[0].id : "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    issueUrl?: string;
    title?: string;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedRepoId) {
      toast.error("Select a repository");
      return;
    }
    if (!description && files.length === 0) {
      toast.error("Add a description or screenshot");
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("repoId", selectedRepoId);
      formData.set("description", description);
      for (const file of files) {
        formData.append("screenshot", file);
      }

      const res = await fetch("/api/v1/collaborators/report", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setResult({
          issueUrl: json.data.issueUrl,
          title: json.data.title,
          message: json.data.message,
        });
        setDescription("");
        setFiles([]);
        toast.success("Bug reported successfully!");
      } else {
        toast.error(json.error ?? "Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.issueUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Issue created!</h3>
          {result.title && (
            <p className="text-sm text-muted-foreground mb-4">{result.title}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              render={<a href={result.issueUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              View on GitHub
            </Button>
            <Button size="sm" onClick={() => setResult(null)}>
              Report another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Repo selector */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <Label>Repository</Label>
          {repos.length === 1 ? (
            <Badge variant="secondary" className="text-sm">
              {repos[0].fullName}
            </Badge>
          ) : (
            <div className="flex flex-wrap gap-2">
              {repos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => setSelectedRepoId(repo.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    selectedRepoId === repo.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {repo.fullName}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <Label htmlFor="bug-description">What went wrong?</Label>
          <textarea
            id="bug-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the bug, error, or issue you encountered..."
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </CardContent>
      </Card>

      {/* Screenshots */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <Label>Screenshots (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="relative flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-35">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Add screenshot
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={submitting || (!description && files.length === 0) || !selectedRepoId}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Analyzing & creating issue...
          </>
        ) : (
          "Submit Bug Report"
        )}
      </Button>
    </form>
  );
}
