import type { StateCreator } from 'zustand';

// ─── Types (mirror server protocol) ─────────────────────────────────────────

export type ParticipantRole = 'human' | 'agent';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  color: string;
  joinedAt: string;
  cursor?: { x: number; y: number };
  activeLayerId?: string;
  activeTool?: string;
}

export interface SessionInfo {
  code: string;
  boardId: string;
  projectId: string;
  hostId: string;
  participants: Participant[];
  createdAt: string;
}

export type SessionStatus = 'disconnected' | 'connecting' | 'connected';

// ─── Slice ──────────────────────────────────────────────────────────────────

export interface SessionSlice {
  sessionStatus: SessionStatus;
  sessionInfo: SessionInfo | null;
  localParticipantId: string | null;
  participants: Participant[];
  remoteCursors: Map<string, { x: number; y: number; color: string; name: string }>;
  remoteSelections: Map<string, string[]>;
  sessionError: string | null;

  setSessionStatus: (status: SessionStatus) => void;
  setSessionInfo: (info: SessionInfo | null) => void;
  setLocalParticipantId: (id: string | null) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (id: string) => void;
  updateRemoteCursor: (participantId: string, x: number, y: number) => void;
  updateRemoteSelection: (participantId: string, ids: string[]) => void;
  updateParticipantTool: (participantId: string, tool: string) => void;
  updateParticipantLayer: (participantId: string, layerId: string) => void;
  setSessionError: (error: string | null) => void;
  clearSession: () => void;
}

export const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  sessionStatus: 'disconnected',
  sessionInfo: null,
  localParticipantId: null,
  participants: [],
  remoteCursors: new Map(),
  remoteSelections: new Map(),
  sessionError: null,

  setSessionStatus: (status) => set({ sessionStatus: status }),
  setSessionInfo: (info) => set({ sessionInfo: info }),
  setLocalParticipantId: (id) => set({ localParticipantId: id }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (p) =>
    set((state) => ({
      participants: [...state.participants.filter((x) => x.id !== p.id), p],
    })),

  removeParticipant: (id) =>
    set((state) => {
      const remoteCursors = new Map(state.remoteCursors);
      remoteCursors.delete(id);
      const remoteSelections = new Map(state.remoteSelections);
      remoteSelections.delete(id);
      return {
        participants: state.participants.filter((x) => x.id !== id),
        remoteCursors,
        remoteSelections,
      };
    }),

  updateRemoteCursor: (participantId, x, y) =>
    set((state) => {
      const p = state.participants.find((pp) => pp.id === participantId);
      const remoteCursors = new Map(state.remoteCursors);
      remoteCursors.set(participantId, {
        x,
        y,
        color: p?.color ?? '#00d4ff',
        name: p?.name ?? 'Unknown',
      });
      return { remoteCursors };
    }),

  updateRemoteSelection: (participantId, ids) =>
    set((state) => {
      const remoteSelections = new Map(state.remoteSelections);
      remoteSelections.set(participantId, ids);
      return { remoteSelections };
    }),

  updateParticipantTool: (participantId, tool) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, activeTool: tool } : p,
      ),
    })),

  updateParticipantLayer: (participantId, layerId) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, activeLayerId: layerId } : p,
      ),
    })),

  setSessionError: (error) => set({ sessionError: error }),

  clearSession: () =>
    set({
      sessionStatus: 'disconnected',
      sessionInfo: null,
      localParticipantId: null,
      participants: [],
      remoteCursors: new Map(),
      remoteSelections: new Map(),
      sessionError: null,
    }),
});
