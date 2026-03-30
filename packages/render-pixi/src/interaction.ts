import type { Point2D } from '@pcb/domain';
import {
  type ViewportState,
  type PointerEvent2D,
  type KeyEvent,
  screenToWorld,
  pan,
  zoomIn,
  zoomOut,
} from '@pcb/editor-core';

export type InteractionEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'dblclick'
  | 'keydown'
  | 'keyup'
  | 'wheel'
  | 'viewportchange';

export interface InteractionEvent {
  type: InteractionEventType;
  pointer?: PointerEvent2D;
  key?: KeyEvent;
  viewport?: ViewportState;
}

export type InteractionHandler = (event: InteractionEvent) => void;

/**
 * Manages mouse/keyboard interactions on the PixiJS canvas.
 * Translates raw DOM events into structured editor events.
 */
export class InteractionManager {
  private handlers = new Map<InteractionEventType, Set<InteractionHandler>>();
  private viewport: ViewportState;
  private canvas: HTMLCanvasElement | null = null;
  private isPanning = false;
  private panStart: Point2D = { x: 0, y: 0 };
  private spaceHeld = false;

  // Bound handlers for cleanup
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundDblClick: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(viewport: ViewportState) {
    this.viewport = viewport;
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundDblClick = this.onDblClick.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.boundPointerDown);
    canvas.addEventListener('pointermove', this.boundPointerMove);
    canvas.addEventListener('pointerup', this.boundPointerUp);
    canvas.addEventListener('dblclick', this.boundDblClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  detach(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    this.canvas.removeEventListener('pointerup', this.boundPointerUp);
    this.canvas.removeEventListener('dblclick', this.boundDblClick);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas = null;
  }

  on(type: InteractionEventType, handler: InteractionHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: InteractionEventType, handler: InteractionHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  updateViewport(viewport: ViewportState): void {
    this.viewport = viewport;
  }

  private emit(event: InteractionEvent): void {
    const set = this.handlers.get(event.type);
    if (set) {
      for (const h of set) h(event);
    }
  }

  private makePointerEvent(e: PointerEvent): PointerEvent2D {
    const rect = this.canvas!.getBoundingClientRect();
    const screenPoint: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return {
      screenPoint,
      worldPoint: screenToWorld(screenPoint, this.viewport),
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
    };
  }

  private makeKeyEvent(e: KeyboardEvent): KeyEvent {
    return {
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
    };
  }

  // --- Raw event handlers ---

  private onPointerDown(e: PointerEvent): void {
    const pe = this.makePointerEvent(e);

    // Middle button or space+left initiates pan
    if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    this.emit({ type: 'pointerdown', pointer: pe });
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.viewport = pan(this.viewport, dx, dy);
      this.emit({ type: 'viewportchange', viewport: this.viewport });
      return;
    }

    const pe = this.makePointerEvent(e);
    this.emit({ type: 'pointermove', pointer: pe });
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    const pe = this.makePointerEvent(e);
    this.emit({ type: 'pointerup', pointer: pe });
  }

  private onDblClick(e: MouseEvent): void {
    const rect = this.canvas!.getBoundingClientRect();
    const screenPoint: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const pe: PointerEvent2D = {
      screenPoint,
      worldPoint: screenToWorld(screenPoint, this.viewport),
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
    };
    this.emit({ type: 'dblclick', pointer: pe });
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas!.getBoundingClientRect();
    const focalPoint: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (e.deltaY < 0) {
      this.viewport = zoomIn(this.viewport, focalPoint);
    } else {
      this.viewport = zoomOut(this.viewport, focalPoint);
    }

    this.emit({ type: 'viewportchange', viewport: this.viewport });
    this.emit({ type: 'wheel' });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spaceHeld = true;
      e.preventDefault();
    }

    const ke = this.makeKeyEvent(e);
    this.emit({ type: 'keydown', key: ke });
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spaceHeld = false;
    }
    this.emit({ type: 'keyup', key: ke(e) });
  }
}

function ke(e: KeyboardEvent): KeyEvent {
  return {
    key: e.key,
    code: e.code,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey || e.metaKey,
    altKey: e.altKey,
  };
}
