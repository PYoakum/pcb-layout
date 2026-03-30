import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import type { Net } from '@pcb/domain';

function NetListItem({
  net,
  isActive,
  onSelect,
}: {
  net: Net;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`net-list__item ${isActive ? 'net-list__item--active' : ''}`}
      onClick={onSelect}
    >
      <span
        className="net-list__color"
        style={{ background: net.color ?? 'var(--accent)' }}
      />
      <span className="net-list__name">{net.name || '(unnamed)'}</span>
      <span className="net-list__meta">
        {net.pins.length}P / {net.paths.length}T
      </span>
    </div>
  );
}

function computeConnectionStatus(net: Net): {
  label: string;
  status: 'connected' | 'partial' | 'unconnected';
} {
  if (net.pins.length === 0) return { label: 'No pins', status: 'unconnected' };
  if (net.paths.length === 0) return { label: 'No traces', status: 'unconnected' };
  // A simple heuristic: if there are paths and all pins have at least some traces
  // we report connected. A real implementation would do graph connectivity.
  if (net.paths.length >= net.pins.length - 1)
    return { label: 'Fully connected', status: 'connected' };
  return { label: 'Partial', status: 'partial' };
}

export function NetInspector({ nets }: { nets: Net[] }) {
  const highlightNet = useStore((s) => s.highlightNet);
  const highlightedNetId = useStore((s) => s.highlightedNetId);
  const inspectedNet = useStore((s) => s.inspectedNet);
  const inspectNet = useStore((s) => s.inspectNet);
  const highlightPath = useStore((s) => s.highlightPath);

  const [search, setSearch] = useState('');

  const filteredNets = useMemo(() => {
    if (!search) return nets;
    const q = search.toLowerCase();
    return nets.filter((n) => (n.name || '').toLowerCase().includes(q));
  }, [nets, search]);

  const handleSelectNet = (net: Net) => {
    if (inspectedNet?.id === net.id) {
      inspectNet(null);
      highlightNet(null);
    } else {
      inspectNet(net);
      highlightNet(net.id);
    }
  };

  const connStatus = inspectedNet ? computeConnectionStatus(inspectedNet) : null;

  return (
    <div className="debug-panel net-inspector">
      <div className="debug-panel__toolbar">
        <input
          className="debug-search"
          type="text"
          placeholder="Search nets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="net-inspector__content">
        <div className="net-list">
          {filteredNets.length === 0 ? (
            <div className="debug-empty">
              {nets.length === 0 ? 'No nets on board.' : 'No nets match search.'}
            </div>
          ) : (
            filteredNets.map((net) => (
              <NetListItem
                key={net.id}
                net={net}
                isActive={highlightedNetId === net.id}
                onSelect={() => handleSelectNet(net)}
              />
            ))
          )}
        </div>

        {inspectedNet && (
          <div className="net-detail">
            <div className="net-detail__header">
              <span className="net-detail__name">{inspectedNet.name || '(unnamed)'}</span>
              {inspectedNet.netClass && (
                <span className="net-detail__class">{inspectedNet.netClass}</span>
              )}
            </div>

            <div className="net-detail__section">
              <div className="net-detail__section-title">Connection Status</div>
              {connStatus && (
                <span className={`net-status net-status--${connStatus.status}`}>
                  {connStatus.label}
                </span>
              )}
            </div>

            <div className="net-detail__section">
              <div className="net-detail__section-title">
                Connected Pins ({inspectedNet.pins.length})
              </div>
              <div className="net-detail__list">
                {inspectedNet.pins.length === 0 ? (
                  <span className="debug-muted">None</span>
                ) : (
                  inspectedNet.pins.map((pinId) => (
                    <div key={pinId} className="net-detail__list-item">
                      {pinId}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="net-detail__section">
              <div className="net-detail__section-title">
                Trace Paths ({inspectedNet.paths.length})
              </div>
              <div className="net-detail__list">
                {inspectedNet.paths.length === 0 ? (
                  <span className="debug-muted">None</span>
                ) : (
                  inspectedNet.paths.map((pathId) => (
                    <div
                      key={pathId}
                      className="net-detail__list-item net-detail__list-item--clickable"
                      onClick={() => highlightPath(pathId)}
                    >
                      {pathId.length > 16 ? `...${pathId.slice(-12)}` : pathId}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
