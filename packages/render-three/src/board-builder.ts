import * as THREE from 'three';
import type { Board, BoardLayer, BoardProfile, ProfileVertex, LayerType, BoardRenderConfig, LayerRenderConfig } from '@pcb/domain';
import { PCBMaterials } from './materials';
import { milsToUnits, createRoundedRectShape } from './utils';

/** Default board render config when none is provided. */
function defaultRenderConfig(board: Board): BoardRenderConfig {
  const { layerCount } = board.workspace;
  const layers: LayerRenderConfig[] = [];
  const copperThickness = 1.4; // ~1.4 mil (1oz copper)
  const maskThickness = 0.5;
  const silkThickness = 0.3;
  const boardThickness = 62; // 62 mil (standard 1.6mm)
  const totalStack = boardThickness;

  for (const layer of board.layers) {
    const cfg = layerRenderConfig(layer, layerCount, totalStack, copperThickness, maskThickness, silkThickness);
    if (cfg) layers.push(cfg);
  }

  return {
    layers,
    boardThickness,
    boardColor: '#1a5c1a',
    solderMaskColor: '#006400',
    silkscreenColor: '#ffffff',
    copperColor: '#b87333',
  };
}

function layerRenderConfig(
  layer: BoardLayer,
  layerCount: number,
  boardThickness: number,
  copperThickness: number,
  maskThickness: number,
  silkThickness: number,
): LayerRenderConfig | null {
  const halfBoard = boardThickness / 2;

  // For signal/plane layers, spread evenly inside the board
  if (layer.type === 'signal' || layer.type === 'plane') {
    // order 0 is top copper, order layerCount-1 is bottom copper
    const t = layerCount > 1 ? layer.order / (layerCount - 1) : 0;
    const zOffset = halfBoard - t * boardThickness;
    return {
      layerId: layer.id,
      material: { color: '#b87333', opacity: 1, metallic: true, roughness: 0.3 },
      thickness: copperThickness,
      zOffset,
    };
  }

  switch (layer.type) {
    case 'solder_mask_top':
      return {
        layerId: layer.id,
        material: { color: '#006400', opacity: 0.7, metallic: false, roughness: 0.6 },
        thickness: maskThickness,
        zOffset: halfBoard + copperThickness + maskThickness / 2,
      };
    case 'solder_mask_bottom':
      return {
        layerId: layer.id,
        material: { color: '#006400', opacity: 0.7, metallic: false, roughness: 0.6 },
        thickness: maskThickness,
        zOffset: -(halfBoard + copperThickness + maskThickness / 2),
      };
    case 'silkscreen_top':
      return {
        layerId: layer.id,
        material: { color: '#ffffff', opacity: 1, metallic: false, roughness: 0.9 },
        thickness: silkThickness,
        zOffset: halfBoard + copperThickness + maskThickness + silkThickness / 2,
      };
    case 'silkscreen_bottom':
      return {
        layerId: layer.id,
        material: { color: '#ffffff', opacity: 1, metallic: false, roughness: 0.9 },
        thickness: silkThickness,
        zOffset: -(halfBoard + copperThickness + maskThickness + silkThickness / 2),
      };
    default:
      return null;
  }
}

/**
 * BoardBuilder creates the 3D mesh group representing the PCB board substrate
 * and its layer stack (copper, solder mask, silkscreen).
 */
export class BoardBuilder {
  private materialCache: THREE.Material[] = [];

  /**
   * Build the complete board group from domain data.
   * Returns a THREE.Group containing the substrate, copper layers, masks, and silkscreen.
   */
  build(board: Board, renderConfig?: BoardRenderConfig): THREE.Group {
    const config = renderConfig ?? defaultRenderConfig(board);
    const group = new THREE.Group();
    group.name = 'pcb-board';

    const { width, height } = board.workspace;
    const boardW = milsToUnits(width);
    const boardD = milsToUnits(height);
    const boardH = milsToUnits(config.boardThickness);
    const bevelRadius = milsToUnits(Math.min(width, height) * 0.01);

    const outline = board.profiles?.find((p) => p.kind === 'outline');
    const cutouts = board.profiles?.filter((p) => p.kind === 'cutout') ?? [];

    // Substrate body — use custom profile if available, otherwise rectangle
    const substrate = outline
      ? this.buildProfileSubstrate(outline, cutouts, boardH, bevelRadius)
      : this.buildSubstrate(boardW, boardD, boardH, bevelRadius);
    group.add(substrate);

    // Layer slabs — use custom profile if available
    for (const layerCfg of config.layers) {
      const slab = outline
        ? this.buildProfileLayerSlab(outline, cutouts, layerCfg)
        : this.buildLayerSlab(boardW, boardD, layerCfg);
      group.add(slab);
    }

    // Store layer config for exploded view
    group.userData['renderConfig'] = config;

    return group;
  }

  /** Build the FR4 substrate box with slight edge bevel. */
  private buildSubstrate(
    width: number,
    depth: number,
    height: number,
    bevelRadius: number,
  ): THREE.Mesh {
    // Use extruded rounded rectangle for slight chamfer effect
    const shape = createRoundedRectShape(width, depth, bevelRadius);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: bevelRadius * 0.5,
      bevelSize: bevelRadius * 0.5,
      bevelSegments: 2,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // ExtrudeGeometry extrudes along Z; rotate so board lies in XZ plane (Y = up)
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height / 2, 0);

