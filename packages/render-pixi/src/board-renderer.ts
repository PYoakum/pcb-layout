import { Container, Graphics } from 'pixi.js';
import type { Board } from '@pcb/domain';
import type { ViewportState } from '@pcb/editor-core';

const BOARD_FILL = 0x006830;  // Green solder mask composite
const BOARD_STROKE = 0x00802a;
const BOARD_STROKE_WIDTH = 2;

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
   * Render the board outline rectangle in world coordinates.
   * The container should be positioned by the parent using the viewport transform.
   */
  render(board: Board, viewport: ViewportState): void {
    try { this.gfx.clear(); } catch { return; }

    const { width, height } = board.workspace;
    const { zoom, x: vx, y: vy } = viewport;

    const sx = 0 * zoom + vx;
    const sy = 0 * zoom + vy;
    const sw = width * zoom;
    const sh = height * zoom;

    this.gfx
      .rect(sx, sy, sw, sh)
      .fill({ color: BOARD_FILL, alpha: 1 })
      .stroke({ color: BOARD_STROKE, width: BOARD_STROKE_WIDTH, alpha: 1 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
