import type { ProjectFile, SerializedBoard, SerializedModule, SerializedTracePath } from './types';
import { CURRENT_VERSION, FORMAT_TYPE } from './types';

// ─── Result Types ────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;       // JSON-path-like location (e.g. "project.boards[0].id")
  code: ValidationErrorCode;
  message: string;
}

export interface ValidationWarning {
  path: string;
  code: string;
  message: string;
}

export type ValidationErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_TYPE'
  | 'INVALID_VERSION'
  | 'INVALID_FORMAT_TYPE'
  | 'DUPLICATE_ID'
  | 'BROKEN_REFERENCE'
  | 'INVALID_VALUE';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate an unknown value as a ProjectFile. Checks structural validity,
 * version compatibility, ID uniqueness, and reference integrity.
 */
export function validateProjectFile(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({
      path: '',
      code: 'INVALID_TYPE',
      message: 'Project file must be a non-null object',
    });
    return { valid: false, errors, warnings };
  }

  const file = data as Record<string, unknown>;

  // Top-level envelope
  validateEnvelope(file, errors, warnings);

  // If envelope is invalid, skip deeper checks
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const project = file['project'] as Record<string, unknown>;
  validateProject(project, errors, warnings);

  // ID uniqueness check across entire file
  validateIdUniqueness(file as unknown as ProjectFile, errors);

  // Reference integrity
  if (errors.length === 0) {
    validateReferenceIntegrity(file as unknown as ProjectFile, errors, warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Envelope ────────────────────────────────────────────────────────────────

function validateEnvelope(
  file: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  // version
  if (typeof file['version'] !== 'string') {
    errors.push({ path: 'version', code: 'MISSING_FIELD', message: 'Missing or invalid version' });
  } else if (!isCompatibleVersion(file['version'] as string)) {
    errors.push({
      path: 'version',
      code: 'INVALID_VERSION',
      message: `Unsupported version "${file['version']}". Current: ${CURRENT_VERSION}`,
    });
  }

  // formatType
  if (file['formatType'] !== FORMAT_TYPE) {
    errors.push({
      path: 'formatType',
      code: 'INVALID_FORMAT_TYPE',
      message: `Expected formatType "${FORMAT_TYPE}", got "${file['formatType']}"`,
    });
  }

  // timestamps
  requireString(file, 'createdAt', 'createdAt', errors);
  requireString(file, 'updatedAt', 'updatedAt', errors);

  // project
  if (typeof file['project'] !== 'object' || file['project'] === null) {
    errors.push({ path: 'project', code: 'MISSING_FIELD', message: 'Missing project object' });
  }
}

// ─── Project ─────────────────────────────────────────────────────────────────

function validateProject(
  project: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  requireString(project, 'id', 'project.id', errors);
  requireString(project, 'name', 'project.name', errors);

  if (typeof project['description'] !== 'string') {
    warnings.push({
      path: 'project.description',
      code: 'MISSING_OPTIONAL',
      message: 'Project description is missing',
    });
  }

  if (typeof project['settings'] !== 'object' || project['settings'] === null) {
    errors.push({ path: 'project.settings', code: 'MISSING_FIELD', message: 'Missing project settings' });
  }

  // boards
  if (!Array.isArray(project['boards'])) {
    errors.push({ path: 'project.boards', code: 'INVALID_TYPE', message: 'boards must be an array' });
  } else {
    (project['boards'] as unknown[]).forEach((board, i) => {
      if (typeof board === 'object' && board !== null) {
        validateBoard(board as Record<string, unknown>, `project.boards[${i}]`, errors, warnings);
      } else {
        errors.push({
          path: `project.boards[${i}]`,
          code: 'INVALID_TYPE',
          message: 'Board entry must be an object',
        });
      }
    });
  }

  // modules
  if (!Array.isArray(project['modules'])) {
    errors.push({ path: 'project.modules', code: 'INVALID_TYPE', message: 'modules must be an array' });
  }

  // libraryAssets
  if (!Array.isArray(project['libraryAssets'])) {
    errors.push({
      path: 'project.libraryAssets',
      code: 'INVALID_TYPE',
      message: 'libraryAssets must be an array',
    });
  }
}

// ─── Board ───────────────────────────────────────────────────────────────────

function validateBoard(
  board: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
  _warnings: ValidationWarning[],
): void {
  requireString(board, 'id', `${path}.id`, errors);
  requireString(board, 'name', `${path}.name`, errors);

  if (typeof board['workspace'] !== 'object' || board['workspace'] === null) {
    errors.push({ path: `${path}.workspace`, code: 'MISSING_FIELD', message: 'Missing workspace config' });
  }

  requireArray(board, 'layers', `${path}.layers`, errors);
  requireArray(board, 'components', `${path}.components`, errors);
  requireArray(board, 'nets', `${path}.nets`, errors);
  requireArray(board, 'paths', `${path}.paths`, errors);
  requireArray(board, 'moduleInstances', `${path}.moduleInstances`, errors);
  requireArray(board, 'designRules', `${path}.designRules`, errors);
}

// ─── ID Uniqueness ───────────────────────────────────────────────────────────

function validateIdUniqueness(file: ProjectFile, errors: ValidationError[]): void {
  const seen = new Map<string, string>(); // id -> first location

  function trackId(id: string, location: string): void {
    if (seen.has(id)) {
      errors.push({
        path: location,
        code: 'DUPLICATE_ID',
        message: `Duplicate ID "${id}" (first seen at ${seen.get(id)})`,
      });
    } else {
      seen.set(id, location);
    }
  }

  const p = file.project;

  // Board IDs
  p.boards.forEach((board, bi) => {
    const bp = `project.boards[${bi}]`;
    trackId(board.id, `${bp}.id`);
    collectIdsFromBoard(board, bp, trackId);
  });

  // Module IDs
  p.modules.forEach((mod, mi) => {
    const mp = `project.modules[${mi}]`;
    trackId(mod.id, `${mp}.id`);
    mod.components.forEach((c, ci) => trackId(c.id, `${mp}.components[${ci}].id`));
    mod.internalNets.forEach((n, ni) => trackId(n.id, `${mp}.internalNets[${ni}].id`));
    mod.internalPaths.forEach((tp, ti) => {
      trackId(tp.id, `${mp}.internalPaths[${ti}].id`);
      collectIdsFromPath(tp, `${mp}.internalPaths[${ti}]`, trackId);
    });
  });

  // Library asset IDs
  p.libraryAssets.forEach((a, ai) => {
    trackId(a.id, `project.libraryAssets[${ai}].id`);
  });
}

function collectIdsFromBoard(
  board: SerializedBoard,
  bp: string,
  trackId: (id: string, location: string) => void,
): void {
  board.components.forEach((c, ci) => {
    trackId(c.id, `${bp}.components[${ci}].id`);
    trackId(c.footprint.id, `${bp}.components[${ci}].footprint.id`);
    c.footprint.pads.forEach((pad, pi) => trackId(pad.id, `${bp}.components[${ci}].footprint.pads[${pi}].id`));
    c.footprint.pins.forEach((pin, pi) => trackId(pin.id, `${bp}.components[${ci}].footprint.pins[${pi}].id`));
  });

  board.nets.forEach((n, ni) => trackId(n.id, `${bp}.nets[${ni}].id`));

  board.paths.forEach((tp, ti) => {
    trackId(tp.id, `${bp}.paths[${ti}].id`);
    collectIdsFromPath(tp, `${bp}.paths[${ti}]`, trackId);
  });

  board.moduleInstances.forEach((mi, idx) => trackId(mi.id, `${bp}.moduleInstances[${idx}].id`));
  board.designRules.forEach((dr, idx) => trackId(dr.id, `${bp}.designRules[${idx}].id`));
}

function collectIdsFromPath(
  tp: SerializedTracePath,
  prefix: string,
  trackId: (id: string, location: string) => void,
): void {
  tp.segments.forEach((seg, si) => trackId(seg.id, `${prefix}.segments[${si}].id`));
  tp.vias.forEach((via, vi) => trackId(via.id, `${prefix}.vias[${vi}].id`));
  tp.debugLinks.forEach((dl, di) => trackId(dl.id, `${prefix}.debugLinks[${di}].id`));
}

// ─── Reference Integrity ────────────────────────────────────────────────────

function validateReferenceIntegrity(
  file: ProjectFile,
  errors: ValidationError[],
  _warnings: ValidationWarning[],
): void {
  // Collect all known IDs
  const allIds = new Set<string>();
  allIds.add(file.project.id);

  for (const board of file.project.boards) {
    allIds.add(board.id);
    for (const layer of board.layers) allIds.add(layer.id as string);
    for (const comp of board.components) {
      allIds.add(comp.id);
      allIds.add(comp.footprint.id);
      for (const pad of comp.footprint.pads) allIds.add(pad.id);
      for (const pin of comp.footprint.pins) allIds.add(pin.id);
    }
    for (const net of board.nets) allIds.add(net.id);
    for (const path of board.paths) {
      allIds.add(path.id);
      for (const seg of path.segments) allIds.add(seg.id);
      for (const via of path.vias) allIds.add(via.id);
      for (const dl of path.debugLinks) allIds.add(dl.id);
    }
    for (const mi of board.moduleInstances) allIds.add(mi.id);
    for (const dr of board.designRules) allIds.add(dr.id);
  }

  for (const mod of file.project.modules) {
    allIds.add(mod.id);
    for (const c of mod.components) allIds.add(c.id);
    for (const n of mod.internalNets) allIds.add(n.id);
    for (const p of mod.internalPaths) allIds.add(p.id);
  }

  // Check net references (pathIds must reference paths in the same board)
  for (const board of file.project.boards) {
    const boardPathIds = new Set(board.paths.map((p) => p.id));
    for (const net of board.nets) {
      for (const pathId of net.pathIds) {
        if (!boardPathIds.has(pathId)) {
          // The path may exist in the file but not on this board -- just warn-level
          if (!allIds.has(pathId)) {
            errors.push({
              path: `net(${net.id}).pathIds`,
              code: 'BROKEN_REFERENCE',
              message: `Net "${net.name}" references unknown path "${pathId}"`,
            });
          }
        }
      }
    }
  }

  // Check moduleInstance.moduleId references
  for (const board of file.project.boards) {
    const moduleIds = new Set(file.project.modules.map((m) => m.id));
    for (const mi of board.moduleInstances) {
      if (!moduleIds.has(mi.moduleId)) {
        errors.push({
          path: `moduleInstance(${mi.id}).moduleId`,
          code: 'BROKEN_REFERENCE',
          message: `ModuleInstance "${mi.id}" references unknown module "${mi.moduleId}"`,
        });
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireString(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
    errors.push({ path, code: 'MISSING_FIELD', message: `Missing or empty required field "${key}"` });
  }
}

function requireArray(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): void {
  if (!Array.isArray(obj[key])) {
    errors.push({ path, code: 'INVALID_TYPE', message: `"${key}" must be an array` });
  }
}

/**
 * Check if a file version is compatible with this deserializer.
 * Currently only exact major version match is required.
 */
function isCompatibleVersion(version: string): boolean {
  const parts = version.split('.');
  if (parts.length !== 3) return false;
  const major = parseInt(parts[0], 10);
  // Major version 1 is the only supported version
  return major === 1;
}
