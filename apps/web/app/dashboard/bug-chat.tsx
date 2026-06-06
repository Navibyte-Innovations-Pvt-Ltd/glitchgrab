"use client";

import { useState, useRef, useEffect, memo } from "react";
import axios from "axios";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  File as FileIcon,
  GitFork,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  RotateCcw,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { toast } from "sonner";


async function compressImage(
  file: File,
  maxWidth = 1024,
  quality = 0.7,
): Promise<File> {
  if (file.size <= 500_000) return file;

  try {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const scale = Math.min(1, maxWidth / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function formatBytes(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} B`;
}

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
  issueNumber?: number;
  failed?: boolean;
}

/* ---------- REPL row building blocks ---------- */

function ReplPrefix({
  label,
  tone,
}: {
  label: string;
  tone: "user" | "sys" | "err" | "res";
}) {
  const color =
    tone === "user"
      ? "text-primary/80"
      : tone === "err"
      ? "text-red-400/80"
      : tone === "res"
      ? "text-green-400/80"
      : "text-muted-foreground";

  return (
    <div className={`font-mono text-[11px] ${color} md:text-right whitespace-nowrap pt-0.5 select-none`}>
      {label}
    </div>
  );
}

function ReplRow({
  prefix,
  tone,
  children,
}: {
  prefix: string;
  tone: "user" | "sys" | "err" | "res";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 md:grid md:grid-cols-[110px_1fr] md:gap-4 py-4 border-b border-dashed border-border/40">
      <ReplPrefix label={prefix} tone={tone} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function FileToken({
  src,
  name,
  size,
  onRemove,
  onClick,
}: {
  src: string;
  name: string;
  size?: number;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-3 bg-background/60 border border-border hover:border-muted-foreground/40 py-1.5 pl-1.5 pr-3 rounded-md group transition-colors">
      <button
        type="button"
        onClick={onClick}
        className="h-8 w-8 rounded overflow-hidden border border-border shrink-0 bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
        disabled={!onClick}
        aria-label={onClick ? `View ${name}` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </button>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[11px] text-foreground truncate max-w-55">{name}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {size !== undefined ? formatBytes(size) : ""} · image
        </span>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      ) : (
        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

/* ---------- Memoized message rendering ---------- */

const MessageBlock = memo(function MessageBlock({
  msg,
  userName,
  sending,
  onRetry,
}: {
  msg: Message;
  userName: string;
  sending: boolean;
  onRetry: () => void;
}) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const isUser = msg.role === "user";
  const isThinking = msg.id === "thinking";
  const isFailed = !!msg.failed;
  const isSuccess = !!msg.issueUrl;

  const tone: "user" | "sys" | "err" | "res" = isUser
    ? "user"
    : isFailed
    ? "err"
    : isSuccess
    ? "res"
    : "sys";

  const prefix = isUser
    ? `user@${userName.toLowerCase()} >`
    : isFailed
    ? "[agent/err] >"
    : isSuccess
    ? "[agent/res] >"
    : "[agent/sys] >";

  return (
    <ReplRow prefix={prefix} tone={tone}>
      {/* Thinking state */}
      {isThinking && (
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>{msg.content}</span>
          <span className="w-2 h-4 bg-primary animate-pulse" />
        </div>
      )}

      {/* Standard text content */}
      {!isThinking && msg.content && (
        <div
          className={`font-mono text-sm whitespace-pre-wrap leading-relaxed ${
            isFailed
              ? "text-red-400/90"
              : isSuccess
              ? "text-green-400/90"
              : "text-foreground"
          }`}
        >
          {msg.content}
        </div>
      )}

      {/* Attachments (screenshots) as file tokens */}
      {msg.screenshots && msg.screenshots.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {msg.screenshots.map((src, i) => (
            <FileToken
              key={`${msg.id}-ss-${i}`}
              src={src}
              name={`screenshot_${i + 1}.jpg`}
              size={msg.screenshotFiles?.[i]?.size}
              onClick={() => setSelectedScreenshot(src)}
            />
          ))}
        </div>
      )}

      {/* Screenshot lightbox */}
      <Dialog
        open={selectedScreenshot !== null}
        onOpenChange={(open) => { if (!open) setSelectedScreenshot(null); }}
      >
        <DialogContent className="sm:max-w-3xl p-2">
          <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
          {selectedScreenshot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedScreenshot}
              alt="Screenshot preview"
              className="w-full h-auto rounded-lg object-contain max-h-[80vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Issue success card */}
      {isSuccess && msg.issueUrl && (
        <div className="mt-3 border border-border rounded-md overflow-hidden bg-card/60 max-w-2xl">
          <div className="flex items-center justify-between px-4 py-2 bg-background/40 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="font-mono text-xs text-foreground font-semibold tracking-wide">
                ISSUE_CREATED
              </span>
            </div>
            <a
              href={msg.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-primary border border-border hover:border-primary/50 bg-card hover:bg-muted rounded px-2 py-1 transition-colors whitespace-nowrap shrink-0"
            >
              <span>View on GitHub</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {/* Retry on failure */}
      {isFailed && !isThinking && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onRetry}
            disabled={sending}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 bg-card hover:bg-muted rounded px-2 py-1 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

    </ReplRow>
  );
});

/* ---------- Main component ---------- */

export function BugChat({ repos, userName }: { repos: Repo[]; userName: string }) {
  const [selectedRepoName, setSelectedRepoName] = useState("");
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
      content: `Hey ${userName} — describe a bug, paste a screenshot, or both. I'll turn it into a GitHub issue.`,
    },
  ]);
  const [sending, setSending] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [originalInput, setOriginalInput] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 'active' = VAD flip restarts recording | 'stopping' = final chunk | 'abandon' = no transcribe
  const recordModeRef = useRef<"active" | "stopping" | "abandon">("abandon");
  const transcribingCountRef = useRef(0);
  const spaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPushToTalkRef = useRef(false);

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
      newFiles.map(async (file) => {
        const compressed = await compressImage(file);
        const preview = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });
        return { compressed, preview };
      }),
    )
      .then((results) => {
        setScreenshots((prev) => [...prev, ...results.map((r) => r.preview)]);
        setScreenshotFiles((prev) => [...prev, ...results.map((r) => r.compressed)]);
      })
      .catch(() => toast.error("Failed to process images"));
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
      if (!selectedRepo) {
        toast.error("Select a repo first");
        return;
      }
      addFiles(imageFiles);
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
        content: `Hey ${userName} — describe a bug, paste a screenshot, or both. I'll turn it into a GitHub issue.`,
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
      content: "creating issue...",
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      const formData = new FormData();
      formData.append("repoId", selectedRepo);
      formData.append("description", description);

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
      for (const file of allFiles) formData.append("screenshot", file);

      const { data } = await axios.post("/api/v1/reports", formData);

      const content = !data.success
        ? `Exception: ${data.error ?? "Something went wrong."}`
        : `Issue created: ${data.data?.title ?? "Bug report"}`;

      setMessages((prev) => {
        let updated = prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content,
            issueUrl: data.data?.issueUrl,
            issueNumber: data.data?.issueNumber,
            failed: !data.success,
          });
        if (data.success) {
          updated = updated.map((m) =>
            m.screenshotFiles ? { ...m, screenshotFiles: undefined } : m,
          );
        }
        return updated;
      });

      if (data.success) toast.success("Issue created");
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "thinking")
          .concat({
            id: Date.now().toString(),
            role: "assistant",
            content: "Exception: connection failed. Please retry.",
            failed: true,
          }),
      );
    }

    setSending(false);
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
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
      screenshotFiles:
        screenshotFiles.length > 0 ? [...screenshotFiles] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    const desc = input.trim();
    const files = screenshotFiles.length > 0 ? [...screenshotFiles] : undefined;
    setInput("");
    removeAllScreenshots();

    await sendReport(desc, files);
  }

  async function handleRetry() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setMessages((prev) => prev.filter((m) => !m.failed));
    await sendReport(lastUserMsg.content, lastUserMsg.screenshotFiles);
  }

  async function handleEnhance() {
    const text = input.trim();
    if (!text || enhancing || sending || isEnhanced) return;
    setEnhancing(true);
    try {
      const context = { url: typeof window !== "undefined" ? window.location.href : undefined };
      const { data } = await axios.post("/api/v1/ai/enhance-text", { text, context });
      if (data?.success && typeof data.data?.text === "string") {
        const enhanced = data.data.text;
        if (enhanced !== text) {
          setOriginalInput(text);
          setInput(enhanced);
          setIsEnhanced(true);
        }
      } else {
        toast.error(data?.error ?? "Couldn't enhance text");
      }
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Couldn't enhance text";
      toast.error(msg);
    } finally {
      setEnhancing(false);
    }
  }

  function acceptEnhance() {
    setIsEnhanced(false);
    setOriginalInput(null);
  }

  function restoreOriginal() {
    if (originalInput !== null) setInput(originalInput);
    setIsEnhanced(false);
    setOriginalInput(null);
  }

  const SILENCE_THRESHOLD = 12; // RMS below this = silence
  const SILENCE_DELAY_MS = 700; // ms of silence before sending chunk
  const MAX_CHUNK_MS = 8000; // send after 8s even without silence

  function clearVadTimers() {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }

  function stopVad() {
    clearVadTimers();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function startVadPolling(stream: MediaStream) {
    let audioCtx = audioCtxRef.current;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let hasSpeech = false;

    const poll = () => {
      if (!analyserRef.current || recordModeRef.current !== "active") return;
      analyser.getByteFrequencyData(dataArray);
      const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length);
      if (rms >= SILENCE_THRESHOLD) {
        hasSpeech = true;
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      } else if (hasSpeech && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          if (recordModeRef.current === "active") {
            // Flip: send current chunk and start new recorder
            try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
          }
        }, SILENCE_DELAY_MS);
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  function startSegment(stream: MediaStream, mimeType: string) {
    if (recordModeRef.current === "abandon") return;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {});
    mediaRecorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const mode = recordModeRef.current;
      const chunks = chunksRef.current;
      chunksRef.current = [];

      if (mode !== "abandon" && chunks.length > 0) {
        transcribingCountRef.current++;
        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "audio.webm");
        axios.post("/api/v1/sdk/stt", form)
          .then(({ data }) => {
            if (data?.success && typeof data.data?.transcript === "string" && data.data.transcript.trim()) {
              const transcript = data.data.transcript.trim();
              setInput((prev) => prev + (prev.trim() ? " " : "") + transcript);
              setIsEnhanced(false);
              setOriginalInput(null);
            }
          })
          .catch(() => {})
          .finally(() => {
            transcribingCountRef.current--;
            if (transcribingCountRef.current === 0) setIsTranscribing(false);
          });
      }

      if (mode === "active" && streamRef.current) {
        // VAD flip — start next segment
        startSegment(stream, mimeType);
        maxTimerRef.current = setTimeout(() => {
          if (recordModeRef.current === "active") try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
        }, MAX_CHUNK_MS);
      } else {
        // Session ended
        stream.getTracks().forEach((t) => t.stop());
        if (streamRef.current === stream) streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);
        if (transcribingCountRef.current === 0) setIsTranscribing(false);
      }
    };
    rec.start();
  }

  function stopVoice() {
    stopVad();
    recordModeRef.current = "abandon";
    chunksRef.current = [];
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    mediaRecorderRef.current = null;
    transcribingCountRef.current = 0;
    setIsListening(false);
    setIsTranscribing(false);
  }

  async function toggleVoice() {
    if (isListening) {
      stopVad();
      recordModeRef.current = "stopping";
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone access denied");
      return;
    }
    streamRef.current = stream;
    recordModeRef.current = "active";
    transcribingCountRef.current = 0;
    setIsListening(true);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    startSegment(stream, mimeType);
    startVadPolling(stream);
    maxTimerRef.current = setTimeout(() => {
      if (recordModeRef.current === "active") try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    }, MAX_CHUNK_MS);
  }

  // Stop voice when component unmounts
  useEffect(() => () => { stopVoice(); }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.code === "Space") {
      // Block all repeat space events while timer pending or recording active
      if (spaceTimerRef.current || isListening || isPushToTalkRef.current) {
        e.preventDefault();
        return;
      }
      if (e.repeat || isTranscribing) return;
      e.preventDefault();
      spaceTimerRef.current = setTimeout(() => {
        isPushToTalkRef.current = true;
        void toggleVoice();
      }, 400);
    }
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.code !== "Space") return;
    if (spaceTimerRef.current) {
      clearTimeout(spaceTimerRef.current);
      spaceTimerRef.current = null;
      if (!isPushToTalkRef.current) {
        // Insert space at cursor, not at end
        const ta = textareaRef.current;
        const pos = ta ? (ta.selectionStart ?? input.length) : input.length;
        setInput((prev) => prev.slice(0, pos) + " " + prev.slice(pos));
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = pos + 1;
            textareaRef.current.selectionEnd = pos + 1;
          }
        });
      }
    }
    if (isPushToTalkRef.current) {
      isPushToTalkRef.current = false;
      stopVad();
      recordModeRef.current = "stopping";
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    }
  }

  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!selectedRepo) {
      toast.error("Select a repo first");
      return;
    }
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) addFiles(files);
  }

  const hasConversation = messages.length > 1;
  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full max-h-[calc(var(--app-height,100dvh)-100px)] md:max-h-[calc(var(--app-height,100dvh)-0)]">
      {/* Top context bar */}
      <div className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                agent active
              </span>
            </div>

            <div className="h-4 w-px bg-border shrink-0" />

            <Popover
              open={repoPickerOpen}
              onOpenChange={(open) => {
                setRepoPickerOpen(open);
                if (!open) setRepoSearch("");
              }}
            >
              <PopoverTrigger className="flex items-center gap-2 font-mono text-xs text-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-muted min-w-0">
                <GitFork className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate max-w-[320px]">
                  {selectedRepoName || "select repo"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="w-80 p-0">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repos..."
                    className="w-full bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        if (repo.fullName !== selectedRepoName) {
                          handleNewChat();
                        }
                        setSelectedRepoName(repo.fullName);
                        setRepoPickerOpen(false);
                        setRepoSearch("");
                      }}
                      className="flex items-center justify-between w-full rounded px-2 py-1.5 font-mono text-xs text-foreground hover:bg-muted transition"
                    >
                      <span className="break-all text-left">{repo.fullName}</span>
                      {selectedRepoName === repo.fullName && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                  {filteredRepos.length === 0 && (
                    <p className="font-mono text-xs text-muted-foreground text-center py-3">
                      No repos found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {hasConversation && (
            <button
              type="button"
              onClick={handleNewChat}
              title="Reset session"
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 bg-card hover:bg-muted rounded px-2 py-1 transition-colors shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">[reset]</span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 flex items-center gap-3 py-4 select-none">
          <div className="h-px bg-border flex-1" />
          <span className="flex items-center gap-1.5">
            <Terminal className="h-3 w-3" />
            session start
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        {messages.map((msg) => (
          <MessageBlock
            key={msg.id}
            msg={msg}
            userName={userName}
            sending={sending}
            onRetry={handleRetry}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Staging area + composer */}
      <div className="shrink-0 border-t border-border bg-card/40 backdrop-blur-sm px-3 sm:px-4 py-3">
        {/* Attachment staging */}
        {screenshots.length > 0 && (
          <div className="mb-2 flex flex-col gap-1.5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" />
              staged ({screenshots.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {screenshots.map((src, i) => (
                <FileToken
                  key={i}
                  src={src}
                  name={`screenshot_${i + 1}.jpg`}
                  size={screenshotFiles[i]?.size}
                  onClick={() => setStagedPreview(src)}
                  onRemove={() => removeScreenshot(i)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Staged screenshot lightbox */}
        <Dialog
          open={stagedPreview !== null}
          onOpenChange={(open) => { if (!open) setStagedPreview(null); }}
        >
          <DialogContent className="sm:max-w-3xl p-2">
            <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
            {stagedPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stagedPreview}
                alt="Screenshot preview"
                className="w-full h-auto rounded-lg object-contain max-h-[80vh]"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Composer */}
        <div
          className={`border rounded-md transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-background/60 focus-within:border-primary/50"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || !selectedRepoName}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
              title={selectedRepoName ? "Attach screenshot" : "Select a repo first"}
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <span className="font-mono text-[10px] text-muted-foreground/70 flex-1 truncate">
              context: {selectedRepoName || "—"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/50 hidden sm:inline">
              enter to send · shift+enter newline · ⌘V / ctrl+V paste screenshot
            </span>
          </div>

          {/* Input row */}
          <div className="flex items-start gap-2 px-2 py-2 relative">
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center rounded-b-md pointer-events-none">
                <span className="font-mono text-xs text-primary/80 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" />
                  drop to attach
                </span>
              </div>
            )}
            <div className="pt-1.5 pl-1 font-mono text-sm text-primary shrink-0 select-none">~ $</div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (isEnhanced) { setIsEnhanced(false); setOriginalInput(null); }
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPaste={handlePaste}
              placeholder={
                isTranscribing ? "Transcribing…" :
                isListening ? "Listening… speak now" :
                selectedRepoName ? "describe a bug, paste a log, or paste / drop a screenshot..." :
                "select a repo above to get started..."
              }
              rows={1}
              className="flex-1 min-w-0 resize-none bg-transparent border-0 outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground/50 min-h-8 max-h-40 py-1.5 leading-relaxed"
              disabled={sending || !selectedRepoName}
            />
            <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
              <button
                type="button"
                onClick={handleEnhance}
                disabled={enhancing || sending || !input.trim() || isEnhanced}
                className="flex items-center justify-center h-7 w-7 rounded bg-muted/40 text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:border-border"
                title="AI enhance — polish your text"
              >
                {enhancing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                disabled={sending || !selectedRepoName}
                className={`flex items-center justify-center h-7 w-7 rounded border transition-colors disabled:opacity-40 ${
                  isListening
                    ? "bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border hover:border-muted-foreground/40"
                }`}
                title={isListening ? "Stop recording" : "Voice input"}
              >
                {isTranscribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || (!input.trim() && screenshots.length === 0)}
                className="flex items-center justify-center h-7 w-7 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-colors disabled:opacity-40 disabled:hover:bg-primary/10 disabled:hover:border-primary/30"
                title="Send (Enter)"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
              <kbd className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase hidden sm:inline">
                ↵
              </kbd>
            </div>
          </div>
          {/* REC badge */}
          {(isListening || isTranscribing) && (
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full animate-pulse ${isTranscribing ? "bg-amber-400" : "bg-red-500"}`} />
              <span className={`font-mono text-[10px] ${isTranscribing ? "text-amber-400" : "text-red-400"}`}>
                {isTranscribing ? "transcribing…" : "REC — speak now"}
              </span>
            </div>
          )}

          {/* AI enhance accept/reject bar */}
          {isEnhanced && originalInput !== null && (
            <div className="flex items-center gap-2 px-3 pb-2">
              <Sparkles className="h-3 w-3 text-primary/70 shrink-0" />
              <span className="font-mono text-[10px] text-muted-foreground flex-1">AI enhanced</span>
              <button
                type="button"
                onClick={acceptEnhance}
                className="font-mono text-[10px] px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={restoreOriginal}
                className="font-mono text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
              >
                Restore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
