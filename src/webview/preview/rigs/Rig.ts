import { Object3D } from "three";
import { ObjectProperties } from "../../contexts/SelectedObjectContext";

/**
 * Abstract base class for every scene object (cross-section plane, light, camera, …).
 * A Rig owns all the Three.js objects needed to represent one scene object and
 * implements the contract that Stage uses to drive selection, raycasting,
 * gizmo attachment, and property read/write without any object-type-specific logic.
 */
export abstract class Rig {
  /** Opacity for gizmo visuals when the object is selected. */
  static readonly GIZMO_OPACITY_SELECTED = 1.0;
  /** Opacity for gizmo visuals when the object is not selected. */
  static readonly GIZMO_OPACITY_UNSELECTED = 0.5;

  abstract readonly id: string;

  /**
   * Objects that raycasting should test against for click-to-select.
   */
  abstract getSelectableObjects(): Object3D[];

  /**
   * The Object3D that TransformControls should attach to.
   */
  abstract getTransformTarget(): Object3D;

  /**
   * The Object3D that should be added to / removed from the scene.
   * For most rigs this is the same as `getTransformTarget`, but rigs whose
   * transform pivot lives inside a larger group (e.g. cross-section planes)
   * override this to return the outer container.
   */
  abstract getSceneRoot(): Object3D;

  /**
   * Whether TransformControls should attach to this object when a transform
   * tool is active. Override to false for objects like ambient lights that
   * have no meaningful spatial transform.
   */
  get supportsTransform(): boolean { return true; }

  /**
   * Read the current properties for display in the Object Properties panel.
   * Called by Stage after every TransformControls change event.
   */
  abstract getProperties(): ObjectProperties;

  /**
   * Apply a property change coming from the Object Properties panel.
   */
  abstract setProperty(key: string, value: number): void;

  /**
   * Called by Stage when this object becomes selected or deselected.
   * The rig is responsible for its own visual selection feedback.
   */
  abstract setSelected(selected: boolean): void;

  /**
   * Show or hide the visual indicator of the object (e.g. the plane quad, gizmo).
   * Does NOT affect whether the object applies its effect to the scene.
   */
  abstract setVisible(visible: boolean): void;

  /** Whether the visual indicator is currently shown. */
  abstract get visible(): boolean;

  /**
   * Enable or disable the object's effect on the scene (clipping, etc.).
   * Does NOT affect whether the visual indicator is shown.
   * Objects with no scene effect (e.g. cameras) can leave this as the default.
   */
  setActive(_active: boolean): void {}

  /** Whether the object is currently applying its effect to the scene. */
  get active(): boolean { return true; }

  /**
   * Called by Stage after setVisible(true). Override to react to being shown.
   */
  onShow(): void {}

  /**
   * Called by Stage after setVisible(false). Override to react to being hidden.
   */
  onHide(): void {}

  abstract dispose(): void;
}
