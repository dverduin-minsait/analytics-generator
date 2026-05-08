# Skill: Testing Strategy

## Description

This skill defines how tests are structured, what they target, and what quality bar they enforce for this repository. Tests are not optional — they are the verification layer that makes the determinism claims of the phase engine trustworthy.

## When This Skill Applies

- Writing any new test file under `test/`
- Deciding between unit, integration, or E2E test coverage
- Setting up fixtures or mock data
- Configuring Jest or Playwright
- Evaluating test coverage

## When This Skill Does NOT Apply

- Writing production code — this skill is test-side only
- Reviewing product logic correctness — that is the Functional Agent's scope

## Test Stack

| Layer | Tool | Target |
|---|---|---|
| Unit | Jest + ts-jest | `src/main/`, `src/shared/` |
| E2E | Playwright + `electron` | Full Electron app |
| Angular | (future) `@angular/testing` | `src/renderer/` |

## Jest Configuration

- Config: `jest.config.js` (CommonJS, no ts-node required)
- TypeScript: `ts-jest` with `tsconfig.spec.json`
- Path alias: `@shared/*` → `src/shared/*`
- Test environment: `node`
- Roots: `test/unit/`

## Unit Test Conventions

### File Naming

```
test/unit/<module-name>.spec.ts
```

Maps to source files:
```
src/main/services/project-manager.ts → test/unit/project-manager.spec.ts
src/main/phases/intent-analysis/intent-analysis-engine.ts → test/unit/intent-analysis-engine.spec.ts
```

### Test Structure

```typescript
describe('ComponentOrService', () => {
  describe('methodName()', () => {
    it('does X when Y', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Phase Engine Tests: Required Coverage

Every phase engine must be tested for:

1. **`validate()` with valid input** — returns `{ valid: true }`
2. **`validate()` with missing required field** — returns `{ valid: false, errors: [...] }`
3. **`execute()` with `useLLM: false`** — produces a `ProgressEvent[]` sequence ending in `type: 'completed'`
4. **`execute()` cancellation** — setting `AbortController.abort()` before/during execution produces `type: 'cancelled'`
5. **Golden output test** — deterministic output for a fixed canonical input (stored in `test/fixtures/golden/`)

### Collecting Generator Output

```typescript
async function collect(gen: AsyncGenerator<ProgressEvent>): Promise<ProgressEvent[]> {
  const events: ProgressEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}
```

### File System Tests (ProjectManager)

Use `afterAll` to clean up test projects:

```typescript
const createdIds: string[] = [];

afterAll(async () => {
  const manager = ProjectManager.getInstance();
  for (const id of createdIds) {
    await manager.deleteProject({ projectId: id }).catch(() => {});
  }
});
```

## Playwright E2E Conventions

### App Launch

```typescript
import { _electron as electron } from 'playwright';

const app = await electron.launch({ args: ['.'] });
const page = await app.firstWindow();
await page.waitForSelector('app-root');
```

### Element Selection

Prefer `getByRole`, `getByLabel`, and `getByText` over CSS selectors:

```typescript
await page.getByRole('link', { name: /Welcome/ }).click();
await page.getByLabel('Project name').fill('Test Project');
```

### Assertions

```typescript
await expect(page.getByRole('heading', { name: 'Intent Analysis' })).toBeVisible();
await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
```

## Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

Coverage is collected from `src/main/**/*.ts` and `src/shared/**/*.ts`. Renderer coverage is tracked separately when Angular testing is added.

## What Is NOT Tested Here

- Angular component rendering (no JSDOM — no component tests yet)
- LLM provider API calls (always stubbed)
- Electron auto-updater
- OS file dialog behavior (mocked in E2E by providing paths directly)
