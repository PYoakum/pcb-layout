import { ModuleId, ModuleInstanceId, ComponentId, NetId, TracePathId } from './ids';
import { Transform2D, BoundingBox } from './geometry';

export interface Module {
  id: ModuleId;
  name: string;
  description: string;
  version: string;          // semver
  components: ComponentId[];
  internalNets: NetId[];
  internalPaths: TracePathId[];
  exposedPins: ExposedPin[];
  boundingBox: BoundingBox;
  tags: string[];
  category: string;
  thumbnail?: string;       // preview image data URL
  createdAt: string;
  updatedAt: string;
}

export interface ExposedPin {
  pinId: string;            // reference to internal pin
  externalName: string;     // name visible at module boundary
}

export interface ModuleInstance {
  id: ModuleInstanceId;
  moduleId: ModuleId;
  moduleVersion: string;
  transform: Transform2D;
  overrides: Record<string, string>; // property overrides
}
