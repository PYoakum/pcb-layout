import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateComponentRequest, UpdateComponentRequest } from '@pcb/api-contracts';
import { createId, type ComponentId } from '@pcb/domain';

export async function componentRoutes(app: FastifyInstance, store: Store) {
  // GET /api/components?boardId=X
  app.get<{ Querystring: { boardId?: string } }>('/api/components', async (req, reply) => {
    const { boardId } = req.query;
    const components = store.components.getAll(
      boardId ? (c) => c.boardId === boardId : undefined,
    );
    return reply.send({ data: components, total: components.length });
  });

  // POST /api/components
  app.post<{ Body: CreateComponentRequest }>('/api/components', async (req, reply) => {
    const { boardId, ...rest } = req.body;
    const component = store.components.create({
      id: createId<ComponentId>('cmp'),
      name: rest.name,
      designator: rest.designator,
      footprint: rest.footprint,
      transform: rest.transform,
      layerId: rest.layerId,
      properties: rest.properties ?? {},
      locked: rest.locked ?? false,
      boardId,
    });
    return reply.status(201).send({ data: component });
  });

  // GET /api/components/:id
  app.get<{ Params: { id: string } }>('/api/components/:id', async (req, reply) => {
    const component = store.components.getById(req.params.id);
    if (!component) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Component not found' });
    return reply.send({ data: component });
  });

  // PUT /api/components/:id
  app.put<{ Params: { id: string }; Body: UpdateComponentRequest }>('/api/components/:id', async (req, reply) => {
    const existing = store.components.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Component not found' });

    const updated = store.components.update(req.params.id, req.body as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/components/:id
  app.delete<{ Params: { id: string } }>('/api/components/:id', async (req, reply) => {
    const deleted = store.components.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Component not found' });
    return reply.status(204).send();
  });
}
