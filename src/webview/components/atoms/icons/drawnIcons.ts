import { iconPalette, lightTint, type PaletteName } from "./iconPalette";

/**
 * Icons with no Fluent equivalent, drawn on the 16px grid in isometric
 * projection: light top face, gradient left face, dark right face.
 */

type Point = readonly [number, number];

/** Corners of an isometric box: top rhombus centred on (cx, cy), `a` deep, `h` tall. */
function isoBox(cx: number, cy: number, a: number, h: number) {
  const w = a * 0.866;
  const T: Point = [cx, cy - a / 2];
  const R: Point = [cx + w, cy];
  const F: Point = [cx, cy + a / 2];
  const L: Point = [cx - w, cy];
  const down = ([x, y]: Point): Point => [x, y + h];
  return { T, R, F, L, Tb: down(T), Rb: down(R), Fb: down(F), Lb: down(L) };
}

type Box = ReturnType<typeof isoBox>;

const pts = (points: Point[]) =>
  points.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" ");

const polygon = (points: Point[], attrs: string) =>
  `<polygon points="${pts(points)}" ${attrs}/>`;

const line = ([x1, y1]: Point, [x2, y2]: Point, attrs: string) =>
  `<line x1="${+x1.toFixed(2)}" y1="${+y1.toFixed(2)}" x2="${+x2.toFixed(2)}" y2="${+y2.toFixed(2)}" ${attrs}/>`;

const lerp = ([x1, y1]: Point, [x2, y2]: Point, t: number): Point => [
  x1 + (x2 - x1) * t,
  y1 + (y2 - y1) * t,
];

/** Vertical light → dark gradient of a palette ramp. */
function ramp(id: string, palette: PaletteName) {
  const [light, dark] = iconPalette[palette];
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>` +
    `</linearGradient>`
  );
}

const gloss =
  `<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#fff" stop-opacity=".6"/>` +
  `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
  `</linearGradient>`;

/**
 * Three visible faces of a box; `opacity` < 1 shows what is inside, `top`
 * replaces the top face paint.
 */
function solidBox(
  box: Box,
  id: string,
  palette: PaletteName,
  { opacity = 1, top }: { opacity?: number; top?: string } = {},
) {
  const [light, dark] = iconPalette[palette];
  const edge = `stroke="${dark}" stroke-width=".5" stroke-linejoin="round"`;
  const alpha = opacity < 1 ? `fill-opacity="${opacity}"` : "";
  return (
    polygon(
      [box.L, box.F, box.Fb, box.Lb],
      `fill="url(#${id})" ${alpha} ${edge}`,
    ) +
    polygon([box.F, box.R, box.Rb, box.Fb], `fill="${dark}" ${alpha} ${edge}`) +
    polygon(
      [box.T, box.R, box.F, box.L],
      `fill="${top ?? light}" ${alpha} ${edge}`,
    ) +
    polygon([box.T, box.R, box.F, box.L], `fill="url(#gloss)"`)
  );
}

const defs = (...gradients: string[]) =>
  `<defs>${gradients.join("")}${gloss}</defs>`;

const cube = isoBox(8, 4.5, 7, 7);

/** A grey cube with one feature highlighted in orange, for the snap modes. */
function snapCube(highlight: string) {
  return (
    defs(ramp("side", "grey")) + solidBox(cube, "side", "grey") + highlight
  );
}

const accent = iconPalette.orange[1];
const marker = ([x, y]: Point) =>
  `<circle cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="1.9" fill="${iconPalette.orange[0]}" stroke="${accent}" stroke-width=".8"/>`;

/** Flat isometric plate centred in the icon. */
const plate = isoBox(8, 8, 8, 0);

function gridLines(attrs: string) {
  return [0.25, 0.5, 0.75]
    .flatMap((t) => [
      line(lerp(plate.L, plate.T, t), lerp(plate.F, plate.R, t), attrs),
      line(lerp(plate.T, plate.R, t), lerp(plate.L, plate.F, t), attrs),
    ])
    .join("");
}

/** Stop or fill painted with the light's tint (see `lightTint`). */
const tintStop = (offset: number) =>
  `<stop offset="${offset}" style="stop-color: ${lightTint}"/>`;

/** Glowing orb with an off-centre highlight and a darker rim. */
function orb(cx: number, cy: number, r: number) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orb)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#rim)"/>`
  );
}

