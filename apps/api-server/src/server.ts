import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createStore } from './store';
import { registerRoutes } from './routes/index';
import { sessionRoutes } from './routes/sessions';
import { SessionManager } from './session';
import type { ServerConfig } from './config';

export async function buildServer(config: ServerConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // WebSocket support
  await app.register(websocket);

  // Global error handler
  app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    app.log.error(error);
    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: error.message,
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // In-memory store
  const store = createStore();

  // Session manager (shared between REST and WS)
  const sessionMgr = new SessionManager();

  // Register all routes
  await registerRoutes(app, store);

  // Register session routes (REST + WebSocket)
  await sessionRoutes(app, store, sessionMgr);

  return app;
}
