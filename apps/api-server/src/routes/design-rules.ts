import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import { createId, type DesignRuleId, type DesignRuleType } from '@pcb/domain';
import { ValidationEngine } from '@pcb/rules-engine';

const engine = new ValidationEngine();

export async function designRuleRoutes(app: FastifyInstance, store: Store) {
  // GET /api/boards/:boardId/rules
  app.get<{ Params: { boardId: string } }>('/api/boards/:boardId/rules', async (req, reply) => {
    const board = store.boards.getById(req.params.boardId);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const rules = store.designRules.getAll((r) => r.boardId === req.params.boardId);

    // If no saved rules, return defaults
    if (rules.length === 0) {
      const defaults = engine.getDefaultRules().map((r) => ({ ...r, boardId: req.params.boardId }));
      return reply.send({ data: defaults, total: defaults.length });
    }

    return reply.send({ data: rules, total: rules.length });
  });

  // POST /api/boards/:boardId/rules
  app.post<{
    Params: { boardId: string };
    Body: { type: DesignRuleType; name: string; value: number; unit: string; netClass?: string; enabled?: boolean };
  }>('/api/boards/:boardId/rules', async (req, reply) => {
    const board = store.boards.getById(req.params.boardId);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const { type, name, value, unit, netClass, enabled } = req.body;
    const rule = store.designRules.create({
      id: createId<DesignRuleId>('rule'),
      type,
      name,
      value,
      unit,
      ...(netClass !== undefined && { netClass }),
      enabled: enabled ?? true,
      boardId: req.params.boardId,
    });

    return reply.status(201).send({ data: rule });
  });

  // PUT /api/boards/:boardId/rules/:id
  app.put<{
    Params: { boardId: string; id: string };
    Body: { type?: DesignRuleType; name?: string; value?: number; unit?: string; netClass?: string; enabled?: boolean };
  }>('/api/boards/:boardId/rules/:id', async (req, reply) => {
    const existing = store.designRules.getById(req.params.id);
    if (!existing || existing.boardId !== req.params.boardId) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Design rule not found' });
    }

    const updated = store.designRules.update(req.params.id, req.body as any);
    return reply.send({ data: updated });
  });

  // DELETE /api/boards/:boardId/rules/:id
  app.delete<{ Params: { boardId: string; id: string } }>('/api/boards/:boardId/rules/:id', async (req, reply) => {
    const existing = store.designRules.getById(req.params.id);
    if (!existing || existing.boardId !== req.params.boardId) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Design rule not found' });
    }

    store.designRules.delete(req.params.id);
    return reply.status(204).send();
  });

  // POST /api/boards/:boardId/rules/defaults -- seed defaults into the store
  app.post<{ Params: { boardId: string } }>('/api/boards/:boardId/rules/defaults', async (req, reply) => {
    const board = store.boards.getById(req.params.boardId);
    if (!board) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Board not found' });

    const defaults = engine.getDefaultRules();
    const created = [];
    for (const rule of defaults) {
      // Skip if a rule of the same type already exists
      const exists = store.designRules.getAll(
        (r) => r.boardId === req.params.boardId && r.type === rule.type,
      );
      if (exists.length > 0) continue;

      created.push(store.designRules.create({
        ...rule,
        id: createId<DesignRuleId>('rule'),
        boardId: req.params.boardId,
      }));
    }

    return reply.status(201).send({ data: created, total: created.length });
  });
}
