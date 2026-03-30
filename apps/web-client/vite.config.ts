import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const packagesDir = path.resolve(__dirname, '../../packages');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@pcb/domain': path.resolve(packagesDir, 'domain/src/index.ts'),
      '@pcb/api-contracts': path.resolve(packagesDir, 'api-contracts/src/index.ts'),
      '@pcb/editor-core': path.resolve(packagesDir, 'editor-core/src/index.ts'),
      '@pcb/render-pixi': path.resolve(packagesDir, 'render-pixi/src/index.ts'),
      '@pcb/render-three': path.resolve(packagesDir, 'render-three/src/index.ts'),
      '@pcb/rules-engine': path.resolve(packagesDir, 'rules-engine/src/index.ts'),
      '@pcb/ui-components': path.resolve(packagesDir, 'ui-components/src/index.ts'),
      '@pcb/project-serialization': path.resolve(packagesDir, 'project-serialization/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@pcb/domain',
      '@pcb/api-contracts',
      '@pcb/editor-core',
      '@pcb/render-pixi',
      '@pcb/render-three',
      '@pcb/rules-engine',
      '@pcb/ui-components',
      '@pcb/project-serialization',
    ],
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
