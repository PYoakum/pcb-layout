import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BoundingBox } from '@pcb/domain';
import { milsToUnits } from './utils';

export enum CameraPreset {
  Top = 'top',
  Bottom = 'bottom',
  Front = 'front',
  Side = 'side',
  Isometric = 'isometric',
  Free = 'free',
}

interface TransitionState {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
}

/**
 * CameraController wraps OrbitControls and provides camera presets
 * with smooth transitions, pan, orbit, zoom, and fit-to-board.
 */
export class CameraController {
  readonly controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private transition: TransitionState | null = null;
  private currentPreset: CameraPreset = CameraPreset.Free;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.01;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI;

    // Middle mouse or shift+left for pan
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  /** Must be called each frame (e.g., via PCBScene.onBeforeRender). */
  update(deltaTime: number = 1 / 60): void {
    if (this.transition) {
      this.transition.progress += deltaTime / this.transition.duration;
      if (this.transition.progress >= 1) {
        this.camera.position.copy(this.transition.endPosition);
        this.controls.target.copy(this.transition.endTarget);
        this.transition = null;
      } else {
        const t = smoothstep(this.transition.progress);
        this.camera.position.lerpVectors(
          this.transition.startPosition,
          this.transition.endPosition,
          t,
        );
        this.controls.target.lerpVectors(
          this.transition.startTarget,
          this.transition.endTarget,
          t,
        );
      }
      this.camera.lookAt(this.controls.target);
    }
    this.controls.update();
  }

  /** Transition to a named camera preset. */
  setPreset(preset: CameraPreset, distance = 0.5, duration = 0.6): void {
    this.currentPreset = preset;
    const target = this.controls.target.clone();
    const pos = new THREE.Vector3();

    switch (preset) {
      case CameraPreset.Top:
        pos.set(target.x, distance, target.z);
        break;
      case CameraPreset.Bottom:
        pos.set(target.x, -distance, target.z);
        break;
      case CameraPreset.Front:
        pos.set(target.x, target.y, target.z + distance);
        break;
      case CameraPreset.Side:
        pos.set(target.x + distance, target.y, target.z);
        break;
      case CameraPreset.Isometric:
        const d = distance * 0.7071; // cos(45)
        pos.set(target.x + d, distance * 0.7071, target.z + d);
        break;
      case CameraPreset.Free:
        return; // no transition needed
    }

    this.transitionTo(pos, target, duration);
  }

  /** Fit the camera so the entire board is visible. */
  fitToBoard(boardBounds: BoundingBox, padding = 1.2): void {
    const minX = milsToUnits(boardBounds.min.x);
    const maxX = milsToUnits(boardBounds.max.x);
    const minZ = milsToUnits(boardBounds.min.y);
    const maxZ = milsToUnits(boardBounds.max.y);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const width = (maxX - minX) * padding;
    const depth = (maxZ - minZ) * padding;

    const maxDim = Math.max(width, depth);
    const fov = this.camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2);

    const newTarget = new THREE.Vector3(cx, 0, cz);
    const newPos = new THREE.Vector3(cx, dist, cz);

    this.transitionTo(newPos, newTarget, 0.6);
  }

  /** Reset to default isometric view. */
  reset(): void {
    const target = new THREE.Vector3(0, 0, 0);
    const pos = new THREE.Vector3(0.3, 0.4, 0.3);
    this.transitionTo(pos, target, 0.6);
    this.currentPreset = CameraPreset.Free;
  }

  /** Get current preset. */
  getPreset(): CameraPreset {
    return this.currentPreset;
  }

  /** Dispose of controls. */
  dispose(): void {
    this.controls.dispose();
  }

  private transitionTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number,
  ): void {
    this.transition = {
      startPosition: this.camera.position.clone(),
      endPosition: position,
      startTarget: this.controls.target.clone(),
      endTarget: target,
      progress: 0,
      duration,
    };
  }
}

/** Hermite smoothstep for easing. */
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
