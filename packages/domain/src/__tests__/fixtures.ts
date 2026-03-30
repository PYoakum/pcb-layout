import type {
  Project,
  Board,
  Component,
  Footprint,
  Pad,
  Net,
  TracePath,
  TraceSegment,
  Via,
  Module,
  DesignRule,
  BoardLayer,
  WorkspaceConfig,
  ProjectId,
  BoardId,
  LayerId,
  ModuleId,
  ComponentId,
  FootprintId,
  PadId,
  NetId,
  TracePathId,
  TraceSegmentId,
  ViaId,
  DesignRuleId,
  BoundingBox,
  Pin,
  PinId,
} from '../index';
import {
  Rotation,
  PadShape,
  PinElectricalType,
  LayerType,
  DesignRuleType,
} from '../index';

// Helper to create branded IDs without crypto.randomUUID (deterministic in tests)
let idCounter = 0;
function testId<T extends string>(prefix: string): T {
  return `${prefix}_test_${++idCounter}` as T;
}

/** Reset the ID counter between tests if needed. */
export function resetIdCounter(): void {
  idCounter = 0;
}

export function createTestWorkspaceConfig(overrides?: Partial<WorkspaceConfig>): WorkspaceConfig {
  return {
    width: 5000,
    height: 4000,
    grid: {
      spacingX: 50,
      spacingY: 50,
      subdivisions: 2,
      visible: true,
      snapEnabled: true,
    },
    layerCount: 2,
    ...overrides,
  };
}

export function createTestBoardLayer(overrides?: Partial<BoardLayer>): BoardLayer {
  return {
    id: testId<LayerId>('layer'),
    boardId: testId<BoardId>('board'),
    name: 'Top Copper',
    type: LayerType.Signal,
    order: 0,
    color: '#ff0000',
    visible: true,
    locked: false,
    opacity: 1,
    ...overrides,
  };
}

export function createTestBoard(overrides?: Partial<Board>): Board {
  const topLayer = createTestBoardLayer({ name: 'Top Copper', order: 0 });
  const bottomLayer = createTestBoardLayer({
    name: 'Bottom Copper',
    order: 1,
    color: '#0000ff',
    boardId: topLayer.boardId,
  });
  return {
    id: topLayer.boardId,
    projectId: testId<ProjectId>('proj'),
    name: 'Main Board',
    workspace: createTestWorkspaceConfig(),
    layers: [topLayer, bottomLayer],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestPad(overrides?: Partial<Pad>): Pad {
  return {
    id: testId<PadId>('pad'),
    componentId: testId<ComponentId>('comp'),
    name: '1',
    localPosition: { x: 0, y: 0 },
    shape: PadShape.Circle,
    width: 40,
    height: 40,
    rotation: Rotation.R0,
    layerId: testId<LayerId>('layer'),
    plated: true,
    ...overrides,
  };
}

function createTestPin(overrides?: Partial<Pin>): Pin {
  return {
    id: testId<PinId>('pin'),
    padId: testId<PadId>('pad'),
    name: '1',
    number: '1',
    electricalType: PinElectricalType.Passive,
    ...overrides,
  };
}

export function createTestFootprint(overrides?: Partial<Footprint>): Footprint {
  const pad1 = createTestPad({ name: '1', localPosition: { x: -50, y: 0 } });
  const pad2 = createTestPad({ name: '2', localPosition: { x: 50, y: 0 } });
  const pin1 = createTestPin({ padId: pad1.id, name: '1', number: '1' });
  const pin2 = createTestPin({ padId: pad2.id, name: '2', number: '2' });
  return {
    id: testId<FootprintId>('fp'),
    name: '0805',
    description: '0805 SMD footprint',
    pads: [pad1, pad2],
    pins: [pin1, pin2],
    boundingBox: { min: { x: -60, y: -30 }, max: { x: 60, y: 30 } },
    courtyard: { min: { x: -70, y: -40 }, max: { x: 70, y: 40 } },
    ...overrides,
  };
}

export function createTestComponent(overrides?: Partial<Component>): Component {
  const footprint = createTestFootprint();
  return {
    id: testId<ComponentId>('comp'),
    name: 'Resistor',
    designator: 'R1',
    footprint,
    transform: {
      position: { x: 500, y: 500 },
      rotation: Rotation.R0,
      mirrored: false,
    },
    layerId: testId<LayerId>('layer'),
    properties: { value: '10k', package: '0805' },
    locked: false,
    ...overrides,
  };
}

export function createTestNet(overrides?: Partial<Net>): Net {
  return {
    id: testId<NetId>('net'),
    name: 'VCC',
    pins: [],
    pads: [],
    paths: [],
    ...overrides,
  };
}

export function createTestTraceSegment(overrides?: Partial<TraceSegment>): TraceSegment {
  return {
    id: testId<TraceSegmentId>('seg'),
    pathId: testId<TracePathId>('path'),
    layerId: testId<LayerId>('layer'),
    start: { x: 100, y: 100 },
    end: { x: 200, y: 100 },
    width: 10,
    ...overrides,
  };
}

export function createTestVia(overrides?: Partial<Via>): Via {
  return {
    id: testId<ViaId>('via'),
    pathId: testId<TracePathId>('path'),
    position: { x: 200, y: 100 },
    fromLayerId: testId<LayerId>('layer'),
    toLayerId: testId<LayerId>('layer'),
    outerDiameter: 30,
    drillDiameter: 15,
    netId: testId<NetId>('net'),
    ...overrides,
  };
}

export function createTestTracePath(overrides?: Partial<TracePath>): TracePath {
  const seg = createTestTraceSegment();
  return {
    id: seg.pathId,
    netId: testId<NetId>('net'),
    segments: [seg],
    vias: [],
    debugLinks: [],
    cornerRadius: 0,
    ...overrides,
  };
}

export function createTestModule(overrides?: Partial<Module>): Module {
  return {
    id: testId<ModuleId>('mod'),
    name: 'Power Supply',
    description: 'Basic 3.3V regulator module',
    version: '1.0.0',
    components: [],
    internalNets: [],
    internalPaths: [],
    exposedPins: [],
    boundingBox: { min: { x: 0, y: 0 }, max: { x: 500, y: 300 } },
    tags: ['power'],
    category: 'power',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestDesignRule(overrides?: Partial<DesignRule>): DesignRule {
  return {
    id: testId<DesignRuleId>('dr'),
    type: DesignRuleType.MinTraceWidth,
    name: 'Minimum Trace Width',
    value: 6,
    unit: 'mil',
    enabled: true,
    ...overrides,
  };
}

export function createTestProject(overrides?: Partial<Project>): Project {
  return {
    id: testId<ProjectId>('proj'),
    name: 'Test Project',
    description: 'A test project',
    boards: [],
    modules: [],
    libraryAssets: [],
    settings: {
      defaultGridSpacing: 50,
      defaultLayerCount: 2,
      defaultBoardWidth: 5000,
      defaultBoardHeight: 4000,
      units: 'mils',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
