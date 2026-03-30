import type { Module, ExposedPin, ComponentId, NetId, TracePathId } from '@pcb/domain';
import type { BoundingBox } from '@pcb/domain';

export interface CreateModuleRequest {
  name: string;
  description: string;
  version: string;
  components?: ComponentId[];
  internalNets?: NetId[];
  internalPaths?: TracePathId[];
  exposedPins?: ExposedPin[];
  boundingBox?: BoundingBox;
  tags?: string[];
  category?: string;
  thumbnail?: string;
}

export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  version?: string;
  components?: ComponentId[];
  internalNets?: NetId[];
  internalPaths?: TracePathId[];
  exposedPins?: ExposedPin[];
  boundingBox?: BoundingBox;
  tags?: string[];
  category?: string;
  thumbnail?: string;
}

export interface ModuleResponse {
  data: Module;
}

export interface ModuleListResponse {
  data: Module[];
  total: number;
}
