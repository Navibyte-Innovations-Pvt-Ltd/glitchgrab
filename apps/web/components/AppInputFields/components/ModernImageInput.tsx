import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import {
  ControllerRenderProps,
  FieldValues,
  Path,
  useFormContext,
} from "react-hook-form";
import { FormField } from "@/components/ui/form";
import toast from "react-hot-toast";

interface ModernImageInputProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  uploadLabel?: string;
  footerNote?: string | null;
}

interface ModernImageFieldProps<T extends FieldValues = FieldValues> {
  field: ControllerRenderProps<T, Path<T>>;
  fieldState?: { error?: { message?: string } };
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  uploadLabel?: string;
  footerNote?: string | null;
}

const ModernImageField = <T extends FieldValues = FieldValues>({
  field,
  fieldState,
  label,
  description,
  required = false,
  className,
  disabled = false,
  uploadLabel,
  footerNote,
}: ModernImageFieldProps<T>) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Combine local error and form error
  const errorMessage = localError || fieldState?.error?.message;

  // Show default image if present — deferred to avoid synchronous setState in effect body
  useEffect(() => {
    const value = field.value;
    let objectUrl: string | null = null;
    const id = setTimeout(() => {
      if (typeof value === "string" && value) {
        setImagePreview(value.startsWith("blob:") ? value : `${value}?v=1`);
      } else if ((value as unknown) instanceof File) {
        objectUrl = URL.createObjectURL(value as File);
        setImagePreview(objectUrl);
      } else {
        setImagePreview(null);
      }
    }, 0);
    return () => {
      clearTimeout(id);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [field.value]);

  // Validate image file
  const validateImageFile = async (file: File): Promise<boolean> => {
    // Check if file exists
    if (!file) {
      if (required) {
        setLocalError("No file selected");
        toast.error("Please select a file to upload");
        return false;
      }
      return true;
    }

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setLocalError("Only image files are allowed");
      toast.error(
        "Invalid file type. Only image files (JPEG, PNG, GIF, WEBP, SVG) are allowed.",
      );
      return false;
    }

    // Check for specific image types
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      setLocalError("Unsupported image format");
      toast.error(
        "Unsupported image format. Please use JPEG, PNG, GIF, WEBP, or SVG.",
      );
      return false;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setLocalError("File size exceeds 10MB limit");
      toast.error("File is too large. Maximum size is 10MB.");
      return false;
    }

    // Check minimum file size (to prevent empty or corrupted files)
    const minSize = 100; // 100 bytes
    if (file.size < minSize) {
      setLocalError("File is too small or corrupted");
      toast.error("File appears to be corrupted or empty.");
      return false;
    }

    // Validate image dimensions (for non-SVG files)
    if (file.type !== "image/svg+xml") {
      try {
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
              reject(new Error("Failed to load image"));
            };
            img.src = URL.createObjectURL(file);
          },
        );

        // Check minimum dimensions
        if (dimensions.width < 10 || dimensions.height < 10) {
          setLocalError("Image dimensions too small");
          toast.error(
            "Image dimensions are too small. Minimum size is 10x10 pixels.",
          );
          return false;
        }
        // Check maximum dimensions
      } catch {
        setLocalError("Invalid image file");
        toast.error("The file appears to be corrupted or invalid.");
        return false;
      }
    }

    setLocalError(null);
    return true;
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = await validateImageFile(file);
      if (isValid) {
        field.onChange(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (required) {
        setLocalError("No file selected");
        toast.error("Please select a file to upload");
      } else {
        setLocalError(null);
      }
    }
  };

  // Handle drag and drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isValid = await validateImageFile(file);
      if (isValid) {
        field.onChange(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  // Extract image file from a ClipboardEvent — handles both `files` and `items`
  const extractImageFromClipboard = (
    clipboardData: DataTransfer | null,
  ): File | null => {
    if (!clipboardData) return null;
    if (clipboardData.files && clipboardData.files.length > 0) {
      const f = clipboardData.files[0];
      if (f.type.startsWith("image/")) return f;
    }
    const items = clipboardData.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) return f;
        }
      }
    }
    return null;
  };

  const acceptPastedImage = async (file: File) => {
    const isValid = await validateImageFile(file);
    if (isValid) {
      field.onChange(file);
      setImagePreview(URL.createObjectURL(file));
      toast.success("Image pasted from clipboard");
    }
  };

  // Handle paste inside the drop zone (when it's focused)
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const file = extractImageFromClipboard(e.clipboardData);
    if (file) {
      e.preventDefault();
      await acceptPastedImage(file);
    }
  };

  // Accept Ctrl+V / Cmd+V from anywhere on the page while this component is
  // mounted — but only if the active element isn't already an editable
  // surface (input, textarea, contenteditable). First such component to
  // claim the paste wins, others ignore it.
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled) return;

    const onWindowPaste = async (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        active?.isContentEditable === true;
      if (isEditable) return;

      const file = extractImageFromClipboard(e.clipboardData);
      if (!file) return;

      // First-claim wins across multiple ModernImageInput instances.
      if ((window as unknown as { __mii_paste_claimed?: boolean }).__mii_paste_claimed) return;
      (window as unknown as { __mii_paste_claimed?: boolean }).__mii_paste_claimed = true;
      setTimeout(() => {
        (window as unknown as { __mii_paste_claimed?: boolean }).__mii_paste_claimed = false;
      }, 100);

      e.preventDefault();
      await acceptPastedImage(file);
    };

    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Remove/clear image
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    field.onChange("");
    if (required) {
      setLocalError("No file selected");
      toast.error("Please select a file to upload");
    } else {
      setLocalError(null);
    }
  };

  return (
    <div className={cn("mb-6 flex w-full flex-col items-center", className)}>
      {label && (
        <label className="mb-3 block w-full text-left text-sm font-semibold text-gray-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={cn(
          "group relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 transition-all duration-300 hover:bg-gray-50",
          isDragActive && "border-blue-500 bg-blue-50",
          errorMessage && "border-red-400 bg-red-50/50",
          imagePreview && "border-solid border-gray-200 bg-white shadow-sm",
          disabled && "cursor-not-allowed opacity-60 hover:bg-gray-50/50",
        )}
        ref={dropZoneRef}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={label || "Upload image"}
        aria-disabled={disabled}
      >
        {imagePreview ? (
          <div className="relative flex h-full w-full items-center justify-center p-4">
            <Image
              width={300}
              height={200}
              src={imagePreview}
              alt="Preview"
              className="max-h-full max-w-full rounded-md object-contain"
            />
            {!disabled && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label="Remove image"
                  className="absolute top-2 right-2 z-10 h-7 w-7 rounded-md shadow-lg"
                  onClick={handleRemoveImage}
                  tabIndex={0}
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-all duration-200 hover:bg-black/10">
                  <div className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Click to change
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-blue-100 transition-colors group-hover:bg-blue-200">
              <ImagePlus
                className={cn("h-6 w-6 text-blue-600", disabled && "grayscale")}
              />
            </div>
            <p className="mb-1 text-sm font-medium text-gray-900">
              {uploadLabel || "Drag & Drop or Click to Upload"}
            </p>
            <p className="mb-4 text-xs text-gray-500">
              PNG, JPG or SVG (max. 10MB)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                disabled && "cursor-not-allowed opacity-50",
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) fileInputRef.current?.click();
              }}
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Choose File
            </Button>
          </div>
        )}

        {description && (
          <p className="absolute right-2 bottom-2 left-2 rounded bg-white/80 px-2 py-1 text-center text-xs text-gray-500">
            {description}
          </p>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={disabled}
        />

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-blue-500 bg-blue-500/10">
            <div className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white">
              Drop image here
            </div>
          </div>
        )}
      </div>

      {footerNote !== null && (
        <p
          className={cn(
            "mt-2 text-xs text-muted-foreground",
            errorMessage && "hidden", // Hide footer note if there is an error
          )}
        >
          {footerNote}
        </p>
      )}

      {errorMessage && (
        <p className="mt-2 text-center text-sm font-medium text-red-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

const ModernImageInput = <T extends FieldValues>({
  name,
  label,
  description,
  required = false,
  className,
  disabled,
  uploadLabel,
  footerNote,
}: ModernImageInputProps<T>) => {
  const form = useFormContext<T>();

  if (!form)
    throw new Error("ModernImageInput must be used within a FormProvider");

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field, fieldState }) => (
        <ModernImageField
          field={field}
          fieldState={fieldState}
          label={label}
          description={description}
          required={required}
          className={className}
          disabled={disabled}
          uploadLabel={uploadLabel}
          footerNote={footerNote}
        />
      )}
    />
  );
};

export default ModernImageInput;
