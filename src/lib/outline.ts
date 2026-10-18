import type { OutlineItem } from "./types";

export type FlatOutlineItem = {
  id: string;
  title: string;
  page: number | null;
  /** Ids of all ancestor outline items, outermost first. */
  parentIds: string[];
  /** Position in the depth-first flattened list. */
  order: number;
};

/** Depth-first flattening that preserves document order. */
export function flattenOutline(
  items: OutlineItem[],
  ancestors: string[] = [],
): FlatOutlineItem[] {
  const out: FlatOutlineItem[] = [];
  const walk = (nodes: OutlineItem[], parentIds: string[]) => {
    for (const node of nodes) {
      out.push({
        id: node.id,
        title: node.title,
        page: node.page,
        parentIds,
        order: out.length,
      });
      if (node.children.length > 0) {
        walk(node.children, [...parentIds, node.id]);
      }
    }
  };
  walk(items, ancestors);
  return out;
}

/**
 * Pick exactly one active outline item for the current page.
 *
 * Several outline entries often point at the same page (especially in long
 * reports). We must never treat all of them as active:
 *   1. keep the explicitly selected item while the reader stays on its page;
 *   2. otherwise use the first entry that starts on the current page;
 *   3. otherwise fall back to the last entry before the current page.
 */
export function pickActiveOutline(
  flat: FlatOutlineItem[],
  currentPage: number,
  currentId: string | null,
): string | null {
  if (flat.length === 0) return null;

  if (currentId) {
    const current = flat.find((item) => item.id === currentId);
    if (current && current.page === currentPage) return current.id;
  }

  const onPage = flat.find((item) => item.page === currentPage);
  if (onPage) return onPage.id;

  let candidate: FlatOutlineItem | null = null;
  for (const item of flat) {
    if (item.page != null && item.page <= currentPage) candidate = item;
  }
  return candidate ? candidate.id : null;
}

/** Ids of the active item and all of its ancestors (used to auto-expand the tree). */
export function outlinePathIds(
  flat: FlatOutlineItem[],
  activeId: string | null,
): Set<string> {
  const ids = new Set<string>();
  if (!activeId) return ids;
  const item = flat.find((entry) => entry.id === activeId);
  if (!item) return ids;
  for (const parentId of item.parentIds) ids.add(parentId);
  ids.add(item.id);
  return ids;
}
