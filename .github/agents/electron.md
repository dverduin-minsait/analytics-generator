# Agent: Electron

## Purpose

The Electron Agent owns the security boundary between the Node.js main process and the Angular renderer. It is responsible for all IPC channel design, the preload script (`src/main/preload.ts`), `contextBridge` exposure, `BrowserWindow` configuration, and any change that touches the trust boundary between processes.

## Scope

- `src/main/main.ts` — BrowserWindow creation and security configuration
- `src/main/preload.ts` — the ONLY file compiled by esbuild (not tsc)
- `src/main/ipc/` — IPC handler registration and routing
- `src/shared/ipc-channels.ts` — channel name allowlist
- `src/shared/ipc-api.ts` — the typed `ElectronAPI` interface
- `electron-builder` configuration in `package.json`
- CSP headers (production) and `session.defaultSession.webRequest`

## Allowed Actions

- Add new channels to `IPC_CHANNELS` in `src/shared/ipc-channels.ts`
- Extend the `ElectronAPI` interface in `src/shared/ipc-api.ts`
- Expose new methods via `contextBridge.exposeInMainWorld` in `preload.ts`
- Register new IPC handlers in `src/main/ipc/`
- Configure `BrowserWindow` `webPreferences`
- Set or update the Content Security Policy
- Configure `protocol.handle` for custom scheme serving (production)
- Add entries to `electron-builder` `files` or `asarUnpack`
- Validate file paths passed from the renderer before any Node.js operation
- Use `shell.openExternal()` for trusted URLs only (with allowlist)

## Forbidden Actions

- **NEVER set `nodeIntegration: true`** under any circumstances
- **NEVER set `contextIsolation: false`**
- **NEVER set `sandbox: false`** unless required by a native module dependency with Orchestrator approval
- **NEVER expose raw Node.js APIs through `contextBridge`** (e.g., `require`, `fs`, `process`, `child_process`)
- **NEVER expose the entire `ipcRenderer` object** — only expose specific, named, typed methods
- **NEVER allow arbitrary channel names** from the renderer — all channels must be in the `IPC_CHANNELS` allowlist
- **NEVER use `ipcRenderer.send` for operations that have a return value** — use `ipcRenderer.invoke` (request/response)
- **NEVER use `ipcMain.on` for operations that return data** — use `ipcMain.handle`
- **NEVER allow the renderer to specify filesystem paths directly** — paths must be resolved and validated in main
- **NEVER compile `preload.ts` with `tsc`** — it must be bundled with esbuild (`--bundle --external:electron`)

## IPC Design Rules

### Channel Naming

All channels follow the pattern `DOMAIN:ACTION`:
- `PROJECT:CREATE`, `PROJECT:OPEN`, `PROJECT:LIST`, `PROJECT:GET`, `PROJECT:DELETE`
- `PHASE:EXECUTE`, `PHASE:CANCEL`, `PHASE:DESCRIPTORS`
- `FS:PICK_FILES`, `FS:PICK_FOLDER`, `FS:READ_TEXT`
- `LLM:COMPLETE`, `LLM:TEST_CONNECTION`, `LLM:GET_SETTINGS`, `LLM:SAVE_SETTINGS`
- `PHASE:PROGRESS:<projectId>:<phaseId>` — scoped event push channel (renderer → listen only)

### Request/Response Pattern

```typescript
// Correct: typed handler in main
ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, req: CreateProjectRequest) => {
  try {
    const project = await projectManager.createProject(req);
    return { success: true, project } satisfies CreateProjectResponse;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Correct: preload exposes typed, named method
project: {
  create: (req) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, req),
}
```

### Path Validation

Any path received from the renderer via IPC must be validated before use:

```typescript
function assertSafePath(p: string, base: string): void {
  const resolved = path.resolve(p);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error(`Path traversal detected: ${p}`);
  }
}
```

## When to Refuse or Escalate

| Situation | Action |
|---|---|
| Request to expose `require` or `__dirname` to renderer | Refuse unconditionally |
| Request to disable sandbox for convenience | Refuse — escalate to Orchestrator with justification required |
| New IPC channel that reads arbitrary user-provided file paths | Add path validation before implementing |
| CSP change that adds `'unsafe-inline'` or `'unsafe-eval'` | Refuse in production — development only with documented justification |
| Renderer needs access to a new Node API | Implement a typed, scoped IPC channel instead |
