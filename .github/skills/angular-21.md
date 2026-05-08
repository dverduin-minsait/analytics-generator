# Skill: Angular 21

## Description

Angular 21 (v21.2.x) introduces a mature standalone component model, signal-based reactivity, and esbuild/Vite-based compilation. This project uses Angular's latest patterns exclusively — no NgModules, no legacy `@Input()` decorator-based bindings where signals apply, no `async` pipe where signals are cleaner.

## When This Skill Applies

- Creating or modifying Angular components, directives, pipes, or services under `src/renderer/`
- Configuring Angular routing, lazy loading, or the application bootstrap
- Working with Angular forms (Reactive Forms)
- Using Angular CDK for accessibility or overlay primitives
- Debugging Angular template type-checking errors

## Core Patterns in This Project

### Standalone Components

All components are standalone. No `NgModule` is used anywhere.

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './example.component.html',
  styleUrl: './example.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent { }
```

### Signals API

Use `signal()`, `computed()`, and `effect()` from `@angular/core`. Do NOT use BehaviorSubject for local component state.

```typescript
// Service state
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);

// Side effect
effect(() => { localStorage.setItem('count', String(this.count())); });
```

### Signal Inputs/Outputs

Use `input()` and `output()` instead of `@Input()` / `@Output()` decorators for new components:

```typescript
readonly descriptor = input.required<PhaseDescriptor>();
readonly cancelled = output<void>();
```

### Control Flow Syntax

Use Angular 17+ built-in control flow. Do NOT use `*ngIf`, `*ngFor`, `*ngSwitch`.

```html
@if (isLoading()) {
  <app-spinner />
} @else {
  <app-content [data]="data()" />
}

@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items</li>
}
```

### Routing

Hash-based routing is used (`withHashLocation()`). Lazy-loaded routes use the pattern:

```typescript
{
  path: 'project/:id/phase/1',
  loadComponent: () =>
    import('./pages/phases/intent-analysis/intent-analysis.component')
      .then(m => m.IntentAnalysisComponent),
}
```

### Change Detection

All components use `ChangeDetectionStrategy.OnPush`. Signal reads automatically schedule change detection in the correct zone.

## When This Skill Does NOT Apply

- Main process code (`src/main/`) — use Node.js/TypeScript patterns, not Angular
- Shared type definitions (`src/shared/`) — plain TypeScript interfaces only, no Angular decorators
- CSS-only changes — use the Styles skill
- IPC design — use the IPC Security skill
