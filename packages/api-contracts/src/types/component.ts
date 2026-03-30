import type { Component, Footprint, Transform2D, LayerId } from '@pcb/domain';

export interface CreateComponentRequest {
  name: string;
  designator: string;
  footprint: Footprint;
  transform: Transform2D;
  layerId: LayerId;
  properties?: Record<string, string>;
  locked?: boolean;
  boardId: string; // used to associate component with board
}

export interface UpdateComponentRequest {
  name?: string;
  designator?: string;
  transform?: Transform2D;
  layerId?: LayerId;
  properties?: Record<string, string>;
  locked?: boolean;
}

export interface ComponentResponse {
  data: Component;
}

export interface ComponentListResponse {
  data: Component[];
  total: number;
}
