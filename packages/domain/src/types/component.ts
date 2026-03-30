import { ComponentId, FootprintId, PadId, PinId, LayerId } from './ids';
import { Point2D, Transform2D, BoundingBox, Rotation } from './geometry';

export enum PadShape {
  Circle = 'circle',
  Rect = 'rect',
  Oval = 'oval',
  Polygon = 'polygon',
}

export interface Pad {
  id: PadId;
  componentId: ComponentId;
  name: string;
  localPosition: Point2D;    // relative to component origin
  shape: PadShape;
  width: number;
  height: number;
  rotation: Rotation;
  layerId: LayerId;
  plated: boolean;
  drillDiameter?: number;
}

export interface Pin {
  id: PinId;
  padId: PadId;
  name: string;
  number: string;             // pin designator (e.g., "1", "A1")
  electricalType: PinElectricalType;
}

export enum PinElectricalType {
  Input = 'input',
  Output = 'output',
  Bidirectional = 'bidirectional',
  Power = 'power',
  Ground = 'ground',
  Passive = 'passive',
  Unconnected = 'unconnected',
}

export interface Footprint {
  id: FootprintId;
  name: string;
  description: string;
  pads: Pad[];
  pins: Pin[];
  boundingBox: BoundingBox;
  courtyard: BoundingBox;     // keep-out area
}

export interface Component {
  id: ComponentId;
  name: string;
  designator: string;         // e.g., "R1", "U3", "C5"
  footprint: Footprint;
  transform: Transform2D;
  layerId: LayerId;           // primary layer
  properties: Record<string, string>; // value, package, etc.
  locked: boolean;
}
