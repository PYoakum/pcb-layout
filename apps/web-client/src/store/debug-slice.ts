import type { StateCreator } from 'zustand';
import type { TracePath, DebugLink, Net, DebugLinkId } from '@pcb/domain';
import { createId, DebugSeverity } from '@pcb/domain';
import type { ValidationResult as ApiValidationResult } from '@pcb/api-contracts';

export interface LocalValidationResult {
  valid: boolean;
  results: ApiValidationResult[];
  checkedAt: string;
  errorCount: number;
  warningCount: number;
  checkedRules: number;
}

export interface DebugSlice {
  // Validation
  validationResults: LocalValidationResult | null;
  validating: boolean;
  autoValidate: boolean;

  // Net/path highlighting
  highlightedNetId: string | null;
  highlightedPathId: string | null;
  highlightedViolationIds: string[];

  // Debug links
  debugLinks: Record<string, DebugLink[]>;

  // Inspection
  inspectedPath: TracePath | null;
  inspectedNet: Net | null;

  // Bottom panel
  debugPanelOpen: boolean;
  debugActiveTab: 'validation' | 'nets' | 'rules';

  // Actions
  runValidation(boardId: string): Promise<void>;
  clearValidation(): void;
  highlightNet(netId: string | null): void;
  highlightPath(pathId: string | null): void;
  highlightViolation(entityIds: string[]): void;
  inspectPath(path: TracePath | null): void;
  inspectNet(net: Net | null): void;
  addDebugLink(pathId: string, link: Partial<DebugLink>): void;
  clearDebugLinks(pathId: string): void;
  removeDebugLink(pathId: string, linkId: string): void;
  setAutoValidate(enabled: boolean): void;
  setDebugPanelOpen(open: boolean): void;
  setDebugActiveTab(tab: 'validation' | 'nets' | 'rules'): void;
}

export const createDebugSlice: StateCreator<DebugSlice> = (set, get) => ({
  validationResults: null,
  validating: false,
  autoValidate: false,
  highlightedNetId: null,
  highlightedPathId: null,
  highlightedViolationIds: [],
  debugLinks: {},
  inspectedPath: null,
  inspectedNet: null,
  debugPanelOpen: false,
  debugActiveTab: 'validation',

  runValidation: async (boardId: string) => {
    set({ validating: true });
    try {
      const { validateBoard } = await import('../api/client');
      // Use empty projectId since the API call will be routed by boardId
      const response = await validateBoard('', boardId);
      const results = response.data.results;
      const errorCount = results.filter((r) => r.severity === 'error').length;
      const warningCount = results.filter((r) => r.severity === 'warning').length;
      set({
        validationResults: {
          valid: response.data.valid,
          results,
          checkedAt: response.data.checkedAt,
          errorCount,
          warningCount,
          checkedRules: results.length,
        },
        validating: false,
      });
    } catch {
      set({ validating: false });
    }
  },

  clearValidation: () => set({ validationResults: null, highlightedViolationIds: [] }),

  highlightNet: (netId) =>
    set({ highlightedNetId: netId, highlightedPathId: null }),

  highlightPath: (pathId) =>
    set({ highlightedPathId: pathId }),

  highlightViolation: (entityIds) =>
    set({ highlightedViolationIds: entityIds }),

  inspectPath: (path) =>
    set({ inspectedPath: path }),

  inspectNet: (net) =>
    set({ inspectedNet: net }),

  addDebugLink: (pathId, partial) => {
    const link: DebugLink = {
      id: createId<DebugLinkId>('dbg'),
      pathId: pathId as any,
      label: partial.label ?? '',
      description: partial.description ?? '',
      severity: partial.severity ?? DebugSeverity.Info,
      metadata: partial.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const existing = state.debugLinks[pathId] ?? [];
      return { debugLinks: { ...state.debugLinks, [pathId]: [...existing, link] } };
    });
  },

  clearDebugLinks: (pathId) =>
    set((state) => {
      const { [pathId]: _, ...rest } = state.debugLinks;
      return { debugLinks: rest };
    }),

  removeDebugLink: (pathId, linkId) =>
    set((state) => {
      const existing = state.debugLinks[pathId] ?? [];
      return {
        debugLinks: {
          ...state.debugLinks,
          [pathId]: existing.filter((l) => l.id !== linkId),
        },
      };
    }),

  setAutoValidate: (enabled) => set({ autoValidate: enabled }),

  setDebugPanelOpen: (open) => set({ debugPanelOpen: open }),

  setDebugActiveTab: (tab) => set({ debugActiveTab: tab, debugPanelOpen: true }),
});
