import type { ProjectFile } from './types';
import { CURRENT_VERSION } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  migrate: (file: ProjectFile) => ProjectFile;
}

export interface MigrationResult {
  file: ProjectFile;
  migrationsApplied: string[]; // versions migrated through
}

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * Ordered list of migration steps. Each step transforms a ProjectFile from
 * one version to the next. Add new entries here as the format evolves.
 *
 * Example future entry:
 * {
 *   fromVersion: '1.0.0',
 *   toVersion: '1.1.0',
 *   migrate: (file) => {
 *     // add new field with default
 *     return { ...file, version: '1.1.0' };
 *   },
 * }
 */
const migrations: MigrationStep[] = [
  // No migrations yet -- 1.0.0 is the initial version.
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Migrate a ProjectFile to the target version (defaults to CURRENT_VERSION).
 * Applies migration steps in sequence.
 *
 * Throws if no migration path exists from the file's version to the target.
 */
export function migrateProjectFile(
  file: ProjectFile,
  targetVersion: string = CURRENT_VERSION,
): MigrationResult {
  const applied: string[] = [];

  if (file.version === targetVersion) {
    return { file, migrationsApplied: applied };
  }

  let current = file;
  let currentVersion = file.version;

  // Safety limit to avoid infinite loops from misconfigured migrations
  const maxSteps = 100;
  let steps = 0;

  while (currentVersion !== targetVersion && steps < maxSteps) {
    const step = migrations.find((m) => m.fromVersion === currentVersion);

    if (!step) {
      throw new Error(
        `No migration path from version "${currentVersion}" to "${targetVersion}". ` +
          `Applied so far: [${applied.join(' -> ')}]`,
      );
    }

    current = step.migrate(current);
    applied.push(`${step.fromVersion} -> ${step.toVersion}`);
    currentVersion = step.toVersion;
    steps++;
  }

  if (steps >= maxSteps) {
    throw new Error(
      `Migration exceeded maximum steps (${maxSteps}). Possible cycle in migration chain.`,
    );
  }

  return { file: current, migrationsApplied: applied };
}

/**
 * Check whether a migration path exists from a given version to the target.
 */
export function canMigrate(
  fromVersion: string,
  targetVersion: string = CURRENT_VERSION,
): boolean {
  if (fromVersion === targetVersion) return true;

  const visited = new Set<string>();
  let current = fromVersion;

  while (current !== targetVersion) {
    if (visited.has(current)) return false;
    visited.add(current);

    const step = migrations.find((m) => m.fromVersion === current);
    if (!step) return false;
    current = step.toVersion;
  }

  return true;
}

/**
 * Register a custom migration step. Useful for extensions or testing.
 */
export function registerMigration(step: MigrationStep): void {
  migrations.push(step);
  // Keep sorted by fromVersion for deterministic ordering
  migrations.sort((a, b) => a.fromVersion.localeCompare(b.fromVersion));
}
