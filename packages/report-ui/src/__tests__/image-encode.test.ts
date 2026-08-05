import { describe, it, expect, vi, afterEach } from "vitest";
import { encodeScreenshot } from "../image-encode";

/** A canvas stub whose encoded size shrinks as quality drops. */
function fakeCanvas(width: number, height: number, bytesPerQualityUnit = 4_000_000) {
  const calls: number[] = [];
  const canvas = {
    width,
    height,
    getContext: () => ({
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toDataURL: (_type: string, quality: number) => {
      calls.push(quality);
      const scale = (width * height) / (1000 * 1000);
      return "x".repeat(Math.round(quality * bytesPerQualityUnit * scale));
    },
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("encodeScreenshot", () => {
  it("uses the highest quality when it already fits the budget", () => {
    const { canvas, calls } = fakeCanvas(1000, 1000, 1000);
    const out = encodeScreenshot(canvas, 100_000);
    expect(calls).toEqual([0.92]);
    expect(out.length).toBeLessThanOrEqual(100_000);
  });

  it("steps quality down until the result fits", () => {
    // At 1M px and 4M bytes/unit: q0.92 → 3.68M, q0.85 → 3.4M, q0.75 → 3.0M.
    const { canvas, calls } = fakeCanvas(1000, 1000);
    const out = encodeScreenshot(canvas, 3_200_000);
    expect(calls).toEqual([0.92, 0.85, 0.75]);
    expect(out.length).toBeLessThanOrEqual(3_200_000);
  });

  it("keeps full resolution whenever a quality step fits", () => {
    const createElement = vi.spyOn(document, "createElement");
    const { canvas } = fakeCanvas(1000, 1000);
    encodeScreenshot(canvas, 3_200_000);
    // No downscale canvas was ever allocated.
    expect(createElement).not.toHaveBeenCalledWith("canvas");
  });

  it("downscales only after every quality step overshoots", () => {
    const smaller = fakeCanvas(700, 700);
    vi.spyOn(document, "createElement").mockReturnValue(
      smaller.canvas as unknown as HTMLElement,
    );
    const { canvas, calls } = fakeCanvas(1000, 1000);

    const out = encodeScreenshot(canvas, 2_000_000);

    expect(calls).toEqual([0.92, 0.85, 0.75]); // full-res ladder exhausted
    expect(smaller.calls[0]).toBe(0.92); // ladder restarts on the smaller canvas
    expect(out.length).toBeLessThanOrEqual(2_000_000);
  });

  it("returns the smallest encoding it managed rather than throwing", () => {
    const smaller = fakeCanvas(700, 700);
    vi.spyOn(document, "createElement").mockReturnValue(
      smaller.canvas as unknown as HTMLElement,
    );
    const { canvas } = fakeCanvas(1000, 1000);

    const out = encodeScreenshot(canvas, 10);

    expect(out.length).toBeGreaterThan(10);
    expect(smaller.calls).toEqual([0.92, 0.85, 0.75]);
  });
});
