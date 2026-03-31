import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';

const browser = await puppeteer.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const page = await browser.newPage();
await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForSelector('canvas', { timeout: 8000 });
await new Promise(r => setTimeout(r, 1000));

const pcbData = readFileSync('/Users/devmachine/dev-projects/pcb-layout/examples/DDR5-96GB-RDIMM.json', 'utf-8');

await page.evaluate((pcbJson) => {
  const file = JSON.parse(pcbJson);
  const sp = file.project;
  const board = sp.boards[0];
  const store = window.__ZUSTAND_STORE__;
  if (!store) return;
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
    components: board.components,
    traces: board.paths || [],
    // Zoom into U1 area to show pad connections
    viewport: { x: -20, y: 10, zoom: 1.2 },
    gridVisible: true,
  });
}, pcbData);

await new Promise(r => setTimeout(r, 3000));

await page.screenshot({ path: '/tmp/board_zoomed.png', fullPage: false });
console.log('Zoomed screenshot saved');

// Also take the full board view for the README
await page.evaluate(() => {
  const store = window.__ZUSTAND_STORE__;
  store.setState({ viewport: { x: 50, y: 50, zoom: 0.45 } });
});
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: '/tmp/board_full.png', fullPage: false });
console.log('Full screenshot saved');

await browser.close();
