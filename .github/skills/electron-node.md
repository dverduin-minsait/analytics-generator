# Skill: Electron + Node.js Main Process

## Description

This skill covers the Electron main process architecture used in this project: BrowserWindow lifecycle, app readiness, module resolution (CommonJS), Node.js async APIs, path handling, and the separation between main process singletons and IPC-exposed services.

## When This Skill Applies

- Modifying `src/main/main.ts` or `src/main/preload.ts`
- Implementing or modifying IPC handlers in `src/main/ipc/`
- Implementing services in `src/main/services/`
- Implementing phase engines in `src/main/phases/`
- Configuring `tsconfig.main.json` or `electron-builder`

## Key Architecture Facts

### Module System

Main process code compiles to **CommonJS** (`"module": "CommonJS"` in `tsconfig.main.json`). Do NOT use top-level `await` in main process files. Use `void` prefix for fire-and-forget async calls.

### Entry Point and `isDev` Detection

```typescript
// main.ts
const isDev = !app.isPackaged; // reliable — does NOT depend on NODE_ENV
```

`app.isPackaged` is `true` only when the app is built and packaged by electron-builder. During `npm start` (development), it is `false`.

### Path Resolution

```typescript
// Correct: resolve paths relative to __dirname (main.ts location after tsc)
// With outDir: "dist", src/main/main.ts → dist/main/main.ts
// So __dirname = dist/main/

// Preload (esbuild output next to main.js):
preload: path.join(__dirname, 'preload.js')

// Renderer (Angular build output):
path.join(__dirname, '../renderer/browser/index.html')
```

### Preload Script

`src/main/preload.ts` is **NOT compiled by `tsc`** — it is excluded in `tsconfig.main.json` and bundled separately by esbuild:

```
esbuild src/main/preload.ts --bundle --platform=node --target=node22 --external:electron --outfile=dist/main/preload.js
```

This produces a single-file bundle with no `require()` calls except `require("electron")`.

### Singleton Services

`ProjectManager` and `LLMGateway` are singletons accessed via `getInstance()`. They are created once when the first IPC handler needs them — not at app startup.

```typescript
// Correct
ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, req) => {
  const manager = ProjectManager.getInstance();
  return manager.createProject(req);
});
```

### Async File I/O

All file operations use `fs/promises`. Never use synchronous variants.

```typescript
import * as fs from 'fs/promises';

// Atomic write pattern
await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
await fs.rename(tmpPath, finalPath);
```

### App Data Directory

Projects are stored under:
```
~/.analytics-platform/projects/<uuid>/
```

Resolved as:
```typescript
import { app } from 'electron';
const base = path.join(app.getPath('home'), '.analytics-platform');
```

## When This Skill Does NOT Apply

- Angular renderer code — use the Angular 21 skill
- IPC security design and contextBridge — use the IPC Security skill
- CSS or visual design — use the Styles skill
- Test writing — use the Testing Strategy skill
