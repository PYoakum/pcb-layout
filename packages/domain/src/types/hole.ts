import { MountingHoleId, LayerId } from './ids';
import { Point2D } from './geometry';

export interface MountingHole {
  id: MountingHoleId;
  position: Point2D;
  diameter: number;       // drill diameter in mils
  plated: boolean;        // plated through-hole
  layerId: LayerId;       // layer for rendering (typically mechanical)
  locked: boolean;
}
