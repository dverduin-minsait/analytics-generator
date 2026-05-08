# Skill: Accessibility

## Description

Accessibility in this project means that all users — including those using keyboard navigation, screen readers, or high-contrast display modes — can fully use the Analytics Compiler. This is both a product requirement and an engineering discipline. WCAG 2.1 AA compliance is the minimum standard.

## When This Skill Applies

- Creating or modifying any Angular component with interactive elements
- Designing phase execution screens (live regions, progress indicators)
- Building form components (validation, error association)
- Implementing modal dialogs, overlays, or focus traps
- Reviewing or writing CSS that affects color, contrast, or motion
- Implementing the high-contrast theme

## When This Skill Does NOT Apply

- Main process code (`src/main/`) — no DOM, no ARIA
- Pure data transformation logic
- IPC handler implementation

## ARIA Requirements by Component Type

### Phase Execution Log (Live Region)

The execution panel must announce progress events to screen readers in real time:

```html
<ul
  role="log"
  aria-label="Phase execution log"
  aria-live="polite"
  aria-relevant="additions"
>
  @for (event of events(); track event.timestamp) {
    <li [attr.aria-label]="event.message">{{ event.message }}</li>
  }
</ul>
```

Use `aria-live="assertive"` only for error and failure events.

### Progress Bar

```html
<div
  role="progressbar"
  [attr.aria-valuenow]="percentComplete()"
  aria-valuemin="0"
  aria-valuemax="100"
  [attr.aria-label]="'Phase execution: ' + percentComplete() + '% complete'"
></div>
```

### Forms

Every form control must have an associated label (not placeholder as label):

```html
<label for="project-name">Project name</label>
<input id="project-name" formControlName="name" [attr.aria-describedby]="nameError() ? 'name-error' : null" />
@if (nameError()) {
  <span id="name-error" role="alert">{{ nameError() }}</span>
}
```

### Interactive Buttons and Links

```html
<!-- Icon-only button must have aria-label -->
<button type="button" aria-label="Cancel phase execution">
  <span aria-hidden="true">◼</span>
</button>
```

### Phase Navigation Dots

```html
<nav aria-label="Phase navigation">
  <ol>
    @for (phase of phases(); track phase.id) {
      <li>
        <a [routerLink]="['/project', projectId, 'phase', phase.id]"
           [attr.aria-current]="isCurrentPhase(phase.id) ? 'page' : null"
           [attr.aria-label]="phase.name + ' - ' + phase.status">
          <!-- visual dot -->
        </a>
      </li>
    }
  </ol>
</nav>
```

## Focus Management

- On route change to a phase screen, move focus to the phase heading (`<h1>`)
- On dialog open, move focus to the first interactive element inside the dialog
- On dialog close, return focus to the element that triggered it
- Never lose focus or trap it outside an intentional focus trap

Use Angular CDK `FocusMonitor` and `A11yModule` for programmatic focus management:

```typescript
import { FocusMonitor } from '@angular/cdk/a11y';
```

## Keyboard Interaction

| Component | Keys required |
|---|---|
| Phase navigation dots | Tab to navigate, Enter/Space to activate |
| File picker | Enter/Space to open dialog |
| Cancel button | Enter/Space to cancel |
| Execution log | Arrow keys to scroll (if focused), Escape to dismiss |
| Theme toggle | Enter/Space to cycle themes |
| Form submission | Enter to submit when form is valid |

## Skip Navigation

The app shell includes a skip-to-content link that must be the first focusable element:

```html
<a href="#main-content" class="skip-to-content">Skip to main content</a>
```

This link is visually hidden until focused.

## Motion

All transitions must be disabled when `prefers-reduced-motion: reduce` is set:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## High-Contrast Theme

The high-contrast theme (`data-theme="high-contrast"`) must:
- Achieve 7:1 contrast for all text
- Use system colors where possible (`ButtonText`, `ButtonFace`, `Highlight`, `HighlightText`)
- Never rely on color alone for state
- Use `forced-colors: active` media query for Windows High Contrast Mode compatibility
