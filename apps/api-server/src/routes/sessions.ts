import type { FastifyInstance } from 'fastify';
import type { Store } from '../store';
import type { SessionManager, ClientMessage, BoardAction } from '../session';
import {
  createId,
  type ComponentId,
  type TracePathId,
  type TraceSegmentId,
  type ViaId,
  type NetId,
} from '@pcb/domain';

export async function sessionRoutes(
  app: FastifyInstance,
  store: Store,
  sessionMgr: SessionManager,
) {
  // ──��� REST Endpoints ─────────────────────────────────────────────────────

  /** Create a new shared session for a board. */
  app.post<{
    Body: { boardId: string; projectId: string };
  }>('/api/sessions', async (req, reply) => {
    const { boardId, projectId } = req.body;

    if (!boardId || !projectId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'boardId and projectId are required',
      });
    }

    // Verify the board exists
    const board = store.boards.getById(boardId);
    if (!board) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Board not found',
      });
    }

    const session = sessionMgr.createSession(boardId, projectId);
    return reply.status(201).send({ data: session });
  });

  /** List all active sessions. */
  app.get('/api/sessions', async (_req, reply) => {
    const sessions = sessionMgr.listSessions();
    return reply.send({ data: sessions, total: sessions.length });
  });

  /** Get session info by code. */
  app.get<{
    Params: { code: string };
  }>('/api/sessions/:code', async (req, reply) => {
    const session = sessionMgr.getSession(req.params.code);
    if (!session) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      });
    }
    return reply.send({ data: session });
  });

  /** Delete / end a session. */
  app.delete<{
    Params: { code: string };
  }>('/api/sessions/:code', async (req, reply) => {
    const ok = sessionMgr.deleteSession(req.params.code);
    if (!ok) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      });
    }
    return reply.status(204).send();
  });

  /**
   * Join a session via REST (agent-friendly — no WebSocket needed).
   * Returns participant info and session state.
   * The agent can then poll GET /api/sessions/:code for updates
   * or connect via WebSocket for real-time.
   */
  app.post<{
    Params: { code: string };
    Body: { name: string; role?: 'human' | 'agent' };
  }>('/api/sessions/:code/join', async (req, reply) => {
    const { name, role = 'agent' } = req.body;

    if (!name) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'name is required',
      });
    }

    const result = sessionMgr.addRestParticipant(req.params.code, name, role);
    if (!result) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    return reply.status(201).send({ data: result });
  });

  /** Leave a session via REST. */
  app.post<{
    Params: { code: string };
    Body: { participantId: string };
  }>('/api/sessions/:code/leave', async (req, reply) => {
    const ok = sessionMgr.removeRestParticipant(
      req.params.code,
      req.body.participantId,
    );
    if (!ok) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session or participant not found',
      });
    }
    return reply.status(204).send();
  });

  /**
   * Push a board event via REST (agent-friendly alternative to WebSocket).
   * The server applies the action to the store and broadcasts to all
   * WebSocket participants.
   */
  app.post<{
    Params: { code: string };
    Body: { participantId: string; action: BoardAction };
  }>('/api/sessions/:code/events', async (req, reply) => {
    const { participantId, action } = req.body;

    const session = sessionMgr.getSession(req.params.code);
    if (!session) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    // Apply the board action to the store
    const result = applyBoardAction(store, session.boardId, action);

    // Broadcast to all WebSocket participants
    sessionMgr.broadcastBoardEvent(
      req.params.code,
      participantId,
      action,
      result,
    );

    return reply.send({ data: { action: action.kind, result } });
  });

  /**
   * Poll for session state snapshot (agents that can't use WebSocket).
   * Returns current board data so the agent can diff against its local state.
   */
  app.get<{
    Params: { code: string };
  }>('/api/sessions/:code/snapshot', async (req, reply) => {
    const session = sessionMgr.getSession(req.params.code);
    if (!session) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    const boardIds = new Set([session.boardId]);
    const components = store.components.getAll((c) => boardIds.has(c.boardId));
    const nets = store.nets.getAll((n) => boardIds.has(n.boardId));
    const paths = store.paths.getAll((p) => boardIds.has(p.boardId));
    const board = store.boards.getById(session.boardId);

    return reply.send({
      data: {
        session,
        board,
        components,
        nets,
        paths,
      },
    });
  });

  // ─── WebSocket Endpoint ─────────────────────────────────────────────────

  app.get<{
    Params: { code: string };
  }>('/ws/session/:code', { websocket: true }, (socket, req) => {
    const code = req.params.code.toUpperCase();
    const session = sessionMgr.getSession(code);

    if (!session) {
      socket.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      socket.close(4004, 'Session not found');
      return;
    }

    // Participant is created when they send a 'join' message
    let joined = false;

    socket.on('message', (raw: Buffer | string) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      switch (msg.type) {
        case 'join': {
          if (joined) break;
          const participant = sessionMgr.addParticipant(
            socket,
            code,
            msg.name,
            msg.role,
          );
          if (!participant) {
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to join' }));
            socket.close(4004, 'Session not found');
            return;
          }
          joined = true;
          break;
        }

        case 'leave':
          sessionMgr.removeParticipant(socket);
          socket.close(1000, 'Left session');
          break;

        case 'cursor':
          if (joined) sessionMgr.handleCursor(socket, msg.x, msg.y);
          break;

        case 'select':
          if (joined) sessionMgr.handleSelection(socket, msg.ids);
          break;

        case 'tool':
          if (joined) sessionMgr.handleToolChange(socket, msg.tool);
          break;

        case 'layer':
          if (joined) sessionMgr.handleLayerChange(socket, msg.layerId);
          break;

        case 'board-event': {
          if (!joined) break;
          const conn = sessionMgr.getConnectionInfo(socket);
          if (!conn) break;

          // Apply the action to the store
          const result = applyBoardAction(store, session.boardId, msg.action);

          // Broadcast to other participants
          sessionMgr.broadcastBoardEvent(
            code,
            conn.participantId,
            msg.action,
            result,
          );

          // Confirm to the sender
          socket.send(JSON.stringify({
            type: 'board-event',
            participantId: conn.participantId,
            action: msg.action,
            result,
          }));
          break;
        }
      }
    });

    socket.on('close', () => {
      if (joined) sessionMgr.removeParticipant(socket);
    });

    socket.on('error', () => {
      if (joined) sessionMgr.removeParticipant(socket);
    });
  });
}

