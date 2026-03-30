import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../../store';
import { milsToUnits } from '@pcb/render-three';
import type { Component, TracePath, BoardLayer } from '@pcb/domain';

// ─── Board Constants ────────────────────────────────────────────────────────

const BOARD_THICKNESS = 62;   // mils (1.6 mm)
const COPPER_THICKNESS = 1.4; // mils (1 oz copper)
const MASK_THICKNESS = 0.8;
const SILK_THICKNESS = 0.3;

// ─── Layer Z-Offset Computation ─────────────────────────────────────────────

/**
 * Compute the Y position (mils) for every layer in the stackup.
 *
 * Signal/plane layers are spread evenly through the board by their `order`
 * field.  order=0 → top copper, order=copperCount-1 → bottom copper.
 * Non-copper layers (mask, silkscreen) sit outside the board at fixed
 * positions based on their type.
 */
function buildLayerZMap(
  layers: BoardLayer[],
  copperLayerCount: number,
): Map<string, number> {
  const map = new Map<string, number>();
  const half = BOARD_THICKNESS / 2;

  for (const layer of layers) {
    let z: number | null = null;

    if (layer.type === 'signal' || layer.type === 'plane') {
      // Interpolate between +half (top) and -half (bottom)
      const t = copperLayerCount > 1
        ? layer.order / (copperLayerCount - 1)
        : 0;
      z = half - t * BOARD_THICKNESS;
    } else {
      switch (layer.type) {
        case 'solder_mask_top':
          z = half + COPPER_THICKNESS + MASK_THICKNESS / 2;
          break;
        case 'solder_mask_bottom':
          z = -(half + COPPER_THICKNESS + MASK_THICKNESS / 2);
          break;
        case 'silkscreen_top':
          z = half + COPPER_THICKNESS + MASK_THICKNESS + SILK_THICKNESS / 2;
          break;
        case 'silkscreen_bottom':
          z = -(half + COPPER_THICKNESS + MASK_THICKNESS + SILK_THICKNESS / 2);
          break;
        default:
          break;
      }
    }

    if (z != null) {
      map.set(layer.id, z);
    }
  }

  return map;
}

// ─── Layer Slab Rendering Info ──────────────────────────────────────────────

interface LayerSlabInfo {
  y: number;
  height: number;
  color: number;
  opacity: number;
  metalness: number;
  roughness: number;
}

function layerSlabInfo(
  layer: BoardLayer,
  layerZMap: Map<string, number>,
): LayerSlabInfo | null {
  const z = layerZMap.get(layer.id);
  if (z == null) return null;

  switch (layer.type) {
    case 'signal':
      return {
        y: z, height: milsToUnits(COPPER_THICKNESS),
        color: 0xb87333, opacity: 1, metalness: 0.7, roughness: 0.3,
      };
    case 'plane':
      return {
        y: z, height: milsToUnits(COPPER_THICKNESS),
        color: 0xb87333, opacity: 0.85, metalness: 0.7, roughness: 0.3,
      };
    case 'solder_mask_top':
    case 'solder_mask_bottom':
      return {
        y: z, height: milsToUnits(MASK_THICKNESS),
        color: 0x006830, opacity: 0.85, metalness: 0, roughness: 0.4,
      };
    case 'silkscreen_top':
    case 'silkscreen_bottom':
      return {
        y: z, height: milsToUnits(SILK_THICKNESS),
        color: 0xeeeeee, opacity: 0.4, metalness: 0, roughness: 0.9,
      };
    default:
      return null;
  }
}

// ─── Component Mesh ─────────────────────────────────────────────────────────

/** Approximate component body height (mils) by designator prefix. */
function componentBodyHeight(designator: string): number {
  const prefix = designator.replace(/[0-9]/g, '').toUpperCase();
  switch (prefix) {
    case 'R':  return 15;
    case 'C':  return 25;
    case 'L':  return 35;
    case 'U':  return 45;
    case 'J':
    case 'P':  return 70;
    default:   return 25;
  }
}

function buildComponentMesh(
  comp: Component,
  layerZMap: Map<string, number>,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `comp:${comp.id}`;
  group.userData.layerId = comp.layerId;

  const layerZ = layerZMap.get(comp.layerId) ?? (BOARD_THICKNESS / 2);
  const isBottom = comp.transform.mirrored;

  // Body direction: top-side grows upward (+Y), bottom-side grows downward (-Y)
  const direction = isBottom ? -1 : 1;

  const bb = comp.footprint.boundingBox;
  const compW = milsToUnits(bb.max.x - bb.min.x);
  const compD = milsToUnits(bb.max.y - bb.min.y);
  const bodyH = milsToUnits(componentBodyHeight(comp.designator));

  // Component body
  const bodyGeo = new THREE.BoxGeometry(
    Math.max(compW, milsToUnits(10)),
    bodyH,
    Math.max(compD, milsToUnits(10)),
  );
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.1 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = direction * bodyH / 2;
  group.add(bodyMesh);

  // Pads on the layer surface
  const padMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.8, roughness: 0.3 });
  const padThickness = milsToUnits(COPPER_THICKNESS);
  for (const pad of comp.footprint.pads) {
    const pw = milsToUnits(pad.width);
    const ph = milsToUnits(pad.height);
    let padGeo: THREE.BufferGeometry;
    if (pad.shape === 'circle' || pad.shape === 'oval') {
      padGeo = new THREE.CylinderGeometry(pw / 2, pw / 2, padThickness, 12);
      if (pad.shape === 'oval') padGeo.scale(1, 1, ph / pw);
    } else {
      padGeo = new THREE.BoxGeometry(pw, padThickness, ph);
    }
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(
      milsToUnits(pad.localPosition.x),
      direction * padThickness / 2,
      milsToUnits(pad.localPosition.y),
    );
    group.add(padMesh);
  }

  // Position the group at the component's world location on its layer
  group.position.set(
    milsToUnits(comp.transform.position.x),
    milsToUnits(layerZ),
    milsToUnits(comp.transform.position.y),
  );

  // Rotation
  if (comp.transform.rotation) {
    group.rotation.y = -(comp.transform.rotation * Math.PI) / 180;
  }

  // Mirror for bottom-side
  if (isBottom) {
    group.scale.x = -1;
  }

  return group;
}

