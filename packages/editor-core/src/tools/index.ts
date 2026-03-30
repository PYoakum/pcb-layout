import { EditorTool } from '../tools';
import type { ToolContext } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { SelectTool } from './select-tool';
import { PlaceTool } from './place-tool';
import { TraceTool } from './trace-tool';
import { PanTool } from './pan-tool';
import { MeasureTool } from './measure-tool';

export type { ToolHandler, ToolOperations, MeasurementOverlay } from './tool-handler';
export { NOOP_RESULT, dirtyResult } from './tool-handler';
export { SelectTool } from './select-tool';
export { PlaceTool } from './place-tool';
export { TraceTool } from './trace-tool';
export { PanTool } from './pan-tool';
export { MeasureTool } from './measure-tool';

/**
 * Factory to create a tool handler for a given editor tool type.
 */
export function createTool(type: EditorTool): ToolHandler {
  switch (type) {
    case EditorTool.Select:
      return new SelectTool();
    case EditorTool.Place:
      return new PlaceTool();
    case EditorTool.Trace:
      return new TraceTool();
    case EditorTool.Pan:
      return new PanTool();
    case EditorTool.Measure:
      return new MeasureTool();
  }
}
