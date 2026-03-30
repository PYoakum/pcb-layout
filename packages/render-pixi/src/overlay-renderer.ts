import { Container, Graphics, Text } from 'pixi.js';
import type { Point2D } from '@pcb/domain';
import type { ViewportState, MarqueeState, MeasurementOverlay } from '@pcb/editor-core';

const MARQUEE_COLOR = 0x4488ff;
const MARQUEE_FILL_ALPHA = 0.1;
const MARQUEE_STROKE_ALPHA = 0.6;
const TRACE_PREVIEW_COLOR = 0x00ff88;
const TRACE_PREVIEW_ALPHA = 0.6;
const MEASURE_COLOR = 0xff8800;
const MEASURE_TEXT_STYLE = { fontFamily: 'monospace', fontSize: 12, fill: 0xff8800 };

export interface OverlayState {
  marquee: MarqueeState | null;
  activeTracePoints: Point2D[] | null;
  measurement: MeasurementOverlay | null;
}

/**
 * Renders editor overlays: marquee selection rectangle, active trace preview,
 * and measurement lines. Drawn in screen coordinates on top of everything else.
 */
export class OverlayRenderer {
  readonly container: Container;
  private gfx: Graphics;
  private measureText: Text;

  constructor() {
    this.container = new Container();
    this.container.label = 'overlay-renderer';

    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    this.measureText = new Text({ text: '', style: MEASURE_TEXT_STYLE });
    this.measureText.visible = false;
    this.container.addChild(this.measureText);
  }

  render(state: OverlayState, viewport: ViewportState): void {
    try { this.gfx.clear(); } catch { return; }
    this.measureText.visible = false;

    if (state.marquee?.active) {
      this.drawMarquee(state.marquee, viewport);
    }

    if (state.activeTracePoints && state.activeTracePoints.length >= 2) {
      this.drawTracePreview(state.activeTracePoints, viewport);
    }

    if (state.measurement) {
      this.drawMeasurement(state.measurement, viewport);
    }
  }

  clear(): void {
    try { this.gfx.clear(); } catch { /* context not ready */ }
    this.measureText.visible = false;
  }

  destroy(): void {
    this.gfx.destroy();
    this.measureText.destroy();
    this.container.destroy();
  }

  private drawMarquee(marquee: MarqueeState, vp: ViewportState): void {
    const sx1 = marquee.start.x * vp.zoom + vp.x;
    const sy1 = marquee.start.y * vp.zoom + vp.y;
    const sx2 = marquee.end.x * vp.zoom + vp.x;
    const sy2 = marquee.end.y * vp.zoom + vp.y;

    const x = Math.min(sx1, sx2);
    const y = Math.min(sy1, sy2);
    const w = Math.abs(sx2 - sx1);
    const h = Math.abs(sy2 - sy1);

    this.gfx
      .rect(x, y, w, h)
      .fill({ color: MARQUEE_COLOR, alpha: MARQUEE_FILL_ALPHA })
      .stroke({ color: MARQUEE_COLOR, width: 1, alpha: MARQUEE_STROKE_ALPHA });
  }

  private drawTracePreview(points: Point2D[], vp: ViewportState): void {
    if (points.length < 2) return;

    const screenPoints = points.map((p) => ({
      x: p.x * vp.zoom + vp.x,
      y: p.y * vp.zoom + vp.y,
    }));

    this.gfx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      this.gfx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    this.gfx.stroke({ color: TRACE_PREVIEW_COLOR, width: 2, alpha: TRACE_PREVIEW_ALPHA });

    // Draw dots at waypoints
    for (const sp of screenPoints) {
      this.gfx.circle(sp.x, sp.y, 3).fill({ color: TRACE_PREVIEW_COLOR, alpha: 0.8 });
    }
  }

  private drawMeasurement(m: MeasurementOverlay, vp: ViewportState): void {
    const sx1 = m.start.x * vp.zoom + vp.x;
    const sy1 = m.start.y * vp.zoom + vp.y;
    const sx2 = m.end.x * vp.zoom + vp.x;
    const sy2 = m.end.y * vp.zoom + vp.y;

    // Line
    this.gfx
      .moveTo(sx1, sy1)
      .lineTo(sx2, sy2)
      .stroke({ color: MEASURE_COLOR, width: 1.5, alpha: 0.8 });

    // Endpoints
    this.gfx.circle(sx1, sy1, 3).fill({ color: MEASURE_COLOR, alpha: 1 });
    this.gfx.circle(sx2, sy2, 3).fill({ color: MEASURE_COLOR, alpha: 1 });

    // Label
    const midX = (sx1 + sx2) / 2;
    const midY = (sy1 + sy2) / 2;

    this.measureText.text =
      `${m.distanceMils.toFixed(1)} mil / ${m.distanceMm.toFixed(3)} mm`;
    this.measureText.position.set(midX + 8, midY - 16);
    this.measureText.visible = true;
  }
}
