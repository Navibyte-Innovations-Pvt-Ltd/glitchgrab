"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Camera,
  CameraIcon,
  CameraOff,
  ImageIcon,
  Loader2,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Square,
  Circle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ControllerRenderProps,
  FieldValues,
  Path,
  useFormContext,
} from "react-hook-form";
import { BaseInputProps } from "../../InputField";
import { Camera as CameraComponent, CameraRef } from "./Camera";
import { ImageCropper } from "./ImageCropper";

const isFile = (value: unknown): value is File => value instanceof File;

const ImageInput = <T extends FieldValues>({
  label,
  name,
  className,
  disabled,
  required = false,
  description,
  placeholder,
  uploadLabel,
  footerNote,
}: Omit<BaseInputProps<T>, "form"> & {
  uploadLabel?: string;
  footerNote?: string | null;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"camera" | "gallery">("gallery");
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"circular" | "rectangular">(
    "circular"
  );
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "prompt" | "granted" | "denied" | "unsupported"
  >("prompt");
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<CameraRef>(null);
  const form = useFormContext<T>();

  // Check camera permissions when dialog opens
  const checkCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.permissions) {
      setCameraPermission("unsupported");
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });

      setCameraPermission(
        permissionStatus.state as "prompt" | "granted" | "denied"
      );

      // Listen for permission changes
      permissionStatus.addEventListener("change", () => {
        setCameraPermission(
          permissionStatus.state as "prompt" | "granted" | "denied"
        );
      });

      setHasCheckedPermissions(true);
    } catch (error) {
      console.error("Error checking camera permission:", error);
      setCameraPermission("unsupported");
    }
  }, []);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl]);

  const stopCameraStream = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stopCamera();
    }
  }, []);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (open && !hasCheckedPermissions) {
      checkCameraPermission();
    }

    if (!open) {
      setCropImageUrl(null);
      setCropMode("circular");
      setImageDimensions(null);
      stopCameraStream();
    }
  };

  if (!form) {
    throw new Error("ImageInput must be used within a FormProvider");
  }

  const handleFileChange = useCallback(
    async (file: File, field: ControllerRenderProps<T, Path<T>>) => {
      if (file) {
        setIsUploading(true);
        try {
          // Simulate file processing time
          await new Promise((resolve) => setTimeout(resolve, 500));
          field.onChange(file);
        } finally {
          setIsUploading(false);
        }
      }
    },
    []
  );

  const detectImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const determineOptimalCropMode = (
    width: number,
    height: number
  ): "circular" | "rectangular" => {
    const aspectRatio = width / height;
    // Use rectangular crop for wide (>1.5) or tall (<0.67) images
    // Use circular crop for more square-ish images (0.67 to 1.5)
    return aspectRatio > 1.5 || aspectRatio < 0.67 ? "rectangular" : "circular";
  };

  const handleGalleryFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stop camera when switching to gallery
      stopCameraStream();

      // Detect image dimensions and set optimal crop mode
      const dimensions = await detectImageDimensions(file);
      setImageDimensions(dimensions);
      const optimalMode = determineOptimalCropMode(
        dimensions.width,
        dimensions.height
      );
      setCropMode(optimalMode);

      const imageUrl = URL.createObjectURL(file);
      setCropImageUrl(imageUrl);
    }
  };

  const handleCropComplete = (
    croppedFile: File,
    field: ControllerRenderProps<T, Path<T>>
  ) => {
    handleFileChange(croppedFile, field);
    setCropImageUrl(null);
    setIsDialogOpen(false);
  };

  const handleCropCancel = () => {
    setCropImageUrl(null);
    // Only restart camera if we're in camera tab
    if (activeTab === "camera") {
      // Camera will start automatically when component remounts
    }
  };

  const handleSwitchToGallery = () => {
    stopCameraStream();
    setActiveTab("gallery");
    setTimeout(() => {
      hiddenInputRef.current?.click();
    }, 100);
  };

  const renderPermissionRequest = () => (
    <div className="flex min-h-75 animate-in flex-col items-center justify-center space-y-4 rounded-lg bg-muted/10 p-6 text-center fade-in-50">
      <div
        className={cn(
          "mb-2 rounded-full p-4",
          cameraPermission === "denied" ? "bg-red-100" : "bg-primary/10"
        )}
      >
        {cameraPermission === "denied" ? (
          <ShieldAlert className="h-10 w-10 text-red-500" />
        ) : (
          <CameraIcon className="h-10 w-10 text-primary" />
        )}
      </div>

      <h3 className="text-lg font-medium">
        {cameraPermission === "denied"
          ? "Camera access blocked"
          : "Camera permission needed"}
      </h3>

      <p className="max-w-75 text-sm text-muted-foreground">
        {cameraPermission === "denied"
          ? "Please enable camera access in your browser settings to take a photo."
          : "We need your permission to access your camera for taking profile photos."}
      </p>

      {cameraPermission === "denied" ? (
        <div className="mt-2 flex w-full max-w-62.5 flex-col space-y-2">
          <Button
            onClick={() =>
              window.open(
                "https://support.google.com/chrome/answer/2693767",
                "_blank"
              )
            }
            variant="outline"
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            How to enable camera
          </Button>
          <Button
            onClick={() => {
              // Switch to gallery as fallback
              setActiveTab("gallery");
            }}
            variant="secondary"
            className="w-full"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Use gallery instead
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => {
            // This will trigger the browser's permission prompt
            navigator.mediaDevices
              .getUserMedia({ video: true })
              .then((stream) => {
                // Stop the stream immediately, we just needed the permission
                stream.getTracks().forEach((track) => track.stop());
                setCameraPermission("granted");
              })
              .catch(() => {
                setCameraPermission("denied");
              });
          }}
          className="mt-4"
          size="lg"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Allow Camera Access
        </Button>
      )}
    </div>
  );

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem
          className={cn(
            "w-full",
            "group transition-all duration-300 ease-in-out",
            "flex flex-col items-center"
          )}
        >
          <FormLabel
            className={cn(
              "text-sm font-medium",
              "transition-colors duration-200",
              "group-hover:text-primary",
              required && "after:ml-0.5 after:text-red-500 after:content-['*']"
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <div className="relative flex w-full flex-col items-center">
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <div
                    className={cn(
                      "flex border-2 border-dashed px-2",
                      "flex-col items-center py-1.5",
                      "h-48 w-48 justify-center rounded-full",
                      "cursor-pointer transition-all duration-300",
                      "group/upload relative overflow-hidden",
                      field?.value
                        ? "border-primary/40 shadow-md"
                        : "border-gray-200 hover:border-primary hover:shadow-md",
                      isHovering && "border-primary/60 shadow-lg",
                      disabled && "cursor-not-allowed opacity-70",
                      className
                    )}
                    style={{
                      backgroundImage: field?.value
                        ? `linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.1)), url(${
                            isFile(field?.value)
                              ? URL.createObjectURL(field?.value)
                              : field?.value
                          })`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    aria-disabled={disabled}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 transition-all duration-300",
                        field?.value
                          ? "bg-linear-to-b from-black/0 to-black/20"
                          : "bg-[#f8f8ff59]",
                        "group-hover/upload:opacity-80"
                      )}
                    />

                    {isUploading ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                      </div>
                    ) : field?.value ? (
                      <>
                        <div className="absolute top-2 right-2 z-10">
                          <div className="rounded-full bg-white/80 p-1 backdrop-blur-sm">
                            <Sparkles className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center opacity-0 transition-all duration-300 group-hover/upload:opacity-100">
                          <UploadCloud className="mb-2 h-8 w-8 text-white drop-shadow-lg" />
                          <p className="text-xs font-medium text-white drop-shadow-lg">
                            Change Photo
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="z-10 flex h-full w-full flex-col items-center justify-center transition-transform duration-300 group-hover/upload:scale-105">
                        <div className="mb-3 rounded-full bg-primary/10 p-3 transition-all duration-300 group-hover/upload:bg-primary/20">
                          <CameraIcon className="h-7 w-7 text-primary" />
                        </div>
                        <p className="text-sm font-medium transition-colors group-hover/upload:text-primary">
                          {uploadLabel || "Upload Photo"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {placeholder || "Click to select"}
                        </p>
                      </div>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="h-auto max-h-[90vh] w-full max-w-[95vw] overflow-y-auto p-0 sm:max-w-md">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="text-center text-xl font-semibold">
                      {uploadLabel || "Upload Photo"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4 p-4 pt-2">
                    {!cropImageUrl && (
                      <div className="w-full">
                        <Tabs
                          value={activeTab}
                          onValueChange={(value) =>
                            setActiveTab(value as "camera" | "gallery")
                          }
                          className="w-full"
                        >
                          <TabsList className="mb-4 grid w-full grid-cols-2">
                            <TabsTrigger
                              value="camera"
                              className="flex items-center gap-2"
                            >
                              {cameraPermission === "denied" ? (
                                <CameraOff className="h-4 w-4" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                              Camera
                            </TabsTrigger>
                            <TabsTrigger
                              value="gallery"
                              className="flex items-center gap-2"
                              onClick={handleSwitchToGallery}
                            >
                              <ImageIcon className="h-4 w-4" />
                              Gallery
                            </TabsTrigger>
                          </TabsList>

                          <div className="w-full overflow-hidden rounded-lg">
                            <TabsContent value="camera" className="m-0">
                              <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-linear-to-b from-slate-50 to-slate-100">
                                {cameraPermission === "prompt" ||
                                cameraPermission === "denied" ? (
                                  renderPermissionRequest()
                                ) : (
                                  <CameraComponent
                                    ref={cameraRef}
                                    onCapture={async (file: File) => {
                                      // Detect image dimensions and set optimal crop mode
                                      const dimensions =
                                        await detectImageDimensions(file);
                                      setImageDimensions(dimensions);
                                      const optimalMode =
                                        determineOptimalCropMode(
                                          dimensions.width,
                                          dimensions.height
                                        );
                                      setCropMode(optimalMode);

                                      // Create a URL for the cropper
                                      const imageUrl =
                                        URL.createObjectURL(file);
                                      setCropImageUrl(imageUrl);
                                    }}
                                  />
                                )}
                              </div>
                            </TabsContent>

                            <TabsContent value="gallery" className="m-0">
                              <div className="flex min-h-70 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-linear-to-b from-slate-50 to-slate-100">
                                <div className="flex animate-in flex-col items-center justify-center space-y-4 p-6 text-center fade-in-50">
                                  <div className="rounded-full bg-primary/10 p-4">
                                    <UploadCloud className="h-8 w-8 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-700">
                                      Select an image from your device
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                      PNG, JPG, GIF or WEBP (max. 10MB)
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      hiddenInputRef.current?.click()
                                    }
                                    className="mt-4 h-10 px-6 transition-all duration-300 hover:border-primary hover:shadow-md"
                                  >
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Browse Files
                                  </Button>
                                </div>
                              </div>
                            </TabsContent>
                          </div>
                        </Tabs>
                      </div>
                    )}

                    {cropImageUrl && (
                      <div className="w-full space-y-4">
                        {/* Crop Mode Toggle */}
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Crop Mode:
                            </span>
                            {imageDimensions && (
                              <span className="text-xs text-muted-foreground">
                                {imageDimensions.width}×{imageDimensions.height}
                                {cropMode === "rectangular"
                                  ? " (Wide image detected)"
                                  : " (Square-ish image)"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 rounded-md bg-background p-1">
                            <Button
                              variant={
                                cropMode === "circular" ? "default" : "ghost"
                              }
                              size="sm"
                              onClick={() => setCropMode("circular")}
                              className="h-8 px-3"
                            >
                              <Circle className="mr-1 h-3 w-3" />
                              Circle
                            </Button>
                            <Button
                              variant={
                                cropMode === "rectangular" ? "default" : "ghost"
                              }
                              size="sm"
                              onClick={() => setCropMode("rectangular")}
                              className="h-8 px-3"
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Rectangle
                            </Button>
                          </div>
                        </div>

                        {/* Cropper */}
                        <div className="flex min-h-70 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-linear-to-b from-slate-50 to-slate-100">
                          <ImageCropper
                            imageUrl={cropImageUrl}
                            onCropComplete={(file) =>
                              handleCropComplete(file, field)
                            }
                            onCancel={handleCropCancel}
                            aspectRatio={
                              cropMode === "circular" ? 1 : undefined
                            }
                            cropMode={cropMode}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {cameraPermission === "denied" && activeTab === "camera" && (
                    <DialogFooter className="p-4 pt-0">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("gallery")}
                        className="w-full"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Switch to Gallery
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
              <input
                type="file"
                accept="image/png,image/gif,image/jpeg,image/webp"
                onChange={handleGalleryFileSelect}
                className="hidden"
                ref={hiddenInputRef}
              />
            </div>
          </FormControl>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {footerNote && (
            <p
              className={cn(
                "mt-2 animate-in text-xs fade-in-50",
                field?.value ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {footerNote}
            </p>
          )}
          <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
        </FormItem>
      )}
    />
  );
};

export default ImageInput as <T extends FieldValues>(
  props: Omit<BaseInputProps<T>, "form"> & {
    uploadLabel?: string;
    footerNote?: string | null;
  }
) => React.ReactNode;
