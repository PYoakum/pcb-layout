import type {
  ProjectFile,
  SerializedBoard,
  SerializedComponent,
  SerializedNet,
  SerializedPad,
  SerializedVia,
} from '../types';

// ─── Unit Conversion ────────────────────────────────────────────────────────

/** Convert mils to millimetres (Eagle XML uses mm). */
function milsToMm(mils: number): number {
  return +(mils * 0.0254).toFixed(4);
}

// ─── XML Helpers ────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attr(name: string, value: string | number): string {
  return ` ${name}="${typeof value === 'string' ? esc(value) : value}"`;
}

// ─── Layer Mapping ──────────────────────────────────────────────────────────

interface EagleLayer {
  number: number;
  name: string;
  color: number;
  fill: number;
}

function mapLayers(board: SerializedBoard): { layers: EagleLayer[]; idMap: Map<string, number> } {
  const idMap = new Map<string, number>();
  const layers: EagleLayer[] = [];

  // Standard Eagle layer numbers
  const copperLayers = board.layers.filter((l) => l.type === 'signal' || l.type === 'plane');

  copperLayers.forEach((l, i) => {
    const num = i === 0 ? 1 : i === copperLayers.length - 1 ? 16 : i + 1;
    const name = i === 0 ? 'Top' : i === copperLayers.length - 1 ? 'Bottom' : `Route${i + 1}`;
    idMap.set(l.id, num);
    layers.push({ number: num, name, color: 4, fill: 1 });
  });

  for (const l of board.layers) {
    if (idMap.has(l.id)) continue;
    let num: number;
    let name: string;
    switch (l.type) {
      case 'silkscreen_top':    num = 21; name = 'tPlace'; break;
      case 'silkscreen_bottom': num = 22; name = 'bPlace'; break;
      case 'solder_mask_top':   num = 29; name = 'tStop'; break;
      case 'solder_mask_bottom':num = 30; name = 'bStop'; break;
      case 'paste_top':         num = 31; name = 'tCream'; break;
      case 'paste_bottom':      num = 32; name = 'bCream'; break;
      default:                  num = 49; name = 'Reference'; break;
    }
    idMap.set(l.id, num);
    layers.push({ number: num, name, color: 7, fill: 1 });
  }

  // Add standard Eagle layers always present
  const standard: EagleLayer[] = [
    { number: 17, name: 'Pads', color: 2, fill: 1 },
    { number: 18, name: 'Vias', color: 2, fill: 1 },
    { number: 19, name: 'Unrouted', color: 6, fill: 1 },
    { number: 20, name: 'Dimension', color: 15, fill: 1 },
    { number: 25, name: 'tNames', color: 7, fill: 1 },
    { number: 26, name: 'bNames', color: 7, fill: 1 },
    { number: 27, name: 'tValues', color: 7, fill: 1 },
    { number: 28, name: 'bValues', color: 7, fill: 1 },
    { number: 39, name: 'tKeepout', color: 4, fill: 11 },
    { number: 40, name: 'bKeepout', color: 1, fill: 11 },
    { number: 41, name: 'tRestrict', color: 4, fill: 10 },
    { number: 42, name: 'bRestrict', color: 1, fill: 10 },
    { number: 43, name: 'vRestrict', color: 2, fill: 10 },
    { number: 44, name: 'Drills', color: 7, fill: 1 },
    { number: 45, name: 'Holes', color: 7, fill: 1 },
    { number: 46, name: 'Milling', color: 3, fill: 1 },
    { number: 47, name: 'Measures', color: 7, fill: 1 },
    { number: 48, name: 'Document', color: 7, fill: 1 },
    { number: 51, name: 'tDocu', color: 7, fill: 1 },
    { number: 52, name: 'bDocu', color: 7, fill: 1 },
  ];

  for (const sl of standard) {
    if (!layers.some((l) => l.number === sl.number)) {
      layers.push(sl);
    }
  }

  layers.sort((a, b) => a.number - b.number);
  return { layers, idMap };
}

function eagleLayerNum(idMap: Map<string, number>, id: string): number {
  return idMap.get(id) ?? 1;
}

// ─── Pad / Shape Helpers ────────────────────────────────────────────────────

