import type {
  ProjectFile,
  SerializedBoard,
  SerializedComponent,
  SerializedNet,
  SerializedTracePath,
  SerializedPad,
  SerializedVia,
} from '../types';

// ─── Unit Conversion ────────────────────────────────────────────────────────

/** Convert mils to millimetres (KiCad native unit). */
function milsToMm(mils: number): number {
  return +(mils * 0.0254).toFixed(4);
}

// ─── S-Expression Helpers ───────────────────────────────────────────────────

function q(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function sexpr(tag: string, ...children: (string | undefined | false)[]): string {
  const parts = children.filter((c): c is string => typeof c === 'string' && c.length > 0);
  return `(${tag} ${parts.join(' ')})`;
}

// ─── Layer Mapping ──────────────────────────────────────────────────────────

interface KiCadLayer {
  index: number;
  name: string;
  type: string; // signal | power | user
}

function mapLayers(board: SerializedBoard): Map<string, KiCadLayer> {
  const m = new Map<string, KiCadLayer>();
  const typeOrder = ['signal', 'plane'];

  // KiCad standard copper layers: F.Cu=0 .. B.Cu=31
  // Assign board signal/plane layers to KiCad copper layers in order.
  const copperLayers = board.layers.filter((l) =>
    typeOrder.includes(l.type),
  );

  copperLayers.forEach((l, i) => {
    const kiName =
      i === 0
        ? 'F.Cu'
        : i === copperLayers.length - 1
          ? 'B.Cu'
          : `In${i}.Cu`;
    m.set(l.id, { index: i, name: kiName, type: l.type === 'plane' ? 'power' : 'signal' });
  });

  // Non-copper layers
  for (const l of board.layers) {
    if (m.has(l.id)) continue;
    switch (l.type) {
      case 'silkscreen_top':
        m.set(l.id, { index: 36, name: 'F.SilkS', type: 'user' });
        break;
      case 'silkscreen_bottom':
        m.set(l.id, { index: 37, name: 'B.SilkS', type: 'user' });
        break;
      case 'solder_mask_top':
        m.set(l.id, { index: 38, name: 'F.Mask', type: 'user' });
        break;
      case 'solder_mask_bottom':
        m.set(l.id, { index: 39, name: 'B.Mask', type: 'user' });
        break;
      case 'paste_top':
        m.set(l.id, { index: 34, name: 'F.Paste', type: 'user' });
        break;
      case 'paste_bottom':
        m.set(l.id, { index: 35, name: 'B.Paste', type: 'user' });
        break;
      default:
        m.set(l.id, { index: 44, name: 'Dwgs.User', type: 'user' });
        break;
    }
  }

  return m;
}

function kiLayerName(layerMap: Map<string, KiCadLayer>, id: string): string {
  return layerMap.get(id)?.name ?? 'F.Cu';
}

// ─── Pad Shape ──────────────────────────────────────────────────────────────

function padShape(shape: string): string {
  switch (shape) {
    case 'circle': return 'circle';
    case 'rect': return 'rect';
    case 'oval': return 'oval';
    default: return 'rect';
  }
}

function padType(pad: SerializedPad): string {
  if (pad.drillDiameter && pad.drillDiameter > 0) return 'thru_hole';
  return 'smd';
}

// ─── Exporters ──────────────────────────────────────────────────────────────

function exportPad(pad: SerializedPad, layerMap: Map<string, KiCadLayer>): string {
  const x = milsToMm(pad.localPosition.x);
  const y = milsToMm(pad.localPosition.y);
  const w = milsToMm(pad.width);
  const h = milsToMm(pad.height);
  const layer = kiLayerName(layerMap, pad.layerId);
  const type = padType(pad);
  const shape = padShape(pad.shape);

  const layers = type === 'smd'
    ? `(layers ${q(layer)} ${q(layer.startsWith('F.') ? 'F.Paste' : 'B.Paste')} ${q(layer.startsWith('F.') ? 'F.Mask' : 'B.Mask')})`
    : '(layers *.Cu *.Mask)';

  const drill = pad.drillDiameter
    ? ` (drill ${milsToMm(pad.drillDiameter)})`
    : '';

  return `    (pad ${q(pad.name)} ${type} ${shape} (at ${x} ${y} ${pad.rotation ?? 0}) (size ${w} ${h})${drill} ${layers})`;
}

function exportComponent(comp: SerializedComponent, layerMap: Map<string, KiCadLayer>): string {
  const x = milsToMm(comp.transform.position.x);
  const y = milsToMm(comp.transform.position.y);
  const rot = comp.transform.rotation ?? 0;
  const layer = kiLayerName(layerMap, comp.layerId);

  const lines: string[] = [];
  lines.push(`  (footprint ${q(comp.footprint.name)} (layer ${q(layer)})`);
  lines.push(`    (at ${x} ${y} ${rot})`);
  lines.push(`    (property "Reference" ${q(comp.designator)} (at 0 -2 0) (layer ${q(layer.startsWith('B.') ? 'B.SilkS' : 'F.SilkS')}) (effects (font (size 0.8 0.8) (thickness 0.15))))`);
  lines.push(`    (property "Value" ${q(comp.properties['value'] ?? comp.name)} (at 0 2 0) (layer ${q(layer.startsWith('B.') ? 'B.Fab' : 'F.Fab')}) (effects (font (size 0.8 0.8) (thickness 0.15))))`);

  // Courtyard
  const cy = comp.footprint.courtyard;
  lines.push(`    (fp_rect (start ${milsToMm(cy.min.x)} ${milsToMm(cy.min.y)}) (end ${milsToMm(cy.max.x)} ${milsToMm(cy.max.y)}) (layer ${q(layer.startsWith('B.') ? 'B.CrtYd' : 'F.CrtYd')}) (stroke (width 0.05) (type solid)))`);

  // Pads
  for (const pad of comp.footprint.pads) {
    lines.push(exportPad(pad, layerMap));
  }

  lines.push('  )');
  return lines.join('\n');
}

function exportSegment(
  seg: { layerId: string; start: { x: number; y: number }; end: { x: number; y: number }; width: number },
  netIndex: number,
  layerMap: Map<string, KiCadLayer>,
): string {
  const layer = kiLayerName(layerMap, seg.layerId);
  return `  (segment (start ${milsToMm(seg.start.x)} ${milsToMm(seg.start.y)}) (end ${milsToMm(seg.end.x)} ${milsToMm(seg.end.y)}) (width ${milsToMm(seg.width)}) (layer ${q(layer)}) (net ${netIndex}))`;
}

function exportVia(via: SerializedVia, netIndex: number, layerMap: Map<string, KiCadLayer>): string {
  const fromLayer = kiLayerName(layerMap, via.fromLayerId);
  const toLayer = kiLayerName(layerMap, via.toLayerId);
  return `  (via (at ${milsToMm(via.position.x)} ${milsToMm(via.position.y)}) (size ${milsToMm(via.outerDiameter)}) (drill ${milsToMm(via.drillDiameter)}) (layers ${q(fromLayer)} ${q(toLayer)}) (net ${netIndex}))`;
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function exportKiCad(projectFile: ProjectFile): string {
  const board = projectFile.project.boards[0];
  if (!board) return '(kicad_pcb (version 20230121) (generator pcb-layout))';

  const layerMap = mapLayers(board);

  // Build net name -> index map (KiCad nets are 1-indexed, 0 = unconnected)
  const netNameToIndex = new Map<string, number>();
  const netIdToIndex = new Map<string, number>();
  netNameToIndex.set('', 0);
  board.nets.forEach((n, i) => {
    netNameToIndex.set(n.name, i + 1);
    netIdToIndex.set(n.id, i + 1);
  });

  const lines: string[] = [];

  // ── Header
  lines.push('(kicad_pcb (version 20230121) (generator "pcb-layout")');
  lines.push('');

  // ── General
  lines.push('  (general');
  lines.push(`    (thickness 1.6)`);
  lines.push('  )');
  lines.push('');

  // ── Page
  const w = milsToMm(board.workspace.width);
  const h = milsToMm(board.workspace.height);
  lines.push(`  (page "User" ${w} ${h})`);
  lines.push('');

  // ── Layers
  lines.push('  (layers');
  const sortedLayers = [...layerMap.entries()].sort((a, b) => a[1].index - b[1].index);
  for (const [, kl] of sortedLayers) {
    lines.push(`    (${kl.index} ${q(kl.name)} ${kl.type})`);
  }
  // Add standard utility layers
  lines.push(`    (32 ${q('B.Adhes')} user)`);
  lines.push(`    (33 ${q('F.Adhes')} user)`);
  lines.push(`    (40 ${q('Edge.Cuts')} user)`);
  lines.push(`    (41 ${q('Margin')} user)`);
  lines.push(`    (44 ${q('Dwgs.User')} user)`);
  lines.push(`    (46 ${q('B.CrtYd')} user)`);
  lines.push(`    (47 ${q('F.CrtYd')} user)`);
  lines.push(`    (48 ${q('B.Fab')} user)`);
  lines.push(`    (49 ${q('F.Fab')} user)`);
  lines.push('  )');
  lines.push('');

  // ── Setup
  lines.push('  (setup');
  lines.push('    (pad_to_mask_clearance 0.05)');
  lines.push('    (pcbplotparams');
  lines.push('      (layerselection 0x00010fc_ffffffff)');
  lines.push('      (outputformat 1)');
  lines.push('    )');
  lines.push('  )');
  lines.push('');

  // ── Nets
  lines.push(`  (net 0 "")`);
  for (const net of board.nets) {
    lines.push(`  (net ${netNameToIndex.get(net.name)} ${q(net.name)})`);
  }
  lines.push('');

  // ── Board outline on Edge.Cuts
  lines.push(`  (gr_rect (start 0 0) (end ${w} ${h}) (layer "Edge.Cuts") (stroke (width 0.1) (type solid)))`);
  lines.push('');

  // ── Footprints (components)
  for (const comp of board.components) {
    lines.push(exportComponent(comp, layerMap));
    lines.push('');
  }

  // ── Traces
  for (const path of board.paths) {
    const netIdx = netIdToIndex.get(path.netId) ?? 0;
    for (const seg of path.segments) {
      lines.push(exportSegment(seg, netIdx, layerMap));
    }
    for (const via of path.vias) {
      lines.push(exportVia(via, netIdx, layerMap));
    }
  }
  lines.push('');

  lines.push(')');

  return lines.join('\n');
}
