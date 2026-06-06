"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useFormContext, useWatch } from "react-hook-form";
import { InputFieldProps } from "./InputField";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  Link2Off,
  Minus,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Redo,
  Undo,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  Wand2,
  LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import markdown from "@wcj/markdown-to-html";

import { toast } from "react-hot-toast";

function convertMarkdown(text: string): string {
  const html = markdown(text.replace(/\n{3,}/g, "\n\n"));
  if (typeof html !== "string") return "";
  // Strip whitespace-only text nodes between block elements — ProseMirror wraps them
  // into <p> tags, and TipTap's break-spaces renders each \n as a visible line break.
  return html
    .replace(/(<\/(?:h[1-6]|p|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|div|pre)>)\s+(<)/gi, "$1$2")
    .replace(/<p[^>]*>\s*<\/p>/gi, "");
}
import { useMutation } from "@tanstack/react-query";

/** Upload a File to S3 via the editor upload API, returns the hosted URL */
async function uploadEditorImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/editor/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  const data = await res.json();
  return data.url;
}

const markdownRegex =
  /(^#{1,6}\s)|(^\s*[\-\*]\s)|(\[.+\]\(.+\))|([\*_]{1,2}.+[\*_]{1,2})/m;

interface InputEditorV2Props extends Omit<InputFieldProps, "form" | "type"> {
  maxLength?: number;
  context?: string;
  defaultPrompt?: string;
  minHeight?: string;
}

// ToolbarButton component - defined outside to avoid re-creation during render
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  tooltip: string;
  className?: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  icon: Icon,
  tooltip,
  className,
}: ToolbarButtonProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onClick();
            }}
            disabled={disabled}
            className={cn(
              "h-7 w-7 shrink-0 p-0",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground",
              className,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-2 py-1 text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Toolbar component for rich text editing
const EditorToolbar = ({
  editor,
  onAiClick,
  onLinkClick,
  disabled = false,
}: {
  editor: Editor | null;
  onAiClick: () => void;
  onLinkClick: () => void;
  disabled?: boolean;
}) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-muted/20 p-1.5">
      {/* History */}
      <div className="mr-1 flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo() || disabled}
          icon={Undo}
          tooltip="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo() || disabled}
          icon={Redo}
          tooltip="Redo"
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border/60" />

      {/* Headings */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          icon={Heading1}
          tooltip="Heading 1"
        />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          icon={Heading2}
          tooltip="Heading 2"
        />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          icon={Heading3}
          tooltip="Heading 3"
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border/60" />

      {/* Inline formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          disabled={disabled}
          icon={Bold}
          tooltip="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          disabled={disabled}
          icon={Italic}
          tooltip="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          disabled={disabled}
          icon={UnderlineIcon}
          tooltip="Underline"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          disabled={disabled}
          icon={Strikethrough}
          tooltip="Strikethrough"
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border/60" />

      {/* Lists & Block */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          disabled={disabled}
          icon={List}
          tooltip="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          disabled={disabled}
          icon={ListOrdered}
          tooltip="Numbered List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          disabled={disabled}
          icon={Quote}
          tooltip="Quote"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          icon={Minus}
          tooltip="Horizontal Rule"
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border/60" />

      {/* Link */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={onLinkClick}
          isActive={editor.isActive("link")}
          disabled={disabled}
          icon={Link2}
          tooltip="Add Link"
        />
        {editor.isActive("link") && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            icon={Link2Off}
            tooltip="Remove Link"
          />
        )}
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border/60" />

      {/* Text Align */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          disabled={disabled}
          icon={AlignLeft}
          tooltip="Align Left"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          disabled={disabled}
          icon={AlignCenter}
          tooltip="Align Center"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          disabled={disabled}
          icon={AlignRight}
          tooltip="Align Right"
        />
      </div>

      <div className="flex-1" />

      {/* AI Button - Highlighted */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAiClick}
        disabled={disabled}
        className="h-7 gap-1.5 px-2.5 text-xs text-primary hover:bg-primary/5 hover:text-primary dark:text-primary dark:hover:bg-primary/10"
      >
        <Wand2 className="h-3.5 w-3.5" />
        <span className="font-medium">AI Write</span>
      </Button>
    </div>
  );
};

const InputEditorV2 = (props: InputEditorV2Props) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled,
    description,
    required,
    context,
    defaultPrompt,
    minHeight = "200px",
  } = props;
  const form = useFormContext();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt || "");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const isUpdatingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentValue = useWatch({
    control: form.control,
    name: name,
  });

  if (!form) {
    throw new Error("InputEditorV2 must be used within a FormProvider");
  }

  // Create editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: "list-disc pl-4 ml-2 space-y-1",
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: "list-decimal pl-4 ml-2 space-y-1",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-slate-200 pl-4 italic text-slate-600 my-4",
          },
        },
      }),
      Underline.configure({
        HTMLAttributes: {
          class: "underline",
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing...",
        emptyEditorClass:
          "is-editor-empty before:text-slate-400 before:content-[attr(data-placeholder)] before:float-left before:pointer-events-none before:h-0",
      }),
      CharacterCount.configure({
        limit: props.maxLength,
      }),
      TiptapImage.configure({
        HTMLAttributes: {
          class: "rounded-lg border max-w-full h-auto my-2",
        },
        allowBase64: false,
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "w-full border-collapse my-4 text-sm",
        },
      }),
      TableRow.configure({
        HTMLAttributes: { class: "border-b border-slate-200" },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-slate-50 text-left font-semibold px-3 py-2 border border-slate-200",
        },
      }),
      TableCell.configure({
        HTMLAttributes: { class: "px-3 py-2 border border-slate-200" },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm min-h-[inherit] max-w-none prose-slate focus:outline-none",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
          "prose-p:my-2 prose-p:leading-relaxed prose-hr:my-3 prose-hr:border-slate-200 [&_.tableWrapper]:mt-0 [&_p:empty]:hidden",
          "prose-img:max-w-full prose-img:rounded-lg prose-img:border",
          "prose-code:bg-transparent prose-code:p-0 prose-code:text-inherit prose-pre:bg-transparent prose-pre:p-0 prose-pre:text-inherit",
          "p-4",
        ),
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && event.ctrlKey) {
          return false;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;

            toast.promise(
              uploadEditorImage(file).then((url) => {
                editor?.chain().focus().setImage({ src: url }).run();
              }),
              {
                loading: "Uploading image...",
                success: "Image uploaded",
                error: "Failed to upload image",
              },
            );
            return true;
          }
        }

        // Markdown paste: if the plain-text portion of the clipboard looks
        // like markdown, convert to HTML and insert. Some editors (VS Code,
        // Cursor, GitHub) also put text/html on the clipboard, so we no
        // longer gate on "!html" — markdown in text/plain wins when present.
        const text = event.clipboardData?.getData("text/plain");
        if (text && markdownRegex.test(text)) {
          const converted = convertMarkdown(text);
          if (converted) {
            event.preventDefault();
            editor?.chain().focus().insertContent(converted).run();
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;

        event.preventDefault();
        toast.promise(
          uploadEditorImage(imageFile).then((url) => {
            editor?.chain().focus().setImage({ src: url }).run();
          }),
          {
            loading: "Uploading image...",
            success: "Image uploaded",
            error: "Failed to upload image",
          },
        );
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      // Avoid infinite loop if content is effectively same
      if (html === currentValue) return;

      isUpdatingRef.current = true;
      form.setValue(name, html, { shouldValidate: true, shouldDirty: true });

      // Reset updating flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    },
    onFocus: () => {
      containerRef.current?.setAttribute("data-focused", "true");
    },
    onBlur: () => {
      containerRef.current?.removeAttribute("data-focused");
    },
  });

  // Sync editor content when form value changes externally
  useEffect(() => {
    if (!editor) return;

    // If we are currently domesticating an update from the editor itself, skip
    if (isUpdatingRef.current) return;

    const editorContent = editor.getHTML();

    // Normalize empty values for comparison
    const normalizedValue = currentValue || "";
    const normalizedEditor = editorContent === "<p></p>" ? "" : editorContent;

    // Only update if content is actually different to avoid cursor jumping
    if (normalizedValue !== normalizedEditor) {
      isUpdatingRef.current = true;

      // Handle markdown content if present
      const html =
        typeof normalizedValue === "string" &&
        markdownRegex.test(normalizedValue)
          ? convertMarkdown(normalizedValue)
          : normalizedValue;

      editor.commands.setContent(typeof html === "string" ? html : "");

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  }, [editor, currentValue]);

  // AI Generation
  const generateContentMutation = useMutation({
    mutationFn: async (params: {
      currentContent: string;
      userPrompt: string;
      context?: string;
    }) => {
      const res = await fetch("/api/editor/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate content");
      }
      return await res.json();
    },
    onSuccess: (result) => {
      if (result.success && result.content && editor) {
        isUpdatingRef.current = true;
        if (markdownRegex.test(result.content)) {
          const html = convertMarkdown(result.content);
          if (html) editor.commands.setContent(html);
        } else {
          editor.commands.setContent(result.content);
        }

        // Manually update form state to ensure it's marked as dirty
        const currentContent = editor.getHTML();
        form.setValue(name, currentContent, {
          shouldValidate: true,
          shouldDirty: true,
        });

        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
        setAiPrompt("");
        setIsAiOpen(false);
        toast.success("Content generated successfully!");
      } else {
        toast.error(result.error || "Failed to generate content");
      }
    },
    onError: () => toast.error("An error occurred while generating content"),
  });

  const handleGenerate = () => {
    if (!aiPrompt.trim() || !editor) return;
    generateContentMutation.mutate({
      currentContent: editor.getHTML() || "",
      userPrompt: aiPrompt.trim(),
      context,
    });
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(previousUrl || "https://");
    setLinkDialogOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className={cn("group flex w-full flex-col gap-2", className)}>
          <div className="flex shrink-0 items-center justify-between">
            <FormLabel
              className={cn(
                "text-sm font-medium transition-colors group-hover:text-primary",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']",
              )}
            >
              {label}
            </FormLabel>
            {isAiOpen && (
              <span className="animate-in text-[10px] font-medium text-primary fade-in">
                AI Assistant Active
              </span>
            )}
          </div>

          <FormControl className="flex flex-1 flex-col">
            <div
              ref={containerRef}
              className={cn(
                "relative flex h-full flex-1 flex-col rounded-lg border bg-background shadow-sm transition-all duration-200",
                "data-[focused=true]:border-primary data-[focused=true]:ring-1 data-[focused=true]:ring-primary/20",
                disabled && "cursor-not-allowed bg-muted opacity-60",
              )}
            >
              <EditorToolbar
                editor={editor}
                onAiClick={() => setIsAiOpen(true)}
                onLinkClick={openLinkDialog}
                disabled={disabled}
              />

              {/* Bubble Menu — appears on text selection */}
              {editor && (
                <BubbleMenu
                  editor={editor}
                  className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-lg"
                >
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    icon={Bold}
                    tooltip="Bold"
                  />
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    icon={Italic}
                    tooltip="Italic"
                  />
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    icon={UnderlineIcon}
                    tooltip="Underline"
                  />
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    icon={Strikethrough}
                    tooltip="Strikethrough"
                  />
                  <Separator orientation="vertical" className="mx-0.5 h-5 bg-border/60" />
                  <ToolbarButton
                    onClick={openLinkDialog}
                    isActive={editor.isActive("link")}
                    icon={Link2}
                    tooltip="Add Link"
                  />
                  {editor.isActive("link") && (
                    <ToolbarButton
                      onClick={() => editor.chain().focus().unsetLink().run()}
                      icon={Link2Off}
                      tooltip="Remove Link"
                    />
                  )}
                </BubbleMenu>
              )}

              {/* Link Dialog */}
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Insert Link</DialogTitle>
                    <DialogDescription>
                      Paste or type the URL for this link.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    autoFocus
                  />
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" size="sm">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="button" size="sm" onClick={applyLink}>
                      Apply
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="max-h-125 overflow-y-auto">
                <EditorContent
                  editor={editor}
                  style={{ minHeight }}
                  className="h-full flex-1 [&>div]:h-full [&>div]:flex-1"
                />
              </div>

              {/* AI Popover Overlay - Moved out of overflow-hidden and centered */}
              {isAiOpen && (
                <div className="absolute top-12 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 animate-in rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur duration-200 zoom-in-95 fade-in supports-backdrop-filter:bg-background/80">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Assistant
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-muted"
                      onClick={() => setIsAiOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      <span className="text-sm text-muted-foreground">✕</span>
                    </Button>
                  </div>

                  <Textarea
                    placeholder={
                      context
                        ? "Describe what to write... (Context aware)"
                        : "Describe what to write..."
                    }
                    className="mb-3 max-h-50 min-h-24 resize-none overflow-y-auto text-sm focus-visible:ring-primary/30"
                    value={aiPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setAiPrompt(e.target.value)
                    }
                    onKeyDown={(
                      e: React.KeyboardEvent<HTMLTextAreaElement>,
                    ) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    autoFocus
                  />

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-4 text-xs"
                      onClick={() => setIsAiOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-2 px-4 text-xs shadow-lg"
                      onClick={handleGenerate}
                      disabled={
                        generateContentMutation.isPending || !aiPrompt.trim()
                      }
                    >
                      {generateContentMutation.isPending ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" /> Generate
                        </>
                      )}
                    </Button>
                  </div>
                  {context && (
                    <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
                      <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                        AI Context (Internal)
                      </p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                        {context}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Character Count */}
              {props.maxLength && (
                <div className="absolute right-2 bottom-2 rounded border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
                  {editor?.storage.characterCount?.characters() || 0} /{" "}
                  {props.maxLength}
                </div>
              )}
            </div>
          </FormControl>

          <div className="flex min-h-5 items-start justify-between">
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
            <FormMessage className="ml-auto text-right text-xs" />
          </div>
        </FormItem>
      )}
    />
  );
};

export default InputEditorV2;
