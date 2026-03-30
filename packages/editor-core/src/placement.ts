import type { Point2D, Rotation, BoundingBox, ComponentId, Component } from '@pcb/domain';

export interface PlacementState {
  componentId: ComponentId | null;
  ghostPosition: Point2D;
  rotation: Rotation;
  valid: boolean;
  active: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export function createPlacementState(): PlacementState {
  return {
    componentId: null,
    ghostPosition: { x: 0, y: 0 },
    rotation: 0 as Rotation,
    valid: false,
    active: false,
  };
}

export function startPlacement(
  state: PlacementState,
  component: Component,
): PlacementState {
  return {
    ...state,
    componentId: component.id,
    ghostPosition: component.transform.position,
    rotation: component.transform.rotation,
    valid: true,
    active: true,
  };
}

export function updatePlacement(
  state: PlacementState,
  point: Point2D,
): PlacementState {
  if (!state.active) return state;
  return { ...state, ghostPosition: point };
}

export function rotatePlacement(state: PlacementState): PlacementState {
  if (!state.active) return state;
  const next = ((state.rotation + 90) % 360) as Rotation;
  return { ...state, rotation: next };
}

export function commitPlacement(state: PlacementState): PlacementState {
  return createPlacementState();
}

export function cancelPlacement(state: PlacementState): PlacementState {
  return createPlacementState();
}

/**
 * Basic placement validation: checks that the component position
 * falls within the board bounds and doesn't violate trivial constraints.
 */
export function validatePlacement(
  component: Component,
  position: Point2D,
  boardBounds: BoundingBox,
): ValidationResult {
  const reasons: string[] = [];

  const fp = component.footprint;
  const halfW = (fp.boundingBox.max.x - fp.boundingBox.min.x) / 2;
  const halfH = (fp.boundingBox.max.y - fp.boundingBox.min.y) / 2;

  if (
    position.x - halfW < boardBounds.min.x ||
    position.x + halfW > boardBounds.max.x ||
    position.y - halfH < boardBounds.min.y ||
    position.y + halfH > boardBounds.max.y
  ) {
    reasons.push('Component extends beyond board boundary');
  }

  return { valid: reasons.length === 0, reasons };
}