function eaglePadShape(shape: string): string {
  switch (shape) {
    case 'circle': return 'round';
    case 'rect': return 'square';
    case 'oval': return 'long';
    default: return 'round';
  }
}

// ─── Component / Package ────────────────────────────────────────────────────

function exportPackage(comp: SerializedComponent, idMap: Map<string, number>): string {
  const lines: string[] = [];
  const pkgName = esc(comp.footprint.name.replace(/\s+/g, '_'));

  lines.push(`      <package name="${pkgName}">`);
  lines.push(`        <description>${esc(comp.footprint.description)}</description>`);

  for (const pad of comp.footprint.pads) {
    const x = milsToMm(pad.localPosition.x);
    const y = milsToMm(pad.localPosition.y);

    if (pad.drillDiameter && pad.drillDiameter > 0) {
      // Through-hole pad
      lines.push(`        <pad name="${esc(pad.name)}" x="${x}" y="${y}" drill="${milsToMm(pad.drillDiameter)}" diameter="${milsToMm(Math.max(pad.width, pad.height))}" shape="${eaglePadShape(pad.shape)}"/>`);
    } else {
      // SMD pad
      const layer = eagleLayerNum(idMap, pad.layerId);
      lines.push(`        <smd name="${esc(pad.name)}" x="${x}" y="${y}" dx="${milsToMm(pad.width)}" dy="${milsToMm(pad.height)}" layer="${layer}"/>`);
    }
  }

  // Courtyard as wire rectangle on tKeepout/bKeepout
  const cy = comp.footprint.courtyard;
  const isBottom = comp.transform.mirrored;
  const cyLayer = isBottom ? 40 : 39;
  lines.push(`        <wire x1="${milsToMm(cy.min.x)}" y1="${milsToMm(cy.min.y)}" x2="${milsToMm(cy.max.x)}" y2="${milsToMm(cy.min.y)}" width="0.05" layer="${cyLayer}"/>`);
  lines.push(`        <wire x1="${milsToMm(cy.max.x)}" y1="${milsToMm(cy.min.y)}" x2="${milsToMm(cy.max.x)}" y2="${milsToMm(cy.max.y)}" width="0.05" layer="${cyLayer}"/>`);
  lines.push(`        <wire x1="${milsToMm(cy.max.x)}" y1="${milsToMm(cy.max.y)}" x2="${milsToMm(cy.min.x)}" y2="${milsToMm(cy.max.y)}" width="0.05" layer="${cyLayer}"/>`);
  lines.push(`        <wire x1="${milsToMm(cy.min.x)}" y1="${milsToMm(cy.max.y)}" x2="${milsToMm(cy.min.x)}" y2="${milsToMm(cy.min.y)}" width="0.05" layer="${cyLayer}"/>`);

  // Designator text
  const textLayer = isBottom ? 26 : 25;
  lines.push(`        <text x="0" y="${milsToMm(cy.min.y - 10)}" size="0.8" layer="${textLayer}">&gt;NAME</text>`);
  lines.push(`        <text x="0" y="${milsToMm(cy.max.y + 10)}" size="0.8" layer="${textLayer === 25 ? 27 : 28}">&gt;VALUE</text>`);

  lines.push('      </package>');
  return lines.join('\n');
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function exportEagle(projectFile: ProjectFile): string {
  const board = projectFile.project.boards[0];
  if (!board) {
    return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE eagle SYSTEM "eagle.dtd">\n<eagle version="9.6.2"><drawing><board></board></drawing></eagle>';
  }

  const { layers, idMap } = mapLayers(board);
  const w = milsToMm(board.workspace.width);
  const h = milsToMm(board.workspace.height);

  // Build net ID -> name map
  const netIdToName = new Map<string, string>();
  for (const net of board.nets) {
    netIdToName.set(net.id, net.name);
  }

  // Deduplicate packages by footprint name
  const seenPackages = new Set<string>();
  const packageXml: string[] = [];
  for (const comp of board.components) {
    const pkgName = comp.footprint.name.replace(/\s+/g, '_');
    if (!seenPackages.has(pkgName)) {
      seenPackages.add(pkgName);
      packageXml.push(exportPackage(comp, idMap));
    }
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push('<!DOCTYPE eagle SYSTEM "eagle.dtd">');
  lines.push('<eagle version="9.6.2">');
  lines.push('  <drawing>');
  lines.push('    <settings>');
  lines.push('      <setting alwaysvectorfont="no"/>');
  lines.push('      <setting verticaltext="up"/>');
  lines.push('    </settings>');
  lines.push(`    <grid distance="0.127" unitdist="mm" unit="mm" style="lines" multiple="1" display="yes" altdistance="0.0127" altunitdist="mm" altunit="mm"/>`);

  // ── Layers
  lines.push('    <layers>');
  for (const l of layers) {
    lines.push(`      <layer number="${l.number}" name="${esc(l.name)}" color="${l.color}" fill="${l.fill}" visible="yes" active="yes"/>`);
  }
  lines.push('    </layers>');

  lines.push('    <board>');
  lines.push(`      <description>${esc(projectFile.project.description)}</description>`);

  // ── Board outline on Dimension layer (20)
  lines.push('      <plain>');
  lines.push(`        <wire x1="0" y1="0" x2="${w}" y2="0" width="0" layer="20"/>`);
  lines.push(`        <wire x1="${w}" y1="0" x2="${w}" y2="${h}" width="0" layer="20"/>`);
  lines.push(`        <wire x1="${w}" y1="${h}" x2="0" y2="${h}" width="0" layer="20"/>`);
  lines.push(`        <wire x1="0" y1="${h}" x2="0" y2="0" width="0" layer="20"/>`);
  lines.push('      </plain>');

  // ── Libraries (packages)
  lines.push('      <libraries>');
  lines.push('        <library name="pcb-layout">');
  lines.push('          <packages>');
  for (const pkg of packageXml) {
    lines.push(pkg);
  }
  lines.push('          </packages>');
  lines.push('        </library>');
  lines.push('      </libraries>');

  // ── Elements (placed components)
  lines.push('      <elements>');
  for (const comp of board.components) {
    const x = milsToMm(comp.transform.position.x);
    const y = milsToMm(comp.transform.position.y);
    const rot = comp.transform.rotation ?? 0;
    const mirror = comp.transform.mirrored ? 'M' : '';
    const pkgName = esc(comp.footprint.name.replace(/\s+/g, '_'));

    lines.push(`        <element name="${esc(comp.designator)}" library="pcb-layout" package="${pkgName}" value="${esc(comp.properties['value'] ?? comp.name)}" x="${x}" y="${y}" rot="${mirror}R${rot}"/>`);
  }
  lines.push('      </elements>');

  // ── Signals (nets + wires)
  lines.push('      <signals>');
  for (const net of board.nets) {
    lines.push(`        <signal name="${esc(net.name)}">`);

    // Find paths for this net
    const netPaths = board.paths.filter((p) => p.netId === net.id);
    for (const path of netPaths) {
      for (const seg of path.segments) {
        const layer = eagleLayerNum(idMap, seg.layerId);
        lines.push(`          <wire x1="${milsToMm(seg.start.x)}" y1="${milsToMm(seg.start.y)}" x2="${milsToMm(seg.end.x)}" y2="${milsToMm(seg.end.y)}" width="${milsToMm(seg.width)}" layer="${layer}"/>`);
      }
      for (const via of path.vias) {
        lines.push(`          <via x="${milsToMm(via.position.x)}" y="${milsToMm(via.position.y)}" extent="${eagleLayerNum(idMap, via.fromLayerId)}-${eagleLayerNum(idMap, via.toLayerId)}" drill="${milsToMm(via.drillDiameter)}"/>`);
      }
    }

    // Contact references (pads connected to this net)
    for (const padId of net.padIds) {
      // Find which component owns this pad
      for (const comp of board.components) {
        const pad = comp.footprint.pads.find((p) => p.id === padId);
        if (pad) {
          lines.push(`          <contactref element="${esc(comp.designator)}" pad="${esc(pad.name)}"/>`);
          break;
        }
      }
    }

    lines.push('        </signal>');
  }
  lines.push('      </signals>');

  lines.push('    </board>');
  lines.push('  </drawing>');
  lines.push('</eagle>');

  return lines.join('\n');
}
