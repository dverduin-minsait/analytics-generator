import type { PhaseDescriptor, PhaseId } from './phase-descriptor';

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

// ─── Execution ───────────────────────────────────────────────────────────────

export interface ExecutionOptions {
  /** Whether the phase may use an LLM for optional/partial assistance */
  readonly useLLM: boolean;
  /**
   * If true, the phase performs all analysis but writes no files and makes no
   * code modifications. Used for previewing Automatic Instrumentation (Phase 8).
   */
  readonly dryRun: boolean;
  /** The configured LLM provider key. Required when useLLM is true. */
  readonly llmProvider?: string;
  /**
   * When set, the engine uses this raw JSON string as the LLM response instead
   * of calling the configured provider. This enables "bring your own chatbot"
   * mode where the user manually obtains the LLM analysis from an external tool.
   * The string must conform to the phase's expected output schema.
   */
  readonly manualLLMResponse?: string;
}

// ─── Progress events ─────────────────────────────────────────────────────────

export type ProgressEventType =
  | 'started'
  | 'progress'
  | 'warning'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProgressEvent {
  readonly type: ProgressEventType;
  readonly phaseId: PhaseId;
  readonly message: string;
  /** 0–100. Optional; not every intermediate event carries a percentage. */
  readonly percentComplete?: number;
  /** Arbitrary structured detail for the UI or logs */
  readonly detail?: unknown;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** True if this step was assisted by an LLM */
  readonly llmAssisted: boolean;
}

// ─── Phase engine contract ────────────────────────────────────────────────────

/**
 * Core contract every phase engine must satisfy.
 *
 * T = input type for this phase
 * R = result/output type produced by this phase
 *
 * Design rules:
 * - validate() is always synchronous and purely deterministic.
 * - execute() is an AsyncGenerator that yields ProgressEvents and, on return,
 *   produces the phase output artifact (type R).
 * - execute() MUST NOT silently swallow errors; it must either yield a
 *   'failed' event and return, or throw so the caller can handle it.
 * - cancel() signals the engine to stop at the next yield point.
 */
export interface PhaseEngine<T, R> {
  readonly descriptor: PhaseDescriptor;
  validate(input: T): ValidationResult;
  execute(
    input: T,
    options: ExecutionOptions,
  ): AsyncGenerator<ProgressEvent, R, unknown>;
  cancel(): Promise<void>;
}
