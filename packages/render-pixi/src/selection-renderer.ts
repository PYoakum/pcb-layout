import { Container, Graphics } from 'pixi.js';
import type { BoundingBox, Point2D } from '@pcb/domain';
import type { ViewportState, MarqueeState, SnapResult } from '@pcb/editor-core';

const MARQUEE_FILL = 0x4488ff;
const MARQUEE_STROKE = 0x66aaff;
const MARQUEE_FILL_ALPHA = 0.15;
const MARQUEE_STROKE_ALPHA = 0.8;
const SELECTION_BOX_COLOR = 0x00ffff;
const HOVER_BOX_COLOR = 0xffff00;
const SNAP_LINE_COLOR = 0xff8800;

export class SelectionRenderer {
  readonly container: Container;
  private gfx: Graphics;
  private destroyed = false;

  constructor() {
    this.container = new Container();
    this.container.label = 'selection-overlay';
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
  }

  clear(): void {
    if (this.destroyed) return;
    try {
      this.gfx.clear();
    } catch {
      // Graphics context may not be ready yet
    }
  }

  /**
   * Draw marquee selection rectangle (in screen coordinates).
   */
  drawMarquee(marquee: MarqueeState, viewport: ViewportState): void {
    if (!marquee.active) return;

    const { zoom, x: vx, y: vy } = viewport;
    const sx1 = marquee.start.x * zoom + vx;
    const sy1 = marquee.start.y * zoom + vy;
    const sx2 = marquee.end.x * zoom + vx;
    const sy2 = marquee.end.y * zoom + vy;

    const x = Math.min(sx1, sx2);
    const y = Math.min(sy1, sy2);
    const w = Math.abs(sx2 - sx1);
    const h = Math.abs(sy2 - sy1);

    this.gfx
      .rect(x, y, w, h)
      .fill({ color: MARQUEE_FILL, alpha: MARQUEE_FILL_ALPHA })
      .stroke({ color: MARQUEE_STROKE, width: 1, alpha: MARQUEE_STROKE_ALPHA });
  }

  /**
   * Draw highlight box around a selected item.
   */
  drawSelectionBox(bounds: BoundingBox, viewport: ViewportState): void {
    const { zoom, x: vx, y: vy } = viewport;
    const sx = bounds.min.x * zoom + vx;
    const sy = bounds.min.y * zoom + vy;
    const sw = (bounds.max.x - bounds.min.x) * zoom;
    const sh = (bounds.max.y - bounds.min.y) * zoom;

    this.gfx
      .rect(sx - 2, sy - 2, sw + 4, sh + 4)
      .stroke({ color: SELECTION_BOX_COLOR, width: 1.5, alpha: 0.9 });
  }

  /**
   * Draw hover highlight around an item.
   */
  drawHoverBox(bounds: BoundingBox, viewport: ViewportState): void {
    const { zoom, x: vx, y: vy } = viewport;
    const sx = bounds.min.x * zoom + vx;
    const sy = bounds.min.y * zoom + vy;
    const sw = (bounds.max.x - bounds.min.x) * zoom;
    const sh = (bounds.max.y - bounds.min.y) * zoom;

    this.gfx
      .rect(sx - 1, sy - 1, sw + 2, sh + 2)
      .stroke({ color: HOVER_BOX_COLOR, width: 1, alpha: 0.6 });
  }

  /**
   * Draw snap indicator lines to show the user where snapping occurred.
   */
  drawSnapIndicator(
    snap: SnapResult,
    originalPoint: Point2D,
    viewport: ViewportState,
    screenWidth: number,
    screenHeight: number,
  ): void {
    if (!snap.snappedTo || !snap.axis) return;

    const { zoom, x: vx, y: vy } = viewport;
    const sx = snap.point.x * zoom + vx;
    const sy = snap.point.y * zoom + vy;

    if (snap.axis === 'x' || snap.axis === 'both') {
      this.gfx.moveTo(sx, 0).lineTo(sx, screenHeight).stroke({
        color: SNAP_LINE_COLOR,
        width: 1,
        alpha: 0.4,
      });
    }
    if (snap.axis === 'y' || snap.axis === 'both') {
      this.gfx.moveTo(0, sy).lineTo(screenWidth, sy).stroke({
        color: SNAP_LINE_COLOR,
        width: 1,
        alpha: 0.4,
      });
    }

    // Snap point indicator dot
    this.gfx.circle(sx, sy, 4).fill({ color: SNAP_LINE_COLOR, alpha: 0.8 });
  }

  destroy(): void {
    this.destroyed = true;
    this.container.destroy({ children: true });
  }
}
