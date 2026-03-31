import type { Project, Board, Module, Component, TracePath, DebugLink } from '@pcb/domain';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListResponse,
} from '@pcb/api-contracts';
import type {
  CreateBoardRequest,
  UpdateBoardRequest,
  BoardListResponse,
} from '@pcb/api-contracts';
import type { CreateModuleRequest, ModuleListResponse } from '@pcb/api-contracts';
import type {
  CreateComponentRequest,
  UpdateComponentRequest,
  ComponentListResponse,
} from '@pcb/api-contracts';
import type {
  CreateTracePathRequest,
  TracePathListResponse,
  TracePathDebugResponse,
} from '@pcb/api-contracts';
import type { ValidationRequest, ValidationResponse } from '@pcb/api-contracts';
import type { ApiResponse, ErrorResponse } from '@pcb/api-contracts';

const BASE_URL = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`;

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorType: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody: ErrorResponse;
    try {
      errorBody = await res.json();
    } catch {
      throw new ApiError(res.status, 'unknown', res.statusText);
    }
    throw new ApiError(errorBody.statusCode, errorBody.error, errorBody.message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ── Projects ──

export async function getProjects(): Promise<ProjectListResponse> {
  return request('GET', '/api/projects');
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  return request('GET', `/api/projects/${id}`);
}

export async function createProject(
  data: CreateProjectRequest,
): Promise<ApiResponse<Project>> {
  return request('POST', '/api/projects', data);
}

export async function updateProject(
  id: string,
  data: UpdateProjectRequest,
): Promise<ApiResponse<Project>> {
  return request('PATCH', `/api/projects/${id}`, data);
}

export async function deleteProject(id: string): Promise<void> {
  return request('DELETE', `/api/projects/${id}`);
}

// ── Boards ──

export async function getBoards(projectId: string): Promise<BoardListResponse> {
  return request('GET', `/api/projects/${projectId}/boards`);
}

export async function getBoard(
  projectId: string,
  boardId: string,
): Promise<ApiResponse<Board>> {
  return request('GET', `/api/projects/${projectId}/boards/${boardId}`);
}

export async function createBoard(
  data: CreateBoardRequest,
): Promise<ApiResponse<Board>> {
  return request('POST', `/api/projects/${data.projectId}/boards`, data);
}

export async function updateBoard(
  projectId: string,
  boardId: string,
  data: UpdateBoardRequest,
): Promise<ApiResponse<Board>> {
  return request('PATCH', `/api/projects/${projectId}/boards/${boardId}`, data);
}

export async function deleteBoard(
  projectId: string,
  boardId: string,
): Promise<void> {
  return request('DELETE', `/api/projects/${projectId}/boards/${boardId}`);
}

// ── Modules ──

export async function getModules(projectId: string): Promise<ModuleListResponse> {
  return request('GET', `/api/projects/${projectId}/modules`);
}

export async function getModule(
  projectId: string,
  moduleId: string,
): Promise<ApiResponse<Module>> {
  return request('GET', `/api/projects/${projectId}/modules/${moduleId}`);
}

export async function createModule(
  projectId: string,
  data: CreateModuleRequest,
): Promise<ApiResponse<Module>> {
  return request('POST', `/api/projects/${projectId}/modules`, data);
}

export async function updateModule(
  projectId: string,
  moduleId: string,
  data: Partial<CreateModuleRequest>,
): Promise<ApiResponse<Module>> {
  return request('PUT', `/api/projects/${projectId}/modules/${moduleId}`, data);
}

export async function deleteModule(
  projectId: string,
  moduleId: string,
): Promise<void> {
  return request('DELETE', `/api/projects/${projectId}/modules/${moduleId}`);
}

export async function getModuleComponents(
  projectId: string,
  moduleId: string,
): Promise<{ data: Component[]; total: number }> {
  return request('GET', `/api/projects/${projectId}/modules/${moduleId}/components`);
}

export async function validateModule(
  projectId: string,
  moduleId: string,
): Promise<ValidationResponse> {
  return request('POST', `/api/projects/${projectId}/modules/${moduleId}/validate`);
}

export async function instantiateModule(
  projectId: string,
  moduleId: string,
  position?: { x: number; y: number },
): Promise<ApiResponse<unknown>> {
  return request('POST', `/api/projects/${projectId}/modules/${moduleId}/instantiate`, { position });
}

export async function getModuleVersions(
  projectId: string,
  moduleId: string,
): Promise<{ data: Array<{ version: string; createdAt: string; updatedAt: string; current: boolean }>; total: number }> {
  return request('GET', `/api/projects/${projectId}/modules/${moduleId}/versions`);
}

// ── Components ──

export async function getComponents(
  projectId: string,
  boardId: string,
): Promise<ComponentListResponse> {
  return request('GET', `/api/projects/${projectId}/boards/${boardId}/components`);
}

export async function createComponent(
  projectId: string,
  boardId: string,
  data: CreateComponentRequest,
): Promise<ApiResponse<Component>> {
  return request(
    'POST',
    `/api/projects/${projectId}/boards/${boardId}/components`,
    data,
  );
}

export async function updateComponent(
  projectId: string,
  boardId: string,
  componentId: string,
  data: UpdateComponentRequest,
): Promise<ApiResponse<Component>> {
  return request(
    'PATCH',
    `/api/projects/${projectId}/boards/${boardId}/components/${componentId}`,
    data,
  );
}

// ── Trace Paths ──

export async function getPaths(
  projectId: string,
  boardId: string,
): Promise<TracePathListResponse> {
  return request('GET', `/api/projects/${projectId}/boards/${boardId}/paths`);
}

export async function getPath(
  projectId: string,
  boardId: string,
  pathId: string,
): Promise<ApiResponse<TracePath>> {
  return request(
    'GET',
    `/api/projects/${projectId}/boards/${boardId}/paths/${pathId}`,
  );
}

export async function getPathDebug(
  projectId: string,
  boardId: string,
  pathId: string,
): Promise<TracePathDebugResponse> {
  return request(
    'GET',
    `/api/projects/${projectId}/boards/${boardId}/paths/${pathId}/debug`,
  );
}

// ── Save ──

/**
 * Save the current board state to the API server.
 * Syncs components and traces so the server has the latest data.
 */
export async function saveBoard(
  boardId: string,
  components: Component[],
  traces: TracePath[],
): Promise<void> {
  // Sync components
  const existingComps = await request<{ data: Component[] }>('GET', `/api/components?boardId=${boardId}`);
  const existingIds = new Set(existingComps.data.map((c) => c.id));

  for (const comp of components) {
    if (existingIds.has(comp.id)) {
      await request('PUT', `/api/components/${comp.id}`, comp);
    } else {
      await request('POST', '/api/components', { ...comp, boardId });
    }
  }

  // Sync traces
  const existingPaths = await request<{ data: TracePath[] }>('GET', `/api/paths?boardId=${boardId}`);
  const existingPathIds = new Set(existingPaths.data.map((p) => p.id));

  for (const trace of traces) {
    if (existingPathIds.has(trace.id)) {
      await request('PUT', `/api/paths/${trace.id}`, {
        segments: trace.segments.map(({ layerId, start, end, width }) => ({ layerId, start, end, width })),
        vias: trace.vias.map(({ position, fromLayerId, toLayerId, outerDiameter, drillDiameter, netId }) => ({ position, fromLayerId, toLayerId, outerDiameter, drillDiameter, netId })),
      });
    } else {
      await request('POST', '/api/paths', {
        netId: trace.netId,
        boardId,
        segments: trace.segments.map(({ layerId, start, end, width }) => ({ layerId, start, end, width })),
        vias: trace.vias.map(({ position, fromLayerId, toLayerId, outerDiameter, drillDiameter, netId }) => ({ position, fromLayerId, toLayerId, outerDiameter, drillDiameter, netId })),
      });
    }
  }
}

// ── Screenshot ──

export async function screenshotBoard(boardId: string, mode: '2d' | '3d' = '2d'): Promise<void> {
  const url = `${BASE_URL}/api/boards/${boardId}/screenshot?mode=${mode}&width=1920&height=1080`;
  const res = await fetch(url);

  if (!res.ok) {
    let errorBody: ErrorResponse;
    try {
      errorBody = await res.json();
    } catch {
      throw new ApiError(res.status, 'unknown', res.statusText);
    }
    throw new ApiError(errorBody.statusCode, errorBody.error, errorBody.message);
  }

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `board_${mode}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ── Export ──

export type ExportFormat = 'pcb' | 'kicad_pcb' | 'brd' | 'PcbDoc';

export async function exportProject(
  projectId: string,
  format: ExportFormat = 'pcb',
): Promise<void> {
  const url = `${BASE_URL}/api/projects/${projectId}/export?format=${format}`;
  const res = await fetch(url);

  if (!res.ok) {
    let errorBody: ErrorResponse;
    try {
      errorBody = await res.json();
    } catch {
      throw new ApiError(res.status, 'unknown', res.statusText);
    }
    throw new ApiError(errorBody.statusCode, errorBody.error, errorBody.message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename="(.+?)"/);
  const filename = filenameMatch?.[1] ?? `project.${format === 'pcb' ? 'pcb' : format}`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ── Validation ──

export async function validateBoard(
  projectId: string,
  boardId: string,
  data?: ValidationRequest,
): Promise<ValidationResponse> {
  return request(
    'POST',
    `/api/projects/${projectId}/boards/${boardId}/validate`,
    data,
  );
}
