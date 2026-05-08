# Skill: IPC Security

## Description

Electron IPC security governs the trust boundary between the Node.js main process and the Angular renderer. In this project, the renderer is sandboxed (`sandbox: true`, `nodeIntegration: false`, `contextIsolation: true`), meaning no Node.js APIs are accessible from Angular. All communication crosses the trust boundary through a typed, allowlisted `contextBridge` surface.

## When This Skill Applies

- Adding a new IPC channel
- Modifying `src/main/preload.ts`
- Modifying `src/shared/ipc-channels.ts` or `src/shared/ipc-api.ts`
- Reviewing any main process code that handles renderer-supplied data (paths, IDs, strings)
- Configuring `BrowserWindow` `webPreferences`
- Setting or modifying the Content Security Policy

## When This Skill Does NOT Apply

- Pure Angular component logic that uses `ElectronService` but doesn't modify IPC
- CSS or theme changes
- Phase engine logic that doesn't cross the IPC boundary

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  Angular Renderer (sandboxed)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  window.electronAPI (contextBridge surface)          │   │
│  │  - project.*   - phase.*   - fs.*   - llm.*         │   │
│  └────────────────────┬────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │ ipcRenderer.invoke / ipcRenderer.on
                        │ (allowlisted channel names only)
┌───────────────────────┼─────────────────────────────────────┐
│  Electron Preload (bundled, sandboxed context)               │
│  - Translates typed methods to ipcRenderer calls             │
│  - Validates channel names against IPC_CHANNELS allowlist   │
└───────────────────────┼─────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────┐
│  Electron Main Process (Node.js, full trust)                 │
│  - ipcMain.handle() — validates + executes                  │
│  - ProjectManager, LLMGateway, Phase Engines                │
└─────────────────────────────────────────────────────────────┘
```

## Adding a New IPC Channel

Follow these steps exactly:

1. **Add the channel name** to `src/shared/ipc-channels.ts`:
   ```typescript
   PHASE_ARTIFACTS_GET: 'PHASE:ARTIFACTS:GET',
   ```

2. **Add request/response types** to `src/shared/ipc-api.ts`:
   ```typescript
   export interface GetArtifactsRequest { projectId: string; phaseId: PhaseId; }
   export interface GetArtifactsResponse { success: boolean; artifacts?: unknown; error?: string; }
   ```

3. **Extend `ElectronAPI`** in `src/shared/ipc-api.ts`:
   ```typescript
   phase: {
     // ...existing
     getArtifacts: (req: GetArtifactsRequest) => Promise<GetArtifactsResponse>;
   }
   ```

4. **Implement in preload** (`src/main/preload.ts`):
   ```typescript
   getArtifacts: (req) => ipcRenderer.invoke(IPC_CHANNELS.PHASE_ARTIFACTS_GET, req),
   ```

5. **Implement the handler** in the appropriate `src/main/ipc/*.ts` file:
   ```typescript
   ipcMain.handle(IPC_CHANNELS.PHASE_ARTIFACTS_GET, async (_event, req: GetArtifactsRequest) => {
     // validate req.projectId and req.phaseId
     // ...
   });
   ```

6. **Rebuild preload**: `esbuild src/main/preload.ts --bundle --platform=node --target=node22 --external:electron --outfile=dist/main/preload.js`

## Input Validation in Handlers

Every handler that receives a value from the renderer must treat it as untrusted:

```typescript
// Validate project IDs are UUIDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(req.projectId)) {
  return { success: false, error: 'Invalid project ID' };
}

// Validate file paths are within allowed directories
const resolved = path.resolve(req.filePath);
const allowed = path.resolve(os.homedir(), '.analytics-platform');
if (!resolved.startsWith(allowed)) {
  return { success: false, error: 'Path outside allowed directory' };
}
```

## CSP Policy (Production)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self' https:;
object-src 'none';
base-uri 'none';
```

`'unsafe-inline'` for styles is needed because Angular's ViewEncapsulation injects component styles. This is acceptable. `'unsafe-eval'` is forbidden.

## Invariants (Must Never Change)

| Setting | Value | Reason |
|---|---|---|
| `nodeIntegration` | `false` | Renderer cannot require() Node modules |
| `contextIsolation` | `true` | Preload and renderer have separate JS contexts |
| `sandbox` | `true` | OS-level process isolation |
| `webSecurity` | `true` (default) | Same-origin policy enforced |
| `allowRunningInsecureContent` | `false` | No mixed content |
