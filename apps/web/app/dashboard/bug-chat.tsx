"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Send, X, Loader2, GitFork, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  screenshot?: string;
  screenshotFile?: File;
  issueUrl?: string;
  failed?: boolean;
}

export function BugChat({
  repos,
  userName,
}: {
  repos: Repo[];
  userName: string;
}) {
  const [selectedRepoName, setSelectedRepoName] = useState(repos[0]?.fullName ?? "");
  const selectedRepo = repos.find((r) => r.fullName === selectedRepoName)?.id ?? "";
  const [input, setInput] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey ${userName}! Describe a bug, paste a screenshot, or both — I'll create a GitHub issue for you.`,
    },
  ]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScreenshot(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;
        setScreenshotFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
          setScreenshot(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        toast.success("Screenshot pasted");
        return;
      }
    }
  }

  function removeScreenshot() {
    setScreenshot(null);
    setScreenshotFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendReport(description: string, file?: File) {
    setSending(true);

    const thinkingMsg: Message = {
      id: "thinking",
      role: "assistant",
      content: "Thinking...",
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      const formData = new FormData();
      formData.append("repoId", selectedRepo);
      formData.append("description", description);
      if (file) {
        formData.append("screenshot", file);
      }

      const res = await fetch("/api/v1/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      let content: string;
      if (!data.success) {
        content = `Failed: ${data.error ?? "Something went wrong."}`;
      } else {
        const intent = data.data?.intent;
        if (intent === "create") {
          content = `Issue created: **${data.data?.title ?? "Bug report"}**`;
        } else if (intent === "update") {
          content = data.data?.message ?? "Issue updated";
        } else if (intent === "close") {
          content = data.data?.message ?? "Issues closed";
        } else {
          content = data.data?.message ?? "Done";
        }
      }

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content,
            issueUrl: data.data?.issueUrl,
            failed: !data.success,
          })
      );

      if (data.success) {
        const intent = data.data?.intent;
        if (intent === "create") toast.success("Issue created!");
        else if (intent === "update") toast.success("Issue updated!");
        else if (intent === "close") toast.success("Issue(s) closed!");
      }
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
            failed: true,
          })
      );
    }

    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSend() {
    if (!input.trim() && !screenshot) return;
    if (!selectedRepo) {
      toast.error("Select a repo first");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      screenshot: screenshot ?? undefined,
      screenshotFile: screenshotFile ?? undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    const desc = input.trim();
    const file = screenshotFile ?? undefined;
    setInput("");
    removeScreenshot();

    await sendReport(desc, file);
  }

  async function handleRetry() {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the failed assistant message
    setMessages((prev) => prev.filter((m) => !m.failed));

    await sendReport(lastUserMsg.content, lastUserMsg.screenshotFile);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100dvh-60px)] md:max-h-[calc(100dvh-0px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
              {msg.id === "thinking" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{msg.content}</span>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.screenshot && (
                    <Image
                      src={msg.screenshot}
                      alt="Screenshot"
                      width={300}
                      height={200}
                      className="mt-2 rounded-lg border border-border"
                    />
                  )}
                  {msg.issueUrl && (
                    <a
                      href={msg.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2"
                    >
                      <Badge variant="outline" className="gap-1 hover:bg-primary/10">
                        View on GitHub →
                      </Badge>
                    </a>
                  )}
                  {msg.failed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5 text-xs"
                      onClick={handleRetry}
                      disabled={sending}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Screenshot preview */}
      {screenshot && (
        <div className="relative inline-block mb-2">
          <Image
            src={screenshot}
            alt="Attached screenshot"
            width={120}
            height={80}
            className="rounded-lg border border-border"
          />
          <button
            onClick={removeScreenshot}
            className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 rounded-xl border border-border bg-card p-2 sm:p-3">
          {/* Repo selector row */}
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border">
            <GitFork className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedRepoName} onValueChange={(val) => { if (val) setSelectedRepoName(val); }}>
              <SelectTrigger className="h-7 border-0 bg-transparent shadow-none px-1 text-xs text-muted-foreground hover:text-foreground">
                <SelectValue placeholder="Select repo" />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.fullName}>
                    {repo.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Input row */}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Describe the bug or paste a screenshot..."
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[36px] max-h-[120px] py-2"
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || (!input.trim() && !screenshot)}
              className="shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
      </div>
    </div>
  );
}
