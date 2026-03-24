"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImagePlus, Send, X, Loader2, GitFork, RotateCcw, ChevronDown, Check, MessageSquarePlus } from "lucide-react";
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
  screenshots?: string[];
  screenshotFiles?: File[];
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
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
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

  function addFiles(files: FileList | File[]) {
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      newFiles.push(file);
    }

    if (newFiles.length === 0) {
      toast.error("Please upload image files");
      return;
    }

    let loaded = 0;
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        loaded++;
        if (loaded === newFiles.length) {
          setScreenshots((prev) => [...prev, ...newPreviews]);
          setScreenshotFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(files);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
      toast.success(`Screenshot${imageFiles.length > 1 ? "s" : ""} pasted`);
    }
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAllScreenshots() {
    setScreenshots([]);
    setScreenshotFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleNewChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hey ${userName}! Describe a bug, paste a screenshot, or both — I'll create a GitHub issue for you.`,
      },
    ]);
    setInput("");
    removeAllScreenshots();
    setSending(false);
  }

  async function sendReport(description: string, files?: File[]) {
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
      if (files && files.length > 0) {
        // Send first screenshot as main (API currently supports one)
        formData.append("screenshot", files[0]);
      }

      // Send last 5 chat messages for context (exclude thinking messages)
      const history = messages
        .filter((m) => m.id !== "welcome" && m.id !== "thinking")
        .slice(-5)
        .map((m) => ({ role: m.role, content: m.content }));
      if (history.length > 0) {
        formData.append("chatHistory", JSON.stringify(history));
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
        } else if (intent === "merge") {
          content = data.data?.message ?? "Issues merged";
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
        else if (intent === "merge") toast.success("Issues merged!");
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
    if (!input.trim() && screenshots.length === 0) return;
    if (!selectedRepo) {
      toast.error("Select a repo first");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      screenshots: screenshots.length > 0 ? [...screenshots] : undefined,
      screenshotFiles: screenshotFiles.length > 0 ? [...screenshotFiles] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    const desc = input.trim();
    const files = screenshotFiles.length > 0 ? [...screenshotFiles] : undefined;
    setInput("");
    removeAllScreenshots();

    await sendReport(desc, files);
  }

  async function handleRetry() {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the failed assistant message
    setMessages((prev) => prev.filter((m) => !m.failed));

    await sendReport(lastUserMsg.content, lastUserMsg.screenshotFiles);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasConversation = messages.length > 1;

  return (
    <div className="flex flex-col h-full max-h-[calc(100dvh-100px)] md:max-h-[calc(100dvh-0px)]">
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
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                  {msg.screenshots && msg.screenshots.length > 0 && (
                    <div className={`mt-2 flex flex-wrap gap-2 ${msg.screenshots.length === 1 ? "" : "grid grid-cols-2"}`}>
                      {msg.screenshots.map((src, i) => {
                        const isSingle = msg.screenshots?.length === 1;
                        return (
                          <Image
                            key={i}
                            src={src}
                            alt={`Screenshot ${i + 1}`}
                            width={isSingle ? 300 : 150}
                            height={isSingle ? 200 : 100}
                            className="rounded-lg border border-border object-cover"
                          />
                        );
                      })}
                    </div>
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

      {/* Screenshot previews */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {screenshots.map((src, i) => (
            <div key={i} className="relative inline-block">
              <Image
                src={src}
                alt={`Attached screenshot ${i + 1}`}
                width={80}
                height={56}
                className="rounded-lg border border-border object-cover bg-transparent"
              />
              <button
                onClick={() => removeScreenshot(i)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 rounded-xl border border-border bg-card p-2 sm:p-3">
          {/* Repo selector row */}
          <div className="mb-1.5 pb-1.5 border-b border-border flex items-center justify-between">
            <Popover open={repoPickerOpen} onOpenChange={(open) => { setRepoPickerOpen(open); if (!open) setRepoSearch(""); }}>
              <PopoverTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-1 py-0.5 rounded">
                <GitFork className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-50">{selectedRepoName || "Select repo"}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-72 p-0">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repos..."
                    className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {repos
                    .filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
                    .map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => {
                          setSelectedRepoName(repo.fullName);
                          setRepoPickerOpen(false);
                          setRepoSearch("");
                        }}
                        className="flex items-center justify-between w-full rounded-md px-2 py-1.5 text-base hover:bg-muted transition"
                      >
                        <span className="truncate">{repo.fullName}</span>
                        {selectedRepoName === repo.fullName && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  {repos.filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No repos found</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {hasConversation && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded hover:bg-muted"
                title="New chat"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
          </div>
          {/* Input row */}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
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
              placeholder="Describe a bug..."
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground min-h-9 max-h-30 py-2"
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || (!input.trim() && screenshots.length === 0)}
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
