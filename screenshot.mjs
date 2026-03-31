import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';

const browser = await puppeteer.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const page = await browser.newPage();
await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });

console.log('Loading web client...');
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForSelector('canvas', { timeout: 8000 });
await new Promise(r => setTimeout(r, 1000));

// Load the DDR5 board file and inject into the store
console.log('Injecting DDR5 board data...');
const pcbData = readFileSync('/Users/devmachine/dev-projects/pcb-layout/examples/DDR5-96GB-RDIMM.json', 'utf-8');

await page.evaluate((pcbJson) => {
  const file = JSON.parse(pcbJson);
  const sp = file.project;
  const board = sp.boards[0];
  
  const store = window.__ZUSTAND_STORE__;
  if (!store) { console.error('Store not found!'); return; }
  
  // Set project
  store.setState({
    currentProject: {
      id: sp.id, name: sp.name, description: sp.description,
      boards: [board.id], modules: [], libraryAssets: [],
      settings: sp.settings, createdAt: file.createdAt, updatedAt: file.updatedAt,
    },
    currentBoard: {
      id: board.id, projectId: sp.id, name: board.name,
      workspace: board.workspace, layers: board.layers,
      profiles: board.profiles,
      createdAt: board.createdAt, updatedAt: board.updatedAt,
    },
    layers: board.layers,
    workspaceConfig: board.workspace,
    components: board.components.map(c => ({
      ...c,
      layerId: c.layerId,
    })),
    traces: board.paths || [],
    viewport: { x: 50, y: 50, zoom: 0.45 },
    gridVisible: true,
  });
}, pcbData);

console.log('Waiting for render...');
await new Promise(r => setTimeout(r, 3000));

await page.screenshot({ path: '/tmp/board_ddr5.png', fullPage: false });
console.log('Screenshot saved to /tmp/board_ddr5.png');

await browser.close();
