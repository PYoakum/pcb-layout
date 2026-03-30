import * as THREE from 'three';

const BACKGROUND_COLOR = 0x1a1a2e;

/**
 * PCBScene manages the Three.js Scene, Camera, Renderer, and animation loop
 * for rendering a 3D PCB board.
 */
export class PCBScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer | null = null;

  private animationFrameId: number | null = null;
  private container: HTMLElement | null = null;
  private onRenderCallbacks: Array<() => void> = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000);
    this.camera.position.set(0.3, 0.4, 0.3);
    this.camera.lookAt(0, 0, 0);

    this.setupLighting();
  }

  /** Initialize the renderer and attach to a DOM container. */
  init(container: HTMLElement): void {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    const { clientWidth: w, clientHeight: h } = container;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    container.appendChild(this.renderer.domElement);
  }

  /** Register a callback invoked every frame before render. */
  onBeforeRender(cb: () => void): void {
    this.onRenderCallbacks.push(cb);
  }

  /** Start the animation loop. */
  startLoop(): void {
    if (this.animationFrameId !== null) return;
    const loop = () => {
      this.animationFrameId = requestAnimationFrame(loop);
      for (const cb of this.onRenderCallbacks) cb();
      this.render();
    };
    loop();
  }

  /** Stop the animation loop. */
  stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /** Render a single frame. */
  render(): void {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Handle container resize. */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height);
  }

  /** Tear down all resources. */
  dispose(): void {
    this.stopLoop();
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    this.renderer?.dispose();
    if (this.renderer && this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer = null;
    this.container = null;
    this.onRenderCallbacks = [];
  }

  /** Get the renderer's canvas DOM element. */
  get domElement(): HTMLCanvasElement | null {
    return this.renderer?.domElement ?? null;
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Key light from upper-right-front
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(0.5, 1.0, 0.5);
    keyLight.castShadow = false;
    this.scene.add(keyLight);

    // Fill light from upper-left-back
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-0.5, 0.8, -0.3);
    fillLight.castShadow = false;
    this.scene.add(fillLight);
  }
}
