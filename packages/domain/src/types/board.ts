import { BoardId, ProjectId, LayerId } from './ids';
import { Point2D, WorkspaceConfig } from './geometry';
import { Component } from './component';
import { TracePath } from './trace';

export enum LayerType {
  Signal = 'signal',
  Plane = 'plane',
  SilkscreenTop = 'silkscreen_top',
  SilkscreenBottom = 'silkscreen_bottom',
  SolderMaskTop = 'solder_mask_top',
  SolderMaskBottom = 'solder_mask_bottom',
  PasteTop = 'paste_top',
  PasteBottom = 'paste_bottom',
  Mechanical = 'mechanical',
}

export interface BoardLayer {
  id: LayerId;
  boardId: BoardId;
  name: string;
  type: LayerType;
  order: number;        // z-order stacking index
  color: string;        // hex color for rendering
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0-1
}

/**
 * A path vertex in a board profile.  If `radius` is > 0 the corner is
 * rounded with an arc of that radius (mils).
 */
export interface ProfileVertex {
  x: number;
  y: number;
  /** Fillet radius at this vertex (mils). 0 = sharp corner. */
  radius?: number;
}

/**
 * A closed polygon defining either the board outline or an internal cutout
 * (hole / slot / notch).
 */
export interface BoardProfile {
  /** Ordered vertices forming a closed polygon (last→first is implicit). */
  vertices: ProfileVertex[];
  /** `outline` = the board edge, `cutout` = an internal hole/slot. */
  kind: 'outline' | 'cutout';
}

export interface Board {
  id: BoardId;
  projectId: ProjectId;
  name: string;
  workspace: WorkspaceConfig;
  layers: BoardLayer[];
  /**
   * Board outline and cutout profiles.  The first entry with kind=`outline`
   * defines the PCB edge (replaces the rectangular workspace dimensions for
   * rendering).  Additional entries with kind=`cutout` define internal holes,
   * slots, or notches.
   *
   * When empty, the board is a simple rectangle from (0,0) to
   * (workspace.width, workspace.height).
   */
  profiles?: BoardProfile[];
  components?: Component[];
  traces?: TracePath[];
  createdAt: string;
  updatedAt: string;
}
