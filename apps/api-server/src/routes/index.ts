import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import { projectRoutes } from './projects';
import { boardRoutes } from './boards';
import { moduleRoutes } from './modules';
import { componentRoutes } from './components';
import { pathRoutes } from './paths';
import { netRoutes } from './nets';
import { validationRoutes } from './validation';
import { exportRoutes } from './export';
import { designRuleRoutes } from './design-rules';
import { screenshotRoutes } from './screenshot';

export async function registerRoutes(app: FastifyInstance, store: Store) {
  await projectRoutes(app, store);
  await boardRoutes(app, store);
  await moduleRoutes(app, store);
  await componentRoutes(app, store);
  await pathRoutes(app, store);
  await netRoutes(app, store);
  await validationRoutes(app, store);
  await exportRoutes(app, store);
  await designRuleRoutes(app, store);
  await screenshotRoutes(app, store);
}
