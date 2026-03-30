import * as THREE from 'three';
import { milsToUnits, unitsToMils } from './utils';
import { PCBMaterials } from './materials';

export interface HoverInfo {
  type: 'component' | 'trace-segment' | 'via' | 'pad' | 'layer';
  id: string;
  designator?: string;
  name?: string;
  position: THREE.Vector3;
}

export interface MeasurementResult {
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distanceMils: number;
}

export type SelectionCallback = (info: HoverInfo | null) => void;
export type HoverCallback = (info: HoverInfo | null) => void;
export type MeasurementCallback = (result: MeasurementResult) => void;

/**
 * InteractionManager handles raycasting, hover, selection, tooltips,
 * and measurement for the 3D PCB scene.
 */
export class InteractionManager {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;

  private hoveredObject: THREE.Object3D | null = null;
  private selectedObject: THREE.Object3D | null = null;
  private originalMaterials = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>();

  private hoverMaterial: THREE.MeshStandardMaterial;
  private selectMaterial: THREE.MeshStandardMaterial;

  private onSelectCallbacks: SelectionCallback[] = [];
  private onHoverCallbacks: HoverCallback[] = [];

  // Measurement mode
  private measurementMode = false;
  private measurePointA: THREE.Vector3 | null = null;
  private measureLine: THREE.Line | null = null;
  private onMeasureCallbacks: MeasurementCallback[] = [];

  private boundMouseMove: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    domElement: HTMLElement,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;

    this.hoverMaterial = PCBMaterials.hoverHighlight();
    this.selectMaterial = PCBMaterials.selectionHighlight();

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundClick = this.onClick.bind(this);

    domElement.addEventListener('mousemove', this.boundMouseMove);
    domElement.addEventListener('click', this.boundClick);
  }

  /** Register a callback for selection changes. */
  onSelect(cb: SelectionCallback): void {
    this.onSelectCallbacks.push(cb);
  }

  /** Register a callback for hover changes. */
  onHover(cb: HoverCallback): void {
    this.onHoverCallbacks.push(cb);
  }

  /** Register a callback for measurement completions. */
  onMeasure(cb: MeasurementCallback): void {
    this.onMeasureCallbacks.push(cb);
  }

  /** Enable or disable measurement mode. */
  setMeasurementMode(enabled: boolean): void {
    this.measurementMode = enabled;
    this.measurePointA = null;
    if (this.measureLine) {
      this.scene.remove(this.measureLine);
      this.measureLine.geometry.dispose();
      (this.measureLine.material as THREE.Material).dispose();
      this.measureLine = null;
    }
  }

  /** Programmatically clear selection. */
  clearSelection(): void {
    this.restoreMaterial(this.selectedObject);
    this.selectedObject = null;
    for (const cb of this.onSelectCallbacks) cb(null);
  }

  /** Get currently selected object info. */
  getSelection(): HoverInfo | null {
    return this.selectedObject ? this.extractInfo(this.selectedObject) : null;
  }

  /** Dispose event listeners and materials. */
  dispose(): void {
    this.domElement.removeEventListener('mousemove', this.boundMouseMove);
    this.domElement.removeEventListener('click', this.boundClick);
    this.hoverMaterial.dispose();
    this.selectMaterial.dispose();
    if (this.measureLine) {
      this.scene.remove(this.measureLine);
      this.measureLine.geometry.dispose();
      (this.measureLine.material as THREE.Material).dispose();
    }
    this.originalMaterials.clear();
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycast(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // Find the first pickable object (has a recognized type)
    for (const hit of intersects) {
      const info = this.extractInfo(hit.object);
      if (info) return hit;
    }
    return null;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    const hit = this.raycast();

    const newHover = hit?.object ?? null;

    if (newHover !== this.hoveredObject) {
      // Restore previous hover (unless it's the selected object)
      if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
        this.restoreMaterial(this.hoveredObject);
      }

      this.hoveredObject = newHover;

      // Apply hover highlight (unless it's the selected object)
      if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
        this.applyMaterial(this.hoveredObject, this.hoverMaterial);
      }

      const info = this.hoveredObject ? this.extractInfo(this.hoveredObject) : null;
      for (const cb of this.onHoverCallbacks) cb(info);
    }
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event);
    const hit = this.raycast();

    if (this.measurementMode && hit) {
      this.handleMeasurementClick(hit.point);
      return;
    }

    // Deselect previous
    if (this.selectedObject) {
      this.restoreMaterial(this.selectedObject);
    }

    if (hit) {
      this.selectedObject = hit.object;
      this.applyMaterial(this.selectedObject, this.selectMaterial);
      const info = this.extractInfo(this.selectedObject);
      for (const cb of this.onSelectCallbacks) cb(info);
    } else {
      this.selectedObject = null;
      for (const cb of this.onSelectCallbacks) cb(null);
    }
  }

  private handleMeasurementClick(point: THREE.Vector3): void {
    if (!this.measurePointA) {
      this.measurePointA = point.clone();
    } else {
      const pointB = point.clone();

      // Draw measurement line
      if (this.measureLine) {
        this.scene.remove(this.measureLine);
        this.measureLine.geometry.dispose();
        (this.measureLine.material as THREE.Material).dispose();
      }

      const geo = new THREE.BufferGeometry().setFromPoints([this.measurePointA, pointB]);
      const mat = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 });
      this.measureLine = new THREE.Line(geo, mat);
      this.scene.add(this.measureLine);

      const dx = unitsToMils(pointB.x - this.measurePointA.x);
      const dy = unitsToMils(pointB.y - this.measurePointA.y);
      const dz = unitsToMils(pointB.z - this.measurePointA.z);
      const distanceMils = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const result: MeasurementResult = {
        pointA: this.measurePointA,
        pointB,
        distanceMils,
      };

      for (const cb of this.onMeasureCallbacks) cb(result);
      this.measurePointA = null;
    }
  }

  private extractInfo(obj: THREE.Object3D): HoverInfo | null {
    // Walk up the hierarchy to find a recognized type
    let current: THREE.Object3D | null = obj;
    while (current) {
      const type = current.userData['type'] as string | undefined;
      if (type) {
        switch (type) {
          case 'component':
          case 'component-body':
            return {
              type: 'component',
              id: current.userData['componentId'] ?? '',
              designator: current.userData['designator'],
              position: current.position.clone(),
            };
          case 'trace-segment':
            return {
              type: 'trace-segment',
              id: current.userData['segmentId'] ?? '',
              position: current.position.clone(),
            };
          case 'via':
            return {
              type: 'via',
              id: current.userData['viaId'] ?? '',
              position: current.position.clone(),
            };
          case 'pad':
            return {
              type: 'pad',
              id: current.userData['padId'] ?? '',
              position: current.position.clone(),
            };
          case 'layer':
            return {
              type: 'layer',
              id: current.userData['layerId'] ?? '',
              position: current.position.clone(),
            };
        }
      }
      current = current.parent;
    }
    return null;
  }

  private applyMaterial(obj: THREE.Object3D, material: THREE.MeshStandardMaterial): void {
    if (obj instanceof THREE.Mesh) {
      if (!this.originalMaterials.has(obj)) {
        this.originalMaterials.set(obj, obj.material);
      }
      obj.material = material;
    }
  }

  private restoreMaterial(obj: THREE.Object3D | null): void {
    if (!obj) return;
    const original = this.originalMaterials.get(obj);
    if (original && obj instanceof THREE.Mesh) {
      obj.material = original;
      this.originalMaterials.delete(obj);
    }
  }
}
