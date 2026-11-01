/**
 * Open/closed state of the parameter groups.
 * Free: groups follow `defaultOpen`, except those the user flipped.
 * Accordion: at most one group open at a time.
 */
export type GroupLayout =
  | { mode: "free"; defaultOpen: boolean; flipped: Set<string> }
  | { mode: "accordion"; open: string | undefined };

export const expandedLayout = (): GroupLayout => ({
  mode: "free",
  defaultOpen: true,
  flipped: new Set(),
});

export const collapsedLayout = (): GroupLayout => ({
  mode: "free",
  defaultOpen: false,
  flipped: new Set(),
});

export function isGroupOpen(layout: GroupLayout, group: string): boolean {
  return layout.mode === "accordion"
    ? layout.open === group
    : layout.defaultOpen !== layout.flipped.has(group);
}

export function toggleGroup(
  layout: GroupLayout,
  group: string,
  open: boolean,
): GroupLayout {
  if (layout.mode === "accordion") {
    return { mode: "accordion", open: open ? group : undefined };
  }
  const flipped = new Set(layout.flipped);
  if (open === layout.defaultOpen) flipped.delete(group);
  else flipped.add(group);
  return { ...layout, flipped };
}

/** Accordion starts all closed; leaving it keeps the open group open. */
export function toggleAccordion(layout: GroupLayout): GroupLayout {
  if (layout.mode !== "accordion")
    return { mode: "accordion", open: undefined };
  return {
    mode: "free",
    defaultOpen: false,
    flipped: new Set(layout.open ? [layout.open] : []),
  };
}
