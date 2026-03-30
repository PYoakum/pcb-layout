import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateTracePathRequest, UpdateTracePathRequest, CreateDebugLinkRequest } from '@pcb/api-contracts';
import { createId, type TracePathId, type TraceSegmentId, type ViaId, type DebugLinkId } from '@pcb/domain';

export async function pathRoutes(app: FastifyInstance, store: Store) {
  // GET /api/paths?boardId=X&netId=Y
  app.get<{ Querystring: { boardId?: string; netId?: string } }>('/api/paths', async (req, reply) => {
    const { boardId, netId } = req.query;
    const paths = store.paths.getAll((p) => {
      if (boardId && p.boardId !== boardId) return false;
      if (netId && p.netId !== netId) return false;
      return true;
    });
    return reply.send({ data: paths, total: paths.length });
  });

  // POST /api/paths
  app.post<{ Body: CreateTracePathRequest }>('/api/paths', async (req, reply) => {
    const pathId = createId<TracePathId>('trc');
    const segments = (req.body.segments ?? []).map((s) => ({
      id: createId<TraceSegmentId>('seg'),
      pathId,
      ...s,
    }));
    const vias = (req.body.vias ?? []).map((v) => ({
      id: createId<ViaId>('via'),
      pathId,
      ...v,
    }));

    const path = store.paths.create({
      id: pathId,
      netId: req.body.netId,
      segments,
      vias,
      debugLinks: [],
      boardId: req.body.boardId,
    });
    return reply.status(201).send({ data: path });
  });

  // GET /api/paths/:id
  app.get<{ Params: { id: string } }>('/api/paths/:id', async (req, reply) => {
    const path = store.paths.getById(req.params.id);
    if (!path) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'TracePath not found' });
    return reply.send({ data: path });
  });

  // PUT /api/paths/:id
  app.put<{ Params: { id: string }; Body: UpdateTracePathRequest }>('/api/paths/:id', async (req, reply) => {
    const existing = store.paths.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'TracePath not found' });

    const updates: Record<string, unknown> = {};
    if (req.body.segments) {
      updates.segments = req.body.segments.map((s) => ({
        id: createId<TraceSegmentId>('seg'),
        pathId: existing.id,
        ...s,
      }));
    }
    if (req.body.vias) {
      updates.vias = req.body.vias.map((v) => ({
        id: createId<ViaId>('via'),
        pathId: existing.id,
        ...v,
      }));
    }
    const updated = store.paths.update(req.params.id, updates as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/paths/:id
  app.delete<{ Params: { id: string } }>('/api/paths/:id', async (req, reply) => {
    const deleted = store.paths.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'TracePath not found' });
    return reply.status(204).send();
  });

  // GET /api/paths/:id/debug
  app.get<{ Params: { id: string } }>('/api/paths/:id/debug', async (req, reply) => {
    const path = store.paths.getById(req.params.id);
    if (!path) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'TracePath not found' });

    const links = path.debugLinks
      .map((linkId) => store.debugLinks.getById(linkId as string))
      .filter(Boolean);
    return reply.send({ data: links });
  });

  // POST /api/paths/:id/debug
  app.post<{ Params: { id: string }; Body: CreateDebugLinkRequest }>('/api/paths/:id/debug', async (req, reply) => {
    const path = store.paths.getById(req.params.id);
    if (!path) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'TracePath not found' });

    const link = store.debugLinks.create({
      id: createId<DebugLinkId>('dbg'),
      pathId: path.id,
      label: req.body.label,
      description: req.body.description,
      severity: req.body.severity,
      metadata: req.body.metadata ?? {},
      createdAt: new Date().toISOString(),
    });

    // Add debug link reference to path
    store.paths.update(req.params.id, {
      debugLinks: [...path.debugLinks, link.id],
    } as Partial<typeof path>);

    return reply.status(201).send({ data: link });
  });
}
