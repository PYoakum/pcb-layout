import { NetId, PadId, PinId, TracePathId } from './ids';

export interface Net {
  id: NetId;
  name: string;
  pins: PinId[];
  pads: PadId[];
  paths: TracePathId[];
  color?: string;           // highlight color
  netClass?: string;        // for design rule matching
}
