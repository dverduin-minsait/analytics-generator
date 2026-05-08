# Source: Accessibility

> Trusted reference for all accessibility requirements in this repository.
> WCAG 2.1 Level AA is the minimum compliance target.

---

## Standard

**WCAG 2.1 Level AA** — all success criteria at levels A and AA must be met.

Target user populations:
- Screen reader users (NVDA, JAWS, VoiceOver, Narrator)
- Keyboard-only users
- Users with low vision (zoom, high-contrast, large text)
- Users with vestibular disorders (reduced motion)
- Windows High Contrast Mode users

---

## Color and Contrast

### Minimum contrast ratios

| Text type | Ratio | WCAG criterion |
|---|---|---|
| Normal text (< 18pt, < 14pt bold) | 4.5:1 | 1.4.3 |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 | 1.4.3 |
| UI component boundary vs adjacent | 3:1 | 1.4.11 |
| Focus ring vs adjacent background | 3:1 | 1.4.11 |
| High-contrast theme: all text | 7:1 | AAA target |

### Color must not be the sole differentiator

Phase status, LLM usage badges, and execution log entries must not rely on color alone. Each must also carry a text label, icon, or ARIA label that conveys the same information.

Correct:
```html
<span class="llm-badge--required" aria-label="LLM required">AI</span>
```

Wrong:
```html
<span class="llm-badge--required"></span>
```

---

## Keyboard Navigation

### Tab order

The tab order must follow the visual reading order (top-to-bottom, left-to-right). Custom tab orders via `tabindex` values > 0 are forbidden.

### Required keyboard interactions

| Component | Keys |
|---|---|
| Phase navigation dots | Tab, Enter/Space, Arrow keys (within group) |
| File picker button | Tab, Enter/Space |
| Cancel execution button | Tab, Enter/Space |
| Execution log (scrollable) | Tab to focus, Arrow keys to scroll |
| Theme toggle | Tab, Enter/Space |
| Create project form | Tab through fields, Enter to submit |
| Project card (list) | Tab, Enter/Space to open |

### Focus visibility

Focus rings must be visible in all three themes. The minimum focus indicator must meet 3:1 contrast against the adjacent surface.

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* High contrast theme */
[data-theme="high-contrast"] :focus-visible {
  outline: 3px solid Highlight;
  outline-offset: 2px;
}
```

---

## ARIA Usage

### Live regions

The execution log is a live region that announces progress events:

```html
<ul role="log" aria-live="polite" aria-relevant="additions" aria-label="Phase execution log">
```

Error events use `aria-live="assertive"` so they interrupt immediately.

### Progress indicators

Phase execution progress bar:
```html
<div role="progressbar" aria-valuemin="0" aria-valuemax="100"
     [attr.aria-valuenow]="percent()" [attr.aria-label]="progressLabel()">
```

Indeterminate state (when percent unknown):
```html
<div role="progressbar" aria-valuetext="Running…">
```

### Page landmarks

The app must have these ARIA landmarks:
- `<header role="banner">` — top app bar
- `<nav aria-label="Phase navigation">` — phase dots
- `<main id="main-content">` — primary content area
- `<footer>` — phase navigation footer

### Skip navigation

The first focusable element must be a skip link:
```html
<a href="#main-content" class="skip-to-content">Skip to main content</a>
```

---

## Motion

All transitions and animations must be disabled or minimized when `prefers-reduced-motion: reduce` is active:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The spinner animation on the execution panel must respect this. Replace animated spinner with a static "Running…" text when motion is reduced.

---

## Windows High Contrast Mode

Use the `forced-colors: active` media query for Windows High Contrast compatibility:

```css
@media (forced-colors: active) {
  .llm-badge {
    border: 1px solid ButtonText;
    forced-color-adjust: none;
  }
}
```

System colors to use in high-contrast overrides:
- `ButtonText` — text on buttons
- `ButtonFace` — button background
- `Highlight` — selected item background
- `HighlightText` — selected item text
- `GrayText` — disabled text
- `LinkText` — link color

---

## Forms

Every form control must have:
1. An associated `<label>` element (using `for`/`id` or wrapping)
2. An `aria-describedby` pointing to any error or hint text
3. `role="alert"` on error messages so they are announced immediately

---

## Images and Icons

- Decorative icons: `aria-hidden="true"`
- Informative icons: `aria-label` on the icon itself or on the containing button
- No `<img>` tags without `alt` attribute (empty `alt=""` for decorative images)
