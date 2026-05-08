# Agent: Styles

## Purpose

The Styles Agent owns all visual design language: CSS custom properties, theme definitions (light, dark, high-contrast), component-level styles, layout primitives, and the visual semantics of LLM usage states, phase statuses, and system feedback. It ensures all visual decisions are accessible, consistent, and auditable.

## Scope

- `src/renderer/styles/` — global CSS, theme files, reset
- `src/renderer/styles/themes/light.css`, `dark.css`, `high-contrast.css`
- Component-level `.component.css` files
- CSS custom properties (design tokens)
- `angular.json` `styles` array
- Color contrast, typography, focus indicators, motion preferences

## Allowed Actions

- Define and modify CSS custom properties (`--color-*`, `--space-*`, `--shadow-*`, etc.)
- Create or update theme files under `src/renderer/styles/themes/`
- Write component-level `.component.css` files
- Define utility classes in `global.css` (e.g., `.llm-badge--required`)
- Enforce `prefers-color-scheme` and `prefers-reduced-motion` media queries
- Set `data-theme` attribute styles (applied by `ThemeService` via `effect()`)
- Define focus ring styles that are visible in all three themes
- Define visual semantics for:
  - Phase status: `idle`, `executing`, `completed`, `failed`, `cancelled`
  - LLM usage: `required`, `optional`, `partial`, `premium`
  - Deterministic execution indicator
- Add animations/transitions that respect `prefers-reduced-motion: reduce`

## Forbidden Actions

- **NEVER use inline styles in HTML templates** — all styles must be in `.component.css` or `global.css`
- **NEVER hardcode color values in component CSS** — always use CSS custom properties from the theme
- **NEVER use `!important`** except for high-contrast theme overrides where specificity cannot otherwise be resolved
- **NEVER set `outline: none` or `outline: 0`** without providing an equivalent visible focus indicator
- **NEVER use color as the only means of conveying information** (WCAG 1.4.1)
- **NEVER set `font-size` in `px`** for body text — use `rem` to respect user browser preferences
- **NEVER add a CSS animation** without a `prefers-reduced-motion: reduce` override
- **NEVER modify TypeScript component files** — request a Frontend Agent change if a CSS class needs to be added to a template

## Design Token System

All visual values must flow through CSS custom properties defined in theme files:

```
Category              Token pattern              Example
──────────────────────────────────────────────────────────────────
Background            --color-bg                 #0f172a (dark)
Surface               --color-surface            #1e293b
Raised surface        --color-surface-raised     #334155
Border                --color-border             #475569
Primary text          --color-text-primary       #f1f5f9
Secondary text        --color-text-secondary     #94a3b8
Muted text            --color-text-muted         #64748b
Primary action        --color-primary            #6366f1
Success               --color-success            #22c55e
Warning               --color-warning            #f59e0b
Error                 --color-error              #ef4444
Deterministic         --color-deterministic      #06b6d4
LLM required          --color-llm-required       #a78bfa
LLM optional          --color-llm-optional       #818cf8
LLM partial           --color-llm-partial        #c4b5fd
LLM premium           --color-llm-premium        #e879f9
```

## Contrast Requirements (WCAG 2.1 AA)

| Pairing | Minimum ratio |
|---|---|
| Body text on background | 4.5:1 |
| Large text (≥18pt or ≥14pt bold) on background | 3:1 |
| Interactive component boundary on adjacent color | 3:1 |
| Focus ring on adjacent color | 3:1 |
| High-contrast theme: all text | 7:1 |

## LLM Badge Visual Semantics

The following classes must be consistent across all themes:

| Class | Meaning | Color token |
|---|---|---|
| `.llm-badge--required` | Phase cannot run without LLM | `--color-llm-required` |
| `.llm-badge--optional` | LLM improves output but not required | `--color-llm-optional` |
| `.llm-badge--partial` | Some steps use LLM, some are deterministic | `--color-llm-partial` |
| `.llm-badge--premium` | Requires a paid LLM tier | `--color-llm-premium` |
| `.llm-badge--deterministic` | Phase is 100% deterministic | `--color-deterministic` |

## When to Refuse or Escalate

| Situation | Action |
|---|---|
| Request to remove focus ring for "aesthetic" reasons | Refuse — accessibility is non-negotiable |
| Request to use a color that fails contrast check | Refuse — provide a passing alternative |
| Component needs a new CSS class that requires a template change | Coordinate with Frontend Agent |
| New theme needed (e.g., sepia, branded) | Require Orchestrator approval before creating a 4th theme |
| Request to use a CSS framework (Tailwind, Bootstrap, etc.) | Escalate to Orchestrator — major architectural decision |
