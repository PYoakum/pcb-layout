import type { Net, PinId, PadId, TracePathId } from '@pcb/domain';

export interface CreateNetRequest {
  name: string;
  boardId: string;
  pins?: PinId[];
  pads?: PadId[];
  color?: string;
  netClass?: string;
}

export interface UpdateNetRequest {
  name?: string;
  pins?: PinId[];
  pads?: PadId[];
  paths?: TracePathId[];
  color?: string;
  netClass?: string;
}

export interface NetResponse {
  data: Net;
}

export interface NetListResponse {
  data: Net[];
  total: number;
}
