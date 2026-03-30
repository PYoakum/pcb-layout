// Branded ID types for type safety
type Brand<T, B> = T & { readonly __brand: B };
export type ProjectId = Brand<string, 'ProjectId'>;
export type BoardId = Brand<string, 'BoardId'>;
export type LayerId = Brand<string, 'LayerId'>;
export type ModuleId = Brand<string, 'ModuleId'>;
export type ModuleInstanceId = Brand<string, 'ModuleInstanceId'>;
export type ComponentId = Brand<string, 'ComponentId'>;
export type FootprintId = Brand<string, 'FootprintId'>;
export type PadId = Brand<string, 'PadId'>;
export type PinId = Brand<string, 'PinId'>;
export type NetId = Brand<string, 'NetId'>;
export type TracePathId = Brand<string, 'TracePathId'>;
export type TraceSegmentId = Brand<string, 'TraceSegmentId'>;
export type ViaId = Brand<string, 'ViaId'>;
export type PlacementId = Brand<string, 'PlacementId'>;
export type DebugLinkId = Brand<string, 'DebugLinkId'>;
export type DesignRuleId = Brand<string, 'DesignRuleId'>;
export type LibraryAssetId = Brand<string, 'LibraryAssetId'>;
export type MountingHoleId = Brand<string, 'MountingHoleId'>;

// ID factory functions
export function createId<T extends string>(prefix: string): T {
  const uuid = globalThis.crypto?.randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}_${uuid}` as T;
}
