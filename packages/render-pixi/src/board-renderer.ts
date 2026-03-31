import { Container, Graphics } from 'pixi.js';
import type { Board, BoardProfile, ProfileVertex } from '@pcb/domain';
import type { ViewportState } from '@pcb/editor-core';

const BOARD_FILL = 0x006830;  // Green solder mask composite
const BOARD_STROKE = 0x00802a;
const BOARD_STROKE_WIDTH = 2;
const CUTOUT_FILL = 0x1a1a2e;  // Match canvas background for cutouts

export class BoardRenderer {
  readonly container: Container;
  private gfx: Graphics;

  constructor() {
    this.container = new Container();
    this.container.label = 'board-outline';
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
  }

  /**
   * Render the board outline.
   * If the board has custom profiles, render them as polygons with optional
   * fillet radii. Otherwise fall back to a simple rectangle.
   */
  render(board: Board, viewport: ViewportState): void {
    try { this.gfx.clear(); } catch { return; }

    const { zoom, x: vx, y: vy } = viewport;
    const outlineProfile = board.profiles?.find((p) => p.kind === 'outline');

    if (outlineProfile && outlineProfile.vertices.length >= 3) {
      // Custom board outline
      this.drawProfile(outlineProfile, zoom, vx, vy, BOARD_FILL, 1, BOARD_STROKE);

      // Cutouts
      const cutouts = board.profiles?.filter((p) => p.kind === 'cutout') ?? [];
      for (const cutout of cutouts) {
        if (cutout.vertices.length >= 3) {
          this.drawProfile(cutout, zoom, vx, vy, CUTOUT_FILL, 1, 0x444444);
        }
      }
    } else {
      // Simple rectangular board
      const { width, height } = board.workspace;
      const sx = 0 * zoom + vx;
      const sy = 0 * zoom + vy;
      const sw = width * zoom;
      const sh = height * zoom;

      this.gfx
        .rect(sx, sy, sw, sh)
        .fill({ color: BOARD_FILL, alpha: 1 })
        .stroke({ color: BOARD_STROKE, width: BOARD_STROKE_WIDTH, alpha: 1 });
    }
  }

  /**
   * Draw a board profile polygon with optional fillet radii at each vertex.
   * Each vertex with radius > 0 gets a quadratic curve (rounded corner).
   */
  private drawProfile(
    profile: BoardProfile,
    zoom: number,
    vx: number,
    vy: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor: number,
  ): void {
    const verts = profile.vertices;
    if (verts.length < 3) return;
    const n = verts.length;

    // Transform vertices to screen coordinates
    const pts = verts.map((v) => ({
      sx: v.x * zoom + vx,
      sy: v.y * zoom + vy,
      radius: (v.radius ?? 0) * zoom,
    }));

    // Helper: compute arc start/end for a filleted vertex
    const filletArc = (iPrev: number, iCur: number, iNext: number) => {
      const prev = pts[iPrev], cur = pts[iCur], next = pts[iNext];
      const dx1 = prev.sx - cur.sx, dy1 = prev.sy - cur.sy;
      const dx2 = next.sx - cur.sx, dy2 = next.sy - cur.sy;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const r = Math.min(cur.radius, len1 / 2, len2 / 2);
      if (r < 1 || len1 < 1 || len2 < 1) return null;
      return {
        arcStartX: cur.sx + (dx1 / len1) * r,
        arcStartY: cur.sy + (dy1 / len1) * r,
        arcEndX: cur.sx + (dx2 / len2) * r,
        arcEndY: cur.sy + (dy2 / len2) * r,
        cx: cur.sx,
        cy: cur.sy,
      };
    };

    // Start: if vertex 0 has a fillet, moveTo its arc-end (the point heading toward vertex 1)
    const arc0 = pts[0].radius > 0 ? filletArc(n - 1, 0, 1) : null;
    if (arc0) {
      this.gfx.moveTo(arc0.arcEndX, arc0.arcEndY);
    } else {
      this.gfx.moveTo(pts[0].sx, pts[0].sy);
    }

    // Iterate vertices 1..n-1
    for (let i = 1; i < n; i++) {
      const arc = pts[i].radius > 0 ? filletArc(i - 1, i, (i + 1) % n) : null;
      if (arc) {
        this.gfx.lineTo(arc.arcStartX, arc.arcStartY);
        this.gfx.quadraticCurveTo(arc.cx, arc.cy, arc.arcEndX, arc.arcEndY);
      } else {
        this.gfx.lineTo(pts[i].sx, pts[i].sy);
      }
    }

    // Close back to vertex 0
    if (arc0) {
      this.gfx.lineTo(arc0.arcStartX, arc0.arcStartY);
      this.gfx.quadraticCurveTo(arc0.cx, arc0.cy, arc0.arcEndX, arc0.arcEndY);
    } else {
      this.gfx.lineTo(pts[0].sx, pts[0].sy);
    }

    this.gfx.closePath();
    this.gfx.fill({ color: fillColor, alpha: fillAlpha });
    this.gfx.stroke({ color: strokeColor, width: BOARD_STROKE_WIDTH, alpha: 1 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
