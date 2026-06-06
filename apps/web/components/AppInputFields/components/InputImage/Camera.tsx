import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CameraIcon,
  FlipHorizontal,
  RefreshCwIcon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  XIcon,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface CameraProps {
  onCapture: (file: File) => void;
}

export interface CameraRef {
  stopCamera: () => void;
}

type PermissionState = "prompt" | "granted" | "denied" | "not-supported";
type CameraFacingMode = "user" | "environment";

export const Camera = forwardRef<CameraRef, CameraProps>(
  ({ onCapture }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraContainerRef = useRef<HTMLDivElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [permissionState, setPermissionState] =
      useState<PermissionState>("prompt");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
    const [hasFrontAndBackCamera, setHasFrontAndBackCamera] = useState(false);

    const cleanupCamera = useCallback(() => {
      if (!videoRef.current) return;

      try {
        const stream = videoRef.current.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });
        }
        videoRef.current.srcObject = null;
        setIsCameraActive(false);
      } catch (error) {
        console.error("Error cleaning up camera:", error);
      }
    }, []);

    // Check device capabilities
    const checkDeviceCapabilities = useCallback(async () => {
      try {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.enumerateDevices
        ) {
          setHasFrontAndBackCamera(false);
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        // If we have more than one video device, assume we have both front and back cameras
        setHasFrontAndBackCamera(videoDevices.length > 1);
      } catch (error) {
        console.error("Error checking device capabilities:", error);
        setHasFrontAndBackCamera(false);
      }
    }, []);

    const startCamera = useCallback(async () => {
      try {
        cleanupCamera();
        setCameraError(null);

        // Determine ideal constraints based on container size
        const aspectRatio = 1; // Still keep square aspect ratio

        // Favor higher resolution on larger screens, but keep reasonable on mobile
        const idealWidth = Math.min(720, Math.max(280, containerSize.width));
        const idealHeight = Math.min(720, Math.max(280, containerSize.height));

        const constraints = {
          video: {
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
            facingMode: facingMode,
            aspectRatio: aspectRatio,
          },
        };

        const newStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        if (!videoRef.current) return;

        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraActive(true);
          setCameraError(null);
          // If we get here, permission was granted
          setPermissionState("granted");
        };

        newStream.getTracks().forEach((track) => {
          track.onended = () => {
            cleanupCamera();
          };
        });

        // Check if device has multiple cameras
        await checkDeviceCapabilities();
      } catch (err: unknown) {
        const error = err as Error & { name?: string };
        console.error("Error accessing camera:", error);

        // Handle permission errors specifically
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setPermissionState("denied");
          setCameraError(
            "Camera access was denied. Please allow camera access in your browser settings.",
          );
        } else if (
          error.name === "NotFoundError" ||
          error.name === "OverconstrainedError"
        ) {
          setCameraError("No compatible camera was found on your device.");
        } else {
          setCameraError(
            "Unable to access the camera. Please check your device and try again.",
          );
        }

        setIsCameraActive(false);
        cleanupCamera();
      }
    }, [cleanupCamera, containerSize, facingMode, checkDeviceCapabilities]);

    // Toggle between front and back camera
    const toggleCamera = useCallback(() => {
      const newMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newMode);
      // Restart camera with new facing mode
      if (isCameraActive) {
        cleanupCamera();
        setTimeout(() => startCamera(), 300);
      }
    }, [facingMode, isCameraActive, cleanupCamera, startCamera]);

    // Check if the browser supports the Permissions API
    const isPermissionsSupported =
      typeof navigator !== "undefined" && "permissions" in navigator;

    // Check camera permission status
    const checkPermission = useCallback(async () => {
      try {
        if (!isPermissionsSupported) {
          // Skip permission check on browsers that don't support it
          return;
        }

        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });

        if (result.state === "granted") {
          setPermissionState("granted");
        } else if (result.state === "denied") {
          setPermissionState("denied");
        } else {
          setPermissionState("prompt");
        }

        // Listen for permission changes
        result.addEventListener("change", () => {
          if (result.state === "granted") {
            setPermissionState("granted");
            startCamera();
          } else if (result.state === "denied") {
            setPermissionState("denied");
            cleanupCamera();
          }
        });
      } catch (error) {
        console.error("Error checking camera permission:", error);
        // Some browsers don't support the camera permission query
        // In this case, we'll just try to start the camera directly
        setPermissionState("not-supported");
      }
    }, [isPermissionsSupported, cleanupCamera, startCamera]);

    // Update container size on mount and window resize
    useEffect(() => {
      const updateContainerSize = () => {
        if (cameraContainerRef.current) {
          const { width, height } =
            cameraContainerRef.current.getBoundingClientRect();
          setContainerSize({ width, height });
        }
      };

      // Initial size update
      updateContainerSize();

      // Listen for resize events
      window.addEventListener("resize", updateContainerSize);

      return () => {
        window.removeEventListener("resize", updateContainerSize);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      stopCamera: cleanupCamera,
    }));

    useEffect(() => {
      // If permissions API is not supported or permission is already granted, try to start the camera
      // We don't need to call checkPermission() here as it sets state and triggers re-renders
      // The initial checkPermission call should happen on mount or via user interaction

      const initCamera = async () => {
        if (
          !isPermissionsSupported ||
          permissionState === "granted" ||
          permissionState === "not-supported"
        ) {
          startCamera();
        } else {
          checkPermission();
        }
      };

      initCamera();

      return () => {
        cleanupCamera();
      };
    }, [
      startCamera,
      cleanupCamera,
      checkPermission,
      isPermissionsSupported,
      permissionState,
    ]);

    const takeSelfie = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;

      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;

      context.clearRect(0, 0, canvas.width, canvas.height);

      // First save the current state
      context.save();

      // Mirror the image for front camera selfies to appear natural
      // For back camera, don't mirror
      if (facingMode === "user") {
        context.scale(-1, 1);
        context.translate(-canvas.width, 0);
      }

      context.drawImage(
        video,
        sx,
        sy,
        size,
        size,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Restore the context to its original state
      context.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          // Create a file from the blob
          const file = new File([blob], "camera-capture.jpg", {
            type: "image/jpeg",
          });

          // Pass the file directly to the parent component
          onCapture(file);
          cleanupCamera();
        },
        "image/jpeg",
        1.0,
      );
    };

    // Render permission request UI
    if (permissionState === "prompt" || permissionState === "denied") {
      return (
        <div className="flex h-full w-full animate-in flex-col items-center justify-center space-y-4 p-4 text-center fade-in-50">
          <div
            className={cn(
              "mb-2 rounded-full p-4",
              permissionState === "denied" ? "bg-red-100" : "bg-primary/10",
            )}
          >
            {permissionState === "denied" ? (
              <ShieldAlert className="h-10 w-10 text-red-500" />
            ) : (
              <CameraIcon className="h-10 w-10 text-primary" />
            )}
          </div>

          <h3 className="text-lg font-medium">
            {permissionState === "denied"
              ? "Camera access denied"
              : "Camera permission required"}
          </h3>

          <p className="max-w-75 text-sm text-muted-foreground">
            {permissionState === "denied"
              ? "You'll need to allow camera access in your browser settings to use this feature."
              : "We need permission to access your camera to take a photo."}
          </p>

          {permissionState === "denied" ? (
            <div className="mt-2 flex w-full max-w-62.5 flex-col space-y-2">
              <Button
                onClick={() =>
                  window.open(
                    "https://support.google.com/chrome/answer/2693767",
                    "_blank",
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
                  // Try requesting again - might work if user changed permissions in another tab
                  startCamera();
                }}
                className="w-full"
              >
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : (
            <Button onClick={startCamera} className="mt-2" size="lg">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Grant Camera Access
            </Button>
          )}
        </div>
      );
    }

    if (cameraError) {
      return (
        <Alert variant="destructive" className="animate-in fade-in-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Camera Error</AlertTitle>
          <AlertDescription>{cameraError}</AlertDescription>
          <Button
            onClick={startCamera}
            variant="outline"
            className="mt-4 w-full"
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </Alert>
      );
    }

    return (
      <div className="h-full w-full space-y-4" ref={cameraContainerRef}>
        <div className="relative aspect-square w-full max-w-full overflow-hidden rounded-xl border border-muted/30 bg-linear-to-b from-gray-900/10 to-gray-900/20 shadow-sm">
          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                className="z-10 h-28 w-28 animate-in rounded-full bg-linear-to-r from-primary/90 to-primary shadow-lg transition-all duration-300 zoom-in-50 hover:shadow-xl"
                onClick={startCamera}
              >
                <CameraIcon className="h-10 w-10" />
              </Button>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "h-full w-full object-cover transition-all duration-300",
              // Only mirror for front camera
              facingMode === "user" && "scale-x-[-1] transform",
              !isCameraActive && "opacity-0",
            )}
          />
          {isCameraActive && (
            <>
              {/* Top controls */}
              <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                {/* Restart button in top-left corner */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="z-10 h-10 w-10 rounded-full border border-white/20 bg-black/30 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/40"
                  onClick={startCamera}
                  title="Restart Camera"
                >
                  <RefreshCwIcon className="h-5 w-5" />
                </Button>

                {/* Switch camera button in middle */}
                {hasFrontAndBackCamera && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="z-10 h-10 w-10 rounded-full border border-white/20 bg-black/30 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/40"
                    onClick={toggleCamera}
                    title={`Switch to ${
                      facingMode === "user" ? "back" : "front"
                    } camera`}
                  >
                    <FlipHorizontal className="h-5 w-5" />
                  </Button>
                )}

                {/* Close button in top-right corner */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="z-10 h-10 w-10 rounded-full border border-white/20 bg-black/30 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/40"
                  onClick={cleanupCamera}
                  title="Stop Camera"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Capture button at bottom */}
              <div className="absolute inset-x-0 bottom-6 flex items-center justify-center">
                <div className="rounded-full bg-black/20 p-1 backdrop-blur-sm">
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full border-4 border-white bg-white shadow-lg transition-all duration-300 hover:bg-white/90 hover:shadow-xl"
                    onClick={takeSelfie}
                    title="Take Photo"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors hover:bg-primary/20">
                      <div className="h-10 w-10 rounded-full border-4 border-primary bg-white"></div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Current mode indicator */}
              <div className="absolute inset-x-0 bottom-24 flex justify-center">
                <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {facingMode === "user" ? "Front Camera" : "Back Camera"}
                </div>
              </div>
            </>
          )}
        </div>
        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
          width={720}
          height={720}
        />
      </div>
    );
  },
);

Camera.displayName = "Camera";
