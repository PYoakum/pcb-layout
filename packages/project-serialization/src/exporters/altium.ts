import type {
  ProjectFile,
  SerializedBoard,
  SerializedComponent,
  SerializedNet,
  SerializedPad,
  SerializedVia,
  SerializedTraceSegment,
} from '../types';

/**
 * Altium .PcbDoc export.
 *
 * The native .PcbDoc format is an OLE2 compound document with binary records.
 * Generating a true OLE2 file from scratch without a dedicated library is
 * impractical, so we produce the widely-supported **Altium ASCII PCB** format
 * (.PcbDoc text variant) which Altium Designer can import via File -> Open and
 * which many third-party tools (e.g. Altium 365 viewer, CircuitMaker) also
 * accept.
 *
 * The format uses pipe-delimited key=value records grouped by RECORD type.
 */

// ─── Unit Conversion ────────────────────────────────────────────────────────

/** Convert mils to Altium internal units (10 nanometres). 1 mil = 2540 × 10nm. */
function milsToAltium(mils: number): number {
  return Math.round(mils * 2540);
}

/** Convert mils to millimetres for human-readable fields. */
function milsToMm(mils: number): number {
  return +(mils * 0.0254).toFixed(4);
}

// ─── Layer Mapping ──────────────────────────────────────────────────────────

/** Altium layer IDs — standard copper layers are 1 (Top) through 32 (Bottom). */
interface AltiumLayer {
  id: number;
  name: string;
}

function mapLayers(board: SerializedBoard): Map<string, AltiumLayer> {
  const m = new Map<string, AltiumLayer>();

  const copper = board.layers.filter((l) => l.type === 'signal' || l.type === 'plane');

  copper.forEach((l, i) => {
    const id = i === 0 ? 1 : i === copper.length - 1 ? 32 : i + 1;
    const name = i === 0 ? 'Top Layer' : i === copper.length - 1 ? 'Bottom Layer' : `Mid-Layer ${i}`;
    m.set(l.id, { id, name });
  });

  for (const l of board.layers) {
    if (m.has(l.id)) continue;
    switch (l.type) {
      case 'silkscreen_top':    m.set(l.id, { id: 33, name: 'Top Overlay' }); break;
      case 'silkscreen_bottom': m.set(l.id, { id: 34, name: 'Bottom Overlay' }); break;
      case 'solder_mask_top':   m.set(l.id, { id: 35, name: 'Top Solder' }); break;
      case 'solder_mask_bottom':m.set(l.id, { id: 36, name: 'Bottom Solder' }); break;
      case 'paste_top':         m.set(l.id, { id: 37, name: 'Top Paste' }); break;
      case 'paste_bottom':      m.set(l.id, { id: 38, name: 'Bottom Paste' }); break;
      default:                  m.set(l.id, { id: 56, name: 'Mechanical 1' }); break;
    }
  }

  return m;
}

function altiumLayerId(layerMap: Map<string, AltiumLayer>, id: string): number {
  return layerMap.get(id)?.id ?? 1;
}

function altiumLayerName(layerMap: Map<string, AltiumLayer>, id: string): string {
  return layerMap.get(id)?.name ?? 'Top Layer';
}

// ─── Pad Shape ──────────────────────────────────────────────────────────────

function altiumPadShape(shape: string): string {
  switch (shape) {
    case 'circle': return 'ROUND';
    case 'rect': return 'RECTANGLE';
    case 'oval': return 'OVAL';
    default: return 'ROUND';
  }
}

// ─── Record Generators ──────────────────────────────────────────────────────

function boardRecord(board: SerializedBoard, layerMap: Map<string, AltiumLayer>): string {
  const lines: string[] = [];

  lines.push('|RECORD=Board');
  lines.push(`|SHEETHEIGHT=${milsToAltium(board.workspace.height)}`);
  lines.push(`|SHEETWIDTH=${milsToAltium(board.workspace.width)}`);
  lines.push(`|ORIGINX=${milsToAltium(0)}`);
  lines.push(`|ORIGINY=${milsToAltium(0)}`);
  lines.push(`|SNAPGRIDSIZE=${milsToMm(board.workspace.grid?.spacingX ?? 5)}mil`);

  // Board outline vertices
  lines.push(`|BOUNDTRACK.KIND=0`);
  lines.push(`|BOUNDTRACK.COUNT=4`);
  lines.push(`|BOUNDTRACK.X0=${milsToAltium(0)}|BOUNDTRACK.Y0=${milsToAltium(0)}`);
  lines.push(`|BOUNDTRACK.X1=${milsToAltium(board.workspace.width)}|BOUNDTRACK.Y1=${milsToAltium(0)}`);
  lines.push(`|BOUNDTRACK.X2=${milsToAltium(board.workspace.width)}|BOUNDTRACK.Y2=${milsToAltium(board.workspace.height)}`);
  lines.push(`|BOUNDTRACK.X3=${milsToAltium(0)}|BOUNDTRACK.Y3=${milsToAltium(board.workspace.height)}`);

  return lines.join('');
}

