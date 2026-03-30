import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { ValidationRequest, ValidationResult } from '@pcb/api-contracts';

export async function validationRoutes(app: FastifyInstance, store: Store) {
  // POST /api/validation/board/:id
  app.post<{ Params: { id: string }; Body: ValidationRequest }>('/api/validation/board/:id', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const results: ValidationResult[] = [];

    // Basic structural checks
    if (board.layers.length === 0) {
      results.push({
        rule: 'board.layers.required',
        severity: 'warning',
        message: 'Board has no layers defined',
        location: { entityType: 'board', entityId: board.id },
      });
    }

    if (board.workspace.width <= 0 || board.workspace.height <= 0) {
      results.push({
        rule: 'board.dimensions.positive',
        severity: 'error',
        message: 'Board dimensions must be positive',
        location: { entityType: 'board', entityId: board.id },
      });
    }

    // Check components on this board
    const components = store.components.getAll((c) => c.boardId === board.id);
    for (const comp of components) {
      const pos = comp.transform.position;
      if (pos.x < 0 || pos.y < 0 || pos.x > board.workspace.width || pos.y > board.workspace.height) {
        results.push({
          rule: 'component.bounds',
          severity: 'warning',
          message: `Component ${comp.designator} is outside board boundaries`,
          location: { entityType: 'component', entityId: comp.id, details: comp.designator },
        });
      }
    }

    // Check nets have connections
    const nets = store.nets.getAll((n) => n.boardId === board.id);
    for (const net of nets) {
      if (net.pins.length === 0 && net.pads.length === 0) {
        results.push({
          rule: 'net.connections.required',
          severity: 'warning',
          message: `Net "${net.name}" has no connected pins or pads`,
          location: { entityType: 'net', entityId: net.id },
        });
      }
    }

    return reply.send({
      data: {
        valid: results.every((r) => r.severity !== 'error'),
        results,
        checkedAt: new Date().toISOString(),
      },
    });
  });

  // POST /api/validation/module/:id
  app.post<{ Params: { id: string }; Body: ValidationRequest }>('/api/validation/module/:id', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    const results: ValidationResult[] = [];

    if (mod.components.length === 0) {
      results.push({
        rule: 'module.components.required',
        severity: 'warning',
        message: 'Module has no components',
        location: { entityType: 'module', entityId: mod.id },
      });
    }

    if (mod.exposedPins.length === 0) {
      results.push({
        rule: 'module.exposedPins.required',
        severity: 'info',
        message: 'Module has no exposed pins',
        location: { entityType: 'module', entityId: mod.id },
      });
    }

    const bb = mod.boundingBox;
    if (bb.max.x - bb.min.x <= 0 || bb.max.y - bb.min.y <= 0) {
      results.push({
        rule: 'module.boundingBox.valid',
        severity: 'warning',
        message: 'Module bounding box has zero or negative dimensions',
        location: { entityType: 'module', entityId: mod.id },
      });
    }

    return reply.send({
      data: {
        valid: results.every((r) => r.severity !== 'error'),
        results,
        checkedAt: new Date().toISOString(),
      },
    });
  });
}
