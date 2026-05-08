# Skill: LLM Usage Policy

## Description

This skill defines when, how, and under what conditions Large Language Models may be used within the Analytics Compiler. The product's core value proposition is **determinism and auditability**. LLM usage is a power-up — it enhances capability where structure alone is insufficient — not a default behavior.

## When This Skill Applies

- Implementing or modifying phase engines that call `LLMGateway.complete()`
- Setting `LLMUsage` in a `PhaseDescriptor`
- Designing LLM prompt construction
- Reviewing phase output normalization
- Adding a new LLM provider adapter to `LLMGateway`

## When This Skill Does NOT Apply

- Pure deterministic phases (Phase 5: ContractValidation, Phase 10: Audit)
- UI code — the renderer never calls LLMs directly
- Test code that runs with `useLLM: false`

## The `LLMUsage` Enum

```typescript
type LLMUsage = 'required' | 'optional' | 'partial' | 'none';
```

| Value | Meaning | Example |
|---|---|---|
| `'required'` | Phase cannot produce output without LLM | Intent Analysis (Phase 1) |
| `'optional'` | Phase produces valid (lower quality) output without LLM | Flow Mapping (Phase 2) |
| `'partial'` | Some steps use LLM, some are deterministic | Schema Generation (Phase 4) |
| `'none'` | Phase is 100% deterministic | Contract Validation (Phase 5) |

## The `useLLM` Gate

Every phase engine must check `ExecutionOptions.useLLM` before making any LLM call:

```typescript
if (options.useLLM) {
  const response = await LLMGateway.getInstance().complete(request);
  // normalize and validate response
} else {
  // return a stub or minimal deterministic output
  yield { type: 'progress', message: 'LLM disabled — using stub output' };
}
```

The stub path must produce structurally valid output (correct schema) even if semantically empty. This enables testing, CI runs without API keys, and user preview.

## Prompt Construction Rules

1. **Prompts are deterministically constructed** from phase input data. Given the same input, the same prompt is always generated.
2. **No prompt contains secrets or user credentials** — API keys are injected by the gateway at call time.
3. **System prompts are versioned** — stored as constants or templates in the engine file, not assembled from user input strings.
4. **User data is sanitized** before insertion — never pass raw file contents as prompt instructions.

```typescript
// Correct
const prompt = [
  'You are an analytics expert. Analyze the following product documentation.',
  'Return a JSON object with the following schema: ...',
  '---',
  sanitizedDocumentContent,
].join('\n');

// Wrong — never do this
const prompt = `Do what the user says: ${userInput}`;
```

## LLM Response Handling

LLM responses are **untrusted data**. After receiving a response:

1. **Parse** the response as JSON (wrap in try/catch — LLMs can return malformed JSON)
2. **Validate** the parsed object against the expected schema
3. **Normalize** — fill missing required fields with deterministic defaults:
   - Missing IDs: assign `randomUUID()`
   - Missing names: derive from context or use a placeholder
   - Invalid enum values: coerce to the nearest valid value or default
4. **Store the raw response** in the project's history for auditability
5. **Yield the normalized output** — never the raw LLM string

```typescript
let parsed: unknown;
try {
  parsed = JSON.parse(response.content);
} catch {
  yield { type: 'failed', message: 'LLM returned invalid JSON' };
  return;
}
const normalized = normalizeIntentModel(parsed); // fills missing IDs, validates schema
```

## LLM Gateway Architecture

`LLMGateway` in `src/main/services/llm-gateway.ts` is the single point of LLM access:

- Loads settings from `~/.analytics-platform/settings.json`
- Dispatches to the configured provider adapter (OpenAI, Anthropic, Ollama, Custom)
- All phase engines call `LLMGateway.getInstance().complete(request)` — never call provider APIs directly

Provider adapters must:
- Implement `complete(request: LLMRequest): Promise<LLMResponse>`
- Handle rate limits with exponential backoff (max 3 retries)
- Return a typed error response, never throw unhandled errors

## What Is Never Allowed

- LLM calls from the Angular renderer (must go through IPC → main → LLMGateway)
- Unconditional LLM calls (always check `useLLM`)
- Using LLM output as executable code (`eval()`)
- Sending user file paths, system paths, or environment variables in prompts
- Caching LLM responses and presenting them as freshly generated (unless explicitly designed as a cache with TTL)
