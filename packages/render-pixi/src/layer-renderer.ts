import { Container } from 'pixi.js';
import type { BoardLayer } from '@pcb/domain';

/** Standard PCB layer colors */
export const LAYER_COLORS: Record<string, number> = {
  // Standard layer types
  signal_top: 0xff0000,       // red
  signal_bottom: 0x0000ff,    // blue
  signal_inner1: 0x808000,    // olive
  signal_inner2: 0x800080,    // purple
  silkscreen_top: 0xffff00,   // yellow
  silkscreen_bottom: 0xffff00,
  solder_mask_top: 0x00ff00,  // green
  solder_mask_bottom: 0x00ff00,
  paste_top: 0xc0c0c0,
  paste_bottom: 0xc0c0c0,
  mechanical: 0x808080,
};

/**
 * Resolve a hex color string (#rrggbb) or layer-type fallback to a numeric color.
 */
export function resolveLayerColor(layer: BoardLayer, orderHint?: number): number {
  // If the layer has an explicit hex color, use it
  if (layer.color && layer.color.startsWith('#')) {
    return parseInt(layer.color.slice(1), 16);
  }

  // Fallback by type + order
  const key = layer.type === 'signal'
    ? (layer.order === 0 ? 'signal_top' : layer.order === 1 ? 'signal_bottom' : `signal_inner${layer.order - 1}`)
    : layer.type;

  return LAYER_COLORS[key] ?? 0xcccccc;
}

export class LayerRenderer {
  /** Maps layerId -> Container */
  private containers = new Map<string, Container>();
  private parent: Container;

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Ensure a container exists for the given layer and return it.
   */
  getOrCreate(layerId: string): Container {
    let c = this.containers.get(layerId);
    if (!c) {
      c = new Container();
      c.label = `layer-${layerId}`;
      this.parent.addChild(c);
      this.containers.set(layerId, c);
    }
    return c;
  }

  /**
   * Sync visibility and opacity from BoardLayer data.
   */
  applyLayerState(layers: BoardLayer[]): void {
    for (const layer of layers) {
      const c = this.containers.get(layer.id);
      if (c) {
        c.visible = layer.visible;
        c.alpha = layer.opacity;
      }
    }
  }

  setVisible(layerId: string, visible: boolean): void {
    const c = this.containers.get(layerId);
    if (c) c.visible = visible;
  }

  setOpacity(layerId: string, opacity: number): void {
    const c = this.containers.get(layerId);
    if (c) c.alpha = Math.max(0, Math.min(1, opacity));
  }

  getContainer(layerId: string): Container | undefined {
    return this.containers.get(layerId);
  }

  clear(): void {
    for (const c of this.containers.values()) {
      c.destroy({ children: true });
    }
    this.containers.clear();
  }
}
