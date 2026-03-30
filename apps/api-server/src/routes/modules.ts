import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateModuleRequest, UpdateModuleRequest } from '@pcb/api-contracts';
import { createId, type ModuleId, type ModuleInstanceId } from '@pcb/domain';

export async function moduleRoutes(app: FastifyInstance, store: Store) {
  // GET /api/modules
  app.get('/api/modules', async (_req, reply) => {
    const modules = store.modules.getAll();
    return reply.send({ data: modules, total: modules.length });
  });

  // POST /api/modules
  app.post<{ Body: CreateModuleRequest }>('/api/modules', async (req, reply) => {
    const now = new Date().toISOString();
    const mod = store.modules.create({
      id: createId<ModuleId>('mod'),
      name: req.body.name,
      description: req.body.description,
      version: req.body.version,
      components: req.body.components ?? [],
      internalNets: req.body.internalNets ?? [],
      internalPaths: req.body.internalPaths ?? [],
      exposedPins: req.body.exposedPins ?? [],
      boundingBox: req.body.boundingBox ?? { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
      tags: [],
      category: 'uncategorized',
      createdAt: now,
      updatedAt: now,
    });
    return reply.status(201).send({ data: mod });
  });

  // GET /api/modules/:id
  app.get<{ Params: { id: string } }>('/api/modules/:id', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });
    return reply.send({ data: mod });
  });

  // GET /api/modules/:id/components - list components in module
  app.get<{ Params: { id: string } }>('/api/modules/:id/components', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    const components = mod.components.map((compId) => {
      const comp = store.components.getById(compId);
      return comp ?? { id: compId, status: 'not_found' };
    });
    return reply.send({ data: components, total: components.length });
  });

  // POST /api/modules/:id/validate - validate module
  app.post<{ Params: { id: string } }>('/api/modules/:id/validate', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    const results: Array<{ rule: string; severity: string; message: string }> = [];

    // Check: at least one component
    if (mod.components.length === 0) {
      results.push({ rule: 'module-has-components', severity: 'error', message: 'Module must have at least one component' });
    }

    // Check: at least one exposed pin
    if (mod.exposedPins.length === 0) {
      results.push({ rule: 'module-has-exposed-pins', severity: 'warning', message: 'Module should have at least one exposed pin' });
    }

    // Check: bounding box is valid
    const w = mod.boundingBox.max.x - mod.boundingBox.min.x;
    const h = mod.boundingBox.max.y - mod.boundingBox.min.y;
    if (w <= 0 || h <= 0) {
      results.push({ rule: 'module-bounding-box', severity: 'error', message: `Module bounding box has invalid dimensions (${w} x ${h})` });
    }

    // Check: version follows semver
    if (!/^\d+\.\d+\.\d+/.test(mod.version)) {
      results.push({ rule: 'module-version', severity: 'error', message: `Version "${mod.version}" does not follow semver` });
    }

    // Check: exposed pins reference valid pin IDs
    for (const pin of mod.exposedPins) {
      if (!pin.pinId) {
        results.push({ rule: 'exposed-pin-reference', severity: 'error', message: `Exposed pin "${pin.externalName}" has no internal pin reference` });
      }
    }

    return reply.send({
      data: {
        valid: results.filter((r) => r.severity === 'error').length === 0,
        results,
        checkedAt: new Date().toISOString(),
      },
    });
  });

  // POST /api/modules/:id/instantiate - create an instance for a board
  app.post<{ Params: { id: string }; Body: { position?: { x: number; y: number } } }>(
    '/api/modules/:id/instantiate',
    async (req, reply) => {
      const mod = store.modules.getById(req.params.id);
      if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

      const position = req.body.position ?? { x: 0, y: 0 };
      const instance = {
        id: createId<ModuleInstanceId>('mi'),
        moduleId: mod.id,
        moduleVersion: mod.version,
        transform: { position, rotation: 0, mirrored: false },
        overrides: {},
      };
      return reply.status(201).send({ data: instance });
    },
  );

  // GET /api/modules/:id/versions - version history (placeholder)
  app.get<{ Params: { id: string } }>('/api/modules/:id/versions', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    // Placeholder: return only the current version
    return reply.send({
      data: [
        {
          version: mod.version,
          createdAt: mod.createdAt,
          updatedAt: mod.updatedAt,
          current: true,
        },
      ],
      total: 1,
    });
  });

  // PUT /api/modules/:id
  app.put<{ Params: { id: string }; Body: UpdateModuleRequest }>('/api/modules/:id', async (req, reply) => {
    const existing = store.modules.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    const updated = store.modules.update(req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    } as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/modules/:id
  app.delete<{ Params: { id: string } }>('/api/modules/:id', async (req, reply) => {
    const deleted = store.modules.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });
    return reply.status(204).send();
  });
}
