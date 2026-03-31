import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Programmatic regression test that loads the actual DDR5-96GB-RDIMM board file
 * and verifies that no components on the same layer have overlapping physical bodies.
 *
 * This test runs against the real PCB data, not synthetic fixtures.
 * It should be re-run after any component placement changes to catch regressions.
 *
 * Courtyard overlaps are permitted (decoupling caps inside IC courtyards per JEDEC).
 * Body overlaps are NEVER permitted -- components would physically collide.
 */

interface Point { x: number; y: number }
interface BBox { min: Point; max: Point }
interface Transform { position: Point; rotation: number; mirrored: boolean }

function worldBox(bb: BBox, transform: Transform): [number, number, number, number] {
  // For 0/180 rotation, just translate. For 90/270, swap width/height.
  const rot = transform.rotation % 360;
  let hw = (bb.max.x - bb.min.x) / 2;
  let hh = (bb.max.y - bb.min.y) / 2;
  if (rot === 90 || rot === 270) {
    [hw, hh] = [hh, hw];
  }
  const cx = transform.position.x;
  const cy = transform.position.y;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

function boxesOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function loadBoard() {
  const pcbPath = path.resolve(__dirname, '../../../../examples/DDR5-96GB-RDIMM.json');
  if (!fs.existsSync(pcbPath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(pcbPath, 'utf-8'));
  const proj = raw.project ?? raw;
  const boards = proj.boards ?? [proj];
  return boards[0];
}

describe('DDR5-96GB-RDIMM component overlap regression', () => {
  const board = loadBoard();

  it('PCB file exists and is loadable', () => {
    expect(board).not.toBeNull();
    expect(board.components.length).toBeGreaterThan(0);
    expect(board.layers.length).toBeGreaterThan(0);
  });

  it('has no same-layer body overlaps', () => {
    if (!board) return;

    const layers: Record<string, string> = {};
    for (const l of board.layers) {
      layers[l.id] = l.name;
    }

    // Group components by layer
    const byLayer: Record<string, any[]> = {};
    for (const comp of board.components) {
      const lname = layers[comp.layerId] ?? comp.layerId;
      if (!byLayer[lname]) byLayer[lname] = [];
      byLayer[lname].push(comp);
    }

    const overlaps: string[] = [];

    for (const [lname, comps] of Object.entries(byLayer)) {
      for (let i = 0; i < comps.length; i++) {
        for (let j = i + 1; j < comps.length; j++) {
          const a = comps[i];
          const b = comps[j];

          const boxA = worldBox(a.footprint.boundingBox, a.transform);
          const boxB = worldBox(b.footprint.boundingBox, b.transform);

          if (boxesOverlap(boxA, boxB)) {
            overlaps.push(
              `${a.designator} ↔ ${b.designator} on ${lname} ` +
              `(A: [${boxA[0]},${boxA[1]}]-[${boxA[2]},${boxA[3]}], ` +
              `B: [${boxB[0]},${boxB[1]}]-[${boxB[2]},${boxB[3]}])`,
            );
          }
        }
      }
    }

    if (overlaps.length > 0) {
      console.error('Body overlaps found:');
      for (const o of overlaps) console.error(`  ${o}`);
    }

    expect(overlaps).toHaveLength(0);
  });

  it('has expected component count', () => {
    if (!board) return;
    expect(board.components.length).toBe(107);
  });

  it('has components split across top and bottom layers', () => {
    if (!board) return;
    const layers: Record<string, string> = {};
    for (const l of board.layers) {
      layers[l.id] = l.name;
    }

    const topCount = board.components.filter(
      (c: any) => (layers[c.layerId] ?? '').includes('Top'),
    ).length;
    const botCount = board.components.filter(
      (c: any) => (layers[c.layerId] ?? '').includes('Bottom'),
    ).length;

    expect(topCount).toBeGreaterThan(0);
    expect(botCount).toBeGreaterThan(0);
    expect(topCount + botCount).toBe(board.components.length);
  });

  it('no two ICs on the same layer have body overlap', () => {
    if (!board) return;
    const layers: Record<string, string> = {};
    for (const l of board.layers) {
      layers[l.id] = l.name;
    }

    const ics = board.components.filter((c: any) => c.designator.startsWith('U'));
    const byLayer: Record<string, any[]> = {};
    for (const ic of ics) {
      const lname = layers[ic.layerId] ?? ic.layerId;
      if (!byLayer[lname]) byLayer[lname] = [];
      byLayer[lname].push(ic);
    }

    const overlaps: string[] = [];
    for (const [lname, comps] of Object.entries(byLayer)) {
      for (let i = 0; i < comps.length; i++) {
        for (let j = i + 1; j < comps.length; j++) {
          const boxA = worldBox(comps[i].footprint.boundingBox, comps[i].transform);
          const boxB = worldBox(comps[j].footprint.boundingBox, comps[j].transform);
          if (boxesOverlap(boxA, boxB)) {
            overlaps.push(`${comps[i].designator} ↔ ${comps[j].designator} on ${lname}`);
          }
        }
      }
    }

    expect(overlaps).toHaveLength(0);
  });

  it('no capacitor body overlaps another capacitor on the same layer', () => {
    if (!board) return;
    const layers: Record<string, string> = {};
    for (const l of board.layers) {
      layers[l.id] = l.name;
    }

    const caps = board.components.filter((c: any) => c.designator.startsWith('C'));
    const byLayer: Record<string, any[]> = {};
    for (const cap of caps) {
      const lname = layers[cap.layerId] ?? cap.layerId;
      if (!byLayer[lname]) byLayer[lname] = [];
      byLayer[lname].push(cap);
    }

    const overlaps: string[] = [];
    for (const [lname, comps] of Object.entries(byLayer)) {
      for (let i = 0; i < comps.length; i++) {
        for (let j = i + 1; j < comps.length; j++) {
          const boxA = worldBox(comps[i].footprint.boundingBox, comps[i].transform);
          const boxB = worldBox(comps[j].footprint.boundingBox, comps[j].transform);
          if (boxesOverlap(boxA, boxB)) {
            overlaps.push(`${comps[i].designator} ↔ ${comps[j].designator} on ${lname}`);
          }
        }
      }
    }

    expect(overlaps).toHaveLength(0);
  });

  it('no resistor body overlaps any other component on the same layer', () => {
    if (!board) return;
    const layers: Record<string, string> = {};
    for (const l of board.layers) {
      layers[l.id] = l.name;
    }

    const byLayer: Record<string, any[]> = {};
    for (const comp of board.components) {
      const lname = layers[comp.layerId] ?? comp.layerId;
      if (!byLayer[lname]) byLayer[lname] = [];
      byLayer[lname].push(comp);
    }

    const overlaps: string[] = [];
    for (const [lname, comps] of Object.entries(byLayer)) {
      const resistors = comps.filter((c: any) => c.designator.startsWith('R'));
      for (const r of resistors) {
        const boxR = worldBox(r.footprint.boundingBox, r.transform);
        for (const other of comps) {
          if (other.designator === r.designator) continue;
          const boxO = worldBox(other.footprint.boundingBox, other.transform);
          if (boxesOverlap(boxR, boxO)) {
            overlaps.push(`${r.designator} ↔ ${other.designator} on ${lname}`);
          }
        }
      }
    }

    expect(overlaps).toHaveLength(0);
  });
});
