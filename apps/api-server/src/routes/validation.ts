import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { ValidationRequest, ValidationResult } from '@pcb/api-contracts';
import { ValidationEngine } from '@pcb/rules-engine';

// Shared engine instance -- all default rules are registered in its constructor
const engine = new ValidationEngine();

export async function validationRoutes(app: FastifyInstance, store: Store) {
  // POST /api/validation/board/:id
  app.post<{ Params: { id: string }; Body: ValidationRequest }>('/api/validation/board/:id', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const components = store.components.getAll((c) => c.boardId === board.id);
    const nets = store.nets.getAll((n) => n.boardId === board.id);
    const paths = store.paths.getAll((p) => p.boardId === board.id);

    // Use saved rules for this board if any exist, otherwise use defaults
    const savedRules = store.designRules.getAll((r) => r.boardId === board.id);
    const rules = savedRules.length > 0 ? savedRules : engine.getDefaultRules();

    // Run the full rules engine
    const engineResult = engine.validateBoard(board as any, components, nets, paths, rules);

    // Map engine violations to API response format
    const results: ValidationResult[] = [
      ...engineResult.violations.map((v) => ({
        rule: v.message.split(':')[0]?.trim() ?? 'unknown',
        severity: v.severity as 'error' | 'warning' | 'info',
        message: v.message,
        location: v.location
          ? { entityType: 'entity', entityId: v.entityIds[0] ?? '', details: v.entityIds.join(', ') }
          : undefined,
      })),
      ...engineResult.warnings.map((v) => ({
        rule: v.message.split(':')[0]?.trim() ?? 'unknown',
        severity: 'warning' as const,
        message: v.message,
        location: v.location
          ? { entityType: 'entity', entityId: v.entityIds[0] ?? '', details: v.entityIds.join(', ') }
          : undefined,
      })),
    ];

    return reply.send({
      data: {
        valid: engineResult.valid,
        results,
        checkedRules: engineResult.checkedRules,
        checkedAt: engineResult.timestamp,
      },
    });
  });

  // POST /api/validation/board/:id/vias
  app.post<{ Params: { id: string } }>('/api/validation/board/:id/vias', async (req, reply) => {
    const board = store.boards.getById(req.params.id);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const paths = store.paths.getAll((p) => p.boardId === board.id);
    const results: ValidationResult[] = [];
    const EPSILON = 0.5;

    for (const path of paths) {
      for (const via of path.vias) {
        const touching = path.segments.filter((seg) => {
          const dStart = Math.sqrt((seg.start.x - via.position.x) ** 2 + (seg.start.y - via.position.y) ** 2);
          const dEnd = Math.sqrt((seg.end.x - via.position.x) ** 2 + (seg.end.y - via.position.y) ** 2);
          return dStart < EPSILON || dEnd < EPSILON;
        });

        if (touching.length === 0) {
          results.push({
            rule: 'via.orphan',
            severity: 'error',
            message: `Orphan via ${via.id} at (${via.position.x}, ${via.position.y}) has no connecting trace segments`,
            location: { entityType: 'via', entityId: via.id },
          });
          continue;
        }

        const touchingLayers = new Set(touching.map((s) => s.layerId as string));
        if (!touchingLayers.has(via.fromLayerId as string)) {
          results.push({
            rule: 'via.layer.from',
            severity: 'error',
            message: `Via ${via.id} fromLayer ${via.fromLayerId} has no connecting segment on that layer`,
            location: { entityType: 'via', entityId: via.id },
          });
        }
        if (!touchingLayers.has(via.toLayerId as string)) {
          results.push({
            rule: 'via.layer.to',
            severity: 'error',
            message: `Via ${via.id} toLayer ${via.toLayerId} has no connecting segment on that layer`,
            location: { entityType: 'via', entityId: via.id },
          });
        }
      }
    }

    return reply.send({
      data: {
        valid: results.every((r) => r.severity !== 'error'),
        results,
        totalVias: paths.reduce((sum, p) => sum + p.vias.length, 0),
        checkedAt: new Date().toISOString(),
      },
    });
  });

  // POST /api/validation/module/:id
  app.post<{ Params: { id: string }; Body: ValidationRequest }>('/api/validation/module/:id', async (req, reply) => {
    const mod = store.modules.getById(req.params.id);
    if (!mod) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Module not found' });

    const components = store.components.getAll();
    const nets = store.nets.getAll();
    const paths = store.paths.getAll();
    const rules = engine.getDefaultRules();

    const engineResult = engine.validateModule(mod as any, components, nets, paths, rules);

    const results: ValidationResult[] = [
      ...engineResult.violations.map((v) => ({
        rule: v.message.split(':')[0]?.trim() ?? 'unknown',
        severity: v.severity as 'error' | 'warning' | 'info',
        message: v.message,
        location: v.location
          ? { entityType: 'entity', entityId: v.entityIds[0] ?? '' }
          : undefined,
      })),
      ...engineResult.warnings.map((v) => ({
        rule: v.message.split(':')[0]?.trim() ?? 'unknown',
        severity: 'warning' as const,
        message: v.message,
        location: v.location
          ? { entityType: 'entity', entityId: v.entityIds[0] ?? '' }
          : undefined,
      })),
    ];

    return reply.send({
      data: {
        valid: engineResult.valid,
        results,
        checkedAt: engineResult.timestamp,
      },
    });
  });
}
