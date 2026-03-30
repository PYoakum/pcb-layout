import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../../store';
import { milsToUnits } from '@pcb/render-three';
import type { Component, TracePath, BoardLayer } from '@pcb/domain';

function buildComponentMesh(comp: Component, boardTop: number): THREE.Mesh {
  const bb = comp.footprint.boundingBox;
  const compW = milsToUnits(bb.max.x - bb.min.x);
  const compH = milsToUnits(bb.max.y - bb.min.y);
  const compHeight = milsToUnits(20);
  const geo = new THREE.BoxGeometry(compW, compHeight, compH);
  const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    milsToUnits(comp.transform.position.x),
    boardTop + compHeight / 2,
    milsToUnits(comp.transform.position.y),
  );
  mesh.name = `comp:${comp.id}`;
  mesh.userData.layerId = comp.layerId;
  return mesh;
}

function buildTraceMeshes(trace: TracePath, boardTop: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `trace:${trace.id}`;
  const mat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.6, roughness: 0.3 });
  const traceHeight = milsToUnits(1.4);
  // Tag group with the layer of the first segment
  group.userData.layerId = trace.segments[0]?.layerId ?? '';

  for (const seg of trace.segments) {
    const sx = milsToUnits(seg.start.x);
    const sz = milsToUnits(seg.start.y);
    const ex = milsToUnits(seg.end.x);
    const ez = milsToUnits(seg.end.y);
    const dx = ex - sx;
    const dz = ez - sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.0001) continue;

    const w = milsToUnits(seg.width);
    const geo = new THREE.BoxGeometry(len, traceHeight, w);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((sx + ex) / 2, boardTop + traceHeight / 2, (sz + ez) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    group.add(mesh);
  }

  return group;
}

/** Map layer type to 3D rendering info */
function layerZ(layer: BoardLayer, thickness: number, maskH: number, silkH: number): {
  y: number; height: number; color: number; opacity: number; metalness: number; roughness: number;
} | null {
  switch (layer.type) {
    case 'signal':
      // Copper layers — thin metallic
      return {
        y: layer.order <= 2 ? thickness / 2 + maskH + milsToUnits(0.7) : -(thickness / 2 + maskH + milsToUnits(0.7)),
        height: milsToUnits(1.4), color: 0xb87333, opacity: 1, metalness: 0.7, roughness: 0.3,
      };
    case 'solder_mask_top':
      return {
        y: thickness / 2 + maskH / 2,
        height: maskH, color: 0x006830, opacity: 0.85, metalness: 0, roughness: 0.4,
      };
    case 'solder_mask_bottom':
      return {
        y: -(thickness / 2 + maskH / 2),
        height: maskH, color: 0x006830, opacity: 0.85, metalness: 0, roughness: 0.4,
      };
    case 'silkscreen_top':
      return {
        y: thickness / 2 + maskH + silkH / 2,
        height: silkH, color: 0xeeeeee, opacity: 0.4, metalness: 0, roughness: 0.9,
      };
    case 'silkscreen_bottom':
      return {
        y: -(thickness / 2 + maskH + silkH / 2),
        height: silkH, color: 0xeeeeee, opacity: 0.4, metalness: 0, roughness: 0.9,
      };
    default:
      return null;
  }
}

export function Canvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animIdRef = useRef(0);
  const cameraFitRef = useRef(false);

  const currentBoard = useStore((s) => s.currentBoard);
  const components = useStore((s) => s.components);
  const traces = useStore((s) => s.traces);
  const layers = useStore((s) => s.layers);

  // Mount: create scene, renderer, controls, animation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45, (container.clientWidth || 100) / (container.clientHeight || 100), 0.001, 1000,
    );
    camera.position.set(0.3, 0.4, 0.3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth || 100, container.clientHeight || 100);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0.5, 1, 0.5);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const m = child.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m.dispose();
        }
      });
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Rebuild 3D geometry when board/components/traces change
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !currentBoard) return;

    // Remove old dynamic objects
    const toRemove = scene.children.filter((c) =>
      c.name.startsWith('pcb-') || c.name.startsWith('layer:') ||
      c.name.startsWith('comp:') || c.name.startsWith('trace:'),
    );
    for (const obj of toRemove) scene.remove(obj);

    const w = milsToUnits(currentBoard.workspace.width);
    const h = milsToUnits(currentBoard.workspace.height);
    const thickness = milsToUnits(62);
    const maskH = milsToUnits(0.8);
    const silkH = milsToUnits(0.3);
    const copperH = milsToUnits(1.4);
    const boardTop = thickness / 2 + maskH + copperH;

    // FR4 substrate (always visible)
    const boardGeo = new THREE.BoxGeometry(w, thickness, h);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.7 });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.set(w / 2, 0, h / 2);
    boardMesh.name = 'pcb-substrate';
    scene.add(boardMesh);

    // Per-layer slabs
    for (const layer of currentBoard.layers) {
      const info = layerZ(layer, thickness, maskH, silkH);
      if (!info) continue;

      const geo = new THREE.BoxGeometry(w, info.height, h);
      const mat = new THREE.MeshStandardMaterial({
        color: info.color,
        roughness: info.roughness,
        metalness: info.metalness,
        transparent: info.opacity < 1,
        opacity: info.opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w / 2, info.y, h / 2);
      mesh.name = `layer:${layer.id}`;
      mesh.visible = layer.visible;
      scene.add(mesh);
    }

    // Components — always visible regardless of layer toggle
    for (const comp of components) {
      scene.add(buildComponentMesh(comp, boardTop));
    }

    // Traces — always visible regardless of layer toggle
    for (const trace of traces) {
      scene.add(buildTraceMeshes(trace, thickness / 2 + copperH / 2));
    }

    // Fit camera only on first build
    if (camera && controls && !cameraFitRef.current) {
      cameraFitRef.current = true;
      const maxDim = Math.max(w, h);
      camera.position.set(w / 2 + maxDim * 0.5, maxDim * 0.6, h / 2 + maxDim * 0.5);
      camera.lookAt(w / 2, 0, h / 2);
      controls.target.set(w / 2, 0, h / 2);
    }
  }, [currentBoard, components, traces]);

  // Sync layer visibility without full rebuild
  // Layer slabs and components follow layer visibility.
  // Traces are always visible (they represent the actual copper routing).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const layer of layers) {
      // Only toggle the layer slab mesh itself — traces and components stay visible
      const layerMesh = scene.getObjectByName(`layer:${layer.id}`);
      if (layerMesh) layerMesh.visible = layer.visible;
    }
  }, [layers]);

  return (
    <div ref={containerRef} className="canvas-container canvas-container--3d" />
  );
}
