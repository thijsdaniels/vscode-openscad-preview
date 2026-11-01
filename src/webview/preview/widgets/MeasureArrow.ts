import { Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/** Arrowhead length and width in screen pixels. */
const LENGTH = 14;
const WIDTH = 10;

/**
 * Screen-space arrowhead whose tip sits on `position` and which points away
 * from `from`: one end of a measurement line, dimension-drawing style.
 * Both points are in the parent's space. The orientation is recomputed on
 * every CSS2D render, so it stays correct while the camera orbits.
 */
export class MeasureArrow extends CSS2DObject {
  /** Point the arrow points away from (the other end of the line). */
  readonly from = new Vector3();

  private readonly svg: SVGSVGElement;
  private readonly tip = new Vector3();
  private readonly tail = new Vector3();

  constructor(color: string) {
    super(document.createElement("div"));
    // CSS2DRenderer owns the outer element's transform: rotate an inner
    // element whose tip lies on the outer element's origin.
    this.center.set(0, 0);
    this.element.style.cssText = "width: 0; height: 0; pointer-events: none;";

    const ns = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(ns, "svg");
    this.svg.setAttribute("width", `${LENGTH}`);
    this.svg.setAttribute("height", `${WIDTH}`);
    this.svg.setAttribute("viewBox", `0 0 ${LENGTH} ${WIDTH}`);
    this.svg.style.cssText = `
      position: absolute;
      left: ${-LENGTH}px;
      top: ${-WIDTH / 2}px;
      overflow: visible;
      transform-origin: ${LENGTH}px ${WIDTH / 2}px;
    `;
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", `M0 0 L${LENGTH} ${WIDTH / 2} L0 ${WIDTH} Z`);
    path.setAttribute("fill", color);
    path.setAttribute("stroke", "rgba(0, 0, 0, 0.6)");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("stroke-linejoin", "round");
    this.svg.appendChild(path);
    this.element.appendChild(this.svg);

    this.onBeforeRender = (_renderer, _scene, camera) => this.orient(camera);
  }

  /** Place the tip on `tip`, pointing away from `from`. */
  set(tip: Vector3, from: Vector3): void {
    this.position.copy(tip);
    this.from.copy(from);
  }

  private orient(camera: Camera): void {
    const space = this.parent?.matrixWorld;
    if (!space) return;
    this.tip.copy(this.position).applyMatrix4(space).project(camera);
    this.tail.copy(this.from).applyMatrix4(space).project(camera);
    // NDC spans [-1, 1] on both axes: rescale x by the aspect ratio so the
    // angle matches the screen. Screen y grows downwards.
    const dx = (this.tip.x - this.tail.x) * aspectOf(camera);
    const dy = this.tail.y - this.tip.y;
    // Line seen end-on: keep the previous orientation.
    if (dx * dx + dy * dy < 1e-8) return;
    this.svg.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }
}

function aspectOf(camera: Camera): number {
  if (camera instanceof PerspectiveCamera) return camera.aspect;
  if (camera instanceof OrthographicCamera) {
    return (camera.right - camera.left) / (camera.top - camera.bottom);
  }
  return 1;
}
