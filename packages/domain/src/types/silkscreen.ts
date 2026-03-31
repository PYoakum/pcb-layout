import { LayerId } from './ids';
import { Point2D, Rotation } from './geometry';

export type SilkscreenLabelId = string & { readonly __brand: 'SilkscreenLabelId' };

export type SilkscreenContentType = 'text' | 'svg';

export interface SilkscreenLabel {
  id: SilkscreenLabelId;
  layerId: LayerId;               // silkscreen_top or silkscreen_bottom layer
  position: Point2D;
  rotation: Rotation;
  contentType: SilkscreenContentType;
  /** Text content when contentType is 'text' */
  text?: string;
  fontSize?: number;              // in mils
  fontFamily?: string;
  /** SVG markup string when contentType is 'svg' */
  svgContent?: string;
  /** SVG viewport width in mils */
  svgWidth?: number;
  /** SVG viewport height in mils */
  svgHeight?: number;
  locked: boolean;
}
