import { describe, expect, it } from "vitest";
import {
  flattenOutline,
  outlinePathIds,
  pickActiveOutline,
  type FlatOutlineItem,
} from "./outline";
import type { OutlineItem } from "./types";

const leaf = (id: string, title: string, page: number | null): OutlineItem => ({
  id,
  title,
  page,
  children: [],
});

const outline: OutlineItem[] = [
  {
    id: "chapter-1",
    title: "Chapter 1",
    page: 2,
    children: [
      leaf("section-1-1", "Section 1.1", 2),
      leaf("section-1-2", "Section 1.2", 4),
    ],
  },
  {
    id: "chapter-2",
    title: "Chapter 2",
    page: 4,
    children: [leaf("section-2-1", "Section 2.1", 4)],
  },
  leaf("chapter-3", "Chapter 3", 32),
];

describe("flattenOutline", () => {
  it("keeps document order and ancestor ids", () => {
    const flat = flattenOutline(outline);
    expect(flat.map((item) => item.id)).toEqual([
      "chapter-1",
      "section-1-1",
      "section-1-2",
      "chapter-2",
      "section-2-1",
      "chapter-3",
    ]);
    const section = flat.find((item) => item.id === "section-1-2");
    expect(section?.parentIds).toEqual(["chapter-1"]);
    expect(section?.order).toBe(2);
  });

  it("handles an empty outline", () => {
    expect(flattenOutline([])).toEqual([]);
  });
});

describe("pickActiveOutline", () => {
  const flat = flattenOutline(outline);

  const pick = (page: number, current: string | null = null) =>
    pickActiveOutline(flat, page, current);

  it("selects exactly one entry when many share a page", () => {
    // page 2 has chapter-1 and section-1-1; page 4 has three entries.
    expect(pick(2)).toBe("chapter-1");
    expect(pick(4)).toBe("section-1-2");
    const activeOnPage = flat.filter((item) => item.page === 4).map((i) => i.id);
    expect(activeOnPage.length).toBeGreaterThan(1);
    expect(activeOnPage).toContain(pick(4));
  });

  it("keeps the explicitly selected entry while on its page", () => {
    expect(pick(4, "section-2-1")).toBe("section-2-1");
    expect(pick(2, "section-1-1")).toBe("section-1-1");
    // ...but leaves it once the reader moves to another page.
    expect(pick(32, "section-2-1")).toBe("chapter-3");
  });

  it("falls back to the last entry before the current page", () => {
    expect(pick(5)).toBe("section-2-1");
    expect(pick(33)).toBe("chapter-3");
  });

  it("returns null before the first outline entry", () => {
    expect(pick(1)).toBeNull();
  });

  it("returns null for an empty outline", () => {
    expect(pickActiveOutline([], 3, null)).toBeNull();
  });
});

describe("outlinePathIds", () => {
  const flat = flattenOutline(outline);

  it("returns the active item plus all ancestors", () => {
    expect([...outlinePathIds(flat, "section-1-2")].sort()).toEqual([
      "chapter-1",
      "section-1-2",
    ]);
  });

  it("returns only the item for a root entry", () => {
    expect([...outlinePathIds(flat, "chapter-3")]).toEqual(["chapter-3"]);
  });

  it("handles unknown or missing ids", () => {
    expect(outlinePathIds(flat, null).size).toBe(0);
    expect(outlinePathIds(flat, "missing").size).toBe(0);
  });
});

// Guard against accidental regressions in the flattened shape.
const shapeCheck: FlatOutlineItem = flattenOutline(outline)[0];
void shapeCheck;
