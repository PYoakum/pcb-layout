import { TracePathId, TraceSegmentId, ViaId, LayerId, NetId, DebugLinkId } from './ids';
import { Point2D } from './geometry';

export interface TraceSegment {
  id: TraceSegmentId;
  pathId: TracePathId;
  layerId: LayerId;
  start: Point2D;
  end: Point2D;
  width: number;
}

export interface Via {
  id: ViaId;
  pathId: TracePathId;
  position: Point2D;
  fromLayerId: LayerId;
  toLayerId: LayerId;
  outerDiameter: number;
  drillDiameter: number;
  netId: NetId;
}

export interface TracePath {
  id: TracePathId;
  netId: NetId;
  segments: TraceSegment[];
  vias: Via[];
  debugLinks: DebugLinkId[];
  /** Corner radius in mils for rounded bends between segments. 0 = sharp corners. */
  cornerRadius: number;
}

export interface DebugLink {
  id: DebugLinkId;
  pathId: TracePathId;
  label: string;
  description: string;
  severity: DebugSeverity;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export enum DebugSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}
