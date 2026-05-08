# Prompt: Documentation

> Use this prompt when writing or updating documentation for this repository.

---

You are writing documentation for the **Analytics Compiler** repository. Documentation in this project serves two audiences: human developers and AI agents. Both audiences require precision, not marketing language.

## Documentation Principles

1. **Factual, not aspirational** — document what the code does, not what we wish it would do
2. **Prescriptive, not descriptive** — write rules, not observations
3. **No filler** — every sentence must carry information; remove sentences that do not
4. **Concrete examples over abstract explanations** — show code, not prose equivalents of code
5. **Stable references** — documentation must remain valid after minor code changes

## Documentation Locations

| Content type | Location |
|---|---|
| Agent definitions | `.github/agents/` |
| Skill definitions | `.github/skills/` |
| Prompt templates | `.github/prompts/` |
| Trusted source references | `.github/sources/` |
| Code-level documentation | Inline JSDoc on exported functions only |
| Architecture overview | `.github/sources/architecture.md` |
| Coding conventions | `.github/sources/coding-standards.md` |

## Code Comments Policy

Comments in TypeScript source files follow this policy:

| Type | When to use |
|---|---|
| No comment | Code is self-explanatory from names and types |
| Single-line `//` | Explain *why* — not *what* — when non-obvious |
| Block `/* */` | Never in TypeScript source — use JSDoc instead |
| JSDoc `/** */` | On all exported functions, classes, and interfaces |
| Section marker `// ─── Title ─` | To visually group related code within a long file |

### JSDoc Format

```typescript
/**
 * Atomically writes a JSON file by first writing to a temporary path,
 * then renaming to the final path. This prevents partial writes.
 *
 * @param filePath - The final destination path
 * @param data - The object to serialize as JSON
 * @throws If the directory does not exist or write permissions are denied
 */
async function writeAtomicJson(filePath: string, data: unknown): Promise<void>
```

Only document parameters that are not self-evident from the type signature. If the types fully describe the contract, a one-line summary is sufficient.

## What NOT to Document

- Implementation details that change frequently
- The "how" of code that is obvious from reading it
- Aspirational goals that have not been implemented
- Anything that duplicates what TypeScript types already express

## `.github/sources/` Files

These files are the canonical references for AI agents. When writing or updating them:

- Use present tense ("The phase engine produces…" not "The phase engine will produce…")
- Use imperative mood for rules ("Use `randomUUID()` for IDs" not "IDs should be generated with…")
- Keep all facts verifiable against the current source code
- Mark anything that is not yet implemented with `[NOT YET IMPLEMENTED]` and a brief explanation

## Updating Documentation After Code Changes

When a code change makes a documentation file inaccurate:
1. Update the documentation in the same commit as the code change
2. Never leave stale documentation — incorrect documentation is worse than no documentation
3. If a `.github/sources/` file references a specific file path or function name, update it when those change
