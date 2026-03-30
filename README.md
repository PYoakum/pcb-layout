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
- **Export** projects as `.pcb` files (JSON-based serialization format)
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

---

## API Reference

Base URL: `http://localhost:3001`

All coordinates are in **mils** (thousandths of an inch). Grid snap is 5 mils. All IDs are prefixed branded strings (e.g. `proj_abc123`, `board_def456`).

### Response Envelope

All successful responses returning a single entity use:

```json
{
  "data": { ... }
}
```

All successful responses returning a list use:

```json
{
  "data": [ ... ],
  "total": 5
}
```

All error responses use:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Project not found"
}
```

### Health Check

```
GET /health
```

Returns `{ "status": "ok", "timestamp": "..." }`.

---

### Projects

#### List all projects

```
GET /api/projects
```

**Response** `200`

```json
{
  "data": [
    {
      "id": "proj_...",
      "name": "My Board",
      "description": "A PCB project",
      "boards": ["board_..."],
      "modules": ["mod_..."],
      "libraryAssets": [],
      "settings": {
        "defaultGridSpacing": 5,
        "defaultLayerCount": 2,
        "defaultBoardWidth": 3000,
        "defaultBoardHeight": 2000,
        "units": "mils"
      },
      "createdAt": "2026-03-29T00:00:00.000Z",
      "updatedAt": "2026-03-29T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### Create a project

```
POST /api/projects
Content-Type: application/json
```

**Request body**

```json
{
  "name": "My Board",
  "description": "A PCB project",
  "settings": {
    "defaultGridSpacing": 5,
    "defaultLayerCount": 4,
    "units": "mils"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Project name |
| `description` | string | yes | Project description |
| `settings` | object | no | Partial `ProjectSettings` override |
| `settings.defaultGridSpacing` | number | no | Grid spacing in mils (default: 5) |
| `settings.defaultLayerCount` | number | no | Default layer count (default: 2) |
| `settings.defaultBoardWidth` | number | no | Default board width in mils (default: 3000) |
| `settings.defaultBoardHeight` | number | no | Default board height in mils (default: 2000) |
| `settings.units` | `"mils"` \| `"mm"` | no | Coordinate unit system (default: `"mils"`) |

**Response** `201`

```json
{ "data": { "id": "proj_...", "name": "My Board", ... } }
```

#### Get a project

```
GET /api/projects/:id
```

**Response** `200` -- single project object in `data`
**Response** `404` -- project not found

#### Update a project

```
PUT /api/projects/:id
Content-Type: application/json
```

**Request body** -- all fields optional

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "settings": { "defaultLayerCount": 4 }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Updated project name |
| `description` | string | no | Updated description |
| `boards` | string[] | no | Board ID list |
| `modules` | string[] | no | Module ID list |
| `libraryAssets` | string[] | no | Library asset ID list |
| `settings` | object | no | Partial `ProjectSettings` (merged with existing) |

**Response** `200` -- updated project
**Response** `404` -- project not found

#### Delete a project

```
DELETE /api/projects/:id
```

**Response** `204` -- no content
**Response** `404` -- project not found

#### Export a project as `.pcb`

```
GET /api/projects/:id/export
```

Returns the full serialized project file as a JSON download. The response includes a `Content-Disposition: attachment` header with a `.pcb` filename.

**Response** `200` -- serialized `ProjectFile` JSON

```json
{
  "version": "1.0.0",
  "formatType": "pcb-layout-project",
  "createdAt": "...",
  "updatedAt": "...",
  "project": {
    "id": "proj_...",
    "name": "My Board",
    "description": "...",
    "settings": { ... },
    "boards": [ { "id": "board_...", "components": [...], "nets": [...], "paths": [...], ... } ],
    "modules": [ ... ],
    "libraryAssets": [ ... ]
  }
}
```

**Response** `404` -- project not found

---

### Boards

#### List all boards

```
GET /api/boards
GET /api/boards?projectId=proj_...
```

| Query Param | Type | Description |
|---|---|---|
| `projectId` | string | Filter boards by project (optional) |

**Response** `200`

```json
{
  "data": [
    {
      "id": "board_...",
      "projectId": "proj_...",
      "name": "Main Board",
      "workspace": {
        "width": 3000,
        "height": 2000,
        "grid": {
          "spacingX": 5,
          "spacingY": 5,
          "subdivisions": 2,
          "visible": true,
          "snapEnabled": true
        },
        "layerCount": 2
      },
      "layers": [
        {
          "id": "layer_...",
          "boardId": "board_...",
          "name": "Top Copper",
          "type": "signal",
          "order": 0,
          "color": "#ff0000",
          "visible": true,
          "locked": false,
          "opacity": 1.0
        }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 1
}
```

#### Create a board

```
POST /api/boards
Content-Type: application/json
```

**Request body**

```json
{
  "projectId": "proj_...",
  "name": "Main Board",
  "workspace": {
    "width": 4000,
    "height": 3000,
    "layerCount": 4
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | yes | Parent project ID |
| `name` | string | yes | Board name |
| `workspace` | object | no | Partial `WorkspaceConfig` override |
| `workspace.width` | number | no | Board width in mils (default: 3000) |
| `workspace.height` | number | no | Board height in mils (default: 2000) |
| `workspace.grid` | object | no | Grid config override |
| `workspace.layerCount` | number | no | Number of layers (default: 2) |

Default workspace creates a board with 5-mil grid, 2 layers (Top Copper, Bottom Copper), 3000x2000 mils.

**Response** `201`

#### Get a board

```
GET /api/boards/:id
```

**Response** `200` / `404`

#### Update a board

```
PUT /api/boards/:id
Content-Type: application/json
```

**Request body**

```json
{
  "name": "Updated Board Name",
  "workspace": { "width": 5000 }
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | no |
| `workspace` | Partial\<WorkspaceConfig\> | no |

**Response** `200` / `404`

#### Delete a board

```
DELETE /api/boards/:id
```

**Response** `204` / `404`

#### Get board layers

```
GET /api/boards/:id/layers
```

**Response** `200`

```json
{
  "data": [
    {
      "id": "layer_...",
      "boardId": "board_...",
      "name": "Top Copper",
      "type": "signal",
      "order": 0,
      "color": "#ff0000",
      "visible": true,
      "locked": false,
      "opacity": 1.0
    }
  ]
}
```

**Layer types**: `signal`, `plane`, `silkscreen_top`, `silkscreen_bottom`, `solder_mask_top`, `solder_mask_bottom`, `paste_top`, `paste_bottom`, `mechanical`

#### Replace board layers

```
PUT /api/boards/:id/layers
Content-Type: application/json
```

**Request body**

```json
{
  "layers": [
    {
      "name": "Top Copper",
      "type": "signal",
      "order": 0,
      "color": "#ff0000",
      "visible": true,
      "locked": false,
      "opacity": 1.0
    },
    {
      "name": "Bottom Copper",
      "type": "signal",
      "order": 1,
      "color": "#0000ff",
      "visible": true,
      "locked": false,
      "opacity": 1.0
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `layers[].name` | string | yes | Layer display name |
| `layers[].type` | LayerType | yes | One of the layer type enum values |
| `layers[].order` | number | yes | Z-order stacking index |
| `layers[].color` | string | yes | Hex color for rendering |
| `layers[].visible` | boolean | yes | Layer visibility |
| `layers[].locked` | boolean | yes | Prevent edits on layer |
| `layers[].opacity` | number | yes | Opacity 0.0--1.0 |

**Response** `200` -- returns the new `BoardLayer[]`

---

### Components

#### List all components

```
GET /api/components
GET /api/components?boardId=board_...
```

| Query Param | Type | Description |
|---|---|---|
| `boardId` | string | Filter by board (optional) |

**Response** `200` -- `{ data: Component[], total: number }`

#### Create a component

```
POST /api/components
Content-Type: application/json
```

**Request body**

```json
{
  "boardId": "board_...",
  "name": "100nF Cap",
  "designator": "C1",
  "footprint": {
    "id": "fp_...",
    "name": "0402",
    "description": "0402 capacitor footprint",
    "pads": [
      {
        "id": "pad_...",
        "componentId": "comp_...",
        "name": "1",
        "localPosition": { "x": -25, "y": 0 },
        "shape": "rect",
        "width": 20,
        "height": 25,
        "rotation": 0,
        "layerId": "layer_...",
        "plated": true
      },
      {
        "id": "pad_...",
        "componentId": "comp_...",
        "name": "2",
        "localPosition": { "x": 25, "y": 0 },
        "shape": "rect",
        "width": 20,
        "height": 25,
        "rotation": 0,
        "layerId": "layer_...",
        "plated": true
      }
    ],
    "pins": [
      {
        "id": "pin_...",
        "padId": "pad_...",
        "name": "1",
        "number": "1",
        "electricalType": "passive"
      }
    ],
    "boundingBox": { "min": { "x": -35, "y": -15 }, "max": { "x": 35, "y": 15 } },
    "courtyard": { "min": { "x": -45, "y": -25 }, "max": { "x": 45, "y": 25 } }
  },
  "transform": {
    "position": { "x": 500, "y": 300 },
    "rotation": 0,
    "mirrored": false
  },
  "layerId": "layer_...",
  "properties": { "value": "100nF", "package": "0402" },
  "locked": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `boardId` | string | yes | Board to place component on |
| `name` | string | yes | Component name |
| `designator` | string | yes | Reference designator (e.g. `"R1"`, `"U3"`, `"C5"`) |
| `footprint` | Footprint | yes | Full footprint with pads and pins |
| `transform` | Transform2D | yes | Position, rotation, mirror state |
| `layerId` | string | yes | Primary layer ID |
| `properties` | object | no | Key-value metadata (default: `{}`) |
| `locked` | boolean | no | Prevent editing (default: `false`) |

**Pad shapes**: `circle`, `rect`, `oval`, `polygon`

**Pin electrical types**: `input`, `output`, `bidirectional`, `power`, `ground`, `passive`, `unconnected`

**Rotation values**: `0`, `90`, `180`, `270` (discrete 90-degree increments)

**Response** `201`

#### Get a component

```
GET /api/components/:id
```

**Response** `200` / `404`

#### Update a component

```
PUT /api/components/:id
Content-Type: application/json
```

**Request body** -- all fields optional

```json
{
  "name": "Updated Name",
  "designator": "C2",
  "transform": { "position": { "x": 600, "y": 400 }, "rotation": 90, "mirrored": false },
  "layerId": "layer_...",
  "properties": { "value": "220nF" },
  "locked": true
}
```

**Response** `200` / `404`

#### Delete a component

```
DELETE /api/components/:id
```

**Response** `204` / `404`

---

### Modules

Modules are reusable circuit blocks that can be instantiated onto boards.

#### List all modules

```
GET /api/modules
```

**Response** `200` -- `{ data: Module[], total: number }`

#### Create a module

```
POST /api/modules
Content-Type: application/json
```

**Request body**

```json
{
  "name": "Voltage Regulator",
  "description": "3.3V LDO with input/output caps",
  "version": "1.0.0",
  "components": ["comp_...", "comp_..."],
  "internalNets": ["net_..."],
  "internalPaths": ["trace_..."],
  "exposedPins": [
    { "pinId": "pin_...", "externalName": "VIN" },
    { "pinId": "pin_...", "externalName": "VOUT" },
    { "pinId": "pin_...", "externalName": "GND" }
  ],
  "boundingBox": { "min": { "x": 0, "y": 0 }, "max": { "x": 500, "y": 500 } },
  "tags": ["power", "regulator"],
  "category": "power"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Module name |
| `description` | string | yes | Module description |
| `version` | string | yes | Semver version string |
| `components` | string[] | no | Component IDs belonging to module |
| `internalNets` | string[] | no | Net IDs internal to module |
| `internalPaths` | string[] | no | Trace path IDs internal to module |
| `exposedPins` | ExposedPin[] | no | Pins exposed at module boundary |
| `exposedPins[].pinId` | string | yes | Internal pin ID reference |
| `exposedPins[].externalName` | string | yes | Name visible at module boundary |
| `boundingBox` | BoundingBox | no | Module spatial bounds |
| `tags` | string[] | no | Searchable tags |
| `category` | string | no | Category grouping |
| `thumbnail` | string | no | Preview image data URL |

**Response** `201`

#### Get a module

```
GET /api/modules/:id
```

**Response** `200` / `404`

#### Update a module

```
PUT /api/modules/:id
Content-Type: application/json
```

All fields from `CreateModuleRequest` are accepted, all optional.

**Response** `200` / `404`

#### Delete a module

```
DELETE /api/modules/:id
```

**Response** `204` / `404`

#### Get module components

```
GET /api/modules/:id/components
```

Returns all components referenced by the module's `components` array.

**Response** `200` -- `{ data: Component[], total: number }`
**Response** `404` -- module not found

#### Validate a module

```
POST /api/modules/:id/validate
```

No request body required. Runs structural validation checks on the module.

**Validation rules checked**:
- `module-has-components` -- error if module has no components
- `module-has-exposed-pins` -- warning if module has no exposed pins
- `module-bounding-box` -- error if bounding box dimensions are invalid
- `module-version` -- error if version doesn't follow semver
- `exposed-pin-reference` -- error if exposed pins reference non-existent internal pins

**Response** `200`

```json
{
  "data": {
    "valid": true,
    "results": [
      {
        "rule": "module-has-exposed-pins",
        "severity": "warning",
        "message": "Module has no exposed pins"
      }
    ],
    "checkedAt": "2026-03-29T00:00:00.000Z"
  }
}
```

#### Instantiate a module on a board

```
POST /api/modules/:id/instantiate
Content-Type: application/json
```

**Request body**

```json
{
  "position": { "x": 1000, "y": 500 }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `position` | Point2D | no | Placement position (default: `{x: 0, y: 0}`) |

**Response** `201`

```json
{
  "data": {
    "id": "mi_...",
    "moduleId": "mod_...",
    "moduleVersion": "1.0.0",
    "transform": {
      "position": { "x": 1000, "y": 500 },
      "rotation": 0,
      "mirrored": false
    },
    "overrides": {}
  }
}
```

#### Get module versions

```
GET /api/modules/:id/versions
```

**Response** `200`

```json
{
  "data": [
    {
      "version": "1.0.0",
      "createdAt": "...",
      "updatedAt": "...",
      "current": true
    }
  ],
  "total": 1
}
```

---

### Nets

Nets represent electrical connections between pins and pads.

#### List all nets

```
GET /api/nets
GET /api/nets?boardId=board_...
```

| Query Param | Type | Description |
|---|---|---|
| `boardId` | string | Filter by board (optional) |

**Response** `200`

```json
{
  "data": [
    {
      "id": "net_...",
      "name": "VCC",
      "pins": ["pin_...", "pin_..."],
      "pads": ["pad_...", "pad_..."],
      "paths": ["trace_..."],
      "color": "#ff0000",
      "netClass": "power"
    }
  ],
  "total": 1
}
```

#### Create a net

```
POST /api/nets
Content-Type: application/json
```

**Request body**

```json
{
  "name": "VCC",
  "boardId": "board_...",
  "pins": ["pin_...", "pin_..."],
  "pads": ["pad_...", "pad_..."],
  "color": "#ff0000",
  "netClass": "power"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Net name (e.g. `"VCC"`, `"GND"`, `"SDA"`) |
| `boardId` | string | yes | Board this net belongs to |
| `pins` | string[] | no | Pin IDs connected to this net |
| `pads` | string[] | no | Pad IDs connected to this net |
| `color` | string | no | Highlight color (hex) |
| `netClass` | string | no | Design rule matching class (e.g. `"power"`, `"signal"`) |

**Response** `201`

#### Get a net

```
GET /api/nets/:id
```

**Response** `200` / `404`

#### Update a net

```
PUT /api/nets/:id
Content-Type: application/json
```

**Request body** -- all fields optional

```json
{
  "name": "GND",
  "pins": ["pin_..."],
  "pads": ["pad_..."],
  "paths": ["trace_..."],
  "color": "#00ff00",
  "netClass": "signal"
}
```

**Response** `200` / `404`

#### Delete a net

```
DELETE /api/nets/:id
```

**Response** `204` / `404`

---

### Trace Paths

Trace paths are copper routing segments between pads/pins. Each path belongs to a net and consists of ordered segments and optional vias.

#### List all paths

```
GET /api/paths
GET /api/paths?boardId=board_...
GET /api/paths?boardId=board_...&netId=net_...
```

| Query Param | Type | Description |
|---|---|---|
| `boardId` | string | Filter by board (optional) |
| `netId` | string | Filter by net (optional) |

**Response** `200`

```json
{
  "data": [
    {
      "id": "trace_...",
      "netId": "net_...",
      "segments": [
        {
          "id": "seg_...",
          "pathId": "trace_...",
          "layerId": "layer_...",
          "start": { "x": 100, "y": 200 },
          "end": { "x": 300, "y": 200 },
          "width": 10
        }
      ],
      "vias": [],
      "debugLinks": [],
      "cornerRadius": 0
    }
  ],
  "total": 1
}
```

#### Create a trace path

```
POST /api/paths
Content-Type: application/json
```

**Request body**

```json
{
  "netId": "net_...",
  "boardId": "board_...",
  "segments": [
    {
      "layerId": "layer_...",
      "start": { "x": 100, "y": 200 },
      "end": { "x": 300, "y": 200 },
      "width": 10
    },
    {
      "layerId": "layer_...",
      "start": { "x": 300, "y": 200 },
      "end": { "x": 300, "y": 400 },
      "width": 10
    }
  ],
  "vias": [
    {
      "position": { "x": 300, "y": 400 },
      "fromLayerId": "layer_top",
      "toLayerId": "layer_bottom",
      "outerDiameter": 30,
      "drillDiameter": 15,
      "netId": "net_..."
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `netId` | string | yes | Net this path belongs to |
| `boardId` | string | yes | Board this path is on |
| `segments` | array | no | Trace segments (default: `[]`) |
| `segments[].layerId` | string | yes | Layer the segment is on |
| `segments[].start` | Point2D | yes | Start point in mils |
| `segments[].end` | Point2D | yes | End point in mils |
| `segments[].width` | number | yes | Trace width in mils |
| `vias` | array | no | Layer-crossing vias (default: `[]`) |
| `vias[].position` | Point2D | yes | Via center position |
| `vias[].fromLayerId` | string | yes | Source layer |
| `vias[].toLayerId` | string | yes | Target layer |
| `vias[].outerDiameter` | number | yes | Outer annular ring diameter in mils |
| `vias[].drillDiameter` | number | yes | Drill hole diameter in mils |
| `vias[].netId` | string | yes | Net association |

**Response** `201`

#### Get a trace path

```
GET /api/paths/:id
```

**Response** `200` / `404`

#### Update a trace path

```
PUT /api/paths/:id
Content-Type: application/json
```

Accepts `segments` and `vias` arrays (same shape as create). Replaces existing segments/vias.

**Response** `200` / `404`

#### Delete a trace path

```
DELETE /api/paths/:id
```

**Response** `204` / `404`

#### Get debug links for a path

```
GET /api/paths/:id/debug
```

Returns all debug annotations attached to a trace path.

**Response** `200`

```json
{
  "data": [
    {
      "id": "dbg_...",
      "pathId": "trace_...",
      "label": "Impedance mismatch",
      "description": "Trace width changes cause impedance discontinuity",
      "severity": "warning",
      "metadata": { "impedance": 52.3 },
      "createdAt": "..."
    }
  ]
}
```

#### Create a debug link on a path

```
POST /api/paths/:id/debug
Content-Type: application/json
```

**Request body**

```json
{
  "label": "Impedance mismatch",
  "description": "Trace width changes cause impedance discontinuity",
  "severity": "warning",
  "metadata": { "impedance": 52.3 }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | Short label |
| `description` | string | yes | Detailed description |
| `severity` | string | yes | `"info"`, `"warning"`, `"error"`, or `"critical"` |
| `metadata` | object | no | Arbitrary debug metadata (default: `{}`) |

**Response** `201` / `404`

---

### Validation

#### Validate a board

```
POST /api/validation/board/:id
Content-Type: application/json
```

**Request body** (optional)

```json
{
  "rules": ["board.layers.required", "component.bounds"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rules` | string[] | no | Subset of rule names to check. Omit to run all rules. |

**Validation rules**:
- `board.layers.required` -- warning if board has no layers
- `board.dimensions.positive` -- error if board dimensions are not positive
- `component.bounds` -- warning if component is outside board boundaries
- `net.connections.required` -- warning if net has no connected pins or pads

**Response** `200`

```json
{
  "data": {
    "valid": false,
    "results": [
      {
        "rule": "component.bounds",
        "severity": "warning",
        "message": "Component R1 is outside board boundaries",
        "location": {
          "entityType": "component",
          "entityId": "comp_...",
          "details": "Position (5000, 3000) exceeds board bounds (3000x2000)"
        }
      }
    ],
    "checkedAt": "2026-03-29T00:00:00.000Z"
  }
}
```

#### Validate a module

```
POST /api/validation/module/:id
Content-Type: application/json
```

Same request/response shape as board validation. See [Validate a module](#validate-a-module) under the Modules section for module-specific rules.

---

### Shared Type Reference

#### Point2D

```json
{ "x": 100, "y": 200 }
```

All coordinates are in mils.

#### BoundingBox

```json
{
  "min": { "x": 0, "y": 0 },
  "max": { "x": 500, "y": 300 }
}
```

#### Transform2D

```json
{
  "position": { "x": 100, "y": 200 },
  "rotation": 0,
  "mirrored": false
}
```

| Field | Type | Description |
|---|---|---|
| `position` | Point2D | World position in mils |
| `rotation` | number | `0`, `90`, `180`, or `270` degrees |
| `mirrored` | boolean | Horizontal mirror state |

#### GridConfig

```json
{
  "spacingX": 5,
  "spacingY": 5,
  "subdivisions": 2,
  "visible": true,
  "snapEnabled": true
}
```

#### WorkspaceConfig

```json
{
  "width": 3000,
  "height": 2000,
  "grid": { "spacingX": 5, "spacingY": 5, "subdivisions": 2, "visible": true, "snapEnabled": true },
  "layerCount": 2
}
```

#### ID Formats

All entity IDs are prefixed strings generated with `createId(prefix)`:

| Entity | Prefix | Example |
|---|---|---|
| Project | `proj` | `proj_a1b2c3d4-...` |
| Board | `board` | `board_a1b2c3d4-...` |
| Layer | `layer` | `layer_a1b2c3d4-...` |
| Component | `comp` | `comp_a1b2c3d4-...` |
| Footprint | `fp` | `fp_a1b2c3d4-...` |
| Pad | `pad` | `pad_a1b2c3d4-...` |
| Pin | `pin` | `pin_a1b2c3d4-...` |
| Net | `net` | `net_a1b2c3d4-...` |
| TracePath | `trace` | `trace_a1b2c3d4-...` |
| TraceSegment | `seg` | `seg_a1b2c3d4-...` |
| Via | `via` | `via_a1b2c3d4-...` |
| Module | `mod` | `mod_a1b2c3d4-...` |
| ModuleInstance | `mi` | `mi_a1b2c3d4-...` |
| DebugLink | `dbg` | `dbg_a1b2c3d4-...` |
| DesignRule | `rule` | `rule_a1b2c3d4-...` |

#### Enum Values

**LayerType**: `signal`, `plane`, `silkscreen_top`, `silkscreen_bottom`, `solder_mask_top`, `solder_mask_bottom`, `paste_top`, `paste_bottom`, `mechanical`

**PadShape**: `circle`, `rect`, `oval`, `polygon`

**PinElectricalType**: `input`, `output`, `bidirectional`, `power`, `ground`, `passive`, `unconnected`

**DebugSeverity**: `info`, `warning`, `error`, `critical`

**DesignRuleType**: `min_trace_width`, `min_clearance`, `min_drill_size`, `min_annular_ring`, `max_via_count`, `trace_to_edge`, `component_to_edge`

**Rotation**: `0`, `90`, `180`, `270`

---

## License

MIT -- see [LICENSE](LICENSE).
