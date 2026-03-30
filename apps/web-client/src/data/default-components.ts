export interface LibraryComponent {
  name: string;
  category: 'passive' | 'ic' | 'connector' | 'discrete' | 'custom';
  designatorPrefix: string;
  footprintName: string;
  pinCount: number;
  defaultProperties: Record<string, string>;
  bodyWidth: number;
  bodyHeight: number;
  pads: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rect' | 'circle' | 'oval';
  }>;
}

export const defaultComponents: LibraryComponent[] = [
  // Resistors
  {
    name: 'Resistor 0402',
    category: 'passive',
    designatorPrefix: 'R',
    footprintName: '0402',
    pinCount: 2,
    defaultProperties: { value: '10k', tolerance: '1%' },
    bodyWidth: 40,
    bodyHeight: 20,
    pads: [
      { name: '1', x: -20, y: 0, width: 16, height: 20, shape: 'rect' },
      { name: '2', x: 20, y: 0, width: 16, height: 20, shape: 'rect' },
    ],
  },
  {
    name: 'Resistor 0603',
    category: 'passive',
    designatorPrefix: 'R',
    footprintName: '0603',
    pinCount: 2,
    defaultProperties: { value: '10k', tolerance: '1%' },
    bodyWidth: 60,
    bodyHeight: 30,
    pads: [
      { name: '1', x: -30, y: 0, width: 24, height: 28, shape: 'rect' },
      { name: '2', x: 30, y: 0, width: 24, height: 28, shape: 'rect' },
    ],
  },
  {
    name: 'Resistor 0805',
    category: 'passive',
    designatorPrefix: 'R',
    footprintName: '0805',
    pinCount: 2,
    defaultProperties: { value: '10k', tolerance: '5%' },
    bodyWidth: 80,
    bodyHeight: 50,
    pads: [
      { name: '1', x: -40, y: 0, width: 30, height: 45, shape: 'rect' },
      { name: '2', x: 40, y: 0, width: 30, height: 45, shape: 'rect' },
    ],
  },
  {
    name: 'Resistor 1206',
    category: 'passive',
    designatorPrefix: 'R',
    footprintName: '1206',
    pinCount: 2,
    defaultProperties: { value: '10k', tolerance: '5%' },
    bodyWidth: 120,
    bodyHeight: 60,
    pads: [
      { name: '1', x: -60, y: 0, width: 40, height: 55, shape: 'rect' },
      { name: '2', x: 60, y: 0, width: 40, height: 55, shape: 'rect' },
    ],
  },
  // Capacitors
  {
    name: 'Capacitor 0402',
    category: 'passive',
    designatorPrefix: 'C',
    footprintName: '0402',
    pinCount: 2,
    defaultProperties: { value: '100nF', voltage: '16V' },
    bodyWidth: 40,
    bodyHeight: 20,
    pads: [
      { name: '1', x: -20, y: 0, width: 16, height: 20, shape: 'rect' },
      { name: '2', x: 20, y: 0, width: 16, height: 20, shape: 'rect' },
    ],
  },
  {
    name: 'Capacitor 0603',
    category: 'passive',
    designatorPrefix: 'C',
    footprintName: '0603',
    pinCount: 2,
    defaultProperties: { value: '100nF', voltage: '16V' },
    bodyWidth: 60,
    bodyHeight: 30,
    pads: [
      { name: '1', x: -30, y: 0, width: 24, height: 28, shape: 'rect' },
      { name: '2', x: 30, y: 0, width: 24, height: 28, shape: 'rect' },
    ],
  },
  {
    name: 'Capacitor 0805',
    category: 'passive',
    designatorPrefix: 'C',
    footprintName: '0805',
    pinCount: 2,
    defaultProperties: { value: '100nF', voltage: '25V' },
    bodyWidth: 80,
    bodyHeight: 50,
    pads: [
      { name: '1', x: -40, y: 0, width: 30, height: 45, shape: 'rect' },
      { name: '2', x: 40, y: 0, width: 30, height: 45, shape: 'rect' },
    ],
  },
  // LEDs
  {
    name: 'LED 0805',
    category: 'discrete',
    designatorPrefix: 'D',
    footprintName: '0805',
    pinCount: 2,
    defaultProperties: { color: 'Red', forwardVoltage: '2.0V' },
    bodyWidth: 80,
    bodyHeight: 50,
    pads: [
      { name: 'A', x: -40, y: 0, width: 30, height: 45, shape: 'rect' },
      { name: 'K', x: 40, y: 0, width: 30, height: 45, shape: 'rect' },
    ],
  },
  {
    name: 'LED 5mm',
    category: 'discrete',
    designatorPrefix: 'D',
    footprintName: 'LED-5MM',
    pinCount: 2,
    defaultProperties: { color: 'Red', forwardVoltage: '2.0V' },
    bodyWidth: 200,
    bodyHeight: 200,
    pads: [
      { name: 'A', x: -50, y: 0, width: 40, height: 40, shape: 'circle' },
      { name: 'K', x: 50, y: 0, width: 40, height: 40, shape: 'circle' },
    ],
  },
  // IC DIP
  {
    name: 'IC DIP-8',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'DIP-8',
    pinCount: 8,
    defaultProperties: { package: 'DIP-8' },
    bodyWidth: 300,
    bodyHeight: 400,
    pads: [
      { name: '1', x: -150, y: -150, width: 50, height: 25, shape: 'oval' },
      { name: '2', x: -150, y: -50, width: 50, height: 25, shape: 'oval' },
      { name: '3', x: -150, y: 50, width: 50, height: 25, shape: 'oval' },
      { name: '4', x: -150, y: 150, width: 50, height: 25, shape: 'oval' },
      { name: '5', x: 150, y: 150, width: 50, height: 25, shape: 'oval' },
      { name: '6', x: 150, y: 50, width: 50, height: 25, shape: 'oval' },
      { name: '7', x: 150, y: -50, width: 50, height: 25, shape: 'oval' },
      { name: '8', x: 150, y: -150, width: 50, height: 25, shape: 'oval' },
    ],
  },
  {
    name: 'IC DIP-14',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'DIP-14',
    pinCount: 14,
    defaultProperties: { package: 'DIP-14' },
    bodyWidth: 300,
    bodyHeight: 700,
    pads: Array.from({ length: 7 }, (_, i) => ({
      name: String(i + 1),
      x: -150,
      y: -300 + i * 100,
      width: 50,
      height: 25,
      shape: 'oval' as const,
    })).concat(
      Array.from({ length: 7 }, (_, i) => ({
        name: String(14 - i),
        x: 150,
        y: -300 + i * 100,
        width: 50,
        height: 25,
        shape: 'oval' as const,
      })),
    ),
  },
  {
    name: 'IC DIP-28',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'DIP-28',
    pinCount: 28,
    defaultProperties: { package: 'DIP-28' },
    bodyWidth: 600,
    bodyHeight: 1400,
    pads: Array.from({ length: 14 }, (_, i) => ({
      name: String(i + 1),
      x: -300,
      y: -650 + i * 100,
      width: 50,
      height: 25,
      shape: 'oval' as const,
    })).concat(
      Array.from({ length: 14 }, (_, i) => ({
        name: String(28 - i),
        x: 300,
        y: -650 + i * 100,
        width: 50,
        height: 25,
        shape: 'oval' as const,
      })),
    ),
  },
  // IC QFP
  {
    name: 'IC QFP-32',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'QFP-32',
    pinCount: 32,
    defaultProperties: { package: 'QFP-32', pitch: '0.8mm' },
    bodyWidth: 350,
    bodyHeight: 350,
    pads: [
      // Bottom (pins 1-8)
      ...Array.from({ length: 8 }, (_, i) => ({
        name: String(i + 1),
        x: -140 + i * 40,
        y: 200,
        width: 20,
        height: 50,
        shape: 'rect' as const,
      })),
      // Right (pins 9-16)
      ...Array.from({ length: 8 }, (_, i) => ({
        name: String(i + 9),
        x: 200,
        y: 140 - i * 40,
        width: 50,
        height: 20,
        shape: 'rect' as const,
      })),
      // Top (pins 17-24)
      ...Array.from({ length: 8 }, (_, i) => ({
        name: String(i + 17),
        x: 140 - i * 40,
        y: -200,
        width: 20,
        height: 50,
        shape: 'rect' as const,
      })),
      // Left (pins 25-32)
      ...Array.from({ length: 8 }, (_, i) => ({
        name: String(i + 25),
        x: -200,
        y: -140 + i * 40,
        width: 50,
        height: 20,
        shape: 'rect' as const,
      })),
    ],
  },
  {
    name: 'IC QFP-44',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'QFP-44',
    pinCount: 44,
    defaultProperties: { package: 'QFP-44', pitch: '0.8mm' },
    bodyWidth: 450,
    bodyHeight: 450,
    pads: [
      ...Array.from({ length: 11 }, (_, i) => ({
        name: String(i + 1),
        x: -200 + i * 40,
        y: 260,
        width: 20,
        height: 50,
        shape: 'rect' as const,
      })),
      ...Array.from({ length: 11 }, (_, i) => ({
        name: String(i + 12),
        x: 260,
        y: 200 - i * 40,
        width: 50,
        height: 20,
        shape: 'rect' as const,
      })),
      ...Array.from({ length: 11 }, (_, i) => ({
        name: String(i + 23),
        x: 200 - i * 40,
        y: -260,
        width: 20,
        height: 50,
        shape: 'rect' as const,
      })),
      ...Array.from({ length: 11 }, (_, i) => ({
        name: String(i + 34),
        x: -260,
        y: -200 + i * 40,
        width: 50,
        height: 20,
        shape: 'rect' as const,
      })),
    ],
  },
  // IC SOIC
  {
    name: 'IC SOIC-8',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'SOIC-8',
    pinCount: 8,
    defaultProperties: { package: 'SOIC-8' },
    bodyWidth: 200,
    bodyHeight: 200,
    pads: [
      { name: '1', x: -100, y: -75, width: 50, height: 24, shape: 'rect' },
      { name: '2', x: -100, y: -25, width: 50, height: 24, shape: 'rect' },
      { name: '3', x: -100, y: 25, width: 50, height: 24, shape: 'rect' },
      { name: '4', x: -100, y: 75, width: 50, height: 24, shape: 'rect' },
      { name: '5', x: 100, y: 75, width: 50, height: 24, shape: 'rect' },
      { name: '6', x: 100, y: 25, width: 50, height: 24, shape: 'rect' },
      { name: '7', x: 100, y: -25, width: 50, height: 24, shape: 'rect' },
      { name: '8', x: 100, y: -75, width: 50, height: 24, shape: 'rect' },
    ],
  },
  {
    name: 'IC SOIC-16',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'SOIC-16',
    pinCount: 16,
    defaultProperties: { package: 'SOIC-16' },
    bodyWidth: 200,
    bodyHeight: 400,
    pads: Array.from({ length: 8 }, (_, i) => ({
      name: String(i + 1),
      x: -100,
      y: -175 + i * 50,
      width: 50,
      height: 24,
      shape: 'rect' as const,
    })).concat(
      Array.from({ length: 8 }, (_, i) => ({
        name: String(16 - i),
        x: 100,
        y: -175 + i * 50,
        width: 50,
        height: 24,
        shape: 'rect' as const,
      })),
    ),
  },
  // Headers / Connectors
  {
    name: 'Header 1x4',
    category: 'connector',
    designatorPrefix: 'J',
    footprintName: 'HDR-1x4',
    pinCount: 4,
    defaultProperties: { pitch: '100mil' },
    bodyWidth: 100,
    bodyHeight: 400,
    pads: Array.from({ length: 4 }, (_, i) => ({
      name: String(i + 1),
      x: 0,
      y: -150 + i * 100,
      width: 40,
      height: 40,
      shape: 'circle' as const,
    })),
  },
  {
    name: 'Header 1x6',
    category: 'connector',
    designatorPrefix: 'J',
    footprintName: 'HDR-1x6',
    pinCount: 6,
    defaultProperties: { pitch: '100mil' },
    bodyWidth: 100,
    bodyHeight: 600,
    pads: Array.from({ length: 6 }, (_, i) => ({
      name: String(i + 1),
      x: 0,
      y: -250 + i * 100,
      width: 40,
      height: 40,
      shape: 'circle' as const,
    })),
  },
  {
    name: 'Header 2x5',
    category: 'connector',
    designatorPrefix: 'J',
    footprintName: 'HDR-2x5',
    pinCount: 10,
    defaultProperties: { pitch: '100mil' },
    bodyWidth: 200,
    bodyHeight: 500,
    pads: Array.from({ length: 5 }, (_, i) => ({
      name: String(2 * i + 1),
      x: -50,
      y: -200 + i * 100,
      width: 40,
      height: 40,
      shape: 'circle' as const,
    })).concat(
      Array.from({ length: 5 }, (_, i) => ({
        name: String(2 * i + 2),
        x: 50,
        y: -200 + i * 100,
        width: 40,
        height: 40,
        shape: 'circle' as const,
      })),
    ),
  },
  {
    name: 'Header 2x10',
    category: 'connector',
    designatorPrefix: 'J',
    footprintName: 'HDR-2x10',
    pinCount: 20,
    defaultProperties: { pitch: '100mil' },
    bodyWidth: 200,
    bodyHeight: 1000,
    pads: Array.from({ length: 10 }, (_, i) => ({
      name: String(2 * i + 1),
      x: -50,
      y: -450 + i * 100,
      width: 40,
      height: 40,
      shape: 'circle' as const,
    })).concat(
      Array.from({ length: 10 }, (_, i) => ({
        name: String(2 * i + 2),
        x: 50,
        y: -450 + i * 100,
        width: 40,
        height: 40,
        shape: 'circle' as const,
      })),
    ),
  },
  // USB-C
  {
    name: 'USB-C Connector',
    category: 'connector',
    designatorPrefix: 'J',
    footprintName: 'USB-C',
    pinCount: 16,
    defaultProperties: { type: 'USB Type-C Receptacle' },
    bodyWidth: 350,
    bodyHeight: 500,
    pads: [
      // Left column
      { name: 'A1', x: -130, y: -150, width: 30, height: 50, shape: 'rect' },
      { name: 'A4', x: -130, y: -50, width: 30, height: 50, shape: 'rect' },
      { name: 'A5', x: -130, y: 50, width: 30, height: 50, shape: 'rect' },
      { name: 'A8', x: -130, y: 150, width: 30, height: 50, shape: 'rect' },
      // Center
      { name: 'A6', x: -40, y: 0, width: 30, height: 50, shape: 'rect' },
      { name: 'A7', x: 40, y: 0, width: 30, height: 50, shape: 'rect' },
      // Right column
      { name: 'B1', x: 130, y: -150, width: 30, height: 50, shape: 'rect' },
      { name: 'B4', x: 130, y: -50, width: 30, height: 50, shape: 'rect' },
      { name: 'B5', x: 130, y: 50, width: 30, height: 50, shape: 'rect' },
      { name: 'B8', x: 130, y: 150, width: 30, height: 50, shape: 'rect' },
      // Shield
      { name: 'S1', x: -175, y: -200, width: 50, height: 70, shape: 'oval' },
      { name: 'S2', x: 175, y: -200, width: 50, height: 70, shape: 'oval' },
      { name: 'S3', x: -175, y: 200, width: 50, height: 70, shape: 'oval' },
      { name: 'S4', x: 175, y: 200, width: 50, height: 70, shape: 'oval' },
      // GND tabs
      { name: 'GND1', x: -100, y: 250, width: 60, height: 40, shape: 'rect' },
      { name: 'GND2', x: 100, y: 250, width: 60, height: 40, shape: 'rect' },
    ],
  },
  // Crystal
  {
    name: 'Crystal HC-49',
    category: 'discrete',
    designatorPrefix: 'Y',
    footprintName: 'HC-49',
    pinCount: 2,
    defaultProperties: { frequency: '16MHz', loadCapacitance: '18pF' },
    bodyWidth: 200,
    bodyHeight: 480,
    pads: [
      { name: '1', x: 0, y: -195, width: 50, height: 50, shape: 'circle' },
      { name: '2', x: 0, y: 195, width: 50, height: 50, shape: 'circle' },
    ],
  },
  // Voltage Regulator SOT-23
  {
    name: 'Voltage Regulator SOT-23',
    category: 'ic',
    designatorPrefix: 'U',
    footprintName: 'SOT-23',
    pinCount: 3,
    defaultProperties: { voltage: '3.3V', package: 'SOT-23' },
    bodyWidth: 120,
    bodyHeight: 130,
    pads: [
      { name: '1', x: -50, y: 65, width: 30, height: 40, shape: 'rect' },
      { name: '2', x: 50, y: 65, width: 30, height: 40, shape: 'rect' },
      { name: '3', x: 0, y: -65, width: 30, height: 40, shape: 'rect' },
    ],
  },
  // Diode SOD-323
  {
    name: 'Diode SOD-323',
    category: 'discrete',
    designatorPrefix: 'D',
    footprintName: 'SOD-323',
    pinCount: 2,
    defaultProperties: { type: 'Schottky', reverseVoltage: '30V' },
    bodyWidth: 70,
    bodyHeight: 35,
    pads: [
      { name: 'A', x: -40, y: 0, width: 24, height: 30, shape: 'rect' },
      { name: 'K', x: 40, y: 0, width: 24, height: 30, shape: 'rect' },
    ],
  },
];

export type ComponentCategory = LibraryComponent['category'];

export const categoryLabels: Record<ComponentCategory, string> = {
  passive: 'Passive',
  ic: 'IC',
  connector: 'Connector',
  discrete: 'Discrete',
  custom: 'Custom',
};
