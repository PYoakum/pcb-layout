import type {
  ProjectSettings,
  WorkspaceConfig,
  BoardLayer,
  BoardProfile,
  Transform2D,
  BoundingBox,
  Point2D,
  Rotation,
  PadShape,
  PinElectricalType,
  DesignRuleType,
  DebugSeverity,
  ExposedPin,
} from '@pcb/domain';

// ─── Top-Level File Envelope ─────────────────────────────────────────────────

export interface ProjectFile {
  version: string;              // file format version "1.0.0"
  formatType: 'pcb-layout-project';
  createdAt: string;
  updatedAt: string;
  project: SerializedProject;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface SerializedProject {
  id: string;
  name: string;
  description: string;
  settings: ProjectSettings;
  boards: SerializedBoard[];
  modules: SerializedModule[];
  libraryAssets: SerializedLibraryAsset[];
}

// ─── Board ───────────────────────────────────────────────────────────────────

export interface SerializedBoard {
  id: string;
  name: string;
  workspace: WorkspaceConfig;
  layers: BoardLayer[];
  profiles?: BoardProfile[];
  components: SerializedComponent[];
  nets: SerializedNet[];
  paths: SerializedTracePath[];
  moduleInstances: SerializedModuleInstance[];
  designRules: SerializedDesignRule[];
  createdAt: string;
  updatedAt: string;
}

// ─── Component / Footprint ───────────────────────────────────────────────────

export interface SerializedPad {
  id: string;
  componentId: string;
  name: string;
  localPosition: Point2D;
  shape: PadShape;
  width: number;
  height: number;
  rotation: Rotation;
  layerId: string;
  plated: boolean;
  drillDiameter?: number;
}

export interface SerializedPin {
  id: string;
  padId: string;
  name: string;
  number: string;
  electricalType: PinElectricalType;
}

export interface SerializedFootprint {
  id: string;
  name: string;
  description: string;
  pads: SerializedPad[];
  pins: SerializedPin[];
  boundingBox: BoundingBox;
  courtyard: BoundingBox;
}

export interface SerializedComponent {
  id: string;
  name: string;
  designator: string;
  footprint: SerializedFootprint;
  transform: Transform2D;
  layerId: string;
  properties: Record<string, string>;
  locked: boolean;
}

// ─── Net ─────────────────────────────────────────────────────────────────────

export interface SerializedNet {
  id: string;
  name: string;
  pinIds: string[];
  padIds: string[];
  pathIds: string[];
  color?: string;
  netClass?: string;
}

// ─── Trace ───────────────────────────────────────────────────────────────────

export interface SerializedTraceSegment {
  id: string;
  pathId: string;
  layerId: string;
  start: Point2D;
  end: Point2D;
  width: number;
}

export interface SerializedVia {
  id: string;
  pathId: string;
  position: Point2D;
  fromLayerId: string;
  toLayerId: string;
  outerDiameter: number;
  drillDiameter: number;
  netId: string;
}

export interface SerializedDebugLink {
  id: string;
  pathId: string;
  label: string;
  description: string;
  severity: DebugSeverity;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SerializedTracePath {
  id: string;
  netId: string;
  segments: SerializedTraceSegment[];
  vias: SerializedVia[];
  debugLinks: SerializedDebugLink[];
}

// ─── Module ──────────────────────────────────────────────────────────────────

export interface SerializedModule {
  id: string;
  name: string;
  description: string;
  version: string;
  components: SerializedComponent[];
  internalNets: SerializedNet[];
  internalPaths: SerializedTracePath[];
  exposedPins: ExposedPin[];
  boundingBox: BoundingBox;
  tags: string[];
  category: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedModuleInstance {
  id: string;
  moduleId: string;
  moduleVersion: string;
  transform: Transform2D;
  overrides: Record<string, string>;
}

// ─── Design Rules ────────────────────────────────────────────────────────────

export interface SerializedDesignRule {
  id: string;
  type: DesignRuleType;
  name: string;
  value: number;
  unit: string;
  netClass?: string;
  enabled: boolean;
}

// ─── Library Asset ───────────────────────────────────────────────────────────

export interface SerializedLibraryAsset {
  id: string;
  projectId: string;
  type: 'component' | 'module' | 'footprint';
  name: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

// ─── Current Format Version ──────────────────────────────────────────────────

export const CURRENT_VERSION = '1.0.0';
export const FORMAT_TYPE = 'pcb-layout-project' as const;
