import type { Point2D, BoundingBox } from '@pcb/domain';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export function createViewport(overrides?: Partial<ViewportState>): ViewportState {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.05,
    maxZoom: 50,
    ...overrides,
  };
}

export function pan(state: ViewportState, dx: number, dy: number): ViewportState {
  return { ...state, x: state.x + dx, y: state.y + dy };
}

export function zoomTo(
  state: ViewportState,
  level: number,
  focalPoint?: Point2D,
): ViewportState {
  const clamped = Math.max(state.minZoom, Math.min(state.maxZoom, level));
  if (!focalPoint) {
    return { ...state, zoom: clamped };
  }
  // Adjust pan so that the focal point stays in the same screen position
  const scale = clamped / state.zoom;
  return {
    ...state,
    zoom: clamped,
    x: focalPoint.x - (focalPoint.x - state.x) * scale,
    y: focalPoint.y - (focalPoint.y - state.y) * scale,
  };
}

export function zoomIn(state: ViewportState, focalPoint?: Point2D): ViewportState {
  return zoomTo(state, state.zoom * 1.25, focalPoint);
}

export function zoomOut(state: ViewportState, focalPoint?: Point2D): ViewportState {
  return zoomTo(state, state.zoom / 1.25, focalPoint);
}

export function fitToContent(
  state: ViewportState,
  bounds: BoundingBox,
  screenWidth: number,
  screenHeight: number,
  padding = 40,
): ViewportState {
  const contentW = bounds.max.x - bounds.min.x;
  const contentH = bounds.max.y - bounds.min.y;
  if (contentW <= 0 || contentH <= 0) return state;

  const scaleX = (screenWidth - padding * 2) / contentW;
  const scaleY = (screenHeight - padding * 2) / contentH;
  const zoom = Math.max(state.minZoom, Math.min(state.maxZoom, Math.min(scaleX, scaleY)));

  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;

  return {
    ...state,
    zoom,
    x: screenWidth / 2 - cx * zoom,
    y: screenHeight / 2 - cy * zoom,
  };
}

export function screenToWorld(screenPoint: Point2D, viewport: ViewportState): Point2D {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(worldPoint: Point2D, viewport: ViewportState): Point2D {
  return {
    x: worldPoint.x * viewport.zoom + viewport.x,
    y: worldPoint.y * viewport.zoom + viewport.y,
  };
}
