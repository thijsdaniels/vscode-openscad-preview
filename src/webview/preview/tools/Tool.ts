export interface ViewportBindings {
  canvas: HTMLElement;
}

export interface Tool {
  /**
   * The gizmo mode this tool activates on selected objects.
   * null means no gizmo is shown (Select, Measure).
   */
  readonly gizmoMode: "translate" | "rotate" | "scale" | null;

  /**
   * Whether this tool exclusively handles canvas clicks.
   * When true, Stage will not process its own click handlers (e.g. scene object
   * selection) while this tool is active.
   */
  readonly capturesClick: boolean;

  activate(bindings: ViewportBindings): void;

  deactivate(): void;
}
