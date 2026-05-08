# Source: Architecture

> Trusted reference for the Analytics Compiler system architecture.
> This document is read by AI agents as ground truth. Keep it synchronized with the codebase.

---

## System Overview

Analytics Compiler is a desktop application that processes product documentation through a deterministic 10-phase pipeline to produce analytics event schemas, tracking contracts, and implementation code.

**Technology stack:**
- **Shell**: Electron 35.x (multi-process desktop app)
- **Main process**: Node.js 22, TypeScript 5.8+ (CommonJS)
- **Renderer process**: Angular 21.2.x, TypeScript 5.8+ (ESM, esbuild)
- **Inter-process communication**: Electron IPC with `contextBridge`
- **Build**: `tsc` (main) + Angular CLI `@angular/build:application` (renderer) + `esbuild` (preload)
- **Storage**: Local JSON files under `~/.analytics-platform/`
- **Testing**: Jest (unit), Playwright (E2E)

---

## Process Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js — full OS access)                   │
│                                                                     │
│  main.ts                                                            │
│  ├─ Creates BrowserWindow                                           │
│  ├─ Registers IPC handlers (ipc/)                                   │
│  └─ Manages app lifecycle                                           │
│                                                                     │
│  Services (singletons)                                              │
│  ├─ ProjectManager   — CRUD for project files                       │
│  └─ LLMGateway       — dispatches to provider adapters              │
│                                                                     │
│  Phase Engines                                                      │
│  └─ PhaseRegistry    — maps PhaseId → PhaseDescriptor + engine      │
│     └─ IntentAnalysisEngine (Phase 1 reference implementation)      │
│                                                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  IPC (contextBridge)
                              │  Channels: PROJECT:*, PHASE:*, FS:*, LLM:*
┌─────────────────────────────┴───────────────────────────────────────┐
│  Preload Script (src/main/preload.ts → dist/main/preload.js)        │
│  Bundled by esbuild — single file, only require('electron')         │
│  Exposes: window.electronAPI (typed ElectronAPI interface)          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  window.electronAPI
┌─────────────────────────────┴───────────────────────────────────────┐
│  Angular Renderer Process (sandboxed)                               │
│                                                                     │
│  Services                                                           │
│  ├─ ElectronService   — wraps window.electronAPI                    │
│  ├─ ProjectService    — signal-based project state                  │
│  ├─ PhaseService      — signal-based phase execution state          │
│  └─ ThemeService      — signal-based theme (persists to localStorage)│
│                                                                     │
│  Pages (lazy-loaded routes)                                         │
│  ├─ /welcome                    WelcomeComponent                    │
│  ├─ /project/:id                ProjectDashboardComponent           │
│  ├─ /project/:id/phase/1        IntentAnalysisComponent             │
│  └─ /project/:id/phase/:id      PhaseStubComponent (phases 2-10)   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Shared Contracts (`src/shared/`)

These files are compiled into **both** the main and renderer TypeScript outputs. They contain only type definitions — no runtime logic.

| File | Contents |
|---|---|
| `phase-descriptor.ts` | `PhaseId` enum, `PhaseDescriptor`, `InputDescriptor`, `OutputDescriptor`, `LLMUsage` |
| `phase-engine.ts` | `PhaseEngine<T,R>` interface, `ValidationResult`, `ProgressEvent`, `ExecutionOptions` |
| `project.ts` | `Project`, `ProjectMetadata`, `PhaseState`, `PhaseStatus` |
| `artifacts.ts` | `IntentModel`, `IntentFlow`, `IntentEvent`, and phase output types |
| `llm-config.ts` | `LLMSettings`, `LLMRequest`, `LLMResponse`, provider config types |
| `ipc-channels.ts` | `IPC_CHANNELS` — allowlist of all valid channel names |
| `ipc-api.ts` | `ElectronAPI` interface — the complete typed surface of `window.electronAPI` |

---

## Storage Layout

```
~/.analytics-platform/
├─ settings.json          LLM provider configuration (API keys, model names)
└─ projects/
   └─ <uuid>/
      ├─ project.json     ProjectMetadata + all PhaseState objects
      ├─ phases/
      │  └─ <phaseId>/
      │     └─ output.json   Phase output artifact (typed by PhaseDescriptor.outputs)
      ├─ artifacts/       Cross-phase compiled artifacts
      └─ history/
         └─ audit.ndjson  Append-only audit log (one JSON object per line)
```

---

## Build Pipeline

| Command | Tool | Input | Output |
|---|---|---|---|
| `build:main` | tsc | `src/main/**/*.ts`, `src/shared/**/*.ts` | `dist/main/**/*.js` |
| `build:preload` | esbuild | `src/main/preload.ts` | `dist/main/preload.js` |
| `build:renderer` | Angular CLI | `src/renderer/**` | `dist/renderer/browser/**` |

**Important**: `preload.ts` is excluded from `tsconfig.main.json` and must be built exclusively by esbuild. Running `tsc` on the preload produces an unbundled CommonJS file that fails in the sandboxed renderer.

---

## The 10-Phase Pipeline

| # | `PhaseId` | Name | LLM Usage | Status |
|---|---|---|---|---|
| 1 | `IntentAnalysis` | Intent Analysis | required | Implemented |
| 2 | `FlowMapping` | Flow Mapping | optional | Stub |
| 3 | `EventDesign` | Event Design | optional | Stub |
| 4 | `SchemaGeneration` | Schema Generation | partial | Stub |
| 5 | `ContractValidation` | Contract Validation | none | Stub |
| 6 | `CodeGeneration` | Code Generation | required | Stub |
| 7 | `TestGeneration` | Test Generation | optional | Stub |
| 8 | `Documentation` | Documentation | optional | Stub |
| 9 | `Reconciliation` | Reconciliation | partial | Stub |
| 10 | `Audit` | Audit | none | Stub |

Phases are implemented in `src/main/phases/<phase-name>/`.

---

## Key Invariants

1. `PhaseId` enum values are stable — they are persisted in `project.json` and must never be renumbered
2. `IPC_CHANNELS` values are stable — changing a channel name breaks the preload/handler contract
3. The renderer never has direct filesystem access — all I/O goes through IPC
4. `dist/main/preload.js` must be rebuilt by esbuild whenever `src/main/preload.ts` or `src/shared/ipc-channels.ts` changes
