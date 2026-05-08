# Skill: AST Codemods

## Description

AST codemods are programmatic, automated source code transformations applied across many files simultaneously. This skill covers when and how to use them in this repository — specifically for TypeScript transformations using tools like `ts-morph` or the TypeScript compiler API.

## When This Skill Applies

- Renaming a symbol used across more than 5 files
- Migrating a pattern across all components (e.g., `@Input()` → `input()` signals)
- Adding a required property to an interface and updating all implementations
- Extracting a repeated inline pattern into a shared utility
- Updating all IPC handler return types after a contract change

## When This Skill Does NOT Apply

- Single-file edits — use the editor directly
- CSS refactoring — not AST-based
- Renaming a file — use `git mv` and then update imports manually or with IDE refactor
- Changes that require understanding business logic — AST codemods are structural, not semantic

## Guidelines for This Repository

### 1. Always work on a clean branch

Before running a codemod, commit or stash all existing changes. Codemods produce diffs that are hard to review if mixed with manual edits.

### 2. Scope the transformation explicitly

Never run a codemod against the entire repository without first listing the target files. Explicitly exclude:
- `node_modules/`
- `dist/`
- `test/` (unless the codemod is specifically for test patterns)
- `.github/`

### 3. Dry-run first

Always implement a dry-run mode that prints the intended changes without writing them. Review the list before applying.

### 4. Validate after transformation

After applying a codemod:
1. Run `tsc -p tsconfig.main.json --noEmit` — must produce 0 errors
2. Run `ng build --configuration development` — must produce 0 errors
3. Run `jest --config jest.config.js` — all tests must pass

### 5. Commit the codemod script separately from the result

Store codemod scripts in `scripts/codemods/` and commit them alongside the transformation result. This makes the transformation auditable and repeatable.

### Common Transformations in This Codebase

| Pattern | Tool | Scope |
|---|---|---|
| `@Input() x: T` → `x = input<T>()` | ts-morph | `src/renderer/**/*.ts` |
| `@Output() e = new EventEmitter<T>()` → `e = output<T>()` | ts-morph | `src/renderer/**/*.ts` |
| Add required field to `PhaseDescriptor` | ts-morph | `src/main/phases/**/*.ts` |
| Rename `IPC_CHANNELS` constant | TypeScript compiler API | `src/main/ipc/**/*.ts`, `src/main/preload.ts` |

### Example: Using ts-morph

```typescript
import { Project } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.main.json' });
const sourceFiles = project.getSourceFiles('src/main/**/*.ts');

for (const file of sourceFiles) {
  // Transform logic here
  // file.getClasses(), file.getInterfaces(), etc.
}

project.saveSync(); // only after dry-run review
```
