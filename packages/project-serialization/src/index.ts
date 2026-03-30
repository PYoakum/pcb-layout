// Types
export type {
  ProjectFile,
  SerializedProject,
  SerializedBoard,
  SerializedComponent,
  SerializedFootprint,
  SerializedPad,
  SerializedPin,
  SerializedNet,
  SerializedTracePath,
  SerializedTraceSegment,
  SerializedVia,
  SerializedDebugLink,
  SerializedModule,
  SerializedModuleInstance,
  SerializedDesignRule,
  SerializedLibraryAsset,
} from './types';
export { CURRENT_VERSION, FORMAT_TYPE } from './types';

// Serializer
export type { SerializeProjectInput } from './serializer';
export {
  serializeProject,
  serializeBoard,
  serializeModule,
  serializeComponent,
  serializeNet,
  serializeTracePath,
  serializeDebugLink,
  serializeDesignRule,
  serializeModuleInstance,
  serializeLibraryAsset,
} from './serializer';

// Deserializer
export type { DeserializedProject } from './deserializer';
export { deserializeProject } from './deserializer';

// Validator
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationErrorCode,
} from './validator';
export { validateProjectFile } from './validator';

// Migration
export type { MigrationStep, MigrationResult } from './migration';
export { migrateProjectFile, canMigrate, registerMigration } from './migration';
