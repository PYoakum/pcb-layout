import { useEffect, useRef, useState } from 'react';
import { PCBCanvas } from '@pcb/render-pixi';
import type { SelectionState } from '@pcb/editor-core';
import { EditorController, EditorTool } from '@pcb/editor-core';
import type { LayerId } from '@pcb/domain';
import { useStore } from '../../store';
import { createComponentFromLibrary } from '../../data/component-factory';

function toEditorTool(tool: string): EditorTool {
  switch (tool) {
    case 'select': return EditorTool.Select;
    case 'place': return EditorTool.Place;
    case 'trace': return EditorTool.Trace;
    case 'pan': return EditorTool.Pan;
    case 'measure': return EditorTool.Measure;
    default: return EditorTool.Select;
  }
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<PCBCanvas | null>(null);
  const controllerRef = useRef<EditorController | null>(null);
  const [ready, setReady] = useState(false);

  // Store selectors
  const currentBoard = useStore((s) => s.currentBoard);
  const activeTool = useStore((s) => s.activeTool);
  const components = useStore((s) => s.components);
  const traces = useStore((s) => s.traces);
  const gridVisible = useStore((s) => s.gridVisible);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const placementTemplate = useStore((s) => s.placementTemplate);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const cursor = useStore((s) => s.cursor);
  const viewport = useStore((s) => s.viewport);

  // Store actions (stable refs via zustand)
  const setViewport = useStore((s) => s.setViewport);
  const setSelectedIds = useStore((s) => s.setSelectedIds);
  const setHoveredId = useStore((s) => s.setHoveredId);
  const setComponents = useStore((s) => s.setComponents);
  const setTraces = useStore((s) => s.setTraces);
  const setCanUndo = useStore((s) => s.setCanUndo);
  const setCanRedo = useStore((s) => s.setCanRedo);
  const setGhostComponent = useStore((s) => s.setGhostComponent);
  const setActiveTracePoints = useStore((s) => s.setActiveTracePoints);
  const setMeasurement = useStore((s) => s.setMeasurement);
  const setCursor = useStore((s) => s.setCursor);

  // Keep a mutable ref to store actions so the onStateChange callback stays stable
  const actionsRef = useRef({
    setViewport, setSelectedIds, setHoveredId, setComponents, setTraces,
    setCanUndo, setCanRedo, setGhostComponent, setActiveTracePoints,
    setMeasurement, setCursor,
  });
  actionsRef.current = {
    setViewport, setSelectedIds, setHoveredId, setComponents, setTraces,
    setCanUndo, setCanRedo, setGhostComponent, setActiveTracePoints,
    setMeasurement, setCursor,
  };

  // ---- Mount: create canvas + controller, wire events ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = new PCBCanvas();
    const controller = new EditorController();
    canvasRef.current = canvas;
    controllerRef.current = controller;
    setReady(false);

    // Controller state changes → push to store (but NOT back to canvas here;
    // canvas gets updated via the React effects below to avoid loops).
    controller.onStateChange = (state) => {
      const a = actionsRef.current;
      a.setSelectedIds(Array.from(state.selection.selectedIds));
      a.setHoveredId(state.selection.hoveredId);
      a.setComponents([...state.components]);
      a.setTraces([...state.traces]);
      a.setCanUndo(state.canUndo);
      a.setCanRedo(state.canRedo);
      a.setGhostComponent(state.ghostComponent ?? null);
      a.setActiveTracePoints(state.activeTracePoints ?? null);
      a.setMeasurement(state.measurement ?? null);
      a.setCursor(state.cursor);
      a.setViewport({ x: state.viewport.x, y: state.viewport.y, zoom: state.viewport.zoom });

      // Push overlay state directly to canvas (bypasses React render cycle)
      if (canvasRef.current) {
        canvasRef.current.setComponents(state.components);
        canvasRef.current.setTraces(state.traces);
        canvasRef.current.setGhostComponent(state.ghostComponent ?? null);
        canvasRef.current.setActiveTracePoints(state.activeTracePoints ?? null);
        const sel: SelectionState = {
          selectedIds: state.selection.selectedIds,
          hoveredId: state.selection.hoveredId,
          lastClickedId: state.selection.lastClickedId,
        };
        canvasRef.current.setSelection(sel);
      }
    };

    let destroyed = false;

    canvas.init({ container }).then(() => {
      if (destroyed) return;
      setReady(true);

      const im = canvas.getInteractionManager();

      im.on('viewportchange', (e) => {
        if (!e.viewport) return;
        controller.setViewport(e.viewport);
        canvas.setViewport(e.viewport);
      });
      im.on('pointerdown', (e) => { if (e.pointer) controller.handlePointerDown(e.pointer); });
      im.on('pointermove', (e) => {
        if (e.pointer) {
          controller.handlePointerMove(e.pointer);
          useStore.getState().setCursorWorldPosition(e.pointer.worldPoint);
        }
      });
      im.on('pointerup', (e) => { if (e.pointer) controller.handlePointerUp(e.pointer); });
      im.on('dblclick', (e) => { if (e.pointer) controller.handleDoubleClick(e.pointer); });
      im.on('keydown', (e) => { if (e.key) controller.handleKeyDown(e.key); });

      // Now that we're ready, do the initial render with current store data
      const board = useStore.getState().currentBoard;
      if (board) canvas.setBoard(board);
      const comps = useStore.getState().components;
      const trs = useStore.getState().traces;
      controller.setComponents([...comps]);
      controller.setTraces([...trs]);
      canvas.setComponents(comps);
      canvas.setTraces(trs);

      // Set active layer
      const layId = useStore.getState().activeLayerId;
      const firstLayerId = board?.layers[0]?.id ?? '' as LayerId;
      controller.setActiveLayerId((layId || firstLayerId) as LayerId);

      // Set the active tool
      const tool = useStore.getState().activeTool;
      controller.setActiveTool(toEditorTool(tool));

      // Set placement template if one is pending
      const tpl = useStore.getState().placementTemplate;
      if (tpl) {
        controller.setPlacementTemplate(createComponentFromLibrary(tpl, (layId || firstLayerId) as LayerId, 1));
      }

      canvas.render();
    });

    return () => {
      destroyed = true;
      setReady(false);
      try { canvas.destroy(); } catch { /* ok */ }
      canvasRef.current = null;
      controllerRef.current = null;
    };
  }, []);

  // ---- Sync board, components, traces to canvas ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || !currentBoard) return;
    canvas.setBoard(currentBoard);
    canvas.setComponents(components);
    canvas.setTraces(traces);
  }, [ready, currentBoard, components, traces]);

  // ---- Sync viewport from store → canvas/controller (for zoom buttons etc.) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !ready) return;
    const cv = canvas.getViewport();
    if (cv.x !== viewport.x || cv.y !== viewport.y || cv.zoom !== viewport.zoom) {
      const newVp = { ...cv, ...viewport };
      canvas.setViewport(newVp);
      controller?.setViewport(newVp);
    }
  }, [ready, viewport]);

  // ---- Sync active tool ----
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !ready) return;
    controller.setActiveTool(toEditorTool(activeTool));
  }, [ready, activeTool]);

  // ---- Sync placement template ----
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !ready || !placementTemplate) return;
    const layerId = activeLayerId || (currentBoard?.layers[0]?.id ?? '' as LayerId);
    controller.setPlacementTemplate(createComponentFromLibrary(placementTemplate, layerId, 1));
  }, [ready, placementTemplate, activeLayerId, currentBoard]);

  // ---- Sync trace width ----
  const traceWidth = useStore((s) => s.traceWidth);
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setTraceWidth(traceWidth);
  }, [traceWidth]);

  // ---- Sync active layer ----
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !ready) return;
    const layerId = activeLayerId || (currentBoard?.layers[0]?.id ?? '' as LayerId);
    controller.setActiveLayerId(layerId as LayerId);
  }, [ready, activeLayerId, currentBoard]);

  // ---- Sync grid/snap ----
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setGridConfig({
      spacingX: 50, spacingY: 50, subdivisions: 2,
      visible: gridVisible, snapEnabled,
    });
  }, [gridVisible, snapEnabled]);

  return (
    <div
      ref={containerRef}
      className="canvas-container canvas-container--2d"
      style={{ cursor: cursor || 'default' }}
    />
  );
}
