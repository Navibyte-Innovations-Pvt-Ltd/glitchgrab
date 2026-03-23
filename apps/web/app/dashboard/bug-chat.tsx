"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Send, X, Loader2, Bug } from "lucide-react";
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
  issueUrl?: string;
}

export function BugChat({
  repos,
  userName,
}: {
  repos: Repo[];
  userName: string;
}) {
  const [selectedRepo, setSelectedRepo] = useState(repos[0]?.id ?? "");
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

  function removeScreenshot() {
    setScreenshot(null);
    setScreenshotFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const thinkingMsg: Message = {
      id: "thinking",
      role: "assistant",
      content: "Analyzing and creating GitHub issue...",
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      const formData = new FormData();
      formData.append("repoId", selectedRepo);
      formData.append("description", userMsg.content);
      if (screenshotFile) {
        formData.append("screenshot", screenshotFile);
      }

      const res = await fetch("/api/v1/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content: data.success
              ? `Issue created: **${data.data?.title ?? "Bug report"}**`
              : `Failed: ${data.error ?? "Something went wrong. Try again."}`,
            issueUrl: data.data?.issueUrl,
          })
      );

      if (data.success) {
        toast.success("Issue created!");
      }
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
          })
      );
    }

    removeScreenshot();
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100dvh-60px)] md:max-h-[calc(100dvh-0px)]">
      {/* Header with repo selector */}
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-3 flex-wrap">
        <Bug className="h-5 w-5 text-primary shrink-0" />
        <span className="text-sm font-medium shrink-0">Report bug to:</span>
        <Select value={selectedRepo} onValueChange={(val) => { if (val) setSelectedRepo(val); }}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a repo" />
          </SelectTrigger>
          <SelectContent>
            {repos.map((repo) => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
      <Card className="shrink-0">
        <CardContent className="p-2 sm:p-3">
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
              placeholder="Describe the bug..."
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
        </CardContent>
      </Card>
    </div>
  );
}
