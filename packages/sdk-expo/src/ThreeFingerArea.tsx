import { useRef } from "react";
import { View } from "react-native";
import type { ReactNode } from "react";
import { captureCurrentScreen } from "./lib/capture";

const DEFAULT_DRAG_THRESHOLD = 60;

function averageTouch(touches: { pageX: number; pageY: number }[]) {
  const sum = touches.reduce(
    (acc, t) => ({ x: acc.x + t.pageX, y: acc.y + t.pageY }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / touches.length, y: sum.y / touches.length };
}

export interface ThreeFingerAreaProps {
  /**
   * Fired once the 3 fingers drag past the distance threshold. Receives the
   * captured screenshot URI (or null if capture is disabled or failed).
   */
  onTrigger: (screenshotUri: string | null) => void;
  /** Capture the current screen before firing onTrigger (default: true). */
  capture?: boolean;
  /** Enable the gesture (default: true). */
  enabled?: boolean;
  /** Min drag distance in px before it fires (default: 60). */
  threshold?: number;
  /** Window in ms that suppresses repeat fires (default: 1000). */
  debounceMs?: number;
  children: ReactNode;
}

/**
 * Wraps content and fires `onTrigger` on a 3-finger drag — the in-app
 * equivalent of the web Cmd+Shift+G report shortcut. Capturing responder
 * handlers observe without stealing touches from children.
 */
export function ThreeFingerArea({
  onTrigger,
  capture = true,
  enabled = true,
  threshold = DEFAULT_DRAG_THRESHOLD,
  debounceMs = 1000,
  children,
}: ThreeFingerAreaProps) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = () => {
    if (capture) {
      void captureCurrentScreen().then((uri) => onTrigger(uri));
    } else {
      onTrigger(null);
    }
  };

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={(e) => {
        if (!enabled) return false;
        // Record the drag origin once the 3rd finger lands.
        dragStartRef.current =
          e.nativeEvent.touches.length >= 3
            ? averageTouch(e.nativeEvent.touches)
            : null;
        return false;
      }}
      onMoveShouldSetResponderCapture={(e) => {
        if (!enabled) return false;
        const touches = e.nativeEvent.touches;
        if (touches.length < 3 || !dragStartRef.current) return false;
        const current = averageTouch(touches);
        const dx = current.x - dragStartRef.current.x;
        const dy = current.y - dragStartRef.current.y;
        if (Math.hypot(dx, dy) >= threshold) {
          if (debounceRef.current) return false;
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
          }, debounceMs);
          dragStartRef.current = null;
          fire();
        }
        return false;
      }}
    >
      {children}
    </View>
  );
}
