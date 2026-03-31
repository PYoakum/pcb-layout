import type {
  Project,
  Board,
  Component,
  Module,
  ModuleInstance,
  Net,
  TracePath,
  DebugLink,
  DesignRule,
  LibraryAsset,
} from '@pcb/domain';

import type {
  ProjectFile,
  SerializedBoard,
  SerializedComponent,
  SerializedModule,
  SerializedModuleInstance,
  SerializedNet,
  SerializedTracePath,
  SerializedDebugLink,
  SerializedDesignRule,
  SerializedLibraryAsset,
} from './types';

import { CURRENT_VERSION, FORMAT_TYPE } from './types';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SerializeProjectInput {
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

/**
 * Serialize a full project and all related entities into a self-contained
 * ProjectFile suitable for JSON persistence.
 */
export function serializeProject(input: SerializeProjectInput): ProjectFile {
  const {
    project,
    boards,
    components,
    modules,
    moduleInstances,
    nets,
    paths,
    debugLinks,
    designRules,
    libraryAssets,
  } = input;

  const now = new Date().toISOString();

  return {
    version: CURRENT_VERSION,
    formatType: FORMAT_TYPE,
    createdAt: project.createdAt ?? now,
    updatedAt: now,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      settings: project.settings,
      boards: boards
        .filter((b) => b.projectId === project.id)
        .map((board) =>
          serializeBoard(
            board,
            components,
            nets,
            paths,
            debugLinks,
            moduleInstances,
            designRules,
          ),
        ),
      modules: modules.map((m) =>
        serializeModule(m, components, nets, paths, debugLinks),
      ),
      libraryAssets: libraryAssets
        .filter((a) => a.projectId === project.id)
        .map(serializeLibraryAsset),
    },
  };
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function serializeBoard(
  board: Board,
  allComponents: Component[],
  allNets: Net[],
  allPaths: TracePath[],
  allDebugLinks: DebugLink[],
  allModuleInstances: ModuleInstance[],
  allDesignRules: DesignRule[],
): SerializedBoard {
  // Components that live on this board's layers
  const boardLayerIds = new Set(board.layers.map((l) => l.id as string));
  const boardComponents = (board.components ?? []).length > 0
    ? board.components!
    : allComponents.filter((c) => boardLayerIds.has(c.layerId as string));

  // Collect pad IDs from board components for net filtering
  const boardPadIds = new Set<string>();
  for (const comp of boardComponents) {
    for (const pad of comp.footprint.pads) {
      boardPadIds.add(pad.id as string);
    }
  }

  // Nets that reference pads on this board
  const boardNets = allNets.filter((n) =>
    n.pads.some((padId) => boardPadIds.has(padId as string)),
  );

  const boardNetIds = new Set(boardNets.map((n) => n.id as string));

  // Paths belonging to board nets
  const boardPaths = allPaths.filter((p) =>
    boardNetIds.has(p.netId as string),
  );

  // Debug links for board paths
  const boardPathIds = new Set(boardPaths.map((p) => p.id as string));
  const boardDebugLinks = allDebugLinks.filter((dl) =>
    boardPathIds.has(dl.pathId as string),
  );

  return {
    id: board.id,
    name: board.name,
    workspace: board.workspace,
    layers: board.layers,
    ...(board.profiles && board.profiles.length > 0 && { profiles: board.profiles }),
    components: boardComponents.map(serializeComponent),
    nets: boardNets.map(serializeNet),
    paths: boardPaths.map((p) => serializeTracePath(p, boardDebugLinks)),
    moduleInstances: allModuleInstances.map(serializeModuleInstance),
    designRules: allDesignRules.map(serializeDesignRule),
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

// ─── Module ──────────────────────────────────────────────────────────────────

export function serializeModule(
  module: Module,
  allComponents: Component[],
  allNets: Net[],
  allPaths: TracePath[],
  allDebugLinks: DebugLink[],
): SerializedModule {
  const componentIds = new Set(module.components.map((id) => id as string));
  const moduleComponents = allComponents.filter((c) =>
    componentIds.has(c.id as string),
  );

  const netIds = new Set(module.internalNets.map((id) => id as string));
  const moduleNets = allNets.filter((n) => netIds.has(n.id as string));

  const pathIds = new Set(module.internalPaths.map((id) => id as string));
  const modulePaths = allPaths.filter((p) => pathIds.has(p.id as string));

  const modulePathIdSet = new Set(modulePaths.map((p) => p.id as string));
  const moduleDebugLinks = allDebugLinks.filter((dl) =>
    modulePathIdSet.has(dl.pathId as string),
  );

  return {
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    components: moduleComponents.map(serializeComponent),
    internalNets: moduleNets.map(serializeNet),
    internalPaths: modulePaths.map((p) =>
      serializeTracePath(p, moduleDebugLinks),
    ),
    exposedPins: module.exposedPins,
    boundingBox: module.boundingBox,
    tags: module.tags,
    category: module.category,
    thumbnail: module.thumbnail,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
  };
}

// ─── Leaf Entity Serializers ─────────────────────────────────────────────────

export function serializeComponent(component: Component): SerializedComponent {
  return {
    id: component.id,
    name: component.name,
    designator: component.designator,
    footprint: {
      id: component.footprint.id,
      name: component.footprint.name,
      description: component.footprint.description,
      pads: component.footprint.pads.map((pad) => ({
        id: pad.id,
        componentId: pad.componentId,
        name: pad.name,
        localPosition: pad.localPosition,
        shape: pad.shape,
        width: pad.width,
        height: pad.height,
        rotation: pad.rotation,
        layerId: pad.layerId,
        plated: pad.plated,
        ...(pad.drillDiameter !== undefined && {
          drillDiameter: pad.drillDiameter,
        }),
      })),
      pins: component.footprint.pins.map((pin) => ({
        id: pin.id,
        padId: pin.padId,
        name: pin.name,
        number: pin.number,
        electricalType: pin.electricalType,
      })),
      boundingBox: component.footprint.boundingBox,
      courtyard: component.footprint.courtyard,
    },
    transform: component.transform,
    layerId: component.layerId,
    properties: component.properties,
    locked: component.locked,
  };
}

export function serializeNet(net: Net): SerializedNet {
  return {
    id: net.id,
    name: net.name,
    pinIds: net.pins.map((id) => id as string),
    padIds: net.pads.map((id) => id as string),
    pathIds: net.paths.map((id) => id as string),
    ...(net.color !== undefined && { color: net.color }),
    ...(net.netClass !== undefined && { netClass: net.netClass }),
  };
}

export function serializeTracePath(
  path: TracePath,
  allDebugLinks: DebugLink[],
): SerializedTracePath {
  const pathDebugLinks = allDebugLinks.filter(
    (dl) => dl.pathId === path.id,
  );

  return {
    id: path.id,
    netId: path.netId,
    segments: path.segments.map((seg) => ({
      id: seg.id,
      pathId: seg.pathId,
      layerId: seg.layerId,
      start: seg.start,
      end: seg.end,
      width: seg.width,
    })),
    vias: path.vias.map((via) => ({
      id: via.id,
      pathId: via.pathId,
      position: via.position,
      fromLayerId: via.fromLayerId,
      toLayerId: via.toLayerId,
      outerDiameter: via.outerDiameter,
      drillDiameter: via.drillDiameter,
      netId: via.netId,
    })),
    debugLinks: pathDebugLinks.map(serializeDebugLink),
  };
}

export function serializeDebugLink(link: DebugLink): SerializedDebugLink {
  return {
    id: link.id,
    pathId: link.pathId,
    label: link.label,
    description: link.description,
    severity: link.severity,
    metadata: link.metadata,
    createdAt: link.createdAt,
  };
}

export function serializeDesignRule(rule: DesignRule): SerializedDesignRule {
  return {
    id: rule.id,
    type: rule.type,
    name: rule.name,
    value: rule.value,
    unit: rule.unit,
    ...(rule.netClass !== undefined && { netClass: rule.netClass }),
    enabled: rule.enabled,
  };
}

export function serializeModuleInstance(
  inst: ModuleInstance,
): SerializedModuleInstance {
  return {
    id: inst.id,
    moduleId: inst.moduleId,
    moduleVersion: inst.moduleVersion,
    transform: inst.transform,
    overrides: inst.overrides,
  };
}

export function serializeLibraryAsset(
  asset: LibraryAsset,
): SerializedLibraryAsset {
  return {
    id: asset.id,
    projectId: asset.projectId,
    type: asset.type,
    name: asset.name,
    data: asset.data,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
