// Types used by rendering engines
export interface RenderMaterial {
  color: string;
  opacity: number;
  metallic: boolean;
  roughness: number;
}

export interface LayerRenderConfig {
  layerId: string;
  material: RenderMaterial;
  thickness: number;      // in mils, for 3D extrusion
  zOffset: number;        // z position in 3D stack
}

export interface BoardRenderConfig {
  layers: LayerRenderConfig[];
  boardThickness: number;
  boardColor: string;
  solderMaskColor: string;
  silkscreenColor: string;
  copperColor: string;
}
