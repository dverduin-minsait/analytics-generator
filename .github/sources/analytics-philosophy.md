# Source: Analytics Philosophy

> Trusted reference for the product's core philosophy on analytics design.
> This document defines *why* this product exists and *what properties* its output must have.
> It is the canonical reference for the Functional Agent when evaluating phase correctness.

---

## What Product Analytics Is

Product analytics is the systematic collection of behavioral data that describes how users interact with a product over time. Good analytics enables:
- Measuring whether features are used and how
- Understanding user journeys across the product
- Identifying friction points and drop-off
- Validating product hypotheses with real data

---

## The Problem This Product Solves

Analytics implementations suffer from three recurring failures:

1. **Inconsistency**: Different engineers implement the same event in different ways, with different property names, casing conventions, and values.
2. **Undocumented intent**: Analytics events are added without documenting what behavior they represent or what question they answer.
3. **Drift**: The tracking implementation diverges from the documented spec over time, making data unreliable.

Analytics Compiler addresses all three by treating analytics as a **formal artifact** — a contract derived from product documentation and verified programmatically.

---

## The Intent → Contract → Code Model

The pipeline produces analytics through four conceptual stages:

| Stage | What it produces | Verified by |
|---|---|---|
| **Intent** | User flows and feature descriptions (Phase 1) | Functional Agent |
| **Spec** | Analytics events implied by those flows (Phases 2-3) | Functional Agent |
| **Contract** | Machine-readable schemas that define what is valid (Phases 4-5) | Testing Agent |
| **Code** | Implementation, tests, and documentation (Phases 6-8) | Testing Agent |
| **Audit** | Proof that code matches contract matches intent (Phases 9-10) | Functional Agent |

---

## Properties of a Good Analytics Event

An analytics event is well-designed if it satisfies all of the following:

### 1. It has a single, clear business meaning

An event name must describe a specific user action, not a generic technical operation.

| Poor | Better |
|---|---|
| `button_clicked` | `checkout_started` |
| `page_viewed` | `product_detail_viewed` |
| `api_called` | `payment_method_saved` |

### 2. Its properties are necessary and sufficient

Every property on an event must answer a business question. Properties that are always `null`, always the same value, or serve no analytical purpose must be removed.

### 3. It is fired exactly once per occurrence

An event must fire exactly once when the described action occurs. It must not fire:
- On render (unless "viewed" is genuinely the intent)
- Multiple times for a single user action
- Speculatively (before the action has actually occurred)

### 4. It has a stable identity

The event name and its required properties must not change between schema versions without a migration plan. Breaking changes to event schemas invalidate historical data.

### 5. Its name follows a consistent taxonomy

Event names follow the `<OBJECT>_<VERB>` convention in SCREAMING_SNAKE_CASE:

```
CHECKOUT_STARTED
PAYMENT_METHOD_ADDED
ORDER_COMPLETED
PRODUCT_SEARCHED
FILTER_APPLIED
```

---

## The Role of LLMs in the Pipeline

LLMs are used where **structural understanding** is required — parsing natural language into structured models. They are not used where the task is mechanical or rule-based.

LLM usage is explicit and bounded:

| Task | LLM role | Fallback |
|---|---|---|
| Parsing documentation → Intent Model | Primary | None (required) |
| Suggesting event names from flows | Advisory | User-specified names |
| Generating code from schema | Template expansion | Handlebars-style templates |
| Validating contract correctness | None | Deterministic JSON Schema validation |
| Auditing implementation drift | None | Deterministic AST comparison |

The LLM never makes final decisions. Its output is always:
1. Normalized against a defined schema
2. Validated before being passed downstream
3. Stored as raw LLM output in the project history for auditability

---

## What Makes an Analytics Schema a "Contract"

A schema becomes a contract when it is:
1. **Versioned** — changes produce a new version, not a silent mutation
2. **Validated** — implementations are checked against it programmatically
3. **Signed off** — an explicit human or automated approval step exists
4. **Auditable** — there is a record of what was approved, when, and by whom

Phase 5 (Contract Validation) is the gate that enforces this. No downstream phase runs if Phase 5 fails.

---

## Output Quality Criteria

The final output of the pipeline is judged by:

| Criterion | Definition |
|---|---|
| **Completeness** | Every user flow identified in Phase 1 has at least one corresponding analytics event |
| **Consistency** | Event names and property names follow the declared taxonomy without exceptions |
| **Traceability** | Every event can be traced back to a specific user flow in the Intent Model |
| **Implementability** | Generated code compiles and passes its generated tests without modification |
| **Auditability** | The full pipeline run is recorded in the NDJSON audit log with timestamps and LLM call records |
