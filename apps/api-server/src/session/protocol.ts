/**
 * Shared session protocol — message types exchanged over WebSocket
 * between human clients, agent clients, and the server.
 */

// ─── Participant ────────────────────────────────────────────────────────────

export type ParticipantRole = 'human' | 'agent';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  color: string;          // cursor / highlight colour
  joinedAt: string;
  cursor?: { x: number; y: number };
  activeLayerId?: string;
  activeTool?: string;
}

// ─── Session ────────────────────────────────────────────────────────────────

export interface Session {
  code: string;           // 6-char human-readable join code
  boardId: string;
  projectId: string;
  hostId: string;         // participant who created the session
  participants: Map<string, Participant>;
  createdAt: string;
}

export interface SessionInfo {
  code: string;
  boardId: string;
  projectId: string;
  hostId: string;
  participants: Participant[];
  createdAt: string;
}

// ─── Client → Server Messages ───────────────────────────────────────────────

export type ClientMessage =
  | { type: 'join'; name: string; role: ParticipantRole }
  | { type: 'leave' }
  | { type: 'cursor'; x: number; y: number }
  | { type: 'select'; ids: string[] }
  | { type: 'tool'; tool: string }
  | { type: 'layer'; layerId: string }
  | { type: 'board-event'; action: BoardAction };

/**
 * Board mutations that get broadcast to all participants.
 * Each maps 1-to-1 to an API endpoint, so agents can also POST these
 * via the REST fallback at POST /api/sessions/:code/events.
 */
export type BoardAction =
  | { kind: 'component:create'; data: unknown }
  | { kind: 'component:update'; id: string; data: unknown }
  | { kind: 'component:delete'; id: string }
  | { kind: 'path:create'; data: unknown }
  | { kind: 'path:update'; id: string; data: unknown }
  | { kind: 'path:delete'; id: string }
  | { kind: 'net:create'; data: unknown }
  | { kind: 'net:update'; id: string; data: unknown }
  | { kind: 'net:delete'; id: string }
  | { kind: 'layer:update'; data: unknown }
  | { kind: 'board:update'; data: unknown };

// ─── Server → Client Messages ───────────────────────────────────────────────

export type ServerMessage =
  | { type: 'session-info'; session: SessionInfo }
  | { type: 'participant-joined'; participant: Participant }
  | { type: 'participant-left'; participantId: string }
  | { type: 'cursor-update'; participantId: string; x: number; y: number }
  | { type: 'selection-update'; participantId: string; ids: string[] }
  | { type: 'tool-update'; participantId: string; tool: string }
  | { type: 'layer-update'; participantId: string; layerId: string }
  | { type: 'board-event'; participantId: string; action: BoardAction; result: unknown }
  | { type: 'error'; message: string };
