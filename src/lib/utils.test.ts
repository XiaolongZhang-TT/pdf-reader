import { describe, expect, it } from "vitest";
import {
  basename,
  clamp,
  mergeRects,
  screenToLocal,
  stripExtension,
  truncate,
} from "./utils";

describe("mergeRects", () => {
  it("merges adjacent boxes on the same text line", () => {
    const merged = mergeRects([
      { x: 0.1, y: 0.2, w: 0.11, h: 0.02 },
      { x: 0.21, y: 0.2, w: 0.1, h: 0.02 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].x).toBeCloseTo(0.1);
    expect(merged[0].w).toBeCloseTo(0.21);
  });

  it("does not merge boxes from different lines", () => {
    const merged = mergeRects([
      { x: 0.1, y: 0.2, w: 0.1, h: 0.02 },
      { x: 0.1, y: 0.4, w: 0.1, h: 0.02 },
    ]);
    expect(merged).toHaveLength(2);
  });

  it("clamps out-of-range boxes and drops empty ones", () => {
    const merged = mergeRects([
      { x: -0.2, y: -0.1, w: 0.4, h: 0.2 },
      { x: 0.5, y: 0.5, w: 0, h: 0.1 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].x).toBe(0);
    expect(merged[0].y).toBe(0);
  });
});

describe("screenToLocal", () => {
  const bbox = { left: 0, top: 0, width: 100, height: 200 };

  it("maps identity rotation one to one", () => {
    expect(screenToLocal(10, 20, bbox, 0, 100, 200)).toEqual({ x: 10, y: 20 });
  });

  it("maps the rotated bounding box back to page coordinates", () => {
    // A 200x100 page rotated 90° has a 100x200 bounding box.
    expect(screenToLocal(0, 0, bbox, 90, 200, 100)).toEqual({ x: 0, y: 100 });
    expect(screenToLocal(100, 200, bbox, 90, 200, 100)).toEqual({ x: 200, y: 0 });
  });

  it("handles 180 and 270 degrees", () => {
    expect(screenToLocal(0, 0, bbox, 180, 100, 200)).toEqual({ x: 100, y: 200 });
    expect(screenToLocal(100, 200, bbox, 270, 200, 100)).toEqual({ x: 0, y: 100 });
  });
});

describe("small helpers", () => {
  it("clamps numbers", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it("extracts basenames and strips extensions", () => {
    expect(basename("/Users/me/Desktop/report.pdf")).toBe("report.pdf");
    expect(basename("C:\\Users\\me\\report.pdf")).toBe("report.pdf");
    expect(stripExtension("report.pdf")).toBe("report");
    expect(stripExtension("report")).toBe("report");
  });

  it("truncates long text on a single line", () => {
    expect(truncate("hello   world", 20)).toBe("hello world");
    expect(truncate("a".repeat(30), 10)).toBe(`${"a".repeat(10)}…`);
  });
});
