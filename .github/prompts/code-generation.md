# Prompt: Code Generation

> Use this prompt when generating new TypeScript, HTML, or CSS code for this repository.

---

You are generating code for the **Analytics Compiler** repository. Apply the following rules exactly.

## Before You Write Any Code

1. Read the relevant files in `src/shared/` to understand existing type contracts.
2. Identify which process the code belongs to (main, renderer, or shared).
3. Check for existing patterns in similar files in the same directory.
4. Do NOT create new files unless there is no existing file that should contain this code.

## TypeScript Rules

- Use `strict` mode — no `any`, no `as any`, no `@ts-ignore`
- Use `const` for all declarations that are not reassigned
- Use `readonly` on all interface properties that are not intended to be mutated
- Prefer `type` for unions and intersections; use `interface` for object shapes that may be extended
- Never use `namespace` or `module` declarations
- Always handle `Promise` rejections — either `try/catch` or explicit `.catch()`
- Use `satisfies` operator to type-check object literals without widening
- Use `import type` for type-only imports

## Main Process Code Rules

- All file I/O uses `fs/promises` (async only)
- All IDs are generated with `randomUUID()` from `crypto`
- File writes are atomic: write to `<path>.tmp` then `fs.rename()`
- IPC handlers always return a typed response object — never `throw` from a handler
- LLM calls are gated by `options.useLLM === true`
- `PhaseEngine.execute()` yields `ProgressEvent` objects — final event is `type: 'completed'` or `type: 'failed'`

## Angular Renderer Rules

- All components are standalone with `ChangeDetectionStrategy.OnPush`
- State uses `signal()`, derived state uses `computed()`, side effects use `effect()`
- Use `input()` and `output()` for component I/O
- Use Angular 17+ control flow (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`
- Never import from Node.js built-ins
- Access IPC only through `ElectronService` — never call `window.electronAPI` directly from components
- Add ARIA attributes to all interactive elements

## CSS Rules

- All color values use CSS custom properties from the active theme (`var(--color-*)`)
- Use `rem` for font sizes, `px` only for borders and shadows
- Every animation has a `prefers-reduced-motion: reduce` override
- Never use `outline: none` without a visible replacement focus indicator
- All contrast ratios meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)

## What to Output

Generate:
1. The complete file content (not a diff)
2. Only the files that need to change
3. No explanatory comments in the code beyond what is already the project's convention

Do NOT generate:
- Placeholder comments like `// TODO: implement`
- Dummy data that will "be replaced later"
- Logging statements unless they serve a documented purpose
- Test files (use the Testing prompt for those)
