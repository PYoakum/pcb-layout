import { useStore } from '../../store';
import { Canvas2D } from './Canvas2D';
import { Canvas3D } from './Canvas3D';
import { CanvasErrorBoundary } from './ErrorBoundary';

/**
 * Wrapper component that switches between the 2D PixiJS canvas
 * and the 3D Three.js scene based on the UI mode store value.
 */
export function CanvasContainer() {
  const mode = useStore((s) => s.mode);

  return (
    <div className="canvas-container-wrapper">
      {mode === '2d' && (
        <CanvasErrorBoundary>
          <Canvas2D />
        </CanvasErrorBoundary>
      )}
      {mode === '3d' && (
        <CanvasErrorBoundary>
          <Canvas3D />
        </CanvasErrorBoundary>
      )}
    </div>
  );
}
