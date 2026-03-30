import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateNetRequest, UpdateNetRequest } from '@pcb/api-contracts';
import { createId, type NetId } from '@pcb/domain';

export async function netRoutes(app: FastifyInstance, store: Store) {
  // GET /api/nets?boardId=X
  app.get<{ Querystring: { boardId?: string } }>('/api/nets', async (req, reply) => {
    const { boardId } = req.query;
    const nets = store.nets.getAll(
      boardId ? (n) => n.boardId === boardId : undefined,
    );
    return reply.send({ data: nets, total: nets.length });
  });

  // POST /api/nets
  app.post<{ Body: CreateNetRequest }>('/api/nets', async (req, reply) => {
    const net = store.nets.create({
      id: createId<NetId>('net'),
      name: req.body.name,
      pins: req.body.pins ?? [],
      pads: req.body.pads ?? [],
      paths: [],
      color: req.body.color,
      netClass: req.body.netClass,
      boardId: req.body.boardId,
    });
    return reply.status(201).send({ data: net });
  });

  // GET /api/nets/:id
  app.get<{ Params: { id: string } }>('/api/nets/:id', async (req, reply) => {
    const net = store.nets.getById(req.params.id);
    if (!net) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Net not found' });
    return reply.send({ data: net });
  });

  // PUT /api/nets/:id
  app.put<{ Params: { id: string }; Body: UpdateNetRequest }>('/api/nets/:id', async (req, reply) => {
    const existing = store.nets.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Net not found' });

    const updated = store.nets.update(req.params.id, req.body as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/nets/:id
  app.delete<{ Params: { id: string } }>('/api/nets/:id', async (req, reply) => {
    const deleted = store.nets.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Net not found' });
    return reply.status(204).send();
  });
}
