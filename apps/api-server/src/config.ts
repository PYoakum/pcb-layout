export interface ServerConfig {
  port: number;
  host: string;
  dbUrl: string;
  logLevel: string;
  corsOrigin: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0',
    dbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/pcb_layout',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  };
}
