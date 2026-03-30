import { Container, Graphics, Text } from 'pixi.js';
import type { Component, Pad } from '@pcb/domain';
import type { ViewportState } from '@pcb/editor-core';

const HIGHLIGHT_COLOR = 0x00ffff;
const HOVER_COLOR = 0xffff00;
const GHOST_ALPHA = 0.4;
const BODY_ALPHA = 0.6;
const PAD_ALPHA = 0.9;
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: 10, fill: 0xffffff };
const SILK_TEXT_STYLE = { fontFamily: 'monospace', fontSize: 10, fill: 0xffff00 };

export interface ComponentRenderOptions {
  selected: boolean;
  hovered: boolean;
  ghost: boolean;
  layerColor: number;
}

export class ComponentRenderer {
  /**
   * Create a PixiJS Container for a single component.
   * The container is positioned in screen coordinates (viewport-transformed).
   */
  createComponentGraphic(
    component: Component,
    viewport: ViewportState,
    opts: ComponentRenderOptions,
  ): Container {
    const container = new Container();
    container.label = `comp-${component.id}`;

    const { zoom, x: vx, y: vy } = viewport;
    const { position, rotation } = component.transform;

    // Screen position
    const sx = position.x * zoom + vx;
    const sy = position.y * zoom + vy;

    container.position.set(sx, sy);
    container.angle = rotation;

    if (opts.ghost) {
      container.alpha = GHOST_ALPHA;
    }

    const gfx = new Graphics();

    // Component body
    const bb = component.footprint.boundingBox;
    const bw = (bb.max.x - bb.min.x) * zoom;
    const bh = (bb.max.y - bb.min.y) * zoom;
    const bx = bb.min.x * zoom;
    const by = bb.min.y * zoom;

    gfx.rect(bx, by, bw, bh).fill({ color: opts.layerColor, alpha: BODY_ALPHA });

    if (opts.selected) {
      gfx.rect(bx - 2, by - 2, bw + 4, bh + 4).stroke({ color: HIGHLIGHT_COLOR, width: 2, alpha: 1 });
    } else if (opts.hovered) {
      gfx.rect(bx - 1, by - 1, bw + 2, bh + 2).stroke({ color: HOVER_COLOR, width: 1, alpha: 0.8 });
    }

    container.addChild(gfx);

    // Pads
    for (const pad of component.footprint.pads) {
      const padGfx = this.drawPad(pad, zoom, opts.layerColor);
      container.addChild(padGfx);
    }

    // Designator text
    if (zoom > 0.3) {
      const text = new Text({
        text: component.designator,
        style: {
          ...TEXT_STYLE,
          fontSize: Math.max(8, Math.min(14, 10 * zoom)),
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set((bb.min.x + (bb.max.x - bb.min.x) / 2) * zoom, (bb.min.y + (bb.max.y - bb.min.y) / 2) * zoom);
      container.addChild(text);
    }

    return container;
  }

  private drawPad(pad: Pad, zoom: number, layerColor: number): Graphics {
    const gfx = new Graphics();
    const px = pad.localPosition.x * zoom;
    const py = pad.localPosition.y * zoom;
    const w = pad.width * zoom;
    const h = pad.height * zoom;

    // Pads are brighter than the body
    const padColor = lightenColor(layerColor, 0.3);

    switch (pad.shape) {
      case 'circle':
        gfx.circle(px, py, w / 2).fill({ color: padColor, alpha: PAD_ALPHA });
        break;
      case 'oval':
        gfx.ellipse(px, py, w / 2, h / 2).fill({ color: padColor, alpha: PAD_ALPHA });
        break;
      case 'rect':
        gfx.rect(px - w / 2, py - h / 2, w, h).fill({ color: padColor, alpha: PAD_ALPHA });
        break;
      case 'polygon':
        // Fallback to rect for polygon
        gfx.rect(px - w / 2, py - h / 2, w, h).fill({ color: padColor, alpha: PAD_ALPHA });
        break;
    }

    // Drill hole
    if (pad.drillDiameter && pad.drillDiameter > 0) {
      const dr = (pad.drillDiameter / 2) * zoom;
      gfx.circle(px, py, dr).fill({ color: 0x111111, alpha: 1 });
    }

    return gfx;
  }

  /**
   * Create a silkscreen designator graphic for a component.
   * Rendered as yellow text positioned at the component's center.
   */
  createSilkscreenDesignator(
    component: Component,
    viewport: ViewportState,
  ): Container | null {
    const { zoom, x: vx, y: vy } = viewport;
    if (zoom <= 0.3) return null;

    const container = new Container();
    container.label = `silk-${component.id}`;

    const { position, rotation } = component.transform;
    const sx = position.x * zoom + vx;
    const sy = position.y * zoom + vy;
    container.position.set(sx, sy);
    container.angle = rotation;

    const bb = component.footprint.boundingBox;
    const cx = (bb.min.x + (bb.max.x - bb.min.x) / 2) * zoom;
    const cy = (bb.min.y + (bb.max.y - bb.min.y) / 2) * zoom;

    const text = new Text({
      text: component.designator,
      style: {
        ...SILK_TEXT_STYLE,
        fontSize: Math.max(8, Math.min(14, 10 * zoom)),
      },
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(cx, cy);
    container.addChild(text);

    // Component outline for silkscreen (thin line)
    const gfx = new Graphics();
    const bw = (bb.max.x - bb.min.x) * zoom;
    const bh = (bb.max.y - bb.min.y) * zoom;
    const bx = bb.min.x * zoom;
    const by = bb.min.y * zoom;
    gfx.rect(bx, by, bw, bh).stroke({ color: 0xffff00, width: 1, alpha: 0.5 });
    container.addChild(gfx);

    return container;
  }

  destroy(): void {
    // No persistent state to clean up
  }
}

function lightenColor(color: number, amount: number): number {
  let r = (color >> 16) & 0xff;
  let g = (color >> 8) & 0xff;
  let b = color & 0xff;
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return (r << 16) | (g << 8) | b;
}
