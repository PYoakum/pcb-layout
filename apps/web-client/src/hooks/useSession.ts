import { useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import type { Board, Component, TracePath, Project } from '@pcb/domain';

const API_BASE = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`;
const WS_BASE = API_BASE.replace(/^http/, 'ws');

type ServerMessage =
  | { type: 'session-info'; session: any }
  | { type: 'participant-joined'; participant: any }
  | { type: 'participant-left'; participantId: string }
  | { type: 'cursor-update'; participantId: string; x: number; y: number }
  | { type: 'selection-update'; participantId: string; ids: string[] }
  | { type: 'tool-update'; participantId: string; tool: string }
  | { type: 'layer-update'; participantId: string; layerId: string }
  | { type: 'board-event'; participantId: string; action: any; result: any }
  | { type: 'error'; message: string };

/**
 * Fetch the full board snapshot from the session and load it into the
 * Zustand store so both 2D and 3D renderers pick it up.
 */
async function loadSessionBoard(sessionCode: string) {
  const store = useStore.getState();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/sessions/${sessionCode}/snapshot`);
  } catch (err) {
    store.setSessionError('Failed to connect to API server');
    return;
  }
  if (!res.ok) {
    store.setSessionError(`Failed to load board: ${res.status}`);
    return;
  }
  const { data } = await res.json();

  const board: Board = data.board;
  const components: Component[] = data.components ?? [];
  const traces: TracePath[] = data.paths ?? [];

  // Build a Project shell so the session panel can reference it
  const project: Project = {
    id: data.session.projectId,
    name: board.name,
    description: '',
    boards: [board.id],
    modules: [],
    libraryAssets: [],
    settings: {
      defaultGridSpacing: board.workspace.grid?.spacingX ?? 5,
      defaultLayerCount: board.workspace.layerCount ?? 2,
      defaultBoardWidth: board.workspace.width,
      defaultBoardHeight: board.workspace.height,
      units: 'mils',
    },
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };

  store.setCurrentProject(project);
  store.setCurrentBoard(board);
  store.setComponents(components);
  store.setTraces(traces);

  // Set active layer to first signal layer
  const signalLayer = board.layers.find(
    (l) => l.type === 'signal' || l.type === 'plane',
  );
  if (signalLayer) {
    store.setActiveLayerId(signalLayer.id);
  }
}

/**
 * Re-fetch components and traces from the API for the session board.
 * Called when a remote board-event is received.
 */
async function refreshBoardData(boardId: string) {
  const store = useStore.getState();

  const [compRes, pathRes] = await Promise.all([
    fetch(`${API_BASE}/api/components?boardId=${boardId}`),
    fetch(`${API_BASE}/api/paths?boardId=${boardId}`),
  ]);

  if (compRes.ok) {
    const { data } = await compRes.json();
    store.setComponents(data);
  }
  if (pathRes.ok) {
    const { data } = await pathRes.json();
    store.setTraces(data);
  }
}

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number>(0);
  const sessionCodeRef = useRef<string>('');

  const setSessionStatus = useStore((s) => s.setSessionStatus);
  const setSessionInfo = useStore((s) => s.setSessionInfo);
  const setLocalParticipantId = useStore((s) => s.setLocalParticipantId);
  const setParticipants = useStore((s) => s.setParticipants);
  const addParticipant = useStore((s) => s.addParticipant);
  const removeParticipant = useStore((s) => s.removeParticipant);
  const updateRemoteCursor = useStore((s) => s.updateRemoteCursor);
  const updateRemoteSelection = useStore((s) => s.updateRemoteSelection);
  const updateParticipantTool = useStore((s) => s.updateParticipantTool);
  const updateParticipantLayer = useStore((s) => s.updateParticipantLayer);
  const setSessionError = useStore((s) => s.setSessionError);
  const clearSession = useStore((s) => s.clearSession);
  const addNotification = useStore((s) => s.addNotification);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'session-info': {
        setSessionInfo(msg.session);
        setParticipants(msg.session.participants);
        // Our ID is the last participant
        if (msg.session.participants.length > 0) {
          const lastP = msg.session.participants[msg.session.participants.length - 1];
          setLocalParticipantId(lastP.id);
        }
        setSessionStatus('connected');
        sessionCodeRef.current = msg.session.code;

        // Load the board data into the renderer
        loadSessionBoard(msg.session.code);
        break;
      }

      case 'participant-joined':
        addParticipant(msg.participant);
        addNotification({
          type: 'info',
          message: `${msg.participant.name} (${msg.participant.role}) joined`,
        });
        break;

      case 'participant-left':
        removeParticipant(msg.participantId);
        break;

      case 'cursor-update':
        updateRemoteCursor(msg.participantId, msg.x, msg.y);
        break;

      case 'selection-update':
        updateRemoteSelection(msg.participantId, msg.ids);
        break;

      case 'tool-update':
        updateParticipantTool(msg.participantId, msg.tool);
        break;

      case 'layer-update':
        updateParticipantLayer(msg.participantId, msg.layerId);
        break;

      case 'board-event': {
        // A remote participant mutated the board — refresh local data
        const boardId = useStore.getState().currentBoard?.id;
        if (boardId) {
          refreshBoardData(boardId as string);
        }
        addNotification({
          type: 'info',
          message: `Board updated: ${msg.action.kind}`,
        });
        break;
      }

      case 'error':
        setSessionError(msg.message);
        break;
    }
  }, [
    setSessionInfo, setParticipants, setLocalParticipantId, setSessionStatus,
    addParticipant, removeParticipant, updateRemoteCursor, updateRemoteSelection,
    updateParticipantTool, updateParticipantLayer, setSessionError, addNotification,
  ]);

  const createSession = useCallback(async (
    boardId: string,
    projectId: string,
    userName: string,
  ) => {
    setSessionStatus('connecting');

    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, projectId }),
      });
      const { data } = await res.json();
      const code = data.code as string;

      connectWs(code, userName, 'human');
      return code;
    } catch {
      setSessionStatus('disconnected');
      setSessionError('Failed to create session');
      return null;
    }
  }, [setSessionStatus, setSessionError]);

  const joinSession = useCallback((
    code: string,
    userName: string,
    role: 'human' | 'agent' = 'human',
  ) => {
    setSessionStatus('connecting');
    connectWs(code, userName, role);
  }, [setSessionStatus]);

  const leaveSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimeout(reconnectTimer.current);
    clearSession();
  }, [clearSession]);

  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', x, y }));
    }
  }, []);

  const sendSelection = useCallback((ids: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'select', ids }));
    }
  }, []);

  const sendBoardEvent = useCallback((action: { kind: string; [key: string]: any }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'board-event', action }));
    }
  }, []);

  function connectWs(code: string, name: string, role: 'human' | 'agent') {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${WS_BASE}/ws/session/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name, role }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      if (event.code !== 1000) {
        setSessionStatus('connecting');
        reconnectTimer.current = window.setTimeout(() => {
          connectWs(code, name, role);
        }, 3000);
      } else {
        clearSession();
      }
    };

    ws.onerror = () => {
      setSessionError('WebSocket connection error');
    };
  }

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearTimeout(reconnectTimer.current);
    };
  }, []);

  return {
    createSession,
    joinSession,
    leaveSession,
    sendCursor,
    sendSelection,
    sendBoardEvent,
  };
}
