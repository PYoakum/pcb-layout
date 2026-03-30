import { useState } from 'react';
import { useStore } from '../../store';
import { useSession } from '../../hooks/useSession';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected' ? '#51cf66' :
    status === 'connecting' ? '#ffd43b' :
    '#666';
  return (
    <span
      className="session-status-dot"
      style={{ background: color }}
      title={status}
    />
  );
}

function ParticipantList() {
  const participants = useStore((s) => s.participants);
  const localId = useStore((s) => s.localParticipantId);

  if (participants.length === 0) return null;

  return (
    <div className="session-participants">
      {participants.map((p) => (
        <div key={p.id} className="session-participant">
          <span
            className="session-participant__dot"
            style={{ background: p.color }}
          />
          <span className="session-participant__name">
            {p.name}
            {p.id === localId && ' (you)'}
          </span>
          <span className={`session-participant__role session-participant__role--${p.role}`}>
            {p.role}
          </span>
          {p.activeTool && (
            <span className="session-participant__tool">{p.activeTool}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SessionPanel() {
  const sessionStatus = useStore((s) => s.sessionStatus);
  const sessionInfo = useStore((s) => s.sessionInfo);
  const sessionError = useStore((s) => s.sessionError);
  const currentBoard = useStore((s) => s.currentBoard);
  const currentProject = useStore((s) => s.currentProject);

  const { createSession, joinSession, leaveSession } = useSession();

  const [userName, setUserName] = useState('Designer');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isConnected = sessionStatus === 'connected';
  const isConnecting = sessionStatus === 'connecting';

  const handleCreate = async () => {
    if (!currentBoard || !currentProject) return;
    await createSession(
      currentBoard.id as string,
      currentProject.id as string,
      userName,
    );
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinSession(joinCode.trim().toUpperCase(), userName);
  };

  const handleCopyCode = () => {
    if (!sessionInfo) return;
    navigator.clipboard.writeText(sessionInfo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Connected state ──
  if (isConnected && sessionInfo) {
    return (
      <div className="session-panel">
        <div className="session-panel__header">
          <StatusDot status="connected" />
          <span className="session-panel__title">Live Session</span>
        </div>

        <div className="session-panel__code-row">
          <span className="session-panel__code">{sessionInfo.code}</span>
          <button
            className="session-panel__copy-btn"
            onClick={handleCopyCode}
            title="Copy session code"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="session-panel__share-hint">
          Share this code with an agent or collaborator to join.
          <br />
          <span className="session-panel__ws-url">
            WS: /ws/session/{sessionInfo.code}
          </span>
          <br />
          <span className="session-panel__ws-url">
            REST: POST /api/sessions/{sessionInfo.code}/join
          </span>
        </div>

        <ParticipantList />

        <button className="session-panel__leave-btn" onClick={leaveSession}>
          Leave Session
        </button>
      </div>
    );
  }

  // ── Disconnected state ──
  return (
    <div className="session-panel">
      <div className="session-panel__header">
        <StatusDot status={sessionStatus} />
        <span className="session-panel__title">
          {isConnecting ? 'Connecting...' : 'Pair Session'}
        </span>
      </div>

      {sessionError && (
        <div className="session-panel__error">{sessionError}</div>
      )}

      <div className="session-panel__field">
        <label className="session-panel__label">Your Name</label>
        <input
          className="session-panel__input"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Name"
          disabled={isConnecting}
        />
      </div>

      <div className="session-panel__actions">
        <button
          className="session-panel__btn session-panel__btn--primary"
          onClick={handleCreate}
          disabled={isConnecting || !currentBoard}
          title={!currentBoard ? 'Load a board first' : 'Start a new session'}
        >
          Create Session
        </button>
      </div>

      <div className="session-panel__divider">or join existing</div>

      <div className="session-panel__field">
        <label className="session-panel__label">Session Code</label>
        <input
          className="session-panel__input session-panel__input--code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          disabled={isConnecting}
        />
      </div>

      <div className="session-panel__actions">
        <button
          className="session-panel__btn"
          onClick={handleJoin}
          disabled={isConnecting || joinCode.length < 4}
        >
          Join Session
        </button>
      </div>
    </div>
  );
}
