import type {
  Project,
  Board,
  Component,
  Module,
  Net,
  TracePath,
  DebugLink,
  DesignRule,
  LibraryAsset,
  ModuleInstance,
  ProjectId,
  BoardId,
  LayerId,
  ComponentId,
  FootprintId,
  PadId,
  PinId,
  NetId,
  TracePathId,
  TraceSegmentId,
  ViaId,
  DebugLinkId,
  DesignRuleId,
  ModuleId,
  ModuleInstanceId,
  LibraryAssetId,
} from '@pcb/domain';

import type { ProjectFile, SerializedBoard, SerializedComponent, SerializedModule } from './types';

// ─── Result Type ─────────────────────────────────────────────────────────────

export interface DeserializedProject {
  project: Project;
  boards: Board[];
  components: Component[];
  modules: Module[];
  moduleInstances: ModuleInstance[];
  nets: Net[];
  paths: TracePath[];
  debugLinks: DebugLink[];
  designRules: DesignRule[];
  libraryAssets: LibraryAsset[];
}

// ─── Branded ID Casting ─────────────────────────────────────────────────────

function asId<T>(value: string): T {
  return value as unknown as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Deserialize a ProjectFile back into domain objects with properly branded IDs.
 * All nested data is flattened into top-level arrays.
 */
export function deserializeProject(file: ProjectFile): DeserializedProject {
  const sp = file.project;

  const allComponents: Component[] = [];
  const allNets: Net[] = [];
  const allPaths: TracePath[] = [];
  const allDebugLinks: DebugLink[] = [];
  const allDesignRules: DesignRule[] = [];
  const allModuleInstances: ModuleInstance[] = [];

  // Deserialize boards (and collect nested entities)
  const boards: Board[] = sp.boards.map((sb) => {
    const { board, components, nets, paths, debugLinks, moduleInstances, designRules } =
      deserializeBoard(sb, asId<ProjectId>(sp.id));

    allComponents.push(...components);
    allNets.push(...nets);
    allPaths.push(...paths);
    allDebugLinks.push(...debugLinks);
    allModuleInstances.push(...moduleInstances);
    allDesignRules.push(...designRules);

    return board;
  });

  // Deserialize modules (and collect nested entities)
  const modules: Module[] = sp.modules.map((sm) => {
    const { module, components, nets, paths, debugLinks } = deserializeModule(sm);

    allComponents.push(...components);
    allNets.push(...nets);
    allPaths.push(...paths);
    allDebugLinks.push(...debugLinks);

    return module;
  });

  // Library assets
  const libraryAssets: LibraryAsset[] = sp.libraryAssets.map((a) => ({
    id: asId<LibraryAssetId>(a.id),
    projectId: asId<ProjectId>(a.projectId),
    type: a.type,
    name: a.name,
    data: a.data,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  // Build project
  const project: Project = {
    id: asId<ProjectId>(sp.id),
    name: sp.name,
    description: sp.description,
    boards: boards.map((b) => b.id),
    modules: modules.map((m) => m.id),
    libraryAssets: libraryAssets.map((a) => a.id),
    settings: sp.settings,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };

  return {
    project,
    boards,
    components: allComponents,
    modules,
    moduleInstances: allModuleInstances,
    nets: allNets,
    paths: allPaths,
    debugLinks: allDebugLinks,
    designRules: allDesignRules,
    libraryAssets,
  };
}

// ─── Board ───────────────────────────────────────────────────────────────────

interface DeserializedBoard {
  board: Board;
  components: Component[];
  nets: Net[];
  paths: TracePath[];
  debugLinks: DebugLink[];
  moduleInstances: ModuleInstance[];
  designRules: DesignRule[];
}

function deserializeBoard(sb: SerializedBoard, projectId: ProjectId): DeserializedBoard {
  const boardId = asId<BoardId>(sb.id);

  const components = sb.components.map(deserializeComponent);
  const nets = sb.nets.map(deserializeNet);

  const pathResults = sb.paths.map(deserializeTracePath);
  const paths = pathResults.map((r) => r.path);
  const debugLinks = pathResults.flatMap((r) => r.debugLinks);

  const moduleInstances: ModuleInstance[] = sb.moduleInstances.map((mi) => ({
    id: asId<ModuleInstanceId>(mi.id),
    moduleId: asId<ModuleId>(mi.moduleId),
    moduleVersion: mi.moduleVersion,
    transform: mi.transform,
    overrides: mi.overrides,
  }));

  const designRules: DesignRule[] = sb.designRules.map((dr) => ({
    id: asId<DesignRuleId>(dr.id),
    type: dr.type,
    name: dr.name,
    value: dr.value,
    unit: dr.unit,
    ...(dr.netClass !== undefined && { netClass: dr.netClass }),
    enabled: dr.enabled,
  }));

  const board: Board = {
    id: boardId,
    projectId,
    name: sb.name,
    workspace: sb.workspace,
    layers: sb.layers.map((l) => ({
      ...l,
      id: asId<LayerId>(l.id as string),
      boardId: asId<BoardId>(l.boardId as string),
    })),
    createdAt: sb.createdAt,
    updatedAt: sb.updatedAt,
  };

  return { board, components, nets, paths, debugLinks, moduleInstances, designRules };
}

// ─── Module ──────────────────────────────────────────────────────────────────

interface DeserializedModule {
  module: Module;
  components: Component[];
  nets: Net[];
  paths: TracePath[];
  debugLinks: DebugLink[];
}

function deserializeModule(sm: SerializedModule): DeserializedModule {
  const components = sm.components.map(deserializeComponent);
  const nets = sm.internalNets.map(deserializeNet);

  const pathResults = sm.internalPaths.map(deserializeTracePath);
  const paths = pathResults.map((r) => r.path);
  const debugLinks = pathResults.flatMap((r) => r.debugLinks);

  const module: Module = {
    id: asId<ModuleId>(sm.id),
    name: sm.name,
    description: sm.description,
    version: sm.version,
    components: components.map((c) => c.id),
    internalNets: nets.map((n) => n.id),
    internalPaths: paths.map((p) => p.id),
    exposedPins: sm.exposedPins,
    boundingBox: sm.boundingBox,
    tags: sm.tags,
    category: sm.category,
    thumbnail: sm.thumbnail,
    createdAt: sm.createdAt,
    updatedAt: sm.updatedAt,
  };

  return { module, components, nets, paths, debugLinks };
}

// ─── Leaf Deserializers ──────────────────────────────────────────────────────

function deserializeComponent(sc: SerializedComponent): Component {
  return {
    id: asId<ComponentId>(sc.id),
    name: sc.name,
    designator: sc.designator,
    footprint: {
      id: asId<FootprintId>(sc.footprint.id),
      name: sc.footprint.name,
      description: sc.footprint.description,
      pads: sc.footprint.pads.map((pad) => ({
        id: asId<PadId>(pad.id),
        componentId: asId<ComponentId>(pad.componentId),
        name: pad.name,
        localPosition: pad.localPosition,
        shape: pad.shape,
        width: pad.width,
        height: pad.height,
        rotation: pad.rotation,
        layerId: asId<LayerId>(pad.layerId),
        plated: pad.plated,
        ...(pad.drillDiameter !== undefined && { drillDiameter: pad.drillDiameter }),
      })),
      pins: sc.footprint.pins.map((pin) => ({
        id: asId<PinId>(pin.id),
        padId: asId<PadId>(pin.padId),
        name: pin.name,
        number: pin.number,
        electricalType: pin.electricalType,
      })),
      boundingBox: sc.footprint.boundingBox,
      courtyard: sc.footprint.courtyard,
    },
    transform: sc.transform,
    layerId: asId<LayerId>(sc.layerId),
    properties: sc.properties,
    locked: sc.locked,
  };
}

function deserializeNet(sn: SerializedNet): Net {
  return {
    id: asId<NetId>(sn.id),
    name: sn.name,
    pins: sn.pinIds.map((id) => asId<PinId>(id)),
    pads: sn.padIds.map((id) => asId<PadId>(id)),
    paths: sn.pathIds.map((id) => asId<TracePathId>(id)),
    ...(sn.color !== undefined && { color: sn.color }),
    ...(sn.netClass !== undefined && { netClass: sn.netClass }),
  };
}

interface DeserializedTracePath {
  path: TracePath;
  debugLinks: DebugLink[];
}

function deserializeTracePath(
  sp: import('./types').SerializedTracePath,
): DeserializedTracePath {
  const path: TracePath = {
    id: asId<TracePathId>(sp.id),
    netId: asId<NetId>(sp.netId),
    segments: sp.segments.map((seg) => ({
      id: asId<TraceSegmentId>(seg.id),
      pathId: asId<TracePathId>(seg.pathId),
      layerId: asId<LayerId>(seg.layerId),
      start: seg.start,
      end: seg.end,
      width: seg.width,
    })),
    vias: sp.vias.map((via) => ({
      id: asId<ViaId>(via.id),
      pathId: asId<TracePathId>(via.pathId),
      position: via.position,
      fromLayerId: asId<LayerId>(via.fromLayerId),
      toLayerId: asId<LayerId>(via.toLayerId),
      outerDiameter: via.outerDiameter,
      drillDiameter: via.drillDiameter,
      netId: asId<NetId>(via.netId),
    })),
    debugLinks: sp.debugLinks.map((dl) => asId<DebugLinkId>(dl.id)),
    cornerRadius: (sp as any).cornerRadius ?? 0,
  };

  const debugLinks: DebugLink[] = sp.debugLinks.map((dl) => ({
    id: asId<DebugLinkId>(dl.id),
    pathId: asId<TracePathId>(dl.pathId),
    label: dl.label,
    description: dl.description,
    severity: dl.severity,
    metadata: dl.metadata,
    createdAt: dl.createdAt,
  }));

  return { path, debugLinks };
}

// Re-export for use by the serialized net type
type SerializedNet = import('./types').SerializedNet;