function netRecord(net: SerializedNet, index: number): string {
  return `|RECORD=Net|ID=${index}|NAME=${net.name}`;
}

function componentRecord(comp: SerializedComponent, layerMap: Map<string, AltiumLayer>, index: number): string {
  const x = milsToAltium(comp.transform.position.x);
  const y = milsToAltium(comp.transform.position.y);
  const layer = altiumLayerId(layerMap, comp.layerId);
  const rotation = comp.transform.rotation ?? 0;

  return [
    `|RECORD=Component`,
    `|ID=${index}`,
    `|CURRENTPARTID=1`,
    `|SOURCEDESIGNATOR=${comp.designator}`,
    `|SOURCEFOOTPRINTLIBRARY=pcb-layout`,
    `|PATTERN=${comp.footprint.name}`,
    `|SOURCECOMPONENTLIBRARY=pcb-layout`,
    `|DESCRIPTION=${comp.footprint.description}`,
    `|X=${x}`,
    `|Y=${y}`,
    `|LAYER=${layer}`,
    `|ROTATION=${rotation}`,
    `|LOCKED=${comp.locked ? 'TRUE' : 'FALSE'}`,
    `|NAMEAUTOPOSITION=0`,
    `|COMMENTAUTOPOSITION=0`,
    `|NAME.TEXT=${comp.designator}`,
    `|COMMENT.TEXT=${comp.properties['value'] ?? comp.name}`,
  ].join('');
}

function padRecord(
  pad: SerializedPad,
  comp: SerializedComponent,
  layerMap: Map<string, AltiumLayer>,
  compIndex: number,
  netIndex: number,
  netName: string,
): string {
  // World position = component position + local position (accounting for rotation)
  const cx = comp.transform.position.x;
  const cy = comp.transform.position.y;
  const rot = (comp.transform.rotation ?? 0) * Math.PI / 180;
  const lx = pad.localPosition.x;
  const ly = pad.localPosition.y;
  const wx = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
  const wy = cy + lx * Math.sin(rot) + ly * Math.cos(rot);

  const isThruHole = pad.drillDiameter != null && pad.drillDiameter > 0;
  const layer = isThruHole ? 74 : altiumLayerId(layerMap, pad.layerId); // 74 = Multi-Layer

  const parts = [
    `|RECORD=Pad`,
    `|COMPONENT=${compIndex}`,
    `|NET=${netIndex}`,
    `|NAME=${pad.name}`,
    `|X=${milsToAltium(wx)}`,
    `|Y=${milsToAltium(wy)}`,
    `|XSIZE=${milsToAltium(pad.width)}`,
    `|YSIZE=${milsToAltium(pad.height)}`,
    `|SHAPE=${altiumPadShape(pad.shape)}`,
    `|LAYER=${layer}`,
    `|PLATED=${pad.plated ? 'TRUE' : 'FALSE'}`,
    `|ROTATION=${pad.rotation ?? 0}`,
  ];

  if (isThruHole) {
    parts.push(`|HOLESIZE=${milsToAltium(pad.drillDiameter!)}`);
  }

  return parts.join('');
}

function trackRecord(
  seg: SerializedTraceSegment,
  layerMap: Map<string, AltiumLayer>,
  netIndex: number,
): string {
  const layer = altiumLayerId(layerMap, seg.layerId);
  return [
    `|RECORD=Track`,
    `|NET=${netIndex}`,
    `|LAYER=${layer}`,
    `|X1=${milsToAltium(seg.start.x)}`,
    `|Y1=${milsToAltium(seg.start.y)}`,
    `|X2=${milsToAltium(seg.end.x)}`,
    `|Y2=${milsToAltium(seg.end.y)}`,
    `|WIDTH=${milsToAltium(seg.width)}`,
  ].join('');
}

