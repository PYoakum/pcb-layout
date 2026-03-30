import { Container, Graphics } from 'pixi.js';
import type { TracePath, TraceSegment, Via } from '@pcb/domain';
import type { ViewportState } from '@pcb/editor-core';

const VIA_OUTER_COLOR = 0xc0c0c0;
const VIA_INNER_COLOR = 0x222222;
const DEBUG_HIGHLIGHT_COLOR = 0xff00ff;
const SELECTED_HIGHLIGHT_COLOR = 0x00ffff;

export interface TraceRenderOptions {
  layerColor: number;
  selected: boolean;
  debugHighlight: boolean;
}

export class TraceRenderer {
  /**
   * Create a PixiJS Container for a TracePath.
   * All coordinates are transformed to screen space using the viewport.
   */
  createTraceGraphic(
    path: TracePath,
    viewport: ViewportState,
    opts: TraceRenderOptions,
  ): Container {
    const container = new Container();
    container.label = `trace-${path.id}`;
    const { zoom, x: vx, y: vy } = viewport;

    const segGfx = new Graphics();
    const segs = path.segments;
    let color = opts.layerColor;
    if (opts.debugHighlight) color = DEBUG_HIGHLIGHT_COLOR;
    const cr = (path.cornerRadius ?? 0) * zoom;

    if (segs.length > 0) {
      const width = Math.max(1, segs[0].width * zoom);

      if (cr > 0 && segs.length > 1) {
        // Draw connected polyline with rounded corners
        this.drawRoundedTrace(segGfx, segs, zoom, vx, vy, cr, width, color, 0.9);
      } else {
        // Sharp corners — draw each segment independently
        for (const seg of segs) {
          const w = Math.max(1, seg.width * zoom);
          segGfx
            .moveTo(seg.start.x * zoom + vx, seg.start.y * zoom + vy)
            .lineTo(seg.end.x * zoom + vx, seg.end.y * zoom + vy)
            .stroke({ color, width: w, alpha: 0.9, cap: 'round' });
        }
      }

      // Selection highlight
      if (opts.selected) {
        const hw = Math.max(3, (segs[0].width + 4) * zoom);
        if (cr > 0 && segs.length > 1) {
          this.drawRoundedTrace(segGfx, segs, zoom, vx, vy, cr, hw, SELECTED_HIGHLIGHT_COLOR, 0.35);
        } else {
          for (const seg of segs) {
            const w = Math.max(3, (seg.width + 4) * zoom);
            segGfx
              .moveTo(seg.start.x * zoom + vx, seg.start.y * zoom + vy)
              .lineTo(seg.end.x * zoom + vx, seg.end.y * zoom + vy)
              .stroke({ color: SELECTED_HIGHLIGHT_COLOR, width: w, alpha: 0.35, cap: 'round' });
          }
        }
      }
    }

    container.addChild(segGfx);

    // Vias
    for (const via of path.vias) {
      const viaGfx = this.drawVia(via, viewport);
      container.addChild(viaGfx);
    }

    return container;
  }

  /**
   * Draw a polyline with rounded corners at each bend point.
   * The radius is clamped to half the shorter of the two adjoining segments.
   */
  private drawRoundedTrace(
    gfx: Graphics,
    segs: TraceSegment[],
    zoom: number, vx: number, vy: number,
    radius: number, width: number,
    color: number, alpha: number,
  ): void {
    // Collect the full point list from segments
    const pts: { x: number; y: number }[] = [
      { x: segs[0].start.x * zoom + vx, y: segs[0].start.y * zoom + vy },
    ];
    for (const seg of segs) {
      pts.push({ x: seg.end.x * zoom + vx, y: seg.end.y * zoom + vy });
    }

    if (pts.length < 2) return;

    gfx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const next = pts[i + 1];

      // Vectors from cur to prev and cur to next
      const dx1 = prev.x - cur.x;
      const dy1 = prev.y - cur.y;
      const dx2 = next.x - cur.x;
      const dy2 = next.y - cur.y;

      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      // Clamp radius to half the shorter segment
      const r = Math.min(radius, len1 / 2, len2 / 2);

      if (r < 1 || len1 < 1 || len2 < 1) {
        gfx.lineTo(cur.x, cur.y);
        continue;
      }

      // Points where the arc starts and ends (offset from corner by r along each segment)
      const arcStartX = cur.x + (dx1 / len1) * r;
      const arcStartY = cur.y + (dy1 / len1) * r;
      const arcEndX = cur.x + (dx2 / len2) * r;
      const arcEndY = cur.y + (dy2 / len2) * r;

      gfx.lineTo(arcStartX, arcStartY);
      gfx.quadraticCurveTo(cur.x, cur.y, arcEndX, arcEndY);
    }

    gfx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    gfx.stroke({ color, width, alpha, cap: 'round', join: 'round' });
  }

  private drawVia(via: Via, viewport: ViewportState): Graphics {
    const gfx = new Graphics();
    const { zoom, x: vx, y: vy } = viewport;

    const cx = via.position.x * zoom + vx;
    const cy = via.position.y * zoom + vy;
    const outerR = (via.outerDiameter / 2) * zoom;
    const innerR = (via.drillDiameter / 2) * zoom;

    // Outer ring
    gfx.circle(cx, cy, Math.max(2, outerR)).fill({ color: VIA_OUTER_COLOR, alpha: 0.9 });
    // Drill hole
    gfx.circle(cx, cy, Math.max(1, innerR)).fill({ color: VIA_INNER_COLOR, alpha: 1 });

    return gfx;
  }

  destroy(): void {
    // stateless
  }
}
