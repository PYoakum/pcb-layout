import type { TracePath, TraceSegment, Via, DebugLink, DebugSeverity, NetId, LayerId } from '@pcb/domain';
import type { Point2D } from '@pcb/domain';

export interface CreateTracePathRequest {
  netId: NetId;
  boardId: string;
  segments?: Array<{
    layerId: LayerId;
    start: Point2D;
    end: Point2D;
    width: number;
  }>;
  vias?: Array<{
    position: Point2D;
    fromLayerId: LayerId;
    toLayerId: LayerId;
    outerDiameter: number;
    drillDiameter: number;
    netId: NetId;
  }>;
}

export interface UpdateTracePathRequest {
  segments?: Array<{
    layerId: LayerId;
    start: Point2D;
    end: Point2D;
    width: number;
  }>;
  vias?: Array<{
    position: Point2D;
    fromLayerId: LayerId;
    toLayerId: LayerId;
    outerDiameter: number;
    drillDiameter: number;
    netId: NetId;
  }>;
}

export interface TracePathResponse {
  data: TracePath;
}

export interface TracePathListResponse {
  data: TracePath[];
  total: number;
}

export interface CreateDebugLinkRequest {
  label: string;
  description: string;
  severity: DebugSeverity;
  metadata?: Record<string, unknown>;
}

export interface TracePathDebugResponse {
  data: DebugLink[];
}
