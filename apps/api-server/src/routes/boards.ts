import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateBoardRequest, UpdateBoardRequest, UpdateLayersRequest } from '@pcb/api-contracts';
import { createId, type BoardId, type LayerId, type WorkspaceConfig } from '@pcb/domain';

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  width: 3000,
  height: 2000,
  layerCount: 2,
  grid: {
    spacingX: 50,
    spacingY: 50,
    subdivisions: 2,
    visible: true,
    snapEnabled: true,
  },
};

export async function boardRoutes(app: FastifyInstance, store: Store) {
  // GET /api/boards
  app.get<{ Querystring: { projectId?: string } }>('/api/boards', async (req, reply) => {
    const { projectId } = req.query;
    const boards = store.boards.getAll(
      projectId ? (b) => b.projectId === projectId : undefined,
    );
    return reply.send({ data: boards, total: boards.length });
  });

  // POST /api/boards
  app.post<{ Body: CreateBoardRequest }>('/api/boards', async (req, reply) => {
    const { projectId, name, workspace } = req.body;
    const now = new Date().toISOString();
    const board = store.boards.create({
      id: createId<BoardId>('brd'),
      projectId,
      name,
      workspace: { ...DEFAULT_WORKSPACE, ...workspace } as WorkspaceConfig,
      layers: [],
      createdAt: now,
      updatedAt: now,
    });
    return reply.status(201).send({ data: board });
  });

  // GET /api/boards/:id
  app.get<{ Params: { id: string } }>('/api/boards/:id', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });
    return reply.send({ data: board });
  });

  // PUT /api/boards/:id
  app.put<{ Params: { id: string }; Body: UpdateBoardRequest }>('/api/boards/:id', async (req, reply) => {
    const existing = store.boards.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() };
    if (req.body.workspace) {
      updates.workspace = { ...existing.workspace, ...req.body.workspace };
    }
    const updated = store.boards.update(req.params.id, updates as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/boards/:id
  app.delete<{ Params: { id: string } }>('/api/boards/:id', async (req, reply) => {
    const deleted = store.boards.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });
    return reply.status(204).send();
  });

  // GET /api/boards/:id/layers
  app.get<{ Params: { id: string } }>('/api/boards/:id/layers', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });
    return reply.send({ data: board.layers });
  });

  // PUT /api/boards/:id/layers
  app.put<{ Params: { id: string }; Body: UpdateLayersRequest }>('/api/boards/:id/layers', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const layers = req.body.layers.map((layer) => ({
      ...layer,
      id: createId<LayerId>('lyr'),
      boardId: board.id,
    }));

    const updated = store.boards.update(req.params.id, {
      layers,
      updatedAt: new Date().toISOString(),
    } as Partial<typeof board>);
    return reply.send({ data: updated!.layers });
  });
}
