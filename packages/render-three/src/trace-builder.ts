import * as THREE from 'three';
import type { TracePath, TraceSegment, Via } from '@pcb/domain';
import type { LayerRenderConfig } from '@pcb/domain';
import { PCBMaterials } from './materials';
import { milsToUnits } from './utils';

/**
 * TraceBuilder creates 3D meshes for trace segments and vias.
 */
export class TraceBuilder {
  private copperMaterial: THREE.MeshStandardMaterial;
  private viaMaterial: THREE.MeshStandardMaterial;
  private viaHoleMaterial: THREE.MeshStandardMaterial;
  private materialCache: THREE.Material[] = [];

  constructor() {
    this.copperMaterial = PCBMaterials.copper();
    this.viaMaterial = PCBMaterials.via();
    this.viaHoleMaterial = PCBMaterials.viaHole();
    this.materialCache.push(this.copperMaterial, this.viaMaterial, this.viaHoleMaterial);
  }

  /**
   * Build a group containing all trace segments and vias for a TracePath.
   * layerZMap provides the Y position (in mils) for each layer ID.
   */
  build(path: TracePath, layerZMap: Map<string, number>): THREE.Group {
    const group = new THREE.Group();
    group.name = `trace-${path.id}`;
    group.userData['type'] = 'trace';
    group.userData['pathId'] = path.id;
    group.userData['netId'] = path.netId;

    for (const segment of path.segments) {
      const zOffset = layerZMap.get(segment.layerId) ?? 0;
      const mesh = this.buildSegment(segment, zOffset);
      group.add(mesh);
    }

    for (const via of path.vias) {
      const fromZ = layerZMap.get(via.fromLayerId) ?? 0;
      const toZ = layerZMap.get(via.toLayerId) ?? 0;
      const viaGroup = this.buildVia(via, fromZ, toZ);
      group.add(viaGroup);
    }

    return group;
  }

  /** Build a single trace segment as a thin extruded rectangle. */
  private buildSegment(segment: TraceSegment, zOffset: number): THREE.Mesh {
    const sx = milsToUnits(segment.start.x);
    const sz = milsToUnits(segment.start.y);
    const ex = milsToUnits(segment.end.x);
    const ez = milsToUnits(segment.end.y);

    const dx = ex - sx;
    const dz = ez - sz;
    const length = Math.sqrt(dx * dx + dz * dz);
    const width = milsToUnits(segment.width);
    const thickness = milsToUnits(1.4); // copper thickness

    const geometry = new THREE.BoxGeometry(length, thickness, width);

    const mesh = new THREE.Mesh(geometry, this.copperMaterial);

    // Position at midpoint
    const mx = (sx + ex) / 2;
    const mz = (sz + ez) / 2;
    mesh.position.set(mx, milsToUnits(zOffset), mz);

    // Rotate to align with segment direction
    const angle = Math.atan2(dz, dx);
    mesh.rotation.y = -angle;

    mesh.name = `segment-${segment.id}`;
    mesh.userData['type'] = 'trace-segment';
    mesh.userData['segmentId'] = segment.id;
    mesh.userData['layerId'] = segment.layerId;

    return mesh;
  }

  /** Build a via as an outer copper cylinder with dark inner hole. */
  private buildVia(via: Via, fromZ: number, toZ: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `via-${via.id}`;
    group.userData['type'] = 'via';
    group.userData['viaId'] = via.id;

    const outerRadius = milsToUnits(via.outerDiameter / 2);
    const innerRadius = milsToUnits(via.drillDiameter / 2);
    const topY = milsToUnits(Math.max(fromZ, toZ));
    const bottomY = milsToUnits(Math.min(fromZ, toZ));
    const height = Math.abs(topY - bottomY) || milsToUnits(62); // default full board
    const centerY = (topY + bottomY) / 2;

    // Outer copper cylinder (tube with hole)
    const outerGeo = new THREE.CylinderGeometry(
      outerRadius,
      outerRadius,
      height,
      24,
      1,
      false,
    );
    const outerMesh = new THREE.Mesh(outerGeo, this.viaMaterial);
    group.add(outerMesh);

    // Inner hole cylinder
    const innerGeo = new THREE.CylinderGeometry(
      innerRadius,
      innerRadius,
      height + milsToUnits(0.5), // slightly taller to avoid z-fighting
      16,
      1,
      false,
    );
    const innerMesh = new THREE.Mesh(innerGeo, this.viaHoleMaterial);
    group.add(innerMesh);

    // Position
    const x = milsToUnits(via.position.x);
    const z = milsToUnits(via.position.y);
    group.position.set(x, centerY, z);

    return group;
  }

  /** Dispose all cached materials. */
  dispose(): void {
    for (const mat of this.materialCache) {
      mat.dispose();
    }
    this.materialCache = [];
  }
}
