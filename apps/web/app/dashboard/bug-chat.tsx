"use client";

import { useState, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImagePlus, Send, X, Loader2, GitFork, RotateCcw, ChevronDown, Check, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { InteractiveQuestions } from "@/components/dashboard/interactive-questions";

/** Compress an image file client-side to stay under Vercel's 4.5MB payload limit */
async function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<File> {
  if (file.size <= 500_000) return file; // skip if already small

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

/* ── Memoized message bubble to prevent re-rendering all messages on state change ── */
const MessageBubble = memo(function MessageBubble({
  msg,
  sending,
  onRetry,
  onClarifyComplete,
  onClarifyDismiss,
}: {
  msg: Message;
  sending: boolean;
  onRetry: () => void;
  onClarifyComplete: (msgId: string, answers: { question: string; answer: string }[]) => void;
  onClarifyDismiss: (msgId: string) => void;
}) {
  return (
    <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
          msg.role === "user"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        } ${msg.clarifyQuestions && msg.clarifyQuestions.length > 0 ? "hidden" : ""}`}
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
                {msg.screenshots.map((src, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={`${msg.id}-ss-${i}`}
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    width={msg.screenshots?.length === 1 ? 300 : 150}
                    height={msg.screenshots?.length === 1 ? 200 : 100}
                    className="rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            )}
            {msg.issueUrl && (
              <a href={msg.issueUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                <Badge variant="outline" className="gap-1 hover:bg-primary/10">
                  View on GitHub →
                </Badge>
              </a>
            )}
            {msg.failed && (
              <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={onRetry} disabled={sending}>
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </>
        )}
      </div>
      {msg.clarifyQuestions && msg.clarifyQuestions.length > 0 && (
        <div className="w-full max-w-[95%] sm:max-w-[80%] mt-2">
          <InteractiveQuestions
            questions={msg.clarifyQuestions}
            onComplete={(answers) => onClarifyComplete(msg.id, answers)}
            onDismiss={() => onClarifyDismiss(msg.id)}
          />
        </div>
      )}
    </div>
  );
});

interface Repo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

interface ClarifyQuestion {
  question: string;
  options: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  screenshots?: string[];
  screenshotFiles?: File[];
  issueUrl?: string;
  failed?: boolean;
  clarifyQuestions?: ClarifyQuestion[];
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

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      newFiles.push(file);
    }

    if (newFiles.length === 0) {
      toast.error("Please upload image files");
      return;
    }

    Promise.all(
      newFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((previews) => {
        setScreenshots((prev) => [...prev, ...previews]);
        setScreenshotFiles((prev) => [...prev, ...newFiles]);
      })
      .catch(() => {
        toast.error("Failed to read some images");
      });
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

      // Collect all screenshots: current files + any from earlier messages in this conversation
      // (so clarification follow-ups keep screenshot context from the original report)
      const allFiles: File[] = files ? [...files] : [];
      if (allFiles.length === 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.role === "user" && m.screenshotFiles && m.screenshotFiles.length > 0) {
            allFiles.push(...m.screenshotFiles);
            break;
          }
        }
      }
      // Compress and append all screenshots (stay under Vercel's 4.5MB payload limit)
      for (const file of allFiles) {
        const compressed = await compressImage(file);
        formData.append("screenshot", compressed);
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
        } else if (intent === "clarify") {
          content = data.data?.message ?? "Could you provide more details?";
        } else {
          content = data.data?.message ?? "Done";
        }
      }

      // Extract clarify questions if present
      let clarifyQuestions: ClarifyQuestion[] | undefined;
      if (data.data?.intent === "clarify") {
        if (Array.isArray(data.data?.clarifyQuestions) && data.data.clarifyQuestions.length > 0) {
          // Structured format from API
          clarifyQuestions = data.data.clarifyQuestions;
        } else if (content) {
          // Fallback: parse numbered questions from the text message
          const lines = content.split("\n").filter((l: string) => /^\d+\.\s/.test(l.trim()));
          if (lines.length > 0) {
            clarifyQuestions = lines.map((line: string) => ({
              question: line.replace(/^\d+\.\s*/, "").trim(),
              options: [], // No AI-generated options — user will use "Something else" input
            }));
          }
        }
      }

      const isTerminalAction = data.success && ["create", "update", "close", "merge"].includes(data.data?.intent);

      // Single state update instead of two — prevents double re-render
      setMessages((prev) => {
        let updated = prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content,
            issueUrl: data.data?.issueUrl,
            failed: !data.success,
            clarifyQuestions,
          });

        // Clear screenshotFiles from all messages after terminal actions
        if (isTerminalAction) {
          updated = updated.map((m) =>
            m.screenshotFiles ? { ...m, screenshotFiles: undefined } : m
          );
        }

        return updated;
      });

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

  // Test mode: detect "ask me questions" and show sample interactive questions locally
  const TEST_QUESTIONS_PATTERN = /^ask\s+me\s+(some\s+)?questions?$/i;

  function handleTestQuestions() {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const testMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      clarifyQuestions: [
        {
          question: "What type of bug are you reporting?",
          options: ["UI/Visual issue", "Crash/Error", "Performance", "Feature not working"],
        },
        {
          question: "Which part of the app is affected?",
          options: ["Dashboard", "Bug chat", "Repos page", "Mobile app"],
        },
        {
          question: "How severe is this issue?",
          options: ["Blocks my work", "Annoying but usable", "Minor cosmetic", "Just a suggestion"],
        },
      ],
    };
    setMessages((prev) => [...prev, testMsg]);
  }

  async function handleSend() {
    if (!input.trim() && screenshots.length === 0) return;

    // Intercept test command — show sample interactive questions without API call
    if (TEST_QUESTIONS_PATTERN.test(input.trim())) {
      handleTestQuestions();
      return;
    }

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

  async function handleClarifyComplete(
    msgId: string,
    answers: { question: string; answer: string }[]
  ) {
    // Clear the interactive questions from the message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, clarifyQuestions: undefined } : m
      )
    );

    // Compile answers into a user message
    const answerText = answers
      .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
      .join("\n\n");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: answerText,
    };
    setMessages((prev) => [...prev, userMsg]);

    await sendReport(answerText);
  }

  function handleClarifyDismiss(msgId: string) {
    // Just remove the interactive card — no API call, no issue creation
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, clarifyQuestions: undefined } : m
      )
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasConversation = messages.length > 1;

  return (
    <div className="flex flex-col h-full max-h-[calc(var(--app-height,100dvh)-100px)] md:max-h-[calc(var(--app-height,100dvh)-0px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            sending={sending}
            onRetry={handleRetry}
            onClarifyComplete={handleClarifyComplete}
            onClarifyDismiss={handleClarifyDismiss}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Screenshot previews */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {screenshots.map((src, i) => (
            <div key={i} className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
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
