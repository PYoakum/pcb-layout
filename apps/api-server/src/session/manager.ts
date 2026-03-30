import type { WebSocket } from 'ws';
import type {
  Session,
  SessionInfo,
  Participant,
  ParticipantRole,
  ServerMessage,
  BoardAction,
} from './protocol';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PARTICIPANT_COLORS = [
  '#00d4ff', '#ff6b6b', '#51cf66', '#ffd43b',
  '#cc5de8', '#ff922b', '#20c997', '#748ffc',
  '#f06595', '#ffe066', '#63e6be', '#da77f2',
];

let colorIndex = 0;
function nextColor(): string {
  const c = PARTICIPANT_COLORS[colorIndex % PARTICIPANT_COLORS.length];
  colorIndex++;
  return c;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Connection Tracking ────────────────────────────────────────────────────

interface Connection {
  ws: WebSocket;
  participantId: string;
  sessionCode: string;
}

// ─── Session Manager ────────────────────────────────────────────────────────

export class SessionManager {
  private sessions = new Map<string, Session>();
  private connections = new Map<WebSocket, Connection>();

  // ── Session Lifecycle ──

  createSession(boardId: string, projectId: string): SessionInfo {
    let code: string;
    do {
      code = generateCode();
    } while (this.sessions.has(code));

    const session: Session = {
      code,
      boardId,
      projectId,
      hostId: '',
      participants: new Map(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(code, session);
    return this.toInfo(session);
  }

  getSession(code: string): SessionInfo | null {
    const s = this.sessions.get(code.toUpperCase());
    return s ? this.toInfo(s) : null;
  }

  listSessions(): SessionInfo[] {
    return [...this.sessions.values()].map((s) => this.toInfo(s));
  }

  deleteSession(code: string): boolean {
    const s = this.sessions.get(code);
    if (!s) return false;

    // Disconnect all participants
    for (const [ws, conn] of this.connections) {
      if (conn.sessionCode === code) {
        this.send(ws, { type: 'error', message: 'Session ended by host' });
        ws.close(1000, 'Session ended');
        this.connections.delete(ws);
      }
    }

    this.sessions.delete(code);
    return true;
  }

  // ── Participant Management ──

  /**
   * Add a participant via WebSocket.
   * Returns the new Participant or null if the session doesn't exist.
   */
  addParticipant(
    ws: WebSocket,
    code: string,
    name: string,
    role: ParticipantRole,
  ): Participant | null {
    const session = this.sessions.get(code.toUpperCase());
    if (!session) return null;

    const participant: Participant = {
      id: generateId(),
      name,
      role,
      color: nextColor(),
      joinedAt: new Date().toISOString(),
    };

    session.participants.set(participant.id, participant);

    if (!session.hostId) {
      session.hostId = participant.id;
    }

    this.connections.set(ws, {
      ws,
      participantId: participant.id,
      sessionCode: session.code,
    });

    // Send session info to the new participant
    this.send(ws, { type: 'session-info', session: this.toInfo(session) });

    // Broadcast join to others
    this.broadcast(session.code, {
      type: 'participant-joined',
      participant,
    }, participant.id);

    return participant;
  }

  /**
   * Add a participant via REST (agent-friendly, no WebSocket required).
   * Returns participant with a token for subsequent REST calls.
   */
  addRestParticipant(
    code: string,
    name: string,
    role: ParticipantRole,
  ): { participant: Participant; session: SessionInfo } | null {
    const session = this.sessions.get(code.toUpperCase());
    if (!session) return null;

    const participant: Participant = {
      id: generateId(),
      name,
      role,
      color: nextColor(),
      joinedAt: new Date().toISOString(),
    };

    session.participants.set(participant.id, participant);

    if (!session.hostId) {
      session.hostId = participant.id;
    }

    // Broadcast join to WS participants
    this.broadcast(session.code, {
      type: 'participant-joined',
      participant,
    }, participant.id);

    return { participant, session: this.toInfo(session) };
  }

  removeParticipant(ws: WebSocket): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const session = this.sessions.get(conn.sessionCode);
    if (session) {
      session.participants.delete(conn.participantId);
      this.broadcast(session.code, {
        type: 'participant-left',
        participantId: conn.participantId,
      });

      // Clean up empty sessions after a delay
      if (session.participants.size === 0) {
        setTimeout(() => {
          const s = this.sessions.get(conn.sessionCode);
          if (s && s.participants.size === 0) {
            this.sessions.delete(conn.sessionCode);
          }
        }, 60_000);
      }
    }

    this.connections.delete(ws);
  }

  removeRestParticipant(code: string, participantId: string): boolean {
    const session = this.sessions.get(code.toUpperCase());
    if (!session) return false;

    session.participants.delete(participantId);
    this.broadcast(session.code, {
      type: 'participant-left',
      participantId,
    });

    return true;
  }

  // ── Event Handling ──

  handleCursor(ws: WebSocket, x: number, y: number): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const session = this.sessions.get(conn.sessionCode);
    if (!session) return;

    const p = session.participants.get(conn.participantId);
    if (p) p.cursor = { x, y };

    this.broadcast(conn.sessionCode, {
      type: 'cursor-update',
      participantId: conn.participantId,
      x,
      y,
    }, conn.participantId);
  }

  handleSelection(ws: WebSocket, ids: string[]): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    this.broadcast(conn.sessionCode, {
      type: 'selection-update',
      participantId: conn.participantId,
      ids,
    }, conn.participantId);
  }

  handleToolChange(ws: WebSocket, tool: string): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const p = this.getParticipantFromWs(ws);
    if (p) p.activeTool = tool;

    this.broadcast(conn.sessionCode, {
      type: 'tool-update',
      participantId: conn.participantId,
      tool,
    }, conn.participantId);
  }

  handleLayerChange(ws: WebSocket, layerId: string): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const p = this.getParticipantFromWs(ws);
    if (p) p.activeLayerId = layerId;

    this.broadcast(conn.sessionCode, {
      type: 'layer-update',
      participantId: conn.participantId,
      layerId,
    }, conn.participantId);
  }

  /**
   * Broadcast a board mutation result to all session participants.
   * Called after the API processes a board action (component create, etc.).
   */
  broadcastBoardEvent(
    code: string,
    participantId: string,
    action: BoardAction,
    result: unknown,
  ): void {
    this.broadcast(code, {
      type: 'board-event',
      participantId,
      action,
      result,
    }, participantId);
  }

  /** Get the session code for a WebSocket connection. */
  getConnectionInfo(ws: WebSocket): Connection | undefined {
    return this.connections.get(ws);
  }

  // ── Internals ──

  private getParticipantFromWs(ws: WebSocket): Participant | undefined {
    const conn = this.connections.get(ws);
    if (!conn) return;
    const session = this.sessions.get(conn.sessionCode);
    return session?.participants.get(conn.participantId);
  }

  private broadcast(code: string, message: ServerMessage, excludeId?: string): void {
    for (const [ws, conn] of this.connections) {
      if (conn.sessionCode === code && conn.participantId !== excludeId) {
        this.send(ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private toInfo(session: Session): SessionInfo {
    return {
      code: session.code,
      boardId: session.boardId,
      projectId: session.projectId,
      hostId: session.hostId,
      participants: [...session.participants.values()],
      createdAt: session.createdAt,
    };
  }
}
