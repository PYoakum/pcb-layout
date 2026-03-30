import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createStore } from './store';
import { registerRoutes } from './routes/index';
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

  // Register all routes
  await registerRoutes(app, store);

  return app;
}
