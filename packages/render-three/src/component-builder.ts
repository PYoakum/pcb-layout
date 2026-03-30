import * as THREE from 'three';
import type { Component, Pad, PadShape } from '@pcb/domain';
import type { LayerRenderConfig } from '@pcb/domain';
import { PCBMaterials } from './materials';
import { milsToUnits, rotationToRadians } from './utils';

/** Component height by designator prefix (mils). */
function componentHeight(designator: string): number {
  const prefix = designator.replace(/[0-9]/g, '').toUpperCase();
  switch (prefix) {
    case 'R':  return 20;   // resistor - thin
    case 'C':  return 30;   // capacitor
    case 'L':  return 40;   // inductor
    case 'D':  return 15;   // diode
    case 'Q':  return 30;   // transistor
    case 'U':  return 50;   // IC - thicker
    case 'J':
    case 'P':  return 80;   // connector - tall
    case 'SW': return 60;   // switch
    case 'Y':  return 25;   // crystal
    default:   return 30;
  }
}

/**
 * ComponentBuilder creates 3D mesh groups for PCB components
 * (body, pads, designator label).
 */
export class ComponentBuilder {
  private bodyMaterial: THREE.MeshStandardMaterial;
  private pinMaterial: THREE.MeshStandardMaterial;
  private highlightMaterial: THREE.MeshStandardMaterial;
  private materialCache: THREE.Material[] = [];

  constructor() {
    this.bodyMaterial = PCBMaterials.componentBody();
    this.pinMaterial = PCBMaterials.componentPin();
    this.highlightMaterial = PCBMaterials.selectionHighlight();
    this.materialCache.push(this.bodyMaterial, this.pinMaterial, this.highlightMaterial);
  }

  /**
   * Build a 3D group for a single component.
   * layerZOffset is the Y position of the layer the component sits on (in mils).
   */
  build(component: Component, layerZOffset: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `component-${component.designator}`;
    group.userData['type'] = 'component';
    group.userData['componentId'] = component.id;
    group.userData['designator'] = component.designator;

    const bb = component.footprint.boundingBox;
    const bodyW = milsToUnits(bb.max.x - bb.min.x);
    const bodyD = milsToUnits(bb.max.y - bb.min.y);
    const height = componentHeight(component.designator);
    const bodyH = milsToUnits(height);

    // Bottom-side components extend downward (-Y), top-side upward (+Y)
    const isBottom = component.transform.mirrored;
    const direction = isBottom ? -1 : 1;

    // Component body
    const bodyGeo = new THREE.BoxGeometry(
      Math.max(bodyW, milsToUnits(10)),
      bodyH,
      Math.max(bodyD, milsToUnits(10)),
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    bodyMesh.position.y = direction * bodyH / 2;
    bodyMesh.name = 'body';
    bodyMesh.userData['type'] = 'component-body';
    bodyMesh.userData['componentId'] = component.id;
    group.add(bodyMesh);

    // Pads
    for (const pad of component.footprint.pads) {
      const padMesh = this.buildPad(pad, direction);
      group.add(padMesh);
    }

    // Designator label sprite
    const label = this.buildDesignatorSprite(component.designator, direction * bodyH);
    group.add(label);

    // Apply component transform
    const pos = component.transform.position;
    group.position.set(
      milsToUnits(pos.x),
      milsToUnits(layerZOffset),
      milsToUnits(pos.y),
    );
    group.rotation.y = -rotationToRadians(component.transform.rotation);
    if (isBottom) {
      group.scale.x = -1;
    }

    return group;
  }

  /** Apply selection highlight to a component group. */
  setSelected(group: THREE.Group, selected: boolean): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData['type'] === 'component-body') {
        child.material = selected ? this.highlightMaterial : this.bodyMaterial;
      }
    });
  }

  /** Build a pad mesh. direction: +1 for top-side, -1 for bottom-side. */
  private buildPad(pad: Pad, direction = 1): THREE.Mesh {
    const w = milsToUnits(pad.width);
    const h = milsToUnits(pad.height);
    const padThickness = milsToUnits(1.5);

    let geometry: THREE.BufferGeometry;

    switch (pad.shape) {
      case 'circle':
        geometry = new THREE.CylinderGeometry(w / 2, w / 2, padThickness, 16);
        break;
      case 'oval':
        geometry = new THREE.CylinderGeometry(w / 2, w / 2, padThickness, 16);
        geometry.scale(1, 1, h / w);
        break;
      case 'rect':
      case 'polygon':
      default:
        geometry = new THREE.BoxGeometry(w, padThickness, h);
        break;
    }

    const mesh = new THREE.Mesh(geometry, this.pinMaterial);
    mesh.position.set(
      milsToUnits(pad.localPosition.x),
      direction * padThickness / 2,
      milsToUnits(pad.localPosition.y),
    );
    if (pad.rotation) {
      mesh.rotation.y = -rotationToRadians(pad.rotation);
    }
    mesh.name = `pad-${pad.name}`;
    mesh.userData['type'] = 'pad';
    mesh.userData['padId'] = pad.id;

    return mesh;
  }

  /** Create a text sprite for the designator label placed on top of the component body. */
  private buildDesignatorSprite(text: string, bodyHeight: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 128, 64);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
    });
    this.materialCache.push(spriteMaterial);

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.y = bodyHeight + milsToUnits(5);
    sprite.scale.set(milsToUnits(80), milsToUnits(40), 1);
    sprite.name = 'designator-label';

    return sprite;
  }

  /** Dispose all cached materials. */
  dispose(): void {
    for (const mat of this.materialCache) {
      mat.dispose();
    }
    this.materialCache = [];
  }
}
