import { useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
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

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number>(0);

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

  // Process incoming server messages
  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'session-info':
        setSessionInfo(msg.session);
        setParticipants(msg.session.participants);
        // Our ID is the last participant in the list
        if (msg.session.participants.length > 0) {
          const lastP = msg.session.participants[msg.session.participants.length - 1];
          setLocalParticipantId(lastP.id);
        }
        setSessionStatus('connected');
        break;

      case 'participant-joined':
        addParticipant(msg.participant);
        addNotification({
          type: 'info',
          message: `${msg.participant.name} (${msg.participant.role}) joined the session`,
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

      case 'board-event':
        // A remote participant mutated the board — trigger a store refresh
        // The actual data is in msg.result; for now we just notify
        addNotification({
          type: 'info',
          message: `Board updated: ${msg.action.kind}`,
        });
        break;

      case 'error':
        setSessionError(msg.message);
        break;
    }
  }, [
    setSessionInfo, setParticipants, setLocalParticipantId, setSessionStatus,
    addParticipant, removeParticipant, updateRemoteCursor, updateRemoteSelection,
    updateParticipantTool, updateParticipantLayer, setSessionError, addNotification,
  ]);

  /** Create a new session and connect to it. */
  const createSession = useCallback(async (
    boardId: string,
    projectId: string,
    userName: string,
  ) => {
    setSessionStatus('connecting');

    try {
      // Create session via REST
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, projectId }),
      });
      const { data } = await res.json();
      const code = data.code as string;

      // Connect via WebSocket
      connectWs(code, userName, 'human');

      return code;
    } catch (err) {
      setSessionStatus('disconnected');
      setSessionError('Failed to create session');
      return null;
    }
  }, [setSessionStatus, setSessionError]);

  /** Join an existing session by code. */
  const joinSession = useCallback((
    code: string,
    userName: string,
    role: 'human' | 'agent' = 'human',
  ) => {
    setSessionStatus('connecting');
    connectWs(code, userName, role);
  }, [setSessionStatus]);

  /** Leave the current session. */
  const leaveSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimeout(reconnectTimer.current);
    clearSession();
  }, [clearSession]);

  /** Send cursor position to other participants. */
  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', x, y }));
    }
  }, []);

  /** Send selection to other participants. */
  const sendSelection = useCallback((ids: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'select', ids }));
    }
  }, []);

  /** Send a board mutation event. */
  const sendBoardEvent = useCallback((action: { kind: string; [key: string]: any }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'board-event', action }));
    }
  }, []);

  // Internal: establish WebSocket connection
  function connectWs(code: string, name: string, role: 'human' | 'agent') {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE}/ws/session/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name, role }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      if (event.code !== 1000) {
        // Unexpected close — try reconnect
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

  // Clean up on unmount
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