    const material = PCBMaterials.substrate();
    this.materialCache.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'substrate';
    mesh.userData['type'] = 'substrate';
    return mesh;
  }

  /** Convert a BoardProfile to a THREE.Shape, with optional cutout holes. */
  private profileToShape(outline: BoardProfile, cutouts: BoardProfile[] = []): THREE.Shape {
    const shape = new THREE.Shape();
    const verts = outline.vertices;
    if (verts.length < 3) return shape;

    shape.moveTo(milsToUnits(verts[0].x), milsToUnits(verts[0].y));

    for (let i = 1; i <= verts.length; i++) {
      const cur = verts[i % verts.length];
      const prev = verts[(i - 1 + verts.length) % verts.length];
      const next = verts[(i + 1) % verts.length];
      const r = milsToUnits(cur.radius ?? 0);

      if (r > 0 && i < verts.length) {
        // Rounded corner: compute fillet arc
        const dx1 = prev.x - cur.x;
        const dy1 = prev.y - cur.y;
        const dx2 = next.x - cur.x;
        const dy2 = next.y - cur.y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const clampR = Math.min(r, milsToUnits(len1) / 2, milsToUnits(len2) / 2);

        if (clampR > 0.0001 && len1 > 0 && len2 > 0) {
          const cx = milsToUnits(cur.x);
          const cy = milsToUnits(cur.y);
          const arcStartX = cx + (milsToUnits(dx1) / milsToUnits(len1)) * clampR;
          const arcStartY = cy + (milsToUnits(dy1) / milsToUnits(len1)) * clampR;
          const arcEndX = cx + (milsToUnits(dx2) / milsToUnits(len2)) * clampR;
          const arcEndY = cy + (milsToUnits(dy2) / milsToUnits(len2)) * clampR;

          shape.lineTo(arcStartX, arcStartY);
          shape.quadraticCurveTo(cx, cy, arcEndX, arcEndY);
          continue;
        }
      }

      shape.lineTo(milsToUnits(cur.x), milsToUnits(cur.y));
    }

    // Add cutout holes
    for (const cutout of cutouts) {
      const hole = new THREE.Path();
      const cv = cutout.vertices;
      if (cv.length < 3) continue;

      hole.moveTo(milsToUnits(cv[0].x), milsToUnits(cv[0].y));
      for (let i = 1; i < cv.length; i++) {
        hole.lineTo(milsToUnits(cv[i].x), milsToUnits(cv[i].y));
      }
      hole.closePath();
      shape.holes.push(hole);
    }

    return shape;
  }

  /** Build substrate from a custom board profile. */
  private buildProfileSubstrate(
    outline: BoardProfile,
    cutouts: BoardProfile[],
    height: number,
    bevelRadius: number,
  ): THREE.Mesh {
    const shape = this.profileToShape(outline, cutouts);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: bevelRadius > 0,
      bevelThickness: bevelRadius * 0.5,
      bevelSize: bevelRadius * 0.5,
      bevelSegments: 2,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height / 2, 0);

    const material = PCBMaterials.substrate();
    this.materialCache.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'substrate';
    mesh.userData['type'] = 'substrate';
    return mesh;
  }

  /** Build a layer slab from a custom board profile. */
  private buildProfileLayerSlab(
    outline: BoardProfile,
    cutouts: BoardProfile[],
    config: LayerRenderConfig,
  ): THREE.Mesh {
    const shape = this.profileToShape(outline, cutouts);
    const thickness = milsToUnits(config.thickness);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, thickness / 2, 0);

    const material = new THREE.MeshStandardMaterial({
      color: config.material.color,
      roughness: config.material.roughness,
      metalness: config.material.metallic ? 0.85 : 0,
      transparent: config.material.opacity < 1,
      opacity: config.material.opacity,
      side: THREE.DoubleSide,
    });
    this.materialCache.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = milsToUnits(config.zOffset);
    mesh.name = `layer-${config.layerId}`;
    mesh.userData['type'] = 'layer';
    mesh.userData['layerId'] = config.layerId;
    return mesh;
  }

  /** Build a thin slab for a copper, mask, or silkscreen layer. */
  private buildLayerSlab(
    width: number,
    depth: number,
    config: LayerRenderConfig,
  ): THREE.Mesh {
    const thickness = milsToUnits(config.thickness);
    const geometry = new THREE.BoxGeometry(width, thickness, depth);

    const material = new THREE.MeshStandardMaterial({
      color: config.material.color,
      roughness: config.material.roughness,
      metalness: config.material.metallic ? 0.85 : 0,
      transparent: config.material.opacity < 1,
      opacity: config.material.opacity,
      side: THREE.DoubleSide,
    });
    this.materialCache.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = milsToUnits(config.zOffset);
    mesh.name = `layer-${config.layerId}`;
    mesh.userData['type'] = 'layer';
    mesh.userData['layerId'] = config.layerId;

    return mesh;
  }

  /** Dispose all cached materials and geometries. */
  dispose(): void {
    for (const mat of this.materialCache) {
      mat.dispose();
    }
    this.materialCache = [];
  }
}
