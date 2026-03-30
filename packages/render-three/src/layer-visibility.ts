import * as THREE from 'three';

export interface LayerVisibilityState {
  layerId: string;
  visible: boolean;
  opacity: number;
}

/**
 * LayerVisibilityController manages show/hide, exploded view,
 * solo mode, opacity, and cross-section clipping for PCB layers.
 */
export class LayerVisibilityController {
  private boardGroup: THREE.Group | null = null;
  private layerStates: Map<string, LayerVisibilityState> = new Map();
  private exploded = false;
  private explodeFactor = 5.0; // multiplier for z-spread in exploded view
  private soloLayerId: string | null = null;
  private clipPlane: THREE.Plane | null = null;
  private clippingEnabled = false;
  /** Original Y positions keyed by mesh name, stored when exploded view activates. */
  private originalPositions: Map<string, number> = new Map();

  /** Attach to the board group built by BoardBuilder. */
  attach(boardGroup: THREE.Group): void {
    this.boardGroup = boardGroup;
    this.scanLayers();
  }

  /** Set visibility for a specific layer. */
  setLayerVisible(layerId: string, visible: boolean): void {
    const state = this.layerStates.get(layerId);
    if (state) {
      state.visible = visible;
      this.applyVisibility();
    }
  }

  /** Set opacity for a specific layer (0 to 1). */
  setLayerOpacity(layerId: string, opacity: number): void {
    const state = this.layerStates.get(layerId);
    if (state) {
      state.opacity = Math.max(0, Math.min(1, opacity));
      this.applyVisibility();
    }
  }

  /** Toggle exploded view: spread layers apart in Y axis. */
  setExplodedView(enabled: boolean, factor?: number): void {
    this.exploded = enabled;
    if (factor !== undefined) this.explodeFactor = factor;

    if (!this.boardGroup) return;

    if (enabled) {
      // Store original positions and spread
      this.boardGroup.traverse((child) => {
        if (child.userData['layerId'] || child.userData['type'] === 'substrate') {
          this.originalPositions.set(child.name, child.position.y);
          child.position.y *= this.explodeFactor;
        }
      });
    } else {
      // Restore original positions
      this.boardGroup.traverse((child) => {
        const orig = this.originalPositions.get(child.name);
        if (orig !== undefined) {
          child.position.y = orig;
        }
      });
      this.originalPositions.clear();
    }
  }

  /** Solo mode: show only the specified layer, hide all others. Pass null to exit solo mode. */
  setSoloLayer(layerId: string | null): void {
    this.soloLayerId = layerId;
    this.applyVisibility();
  }

  /** Enable a cross-section clip plane at the given Y position (in Three.js units). */
  setCrossSection(enabled: boolean, yPosition = 0): void {
    this.clippingEnabled = enabled;

    if (enabled) {
      // Clip everything above yPosition (normal pointing down)
      this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), yPosition);
    } else {
      this.clipPlane = null;
    }

    this.applyClipping();
  }

  /** Get the current clip plane (for renderer.clippingPlanes). */
  getClipPlane(): THREE.Plane | null {
    return this.clippingEnabled ? this.clipPlane : null;
  }

  /** Get all layer states. */
  getLayerStates(): LayerVisibilityState[] {
    return Array.from(this.layerStates.values());
  }

  /** Whether exploded view is active. */
  isExploded(): boolean {
    return this.exploded;
  }

  private scanLayers(): void {
    if (!this.boardGroup) return;
    this.layerStates.clear();

    this.boardGroup.traverse((child) => {
      const layerId = child.userData['layerId'] as string | undefined;
      if (layerId && !this.layerStates.has(layerId)) {
        this.layerStates.set(layerId, {
          layerId,
          visible: true,
          opacity: 1,
        });
      }
    });
  }

  private applyVisibility(): void {
    if (!this.boardGroup) return;

    this.boardGroup.traverse((child) => {
      const layerId = child.userData['layerId'] as string | undefined;
      if (!layerId) return;

      const state = this.layerStates.get(layerId);
      if (!state) return;

      // Solo mode overrides
      if (this.soloLayerId !== null) {
        child.visible = layerId === this.soloLayerId;
      } else {
        child.visible = state.visible;
      }

      // Apply opacity to materials
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.opacity !== undefined) {
          mat.opacity = state.opacity;
          mat.transparent = state.opacity < 1;
          mat.needsUpdate = true;
        }
      }
    });
  }

  private applyClipping(): void {
    if (!this.boardGroup) return;

    this.boardGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (this.clippingEnabled && this.clipPlane) {
          mat.clippingPlanes = [this.clipPlane];
        } else {
          mat.clippingPlanes = [];
        }
        mat.needsUpdate = true;
      }
    });
  }
}
