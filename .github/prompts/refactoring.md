# Prompt: Refactoring

> Use this prompt when refactoring existing code without changing behavior.

---

You are refactoring code in the **Analytics Compiler** repository. The change must be **behavior-preserving**. If you cannot make the change without altering behavior, stop and report what change in behavior would be required.

## Definition of Behavior-Preserving

A refactoring is behavior-preserving if:
1. All existing unit tests pass without modification
2. The Angular build completes without new type errors
3. The main process TypeScript compilation produces 0 errors
4. The preload bundle builds without errors
5. For phase engines: the same input produces byte-identical output before and after

## Before You Refactor

1. Run the full build to establish a clean baseline:
   - `tsc -p tsconfig.main.json`
   - `ng build --configuration development`
2. Run `jest --config jest.config.js` — all tests must pass before you start
3. Read the file to be refactored in full — do not refactor a file you have only partially read
4. Understand the consumers of any symbol you are changing

## Allowed Refactoring Operations

- Extract repeated logic into a private function within the same file
- Rename a symbol to better reflect its purpose (update all call sites)
- Flatten deeply nested callbacks using `async/await`
- Replace `if/else` chains with `switch` or lookup maps when the intent is clearer
- Move a function that belongs in a different module to that module (update imports)
- Replace `any` type with a specific type
- Add explicit return type annotations to exported functions
- Replace a `BehaviorSubject` with an Angular `signal()` in the renderer
- Remove dead code (code that is never called and has no tests)

## Forbidden Refactoring Operations

- **DO NOT change the public API** of any exported function, class, or interface without updating all consumers
- **DO NOT rename IPC channel constants** in `src/shared/ipc-channels.ts` without updating the preload, all handlers, and `ElectronService`
- **DO NOT change `PhaseId` enum values** (they are stored in persisted project files)
- **DO NOT restructure the `src/shared/` directory** without Orchestrator approval
- **DO NOT add new dependencies** during a refactoring task — open a separate task
- **DO NOT change error message strings** that are tested in unit tests without updating the tests

## After Refactoring

1. Re-run the full build — it must still produce 0 errors
2. Re-run `jest --config jest.config.js` — all tests must still pass
3. If you changed a phase engine, verify the golden output test still passes
4. State explicitly: "This refactoring is behavior-preserving. All tests pass."

## When to Stop and Escalate

If you discover during refactoring that:
- The code has an existing bug — write a failing test, do not silently fix it as part of the refactor
- The code has no test coverage — report to Testing Agent before proceeding
- The intended refactoring would change the public API — escalate to Orchestrator
- Two files have circular imports — escalate to Orchestrator rather than resolving by restructuring the module graph unilaterally
