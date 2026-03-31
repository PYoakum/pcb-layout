import { TracePathId, TraceSegmentId, ViaId, LayerId, NetId, DebugLinkId } from './ids';
import { Point2D } from './geometry';

export enum FillPattern {
  Solid = 'solid',
  SparseDot = 'sparse_dot',
  Hatch = 'hatch',
  ReverseHatch = 'reverse_hatch',
  HorizontalStripe = 'horizontal_stripe',
  VerticalStripe = 'vertical_stripe',
  DashShortHorizontal = 'dash_short_h',
  DashShortVertical = 'dash_short_v',
  DashShortDiagonal = 'dash_short_diag',
  DashShortReverseDiagonal = 'dash_short_rdiag',
  DashMediumHorizontal = 'dash_medium_h',
  DashMediumVertical = 'dash_medium_v',
  DashMediumDiagonal = 'dash_medium_diag',
  DashMediumReverseDiagonal = 'dash_medium_rdiag',
  DashLongHorizontal = 'dash_long_h',
  DashLongVertical = 'dash_long_v',
  DashLongDiagonal = 'dash_long_diag',
  DashLongReverseDiagonal = 'dash_long_rdiag',
  CrossHatch = 'cross_hatch',
}

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
  /** Fill pattern for wide traces / copper pours. Default: solid. */
  fillPattern?: FillPattern;
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