function viaRecord(
  via: SerializedVia,
  layerMap: Map<string, AltiumLayer>,
  netIndex: number,
): string {
  const fromLayer = altiumLayerId(layerMap, via.fromLayerId);
  const toLayer = altiumLayerId(layerMap, via.toLayerId);
  return [
    `|RECORD=Via`,
    `|NET=${netIndex}`,
    `|X=${milsToAltium(via.position.x)}`,
    `|Y=${milsToAltium(via.position.y)}`,
    `|DIAMETER=${milsToAltium(via.outerDiameter)}`,
    `|HOLESIZE=${milsToAltium(via.drillDiameter)}`,
    `|STARTLAYER=${fromLayer}`,
    `|ENDLAYER=${toLayer}`,
  ].join('');
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function exportAltium(projectFile: ProjectFile): string {
  const board = projectFile.project.boards[0];
  if (!board) {
    return '|RECORD=Board|SHEETHEIGHT=0|SHEETWIDTH=0\n';
  }

  const layerMap = mapLayers(board);

  // Net indices (0 = no net)
  const netIdToIndex = new Map<string, number>();
  const netIdToName = new Map<string, string>();
  board.nets.forEach((n, i) => {
    netIdToIndex.set(n.id, i + 1);
    netIdToName.set(n.id, n.name);
  });

  // Build pad-to-net lookup
  const padToNet = new Map<string, { index: number; name: string }>();
  for (const net of board.nets) {
    const idx = netIdToIndex.get(net.id) ?? 0;
    for (const padId of net.padIds) {
      padToNet.set(padId, { index: idx, name: net.name });
    }
  }

  const records: string[] = [];

  // ── File header
  records.push(`|HEADER=Altium PCB ASCII Export|VERSION=6.0|GENERATOR=pcb-layout`);

  // ── Board record
  records.push(boardRecord(board, layerMap));

  // ── Layer definitions
  const allLayers = [...layerMap.values()].sort((a, b) => a.id - b.id);
  for (const l of allLayers) {
    records.push(`|RECORD=Layer|ID=${l.id}|NAME=${l.name}|COPPERTHICK=1.4`);
  }

  // ── Net definitions
  for (const net of board.nets) {
    records.push(netRecord(net, netIdToIndex.get(net.id)!));
  }

  // ── Components
  const compIndexMap = new Map<string, number>();
  board.components.forEach((comp, i) => {
    compIndexMap.set(comp.id, i);
    records.push(componentRecord(comp, layerMap, i));
  });

  // ── Pads (per component)
  for (const comp of board.components) {
    const compIdx = compIndexMap.get(comp.id) ?? 0;
    for (const pad of comp.footprint.pads) {
      const netInfo = padToNet.get(pad.id) ?? { index: 0, name: '' };
      records.push(padRecord(pad, comp, layerMap, compIdx, netInfo.index, netInfo.name));
    }
  }

  // ── Tracks (trace segments)
  for (const path of board.paths) {
    const netIdx = netIdToIndex.get(path.netId) ?? 0;
    for (const seg of path.segments) {
      records.push(trackRecord(seg, layerMap, netIdx));
    }
  }

  // ── Vias
  for (const path of board.paths) {
    const netIdx = netIdToIndex.get(path.netId) ?? 0;
    for (const via of path.vias) {
      records.push(viaRecord(via, layerMap, netIdx));
    }
  }

  // ── Board outline as tracks on Keep-Out Layer (layer 57)
  const w = board.workspace.width;
  const h = board.workspace.height;
  records.push(`|RECORD=Track|NET=0|LAYER=57|X1=${milsToAltium(0)}|Y1=${milsToAltium(0)}|X2=${milsToAltium(w)}|Y2=${milsToAltium(0)}|WIDTH=${milsToAltium(10)}`);
  records.push(`|RECORD=Track|NET=0|LAYER=57|X1=${milsToAltium(w)}|Y1=${milsToAltium(0)}|X2=${milsToAltium(w)}|Y2=${milsToAltium(h)}|WIDTH=${milsToAltium(10)}`);
  records.push(`|RECORD=Track|NET=0|LAYER=57|X1=${milsToAltium(w)}|Y1=${milsToAltium(h)}|X2=${milsToAltium(0)}|Y2=${milsToAltium(h)}|WIDTH=${milsToAltium(10)}`);
  records.push(`|RECORD=Track|NET=0|LAYER=57|X1=${milsToAltium(0)}|Y1=${milsToAltium(h)}|X2=${milsToAltium(0)}|Y2=${milsToAltium(0)}|WIDTH=${milsToAltium(10)}`);

  // ── Footer
  records.push(`|RECORD=End`);

  return records.join('\n');
}
