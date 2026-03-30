// Core coordinate system - all positions in mils (thousandths of an inch)
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Point2D;
  max: Point2D;
}

// Rotation: discrete 90-degree increments
export enum Rotation {
  R0 = 0,
  R90 = 90,
  R180 = 180,
  R270 = 270,
}

export interface Transform2D {
  position: Point2D;
  rotation: Rotation;
  mirrored: boolean;
}

export interface GridConfig {
  spacingX: number; // in mils
  spacingY: number; // in mils
  subdivisions: number;
  visible: boolean;
  snapEnabled: boolean;
}

export interface WorkspaceConfig {
  width: number;   // board width in mils
  height: number;  // board height in mils
  grid: GridConfig;
  layerCount: number;
}

// Snap a point to grid
export function snapToGrid(point: Point2D, grid: GridConfig): Point2D {
  return {
    x: Math.round(point.x / grid.spacingX) * grid.spacingX,
    y: Math.round(point.y / grid.spacingY) * grid.spacingY,
  };
}

// Apply rotation to a point around an origin
export function rotatePoint(point: Point2D, origin: Point2D, rotation: Rotation): Point2D {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

// Normalize rotation to 0/90/180/270
export function normalizeRotation(degrees: number): Rotation {
  const normalized = ((degrees % 360) + 360) % 360;
  const snapped = Math.round(normalized / 90) * 90;
  return (snapped % 360) as Rotation;
}
