import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { CreateProjectRequest, UpdateProjectRequest } from '@pcb/api-contracts';
import { createId, type ProjectId, type ProjectSettings } from '@pcb/domain';

const DEFAULT_SETTINGS: ProjectSettings = {
  defaultGridSpacing: 50,
  defaultLayerCount: 2,
  defaultBoardWidth: 3000,
  defaultBoardHeight: 2000,
  units: 'mils',
};

export async function projectRoutes(app: FastifyInstance, store: Store) {
  // GET /api/projects
  app.get('/api/projects', async (_req, reply) => {
    const projects = store.projects.getAll();
    return reply.send({ data: projects, total: projects.length });
  });

  // POST /api/projects
  app.post<{ Body: CreateProjectRequest }>('/api/projects', async (req, reply) => {
    const { name, description, settings } = req.body;
    const now = new Date().toISOString();
    const project = store.projects.create({
      id: createId<ProjectId>('proj'),
      name,
      description,
      boards: [],
      modules: [],
      libraryAssets: [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      createdAt: now,
      updatedAt: now,
    });
    return reply.status(201).send({ data: project });
  });

  // GET /api/projects/:id
  app.get<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const project = store.projects.getById(req.params.id);
    if (!project) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
    return reply.send({ data: project });
  });

  // PUT /api/projects/:id
  app.put<{ Params: { id: string }; Body: UpdateProjectRequest }>('/api/projects/:id', async (req, reply) => {
    const existing = store.projects.getById(req.params.id);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });

    const updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() };
    if (req.body.settings) {
      updates.settings = { ...existing.settings, ...req.body.settings };
    }
    const updated = store.projects.update(req.params.id, updates as Partial<typeof existing>);
    return reply.send({ data: updated });
  });

  // DELETE /api/projects/:id
  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const deleted = store.projects.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
    return reply.status(204).send();
  });
}
