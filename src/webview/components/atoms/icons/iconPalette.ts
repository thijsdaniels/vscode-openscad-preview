/**
 * Colour ramps shared by every icon: each ramp is a light → dark pair used
 * as a top-to-bottom gradient, which gives the icons their 3D look.
 */
export const iconPalette = {
  blue: ["#6fdcff", "#1f6fd8"],
  purple: ["#c9a6ff", "#5b45d9"],
  green: ["#86eba0", "#139447"],
  orange: ["#ffd84d", "#f2750c"],
  red: ["#ff9a9a", "#d42a2a"],
  pink: ["#ffb0dc", "#d42a85"],
  teal: ["#7cf0dc", "#0b8a80"],
  grey: ["#dde3ea", "#68737f"],
} as const;

export type PaletteName = keyof typeof iconPalette;

/**
 * Tint of the light icons. The 3D preview overrides `--icon-tint` with the
 * light's own colour so each gizmo shows the colour it casts.
 */
export const lightTint = "var(--icon-tint, #ffc83d)";
