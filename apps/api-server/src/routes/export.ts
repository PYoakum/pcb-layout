import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import {
  serializeProject,
  exportKiCad,
  exportEagle,
  exportAltium,
  EXPORT_FORMATS,
  type ExportFormat,
} from '@pcb/project-serialization';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function exportRoutes(app: FastifyInstance, store: Store) {
  // GET /api/projects/:id/export?format=pcb|kicad_pcb|brd|PcbDoc
  app.get<{
    Params: { id: string };
    Querystring: { format?: string };
  }>('/api/projects/:id/export', async (req, reply) => {
    const project = store.projects.getById(req.params.id);
    if (!project) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
    }

    const format = (req.query.format ?? 'pcb') as ExportFormat;
    if (!EXPORT_FORMATS[format]) {
      const supported = Object.keys(EXPORT_FORMATS).join(', ');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Unsupported format "${req.query.format}". Supported: ${supported}`,
      });
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

    const { extension, contentType } = EXPORT_FORMATS[format];
    const filename = `${sanitizeFilename(project.name)}${extension}`;

    let body: string;
    switch (format) {
      case 'kicad_pcb':
        body = exportKiCad(projectFile);
        break;
      case 'brd':
        body = exportEagle(projectFile);
        break;
      case 'PcbDoc':
        body = exportAltium(projectFile);
        break;
      case 'pcb':
      default:
        body = JSON.stringify(projectFile, null, 2);
        break;
    }

    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body);
  });

  // GET /api/export/formats -- list supported export formats
  app.get('/api/export/formats', async (_req, reply) => {
    return reply.send({ data: EXPORT_FORMATS });
  });
}