// ─── Trace / Via Mesh ───────────────────────────────────────────────────────

function buildTraceMeshes(
  trace: TracePath,
  layerZMap: Map<string, number>,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `trace:${trace.id}`;
  group.userData.layerId = trace.segments[0]?.layerId ?? '';

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb87333, metalness: 0.6, roughness: 0.3,
  });
  const viaMat = new THREE.MeshStandardMaterial({
    color: 0xc9a84c, metalness: 0.8, roughness: 0.2,
  });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const traceHeight = milsToUnits(COPPER_THICKNESS);

  // ── Segments: each positioned at its own layer's Z
  for (const seg of trace.segments) {
    const zOffset = layerZMap.get(seg.layerId) ?? 0;

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
    const mesh = new THREE.Mesh(geo, copperMat);
    mesh.position.set((sx + ex) / 2, milsToUnits(zOffset), (sz + ez) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.userData.layerId = seg.layerId;
    group.add(mesh);
  }

  // ── Vias: copper cylinder spanning fromLayer to toLayer
  for (const via of trace.vias) {
    const fromZ = layerZMap.get(via.fromLayerId) ?? 0;
    const toZ = layerZMap.get(via.toLayerId) ?? 0;
    const topY = milsToUnits(Math.max(fromZ, toZ));
    const bottomY = milsToUnits(Math.min(fromZ, toZ));
    const height = Math.abs(topY - bottomY) || milsToUnits(BOARD_THICKNESS);
    const centerY = (topY + bottomY) / 2;

    const outerR = milsToUnits(via.outerDiameter / 2);
    const innerR = milsToUnits(via.drillDiameter / 2);

    // Outer copper barrel
    const outerGeo = new THREE.CylinderGeometry(outerR, outerR, height, 12);
    const outerMesh = new THREE.Mesh(outerGeo, viaMat);
    group.add(outerMesh);

    // Inner drill hole (dark)
    const innerGeo = new THREE.CylinderGeometry(innerR, innerR, height + 0.0001, 8);
    const innerMesh = new THREE.Mesh(innerGeo, holeMat);
    group.add(innerMesh);

    // Annular ring pads at top and bottom of via
    const ringGeo = new THREE.CylinderGeometry(outerR, outerR, milsToUnits(COPPER_THICKNESS), 12);
    const ringTop = new THREE.Mesh(ringGeo, viaMat);
    ringTop.position.y = height / 2;
    group.add(ringTop);
    const ringBot = new THREE.Mesh(ringGeo.clone(), viaMat);
    ringBot.position.y = -height / 2;
    group.add(ringBot);

    // Position the via group
    const viaGroup = new THREE.Group();
    viaGroup.add(outerMesh);
    viaGroup.add(innerMesh);
    viaGroup.add(ringTop);
    viaGroup.add(ringBot);
    viaGroup.position.set(
      milsToUnits(via.position.x),
      centerY,
      milsToUnits(via.position.y),
    );
    group.add(viaGroup);
  }

  return group;
}

// ─── Main Component ─────────────────────────────────────────────────────────

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
    const thickness = milsToUnits(BOARD_THICKNESS);

    // ── Compute layer Z positions ──
    const copperLayerCount = currentBoard.layers.filter(
      (l) => l.type === 'signal' || l.type === 'plane',
    ).length;
    const layerZMap = buildLayerZMap(currentBoard.layers, copperLayerCount);

    // ── FR4 substrate ──
    const boardGeo = new THREE.BoxGeometry(w, thickness, h);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.7 });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.set(w / 2, 0, h / 2);
    boardMesh.name = 'pcb-substrate';
    scene.add(boardMesh);

    // ── Layer slabs (copper, mask, silkscreen — each at correct Z) ──
    for (const layer of currentBoard.layers) {
      const info = layerSlabInfo(layer, layerZMap);
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
      mesh.position.set(w / 2, milsToUnits(info.y), h / 2);
      mesh.name = `layer:${layer.id}`;
      mesh.visible = layer.visible;
      scene.add(mesh);
    }

    // ── Components — positioned on their respective layer ──
    for (const comp of components) {
      scene.add(buildComponentMesh(comp, layerZMap));
    }

    // ── Traces — each segment on its layer, vias spanning layers ──
    for (const trace of traces) {
      scene.add(buildTraceMeshes(trace, layerZMap));
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
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const layer of layers) {
      const layerMesh = scene.getObjectByName(`layer:${layer.id}`);
      if (layerMesh) layerMesh.visible = layer.visible;
    }
  }, [layers]);

  return (
    <div ref={containerRef} className="canvas-container canvas-container--3d" />
  );
}
