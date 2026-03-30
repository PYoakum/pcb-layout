export { exportKiCad } from './kicad';
export { exportEagle } from './eagle';
export { exportAltium } from './altium';

export type ExportFormat = 'pcb' | 'kicad_pcb' | 'brd' | 'PcbDoc';

export const EXPORT_FORMATS: Record<ExportFormat, { extension: string; contentType: string; description: string }> = {
  pcb: {
    extension: '.pcb',
    contentType: 'application/json',
    description: 'PCB Layout native format (JSON)',
  },
  kicad_pcb: {
    extension: '.kicad_pcb',
    contentType: 'application/x-kicad-pcb',
    description: 'KiCad PCB format (S-expression)',
  },
  brd: {
    extension: '.brd',
    contentType: 'application/xml',
    description: 'Eagle board format (XML)',
  },
  PcbDoc: {
    extension: '.PcbDoc',
    contentType: 'text/plain',
    description: 'Altium Designer PCB format (ASCII)',
  },
};
