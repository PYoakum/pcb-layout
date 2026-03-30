import * as THREE from 'three';

/** Central material definitions for PCB rendering. */
export const PCBMaterials = {
  /** Dark green FR4 substrate. */
  substrate(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x1a5c1a,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  },

  /** Copper layer material. */
  copper(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xb87333,
      roughness: 0.3,
      metalness: 0.85,
      side: THREE.DoubleSide,
    });
  },

  /** Green solder mask, semi-transparent. */
  solderMask(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x006400,
      roughness: 0.6,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
  },

  /** White silkscreen, matte. */
  silkscreen(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  },

  /** Selection highlight with emissive blue glow. */
  selectionHighlight(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x2266ff,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x2266ff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });
  },

  /** Via material, copper metallic. */
  via(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xb87333,
      roughness: 0.25,
      metalness: 0.9,
    });
  },

  /** Via inner hole, dark. */
  viaHole(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 1.0,
      metalness: 0.0,
    });
  },

  /** Component body, dark gray. */
  componentBody(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
      metalness: 0.1,
    });
  },

  /** Component pin/lead, silver metallic. */
  componentPin(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.3,
      metalness: 0.9,
    });
  },

  /** Hover highlight material. */
  hoverHighlight(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x44aaff,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });
  },
} as const;

/** Dispose all materials in a material cache map. */
export function disposeMaterials(materials: THREE.Material[]): void {
  for (const mat of materials) {
    mat.dispose();
  }
}
