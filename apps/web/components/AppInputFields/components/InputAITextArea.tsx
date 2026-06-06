"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_COLOR, INPUT_BORDER_FOCUS, INPUT_BORDER_HOVER, INPUT_ICON_SIZE, INPUT_ICON_COLOR, INPUT_PLACEHOLDER_COLOR } from "../input-styles";
import { useMutation } from "@tanstack/react-query";
import { Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "react-hot-toast";
import { InputFieldProps } from "../InputField";

interface InputAITextAreaProps extends Omit<InputFieldProps, "form" | "type"> {
  generationPrompt?: string;
  context?: string;
  maxLength?: number;
  aiButtonText?: string;
}

const InputAITextArea = (props: InputAITextAreaProps) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled,
    Icon,
    iconClassName,
    description,
    required,
    generationPrompt = "Generate professional content for this field",
    context = "",
    maxLength = 1000,
  } = props;

  const form = useFormContext();
  const [generatedText, setGeneratedText] = useState("");

  if (!form) {
    throw new Error("InputAITextArea must be used within a FormProvider");
  }

  // Use useMutation for AI generation (better for manual triggers)
  const { mutate: generateText, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generationPrompt,
          context: context,
          maxLength: maxLength,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.text) {
        setGeneratedText(data.text);
        toast.success("Content generated successfully!");
      }
    },
    onError: () => {
      toast.error("Failed to generate content. Please try again.");
    },
  });

  const generateAIContent = () => {
    generateText();
  };

  const applyGeneratedText = () => {
    if (generatedText) {
      form.setValue(name, generatedText);
      setGeneratedText("");
      toast.success("Content applied!");
    }
  };

  const copyToClipboard = () => {
    if (generatedText) {
      navigator.clipboard.writeText(generatedText);
      toast.success("Copied to clipboard!");
    }
  };

  const regenerateContent = () => {
    setGeneratedText("");
    generateAIContent();
  };

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => {
        return (
          <FormItem
            className={cn(
              "w-full",
              "group transition-all duration-300 ease-in-out",
              className
            )}
          >
            <FormLabel
              className={cn(
                "min-h-5 text-sm font-medium transition-colors",
                "group-hover:text-primary",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']"
              )}
            >
              {label}
            </FormLabel>
            <FormControl>
              <div className="space-y-3">
                <div className="group/textarea relative w-full">
                  {Icon && (
                    <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center">
                      <Icon
                        className={cn(
                          `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                          "group-hover:text-primary",
                          iconClassName
                        )}
                      />
                    </div>
                  )}

                  {/* AI Generation Button - Top Right */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateAIContent}
                    disabled={isGenerating || disabled}
                    className={cn(
                      "absolute top-2 right-2 z-20 h-8 w-8 p-0",
                      "bg-background/90 backdrop-blur-sm",
                      "border border-border/50",
                      "hover:border-primary/60 hover:bg-primary/10 hover:shadow-md",
                      "transition-all duration-300 ease-out",
                      "shadow-sm hover:shadow-primary/20",
                      "group/ai-btn",
                      isGenerating && "scale-105"
                    )}
                    title="Generate with AI"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary transition-transform group-hover/ai-btn:scale-110" />
                    )}
                  </Button>

                  <Textarea
                    className={cn(
                      "min-h-30 w-full pr-12",
                      "transition-all duration-200",
                      `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_FOCUS}`,
                      INPUT_BORDER_HOVER,
                      "rounded-md shadow-none",
                      INPUT_PLACEHOLDER_COLOR,
                      "focus:ring-1 focus:ring-primary/20",
                      "resize-none",
                      Icon ? "pt-3 pb-3 pl-10" : "pt-3 pb-3 pl-3"
                    )}
                    placeholder={placeholder}
                    {...field}
                  />
                </div>

                {/* Generated Content Preview */}
                {generatedText && (
                  <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-linear-to-br from-primary/5 to-primary/10">
                    {/* Header with gradient */}
                    <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-primary">
                          AI Generated Content
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copyToClipboard}
                          className="h-7 w-7 p-0 hover:bg-primary/10"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={regenerateContent}
                          disabled={isGenerating}
                          className="h-7 w-7 p-0 hover:bg-primary/10"
                          title="Regenerate content"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3 w-3",
                              isGenerating && "animate-spin"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="rounded-md border border-primary/10 bg-background/80 p-3 text-sm leading-relaxed backdrop-blur-sm">
                        {generatedText}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setGeneratedText("")}
                          className="text-xs"
                        >
                          Dismiss
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={applyGeneratedText}
                          className="bg-primary text-xs hover:bg-primary/90"
                        >
                          Apply Content
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </FormControl>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
            <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
          </FormItem>
        );
      }}
    />
  );
};

export default InputAITextArea;