const orbDefs =
  `<defs>` +
  `<radialGradient id="orb" cx=".38" cy=".35" r=".7">` +
  `<stop offset="0" stop-color="#fff"/>${tintStop(0.45)}${tintStop(1)}` +
  `</radialGradient>` +
  `<radialGradient id="rim" cx=".5" cy=".5" r=".5">` +
  `<stop offset=".6" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity=".3"/>` +
  `</radialGradient>` +
  `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">` +
  `${tintStop(0)}<stop offset="1" stop-opacity="0" style="stop-color: ${lightTint}"/>` +
  `</linearGradient>` +
  `</defs>`;

const ray = (angle: number, from: number, to: number, cx = 8, cy = 8) => {
  const rad = (angle * Math.PI) / 180;
  const at = (r: number): Point => [
    cx + Math.cos(rad) * r,
    cy + Math.sin(rad) * r,
  ];
  return line(
    at(from),
    at(to),
    `style="stroke: ${lightTint}" stroke-width="1.6" stroke-linecap="round"`,
  );
};

const rays = (
  angles: number[],
  from: number,
  to: number,
  cx?: number,
  cy?: number,
) => angles.map((angle) => ray(angle, from, to, cx, cy)).join("");

const arrowDown = (x: number) =>
  line(
    [x, 9.5],
    [x, 13.5],
    `style="stroke: ${lightTint}" stroke-width="1.5" stroke-linecap="round"`,
  ) +
  polygon(
    [
      [x - 1.6, 12.6],
      [x + 1.6, 12.6],
      [x, 15.2],
    ],
    `style="fill: ${lightTint}"`,
  );

const frustumTop = isoBox(8, 3, 3.5, 0);
const frustumBottom = isoBox(8, 11.5, 8, 0);
const prism = isoBox(8, 3.5, 5.5, 8);
const halfCube = isoBox(8, 8, 7, 3.5);

/** Flat 2D shape painted with a palette ramp and the gloss highlight. */
function glossyPath(d: string, palette: PaletteName) {
  return (
    defs(ramp("fill", palette)) +
    `<path d="${d}" fill="url(#fill)" stroke="${iconPalette[palette][1]}" stroke-width=".4" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="url(#gloss)"/>`
  );
}

/** Orange ruler with a black outline and black graduations (long every other tick). */
const ruler =
  defs(ramp("fill", "orange")) +
  `<rect x="1" y="4.5" width="14" height="7" rx="1" fill="url(#fill)"/>` +
  `<rect x="1" y="4.5" width="14" height="7" rx="1" fill="url(#gloss)"/>` +
  [3.5, 5.75, 8, 10.25, 12.5]
    .map((x, i) =>
      line(
        [x, 4.5],
        [x, 4.5 + (i % 2 ? 2.2 : 3.6)],
        `stroke="#000" stroke-width=".9"`,
      ),
    )
    .join("") +
  `<rect x="1" y="4.5" width="14" height="7" rx="1" fill="none" stroke="#000" stroke-width="1"/>`;

