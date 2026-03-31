/**
 * In-memory data store — placeholder for future PostgreSQL integration.
 * Provides generic CRUD operations over typed entity maps.
 */

export class EntityStore<T extends { id: string }> {
  private items: Map<string, T> = new Map();

  getAll(filter?: (item: T) => boolean): T[] {
    const all = Array.from(this.items.values());
    return filter ? all.filter(filter) : all;
  }

  getById(id: string): T | undefined {
    return this.items.get(id);
  }

  create(item: T): T {
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, partial: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial, id: existing.id } as T;
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  count(filter?: (item: T) => boolean): number {
    if (!filter) return this.items.size;
    return this.getAll(filter).length;
  }
}

import type { Project, Board, Module, Component, TracePath, Net, DebugLink, DesignRule } from '@pcb/domain';

export interface Store {
  projects: EntityStore<Project>;
  boards: EntityStore<Board>;
  modules: EntityStore<Module>;
  components: EntityStore<Component & { boardId: string }>;
  paths: EntityStore<TracePath & { boardId: string }>;
  nets: EntityStore<Net & { boardId: string }>;
  debugLinks: EntityStore<DebugLink>;
  designRules: EntityStore<DesignRule & { boardId: string }>;
}

export function createStore(): Store {
  return {
    projects: new EntityStore(),
    boards: new EntityStore(),
    modules: new EntityStore(),
    components: new EntityStore(),
    paths: new EntityStore(),
    nets: new EntityStore(),
    debugLinks: new EntityStore(),
    designRules: new EntityStore(),
  };
}
