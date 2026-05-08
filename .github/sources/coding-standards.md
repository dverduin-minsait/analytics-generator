# Source: Coding Standards

> Trusted reference for all TypeScript, HTML, and CSS conventions in this repository.
> These standards are enforced by the TypeScript compiler and are expected of all generated code.

---

## TypeScript

### Configuration

Two separate TypeScript configurations exist:

| Config | Target | Module | Usage |
|---|---|---|---|
| `tsconfig.main.json` | Main process | CommonJS | `tsc` build |
| `tsconfig.app.json` | Angular renderer | Preserve/Bundler | `ng build` |
| `tsconfig.spec.json` | Unit tests | CommonJS | `jest` with `ts-jest` |

`tsconfig.json` (base) is the foundation for Angular. `tsconfig.main.json` does NOT extend it.

### Strict Mode

All TypeScript is compiled with `strict: true` plus:
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `noImplicitOverride: true`
- `noPropertyAccessFromIndexSignature: true`

No exceptions. Do not use `// @ts-ignore` or `// @ts-expect-error` in production code.

### Naming Conventions

| Symbol | Convention | Example |
|---|---|---|
| Class | PascalCase | `ProjectManager` |
| Interface | PascalCase | `PhaseDescriptor` |
| Type alias | PascalCase | `LLMUsage` |
| Enum | PascalCase (name), SCREAMING_SNAKE (values) | `PhaseId.IntentAnalysis` |
| Function | camelCase | `createProject` |
| Variable / property | camelCase | `currentProject` |
| CSS class | kebab-case | `phase-card--active` |
| CSS custom property | kebab-case with prefix | `--color-primary` |
| IPC channel | SCREAMING_SNAKE with colon separator | `PROJECT:CREATE` |
| File | kebab-case | `project-manager.ts` |
| Angular component selector | `app-` prefix, kebab-case | `app-phase-header` |

### Imports

- Use `import type` for type-only imports
- Group imports: external packages, then `src/shared/`, then relative
- Use path aliases for shared code: `@shared/phase-descriptor` (in tests only — use relative paths in source)
- Relative imports in `src/main/` and `src/renderer/` — no path aliases in production source

### Error Handling

IPC handlers never throw — they return typed error responses:

```typescript
// Correct
try {
  const result = await doWork();
  return { success: true, result };
} catch (err) {
  return { success: false, error: (err as Error).message };
}
```

Phase engines yield a `failed` event instead of throwing:

```typescript
// Correct
yield { type: 'failed', message: 'File not found: ' + filePath };
return;
```

---

## Angular Components

### Component Decorator

All components must declare:

```typescript
@Component({
  selector: 'app-<name>',
  standalone: true,
  imports: [...],
  templateUrl: './<name>.component.html',
  styleUrl: './<name>.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

### Inputs and Outputs

Use signal-based API for new components:

```typescript
// Inputs
readonly descriptor = input.required<PhaseDescriptor>();
readonly label = input<string>('');

// Outputs
readonly cancelled = output<void>();
readonly filesChanged = output<string[]>();
```

### State

Local state: `signal()`. Derived state: `computed()`. Side effects: `effect()`.

Never use `BehaviorSubject` for component-local state.

### Template Control Flow

```html
@if (condition) { ... }
@for (item of items(); track item.id) { ... } @empty { ... }
@switch (value()) { @case ('a') { ... } @default { ... } }
```

Never use `*ngIf`, `*ngFor`, `*ngSwitch`.

---

## CSS

### Custom Properties

All visual values are defined in theme files under `src/renderer/styles/themes/`. Components access values only through `var(--token-name)`. Raw color values are never written in component CSS.

### Units

- Font sizes: `rem`
- Spacing: `rem` or `px` for micro-values (1px, 2px borders)
- Shadows: `px`
- Breakpoints: `em`

### Specificity

Keep specificity low. Prefer class selectors over element selectors in component CSS. Never use `#id` selectors in component styles.

### BEM-inspired naming

```css
/* Block */
.phase-card { }

/* Element */
.phase-card__title { }
.phase-card__badge { }

/* Modifier */
.phase-card--active { }
.phase-card--disabled { }
```

---

## File Organization

```
src/main/phases/<phase-name>/
  <phase-name>-engine.ts        PhaseEngine implementation

src/renderer/app/pages/<page-name>/
  <page-name>.component.ts
  <page-name>.component.html
  <page-name>.component.css
  components/                   Sub-components used only by this page
    <sub-name>/
      <sub-name>.component.ts
      ...

test/unit/
  <module-name>.spec.ts

test/fixtures/
  <module-name>-fixtures.ts     Typed test data constants
  golden/
    <phase-name>-output.snap    Jest snapshots for golden tests
```
