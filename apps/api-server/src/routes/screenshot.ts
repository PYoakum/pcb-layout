import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import puppeteer from 'puppeteer';

const WEB_CLIENT_URL = process.env.WEB_CLIENT_URL || 'http://localhost:5173';

export async function screenshotRoutes(app: FastifyInstance, store: Store) {
  /**
   * GET /api/boards/:id/screenshot
   *
   * Renders the board in a headless browser and returns a PNG image.
   * Query params:
   *   width  - viewport width in pixels (default: 1920)
   *   height - viewport height in pixels (default: 1080)
   *   mode   - '2d' or '3d' (default: '2d')
   *   zoom   - zoom level (default: auto-fit)
   */
  app.get<{
    Params: { id: string };
    Querystring: { width?: string; height?: string; mode?: string; zoom?: string };
  }>('/api/boards/:id/screenshot', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });
    }

    const width = parseInt(req.query.width ?? '1920', 10);
    const height = parseInt(req.query.height ?? '1080', 10);
    const mode = req.query.mode ?? '2d';

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });

      // Load the web client
      await page.goto(WEB_CLIENT_URL, { waitUntil: 'networkidle0', timeout: 15000 });

      // Inject the board data into the app's store via the browser console
      const boardJson = JSON.stringify(board);
      const componentsJson = JSON.stringify(
        store.components.getAll((c) => c.boardId === board.id),
      );
      const tracesJson = JSON.stringify(
        store.paths.getAll((p) => p.boardId === board.id),
      );

      await page.evaluate(
        (boardStr, compsStr, tracesStr, renderMode) => {
          const boardData = JSON.parse(boardStr);
          const components = JSON.parse(compsStr);
          const traces = JSON.parse(tracesStr);

          // Access Zustand store
          const store = (window as any).__ZUSTAND_STORE__;
          if (store) {
            store.setState({
              currentBoard: boardData,
              layers: boardData.layers,
              workspaceConfig: boardData.workspace,
              components,
              traces,
              mode: renderMode,
            });
          }
        },
        boardJson,
        componentsJson,
        tracesJson,
        mode,
      );

      // Wait for the canvas to render
      await page.waitForSelector('canvas', { timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Take screenshot of the canvas element
      const canvas = await page.$('canvas');
      let imageBuffer: Buffer;

      if (canvas) {
        imageBuffer = (await canvas.screenshot({ type: 'png' })) as Buffer;
      } else {
        imageBuffer = (await page.screenshot({ type: 'png', fullPage: false })) as Buffer;
      }

      const filename = `${board.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${mode}.png`;

      return reply
        .header('Content-Type', 'image/png')
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .send(imageBuffer);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Screenshot Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  /**
   * GET /api/screenshots/canvas
   *
   * Client-side alternative: returns an HTML page that renders the board
   * and auto-captures to PNG. Useful when Puppeteer is not available.
   */
  app.get('/api/screenshots/canvas', async (_req, reply) => {
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head><title>PCB Screenshot</title></head>
      <body style="margin:0;background:#1a1a2e">
        <p style="color:white;padding:20px">
          To capture a screenshot, use: GET /api/boards/{boardId}/screenshot
        </p>
      </body>
      </html>
    `);
  });
}
