import { Container, Graphics } from 'pixi.js';
import type { GridConfig } from '@pcb/domain';
import type { ViewportState } from '@pcb/editor-core';

const COLOR_MAJOR = 0x3a3a5a;
const COLOR_MINOR = 0x2a2a3a;
const COLOR_ORIGIN = 0x5a5a8a;
const ALPHA_MAJOR = 0.8;
const ALPHA_MINOR = 0.4;

export class GridRenderer {
  readonly container: Container;
  private gfx: Graphics;

  constructor() {
    this.container = new Container();
    this.container.label = 'grid';
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
  }

  /**
   * Redraw the grid for the current viewport.
   * Only lines visible in the viewport are drawn.
   */
  render(
    viewport: ViewportState,
    gridConfig: GridConfig,
    screenWidth: number,
    screenHeight: number,
  ): void {
    try { this.gfx.clear(); } catch { return; }

    if (!gridConfig.visible) {
      return;
    }

    const { zoom, x: vx, y: vy } = viewport;
    const majorSpacingX = gridConfig.spacingX;
    const majorSpacingY = gridConfig.spacingY;
    const subs = Math.max(1, gridConfig.subdivisions);
    const minorSpacingX = majorSpacingX / subs;
    const minorSpacingY = majorSpacingY / subs;

    // Dynamic density: skip minor grid when zoomed too far out
    const pixelSpacingMinorX = minorSpacingX * zoom;
    const pixelSpacingMinorY = minorSpacingY * zoom;
    const drawMinor = pixelSpacingMinorX >= 4 && pixelSpacingMinorY >= 4;

    // Visible world bounds
    const worldLeft = -vx / zoom;
    const worldTop = -vy / zoom;
    const worldRight = (screenWidth - vx) / zoom;
    const worldBottom = (screenHeight - vy) / zoom;

    // Draw minor grid lines
    if (drawMinor) {
      const startX = Math.floor(worldLeft / minorSpacingX) * minorSpacingX;
      const startY = Math.floor(worldTop / minorSpacingY) * minorSpacingY;

      for (let wx = startX; wx <= worldRight; wx += minorSpacingX) {
        // Skip if this is also a major line
        if (Math.abs(wx % majorSpacingX) < 0.001) continue;
        const sx = wx * zoom + vx;
        this.gfx.moveTo(sx, 0).lineTo(sx, screenHeight).stroke({ color: COLOR_MINOR, width: 1, alpha: ALPHA_MINOR });
      }

      for (let wy = startY; wy <= worldBottom; wy += minorSpacingY) {
        if (Math.abs(wy % majorSpacingY) < 0.001) continue;
        const sy = wy * zoom + vy;
        this.gfx.moveTo(0, sy).lineTo(screenWidth, sy).stroke({ color: COLOR_MINOR, width: 1, alpha: ALPHA_MINOR });
      }
    }

    // Draw major grid lines
    const majorPixelX = majorSpacingX * zoom;
    const majorPixelY = majorSpacingY * zoom;

    if (majorPixelX >= 2) {
      const startX = Math.floor(worldLeft / majorSpacingX) * majorSpacingX;
      for (let wx = startX; wx <= worldRight; wx += majorSpacingX) {
        const sx = wx * zoom + vx;
        this.gfx.moveTo(sx, 0).lineTo(sx, screenHeight).stroke({ color: COLOR_MAJOR, width: 1, alpha: ALPHA_MAJOR });
      }
    }

    if (majorPixelY >= 2) {
      const startY = Math.floor(worldTop / majorSpacingY) * majorSpacingY;
      for (let wy = startY; wy <= worldBottom; wy += majorSpacingY) {
        const sy = wy * zoom + vy;
        this.gfx.moveTo(0, sy).lineTo(screenWidth, sy).stroke({ color: COLOR_MAJOR, width: 1, alpha: ALPHA_MAJOR });
      }
    }

    // Origin crosshair
    const ox = 0 * zoom + vx;
    const oy = 0 * zoom + vy;
    if (ox >= -20 && ox <= screenWidth + 20) {
      this.gfx.moveTo(ox, 0).lineTo(ox, screenHeight).stroke({ color: COLOR_ORIGIN, width: 2, alpha: 1 });
    }
    if (oy >= -20 && oy <= screenHeight + 20) {
      this.gfx.moveTo(0, oy).lineTo(screenWidth, oy).stroke({ color: COLOR_ORIGIN, width: 2, alpha: 1 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
