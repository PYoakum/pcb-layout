import { buildServer } from './server';
import { loadConfig } from './config';

async function main() {
  const config = loadConfig();
  const server = await buildServer(config);

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`[api-server] Listening on ${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
