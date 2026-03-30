import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import { serializeProject } from '@pcb/project-serialization';

export async function exportRoutes(app: FastifyInstance, store: Store) {
  // GET /api/projects/:id/export
  app.get<{ Params: { id: string } }>('/api/projects/:id/export', async (req, reply) => {
    const project = store.projects.getById(req.params.id);
    if (!project) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
    }

    const boards = store.boards.getAll((b) => b.projectId === project.id);
    const boardIds = new Set(boards.map((b) => b.id as string));

    const components = store.components.getAll((c) => boardIds.has(c.boardId));
    const nets = store.nets.getAll((n) => boardIds.has(n.boardId));
    const paths = store.paths.getAll((p) => boardIds.has(p.boardId));
    const modules = store.modules.getAll();
    const debugLinks = store.debugLinks.getAll();

    const projectFile = serializeProject({
      project,
      boards,
      components,
      modules,
      moduleInstances: [],
      nets,
      paths,
      debugLinks,
      designRules: [],
      libraryAssets: [],
    });

    const filename = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pcb`;

    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(JSON.stringify(projectFile, null, 2));
  });
}
