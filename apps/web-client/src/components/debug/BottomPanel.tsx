import { useState } from 'react';
import { useStore } from '../../store';
import { DebugToolbar } from './DebugToolbar';
import { ValidationPanel } from './ValidationPanel';
import { NetInspector } from './NetInspector';
import { DesignRulesPanel } from './DesignRulesPanel';
import type { Net, DesignRule } from '@pcb/domain';

export function BottomPanel() {
  const debugPanelOpen = useStore((s) => s.debugPanelOpen);
  const debugActiveTab = useStore((s) => s.debugActiveTab);

  // Placeholder data - in a real app these come from the board slice or API
  const [nets] = useState<Net[]>([]);
  const [designRules, setDesignRules] = useState<DesignRule[]>([]);

  return (
    <div className={`bottom-panel ${debugPanelOpen ? 'bottom-panel--open' : ''}`}>
      <DebugToolbar />
      {debugPanelOpen && (
        <div className="bottom-panel__content">
          {debugActiveTab === 'validation' && <ValidationPanel />}
          {debugActiveTab === 'nets' && <NetInspector nets={nets} />}
          {debugActiveTab === 'rules' && (
            <DesignRulesPanel rules={designRules} onUpdateRules={setDesignRules} />
          )}
        </div>
      )}
    </div>
  );
}
