# Prompt: Test Writing

> Use this prompt when writing new tests for this repository.

---

You are writing tests for the **Analytics Compiler** repository. Tests must be specific, independent, deterministic, and fast. Tests are the formal proof that the system behaves as documented.

## Before Writing Tests

1. Read the source file you are testing in full
2. Identify the exported functions, classes, and their documented contracts
3. Check `test/fixtures/` for existing fixtures you can reuse
4. Confirm the build passes before adding tests

## Unit Tests (Jest)

### File location

```
src/main/services/project-manager.ts
  → test/unit/project-manager.spec.ts

src/main/phases/intent-analysis/intent-analysis-engine.ts
  → test/unit/intent-analysis-engine.spec.ts
```

### Required structure for a phase engine test suite

```typescript
import { AbortController } from 'node:events';
import { IntentAnalysisEngine } from '../../src/main/phases/intent-analysis/intent-analysis-engine';
import type { ProgressEvent } from '../../src/shared/phase-engine';
import { CANONICAL_INPUT } from '../fixtures/intent-analysis-fixtures';

async function collect(gen: AsyncGenerator<ProgressEvent>): Promise<ProgressEvent[]> {
  const events: ProgressEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe('IntentAnalysisEngine', () => {
  let engine: IntentAnalysisEngine;

  beforeEach(() => {
    engine = new IntentAnalysisEngine();
  });

  describe('validate()', () => {
    it('returns valid for a well-formed input', () => {
      const result = engine.validate(CANONICAL_INPUT);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when documents is empty', () => {
      const result = engine.validate({ documents: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/document/i));
    });
  });

  describe('execute()', () => {
    it('completes with a valid IntentModel in stub mode', async () => {
      const events = await collect(engine.execute(CANONICAL_INPUT, { useLLM: false }));
      const last = events.at(-1);
      expect(last?.type).toBe('completed');
      expect(last?.detail).toMatchObject({ flows: expect.any(Array) });
    });

    it('respects AbortSignal cancellation', async () => {
      const controller = new AbortController();
      const gen = engine.execute(CANONICAL_INPUT, { useLLM: false, signal: controller.signal });
      controller.abort();
      const events = await collect(gen);
      expect(events.some(e => e.type === 'cancelled')).toBe(true);
    });

    it('produces stable output for canonical input (golden test)', async () => {
      const events = await collect(engine.execute(CANONICAL_INPUT, { useLLM: false }));
      const completed = events.find(e => e.type === 'completed');
      expect(completed?.detail).toMatchSnapshot();
    });
  });
});
```

### Test data rules

- Test data lives in `test/fixtures/` as TypeScript files with typed constants
- Production files are never modified to make tests easier to write
- File system state created during tests must be cleaned up in `afterAll`
- Never share mutable state between test cases — use `beforeEach` for fresh instances

## E2E Tests (Playwright)

### File location

```
test/e2e/smoke.spec.ts          — critical user paths
test/e2e/<feature>.spec.ts      — feature-specific E2E scenarios
```

### Required app launch pattern

```typescript
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import { test, expect } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] });
  page = await app.firstWindow();
  await page.waitForSelector('app-root');
});

test.afterAll(async () => {
  await app.close();
});
```

### Selector strategy (in order of preference)

1. `getByRole('button', { name: 'Create project' })` — semantic, stable
2. `getByLabel('Project name')` — form controls
3. `getByText('Phase 1')` — text content
4. `page.locator('[data-testid="phase-dot-1"]')` — only if semantic selectors fail

### Assertions

```typescript
// Visibility
await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

// ARIA state
await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

// Navigation
await expect(page).toHaveURL(/#\/project\/.+\/phase\/1/);
```

Never use `page.waitForTimeout()` — use `waitForSelector`, `waitForURL`, or `toBeVisible` with a timeout instead.

## What Good Tests Look Like

- Each `it()` block tests exactly one observable behavior
- Test names read as specifications: `'returns invalid when documents is empty'`
- No test has side effects that affect another test
- Tests do not assert on internal implementation details — only public outputs and observable state
- Flaky tests are investigated and fixed, not skipped