// ─── Board Action Executor ──────────────────────────────────────────────────

/**
 * Apply a BoardAction to the store and return the result.
 * This bridges the session event protocol with the existing CRUD store.
 */
function applyBoardAction(
  store: Store,
  boardId: string,
  action: BoardAction,
): unknown {
  const data = (action as any).data;

  switch (action.kind) {
    case 'component:create': {
      const id = createId<ComponentId>('cmp');
      return store.components.create({
        id,
        name: data.name,
        designator: data.designator,
        footprint: data.footprint,
        transform: data.transform,
        layerId: data.layerId,
        properties: data.properties ?? {},
        locked: data.locked ?? false,
        boardId,
      });
    }

    case 'component:update':
      return store.components.update(action.id, data);

    case 'component:delete':
      return store.components.delete(action.id);

    case 'path:create': {
      const pathId = createId<TracePathId>('trc');
      const segments = (data.segments ?? []).map((s: any) => ({
        id: createId<TraceSegmentId>('seg'),
        pathId,
        ...s,
      }));
      const vias = (data.vias ?? []).map((v: any) => ({
        id: createId<ViaId>('via'),
        pathId,
        ...v,
      }));
      return store.paths.create({
        id: pathId,
        netId: data.netId,
        segments,
        vias,
        debugLinks: [],
        cornerRadius: 0,
        boardId,
      });
    }

    case 'path:update': {
      const existing = store.paths.getById(action.id);
      if (!existing) return null;
      const updates: Record<string, unknown> = {};
      if (data.segments) {
        updates.segments = data.segments.map((s: any) => ({
          id: createId<TraceSegmentId>('seg'),
          pathId: existing.id,
          ...s,
        }));
      }
      if (data.vias) {
        updates.vias = data.vias.map((v: any) => ({
          id: createId<ViaId>('via'),
          pathId: existing.id,
          ...v,
        }));
      }
      return store.paths.update(action.id, updates as any);
    }

    case 'path:delete':
      return store.paths.delete(action.id);

    case 'net:create': {
      return store.nets.create({
        id: createId<NetId>('net'),
        name: data.name,
        pins: data.pins ?? [],
        pads: data.pads ?? [],
        paths: [],
        color: data.color,
        netClass: data.netClass,
        boardId,
      });
    }

    case 'net:update':
      return store.nets.update(action.id, data);

    case 'net:delete':
      return store.nets.delete(action.id);

    case 'layer:update': {
      const board = store.boards.getById(boardId);
      if (board) store.boards.update(boardId, data);
      return store.boards.getById(boardId);
    }

    case 'board:update':
      return store.boards.update(boardId, data);

    default:
      return null;
  }
}
