# Prompt: Code Review

> Use this prompt when reviewing a change to this repository for correctness, security, and architectural compliance.

---

You are reviewing a code change for the **Analytics Compiler** repository. Your review must be objective, specific, and actionable. Every finding must reference the specific file, line, and rule that is violated.

## Review Checklist

### Architecture

- [ ] Does the change respect the main/renderer process boundary?
- [ ] Does any renderer code import from Node.js built-ins?
- [ ] Does any renderer code call `window.electronAPI` directly (bypassing `ElectronService`)?
- [ ] Does the change introduce new IPC channels that are not in `IPC_CHANNELS`?
- [ ] Does the change modify `src/shared/` contracts? If so, are all consumers updated?

### Determinism

- [ ] Does any phase engine call an LLM unconditionally (without checking `options.useLLM`)?
- [ ] Does any deterministic function use `Math.random()`, `Date.now()`, or `new Date()`?
- [ ] Is new ID generation using `randomUUID()` from `crypto`?
- [ ] Is any LLM response used without normalization and schema validation?

### Security

- [ ] Does the change modify `BrowserWindow` `webPreferences`? If so, are all security settings preserved?
- [ ] Does any IPC handler use renderer-supplied values without validation?
- [ ] Does any handler accept a file path from the renderer without checking it against an allowed base directory?
- [ ] Does the change add `'unsafe-eval'` or `'unsafe-inline'` (script-src) to the CSP?
- [ ] Are API keys or credentials stored anywhere other than `~/.analytics-platform/settings.json`?

### TypeScript

- [ ] Is `any` used anywhere in the changed files?
- [ ] Are `Promise` rejections handled (try/catch or `.catch()`)?
- [ ] Do all exported functions have explicit return types?
- [ ] Are there new `// @ts-ignore` or `// @ts-expect-error` suppressions? If so, are they justified?

### Angular Renderer

- [ ] Do all new components use `ChangeDetectionStrategy.OnPush`?
- [ ] Do all new components use `standalone: true`?
- [ ] Is state managed with `signal()` and `computed()` rather than class fields with manual change detection?
- [ ] Is `*ngIf` / `*ngFor` used instead of the newer `@if` / `@for` control flow? (Flag as style issue)
- [ ] Are all interactive elements accessible (ARIA labels, focus management)?

### Testing

- [ ] Does the change add a new phase engine without a corresponding unit test?
- [ ] Does the change modify a phase engine's output without updating the golden test?
- [ ] Were any tests deleted to make the build pass?

### CSS / Styles

- [ ] Are hardcoded color values used instead of CSS custom properties?
- [ ] Is `outline: none` set without a replacement focus indicator?
- [ ] Are animations present without a `prefers-reduced-motion` override?

## Severity Levels

| Severity | Description | Required Action |
|---|---|---|
| **BLOCK** | Security vulnerability or determinism violation | Must be fixed before merge |
| **ERROR** | Type error, broken build, or test failure | Must be fixed before merge |
| **WARN** | Style issue, accessibility gap, or missing test | Should be fixed; document if deferred |
| **NOTE** | Suggestion for improvement, no action required | At author's discretion |

## Review Output Format

```
## Review Summary
[Overall assessment: APPROVED / APPROVED WITH CHANGES / BLOCKED]

## Findings

### [BLOCK] Preload exposes raw `fs` module
File: src/main/preload.ts, line 42
Rule: IPC Security — never expose Node.js built-ins through contextBridge
Required fix: Remove `fs` exposure; implement a typed IPC handler in main instead.

### [WARN] Missing aria-label on icon button
File: src/renderer/app/pages/.../button.html, line 18
Rule: Accessibility — icon-only buttons must have aria-label
Suggested fix: Add `aria-label="Cancel execution"` to the button element.
```
