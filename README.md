# PCB Layout

A modular PCB design and layout platform with a 2D grid-based editor, 3D board visualization, and a REST API backend. Supports web and Electron desktop clients built from a shared codebase.

## Features

- **Infinite 2D canvas** with pan, zoom, snap-to-grid placement, and drag-and-drop editing (PixiJS)
- **3D board rendering** for final inspection with layer stack visualization (Three.js)
- **Multi-layer PCB design** with layer visibility toggles and lock/unlock controls
- **Modular design workflow** -- create reusable circuit modules and assemble them into larger boards
- **Trace routing** with stable path IDs, segment-level geometry, and debug inspection
- **Undo/redo** via a command pattern history stack
- **REST API** for programmatic CRUD on projects, boards, components, modules, paths, nets, and validation
- **Cross-platform** -- web browser and Electron desktop clients share the same editor core

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.7 |
| Runtime | Node.js / Bun |
| Backend | Fastify 5 |
| Frontend | React 18, Vite |
| 2D Rendering | PixiJS 8 |
| 3D Rendering | Three.js 0.170 |
| State Management | Zustand 5 |
| Desktop | Electron 33 |
| Testing | Vitest 3 |

## Monorepo Structure

```
pcb-layout/
  apps/
    api-server/        # Fastify REST API (port 3001)
    web-client/        # React + Vite web app (port 5173)
    electron-client/   # Electron desktop wrapper
  packages/
    domain/            # Core types -- board, component, geometry, trace, module, net
    api-contracts/     # Shared request/response types for the API
    editor-core/       # Framework-agnostic editor controller, tools, commands, viewport
    render-pixi/       # 2D rendering -- canvas, board, component, trace, grid renderers
    render-three/      # 3D rendering -- scene builder, layer stack, board extrusion
    rules-engine/      # Design rule checking and manufacturing constraints
    project-serialization/  # Project save/load and file I/O
    ui-components/     # Reusable React UI components
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) (used for running dev scripts)

### Install

```bash
npm install
```

### Development

Start the API server and web client concurrently:

```bash
npm run dev
```

This runs:
- **API server** at `http://localhost:3001`
- **Web client** at `http://localhost:5173`

### Build

```bash
npm run build
```

### Test

```bash
npm run test          # single run
npm run test:watch    # watch mode
```

## Architecture

```
Web / Electron Client
  └─ Zustand Store (board, editor, module, project slices)
       └─ Editor Core (tools: select, place, trace, measure, pan)
            ├─ Render Pixi (2D canvas, grid, components, traces)
            └─ Render Three (3D board, layer stack)

REST API (Fastify)
  └─ Routes: /api/projects, /api/boards, /api/components,
             /api/modules, /api/paths, /api/nets, /api/validation
       └─ In-memory store
```

Both renderers derive from the shared **domain** package, ensuring 2D and 3D representations stay in sync with a single canonical board model.

## Editor Tools

| Tool | Description |
|---|---|
| Select | Click or marquee-select components and traces |
| Place | Snap-to-grid component placement with rotation |
| Trace | Interactive copper trace routing between pads |
| Measure | Distance measurement overlay |
| Pan | Viewport panning |

## API Endpoints

| Group | Base Path | Operations |
|---|---|---|
| Projects | `/api/projects` | CRUD |
| Boards | `/api/boards` | CRUD, layer management |
| Components | `/api/components` | CRUD |
| Modules | `/api/modules` | CRUD, instance placement |
| Paths | `/api/paths` | CRUD, debug inspection |
| Nets | `/api/nets` | CRUD |
| Validation | `/api/validation` | Board and module validation |

## License

Private -- not licensed for distribution.