export const drawnIcons = {
  "tool-measure": ruler,
  measurement: ruler,

  "tool-move": glossyPath(
    "M8 1 L5.5 4 H7.1 V7.1 H4 V5.5 L1 8 L4 10.5 V8.9 H7.1 V12 H5.5 L8 15 L10.5 12 H8.9 V8.9 H12 V10.5 L15 8 L12 5.5 V7.1 H8.9 V4 H10.5 Z",
    "green",
  ),

  "render-solid": defs(ramp("side", "blue")) + solidBox(cube, "side", "blue"),

  "render-xray": (() => {
    const inner = isoBox(8, 6.2, 3.6, 3.6);
    const [, dark] = iconPalette.blue;
    const hidden = `stroke="${dark}" stroke-width=".6" stroke-dasharray="1,1"`;
    return (
      defs(ramp("side", "blue"), ramp("core", "orange")) +
      line(cube.T, cube.Tb, hidden) +
      line(cube.Tb, cube.Lb, hidden) +
      line(cube.Tb, cube.Rb, hidden) +
      solidBox(inner, "core", "orange") +
      solidBox(cube, "side", "blue", { opacity: 0.3 })
    );
  })(),

  "render-wireframe": (() => {
    const [light, dark] = iconPalette.blue;
    const visible = `stroke="url(#wire)" stroke-width="1.2" stroke-linecap="round"`;
    const hidden = `stroke="${light}" stroke-width=".6" stroke-dasharray="1,1"`;
    const edges: [Point, Point][] = [
      [cube.T, cube.R],
      [cube.R, cube.F],
      [cube.F, cube.L],
      [cube.L, cube.T],
      [cube.L, cube.Lb],
      [cube.F, cube.Fb],
      [cube.R, cube.Rb],
      [cube.Lb, cube.Fb],
      [cube.Fb, cube.Rb],
    ];
    return (
      `<defs><linearGradient id="wire" gradientUnits="userSpaceOnUse" x1="0" y1="1" x2="0" y2="15">` +
      `<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>` +
      `</linearGradient></defs>` +
      line(cube.T, cube.Tb, hidden) +
      line(cube.Tb, cube.Lb, hidden) +
      line(cube.Tb, cube.Rb, hidden) +
      edges.map(([a, b]) => line(a, b, visible)).join("")
    );
  })(),

  "model-part": defs(ramp("part", "orange")) + solidBox(cube, "part", "orange"),

  // Three orange parts pulled apart.
  explode:
    defs(ramp("part", "orange")) +
    [isoBox(4, 2.5, 4, 4), isoBox(12, 2.5, 4, 4), isoBox(8, 9, 4, 4)]
      .map((box) => solidBox(box, "part", "orange"))
      .join(""),

  "snap-vertex": snapCube(marker(cube.R)),

  "snap-edge": snapCube(
    line(
      cube.F,
      cube.Fb,
      `stroke="${accent}" stroke-width="1.6" stroke-linecap="round"`,
    ) + marker(lerp(cube.F, cube.Fb, 0.5)),
  ),

  "snap-face": snapCube(
    polygon(
      [cube.F, cube.R, cube.Rb, cube.Fb],
      `fill="url(#face)" stroke="${accent}" stroke-width=".5"`,
    ) +
      `<defs>${ramp("face", "orange")}</defs>` +
      marker(lerp(cube.F, cube.Rb, 0.5)),
  ),

  "cross-section": (() => {
    const [, dark] = iconPalette.blue;
    const ghost = `fill="none" stroke="${dark}" stroke-width=".6" stroke-dasharray="1,1"`;
    return (
      defs(ramp("side", "blue"), ramp("cut", "pink")) +
      polygon([cube.L, cube.T, cube.R, halfCube.R, halfCube.L], ghost) +
      line(
        cube.L,
        cube.F,
        `stroke="${dark}" stroke-width=".6" stroke-dasharray="1,1"`,
      ) +
      line(
        cube.F,
        cube.R,
        `stroke="${dark}" stroke-width=".6" stroke-dasharray="1,1"`,
      ) +
      line(
        cube.F,
        halfCube.F,
        `stroke="${dark}" stroke-width=".6" stroke-dasharray="1,1"`,
      ) +
      solidBox(halfCube, "side", "blue", { top: "url(#cut)" })
    );
  })(),

  "camera-perspective": (() => {
    const [light, dark] = iconPalette.purple;
    const edge = `stroke="${dark}" stroke-width=".5" stroke-linejoin="round"`;
    const t = frustumTop;
    const b = frustumBottom;
    return (
      defs(ramp("side", "purple")) +
      polygon([t.L, t.F, b.F, b.L], `fill="url(#side)" ${edge}`) +
      polygon([t.F, t.R, b.R, b.F], `fill="${dark}" ${edge}`) +
      polygon([t.T, t.R, t.F, t.L], `fill="${light}" ${edge}`) +
      polygon([t.T, t.R, t.F, t.L], `fill="url(#gloss)"`)
    );
  })(),

  "camera-orthographic":
    defs(ramp("side", "purple")) + solidBox(prism, "side", "purple"),

  shadows: (() => {
    const [light, dark] = iconPalette.blue;
    return (
      `<defs>` +
      `<radialGradient id="ball" cx=".35" cy=".3" r=".75">` +
      `<stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>` +
      `</radialGradient>` +
      `<radialGradient id="shade" cx=".5" cy=".5" r=".5">` +
      `<stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<ellipse cx="9.5" cy="13.4" rx="6" ry="2.1" fill="url(#shade)"/>` +
      `<circle cx="7.5" cy="6.5" r="5" fill="url(#ball)"/>`
    );
  })(),

  "env-none": polygon(
    [plate.T, plate.R, plate.F, plate.L],
    `fill="${iconPalette.grey[0]}" fill-opacity=".25" stroke="${iconPalette.grey[1]}" stroke-width="1" stroke-dasharray="1.5,1.2" stroke-linejoin="round"`,
  ),

  "env-grid": (() => {
    const [light, dark] = iconPalette.blue;
    return (
      defs(ramp("side", "blue")) +
      polygon(
        [plate.T, plate.R, plate.F, plate.L],
        `fill="url(#side)" stroke="${dark}" stroke-width=".7" stroke-linejoin="round"`,
      ) +
      gridLines(`stroke="${light}" stroke-width=".6"`) +
      polygon([plate.T, plate.R, plate.F, plate.L], `fill="url(#gloss)"`)
    );
  })(),

  "env-build-plate": (() => {
    const slab = isoBox(8, 7, 8, 2);
    const edge = `stroke="#3a3f46" stroke-width=".5" stroke-linejoin="round"`;
    return (
      `<defs>` +
      `<linearGradient id="pei" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#ffe28a"/><stop offset="1" stop-color="#b8862b"/>` +
      `</linearGradient>` +
      gloss +
      `</defs>` +
      polygon([slab.L, slab.F, slab.Fb, slab.Lb], `fill="#5b6470" ${edge}`) +
      polygon([slab.F, slab.R, slab.Rb, slab.Fb], `fill="#3a3f46" ${edge}`) +
      polygon([slab.T, slab.R, slab.F, slab.L], `fill="url(#pei)" ${edge}`) +
      polygon([slab.T, slab.R, slab.F, slab.L], `fill="url(#gloss)"`)
    );
  })(),

  "light-ambient":
    orbDefs +
    rays([0, 45, 90, 135, 180, 225, 270, 315], 4.6, 6.8) +
    orb(8, 8, 3.2),

  "light-point": orbDefs + rays([45, 135, 225, 315], 5, 7) + orb(8, 8, 4),

  "light-directional":
    orbDefs +
    rays([180, 225, 270, 315, 0], 3.9, 5.4, 8, 4.5) +
    orb(8, 4.5, 3) +
    arrowDown(4.5) +
    arrowDown(8) +
    arrowDown(11.5),

  "light-spot":
    orbDefs +
    polygon(
      [
        [6.2, 4.5],
        [9.8, 4.5],
        [14.5, 13.5],
        [1.5, 13.5],
      ],
      `fill="url(#beam)" fill-opacity=".6"`,
    ) +
    `<ellipse cx="8" cy="13.5" rx="6.5" ry="1.6" style="fill: ${lightTint}" fill-opacity=".55"/>` +
    `<defs>${ramp("lamp", "grey")}</defs>` +
    polygon(
      [
        [6, 0.8],
        [10, 0.8],
        [11, 4.8],
        [5, 4.8],
      ],
      `fill="url(#lamp)" stroke="${iconPalette.grey[1]}" stroke-width=".5" stroke-linejoin="round"`,
    ) +
    `<ellipse cx="8" cy="4.8" rx="3" ry=".9" fill="url(#orb)"/>`,
} as const;
