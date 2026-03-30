import type {
  Component,
  ComponentId,
  FootprintId,
  PadId,
  PinId,
  LayerId,
  Footprint,
  Pad,
  Pin,
  PadShape,
  PinElectricalType,
  BoundingBox,
  Rotation,
} from '@pcb/domain';
import { createId } from '@pcb/domain';
import type { LibraryComponent } from './default-components';

const padShapeMap: Record<string, PadShape> = {
  rect: 'rect' as PadShape,
  circle: 'circle' as PadShape,
  oval: 'oval' as PadShape,
};

/**
 * Convert a LibraryComponent into a full domain Component ready for placement.
 */
export function createComponentFromLibrary(
  lib: LibraryComponent,
  layerId: LayerId,
  designatorIndex: number,
): Component {
  const componentId = createId<ComponentId>('comp');
  const footprintId = createId<FootprintId>('fp');

  // Build pads
  const pads: Pad[] = lib.pads.map((p) => {
    const padId = createId<PadId>('pad');
    return {
      id: padId,
      componentId,
      name: p.name,
      localPosition: { x: p.x, y: p.y },
      shape: padShapeMap[p.shape] ?? ('rect' as PadShape),
      width: p.width,
      height: p.height,
      rotation: 0 as Rotation,
      layerId,
      plated: true,
    };
  });

  // Build pins (one per pad)
  const pins: Pin[] = pads.map((pad, i) => ({
    id: createId<PinId>('pin'),
    padId: pad.id,
    name: lib.pads[i].name,
    number: lib.pads[i].name,
    electricalType: 'passive' as PinElectricalType,
  }));

  // Calculate bounding box from body + pads
  const allX = lib.pads.map((p) => [p.x - p.width / 2, p.x + p.width / 2]).flat();
  const allY = lib.pads.map((p) => [p.y - p.height / 2, p.y + p.height / 2]).flat();
  allX.push(-lib.bodyWidth / 2, lib.bodyWidth / 2);
  allY.push(-lib.bodyHeight / 2, lib.bodyHeight / 2);

  const boundingBox: BoundingBox = {
    min: { x: Math.min(...allX), y: Math.min(...allY) },
    max: { x: Math.max(...allX), y: Math.max(...allY) },
  };

  const courtyard: BoundingBox = {
    min: { x: boundingBox.min.x - 10, y: boundingBox.min.y - 10 },
    max: { x: boundingBox.max.x + 10, y: boundingBox.max.y + 10 },
  };

  const footprint: Footprint = {
    id: footprintId,
    name: lib.footprintName,
    description: lib.name,
    pads,
    pins,
    boundingBox,
    courtyard,
  };

  return {
    id: componentId,
    name: lib.name,
    designator: `${lib.designatorPrefix}${designatorIndex}`,
    footprint,
    transform: {
      position: { x: 0, y: 0 },
      rotation: 0 as Rotation,
      mirrored: false,
    },
    layerId,
    properties: { ...lib.defaultProperties },
    locked: false,
  };
}
