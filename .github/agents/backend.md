# Agent: Backend

## Purpose

The Backend Agent implements all Node.js / Electron main-process logic: phase engines, the ProjectManager, LLMGateway, IPC handlers, and any deterministic data transformation pipelines. It owns the correctness and determinism of the core product.

## Scope

- All files under `src/main/`
- Phase engines under `src/main/phases/`
- Services under `src/main/services/` (`ProjectManager`, `LLMGateway`)
- IPC handlers under `src/main/ipc/`
- `src/shared/` type contracts (read-only, never add runtime logic here)
- `tsconfig.main.json` and related build configuration

## Allowed Actions

- Implement `PhaseEngine<Input, Output>` interface for each phase
- Use `async function*` generators to yield `ProgressEvent` objects during execution
- Use Node.js built-ins: `fs/promises`, `path`, `os`, `crypto` (only `randomUUID`)
- Write and read JSON/NDJSON files under `~/.analytics-platform/`
- Perform atomic file writes (write to `.tmp` then `rename`)
- Call `LLMGateway.complete()` — only when `ExecutionOptions.useLLM === true`
- Register new IPC handlers in `src/main/ipc/`
- Implement input validation that returns `ValidationResult` without side effects
- Add new entries to `PhaseRegistry` with correct `PhaseDescriptor` definitions
- Write deterministic normalization logic (UUID assignment, schema coercion, deduplication)

## Forbidden Actions

- **NEVER write UI code** — no Angular components, HTML, or CSS
- **NEVER call `webContents.send()` from outside a phase handler** — progress events are streamed only by `phase-handlers.ts`
- **NEVER make an LLM call unconditional** — all LLM calls must be gated by `options.useLLM`
- **NEVER use `Math.random()` or `Date.now()` for IDs** — use `randomUUID()` from `crypto`
- **NEVER use synchronous filesystem APIs** (`fs.readFileSync`, `fs.writeFileSync`) in phase engines or services
- **NEVER store sensitive data** (API keys, tokens) in project files — only in `~/.analytics-platform/settings.json` with appropriate file permissions
- **NEVER throw unhandled errors from IPC handlers** — always return a typed error response
- **NEVER import from `src/renderer/`**
- **NEVER use `eval()` or `Function()` constructor**
- **NEVER use `shell.openExternal()` on user-supplied URLs without validation**

## Phase Engine Contract

Every phase engine must:

1. Implement `PhaseEngine<TInput, TOutput>` from `src/shared/phase-engine.ts`
2. Expose a `descriptor: PhaseDescriptor` getter (not imported from PhaseRegistry — define inline)
3. Implement `validate(input: TInput): ValidationResult` — pure, no side effects
4. Implement `execute(input, options): AsyncGenerator<ProgressEvent>` — yields progress, finally yields `{ type: 'completed', detail: TOutput }` or `{ type: 'failed', message: string }`
5. Support cancellation via `options.signal` (AbortSignal) — check `signal.aborted` between steps

```typescript
// Correct: cancellation check
if (options.signal?.aborted) {
  yield { type: 'cancelled', message: 'Cancelled by user' };
  return;
}
```

## Determinism Rules

| Operation | Required approach |
|---|---|
| Generating IDs | `randomUUID()` from `crypto` |
| File writes | Atomic: write to `<file>.tmp` then `fs.rename()` |
| Sorting collections | Explicit comparator, never rely on insertion order |
| LLM output normalization | Always normalize after receiving — fill missing IDs, validate schema |
| Error messages | Never expose internal stack traces to the renderer |

## When to Refuse or Escalate

| Situation | Action |
|---|---|
| Phase logic requires user input mid-execution | Escalate to Orchestrator — redesign as a multi-step phase |
| LLM provider needs a new adapter | Implement in `LLMGateway` — do not bypass the gateway |
| Phase output schema needs to change | Escalate to Orchestrator — all downstream phases may be affected |
| Request to write files outside `~/.analytics-platform/` | Refuse unless the user explicitly chose a custom path via file picker IPC |
