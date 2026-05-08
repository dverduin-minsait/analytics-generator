/**
 * Artifact types — structured outputs persisted to disk after each phase.
 * Every artifact carries a schemaVersion and generatedAt timestamp so the
 * system can detect staleness and schema drift.
 */

// ─── Phase 1: Intent Model ────────────────────────────────────────────────────

export interface IntentEvent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly trigger: string;
  readonly expectedProperties: readonly string[];
  /** explicit = mentioned verbatim; inferred = deduced by the LLM from context */
  readonly source: 'explicit' | 'inferred';
}

export interface IntentFlow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly userStories: readonly string[];
  readonly features: readonly string[];
  readonly events: readonly IntentEvent[];
  /** 0–1 confidence score from the LLM semantic parsing */
  readonly confidence: number;
  readonly llmAssisted: boolean;
}

export interface IntentModel {
  readonly schemaVersion: string;
  /** ISO 8601 */
  readonly generatedAt: string;
  readonly llmAssisted: boolean;
  readonly llmProvider?: string;
  /** Original source document names/paths */
  readonly sourceDocuments: readonly string[];
  readonly flows: readonly IntentFlow[];
  readonly globalEvents: readonly IntentEvent[];
  readonly metadata: Record<string, unknown>;
}

// ─── Phase 2: Execution Model (placeholder) ───────────────────────────────────

export interface ExistingTrackingCall {
  readonly file: string;
  readonly line: number;
  readonly eventName: string;
  readonly properties: readonly string[];
}

export interface RepositoryAnalysis {
  readonly path: string;
  readonly language: string;
  readonly frameworks: readonly string[];
  readonly existingTracking: readonly ExistingTrackingCall[];
}

export interface ExecutionModel {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly repositories: readonly RepositoryAnalysis[];
}

// ─── Phase 3: Reconciliation Report (placeholder) ────────────────────────────

export interface ReconciledFlow {
  readonly intentFlowId: string;
  readonly confidence: number;
  readonly matchedCodePaths: readonly string[];
  readonly issues: readonly string[];
  readonly llmAssisted: boolean;
}

export interface ReconciliationReport {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly reconciledFlows: readonly ReconciledFlow[];
}

// ─── Phases 4–9: Placeholder artifact types ──────────────────────────────────
// These will be fully specified when those phases are implemented.

export interface AnalyticsSpecification {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly events: readonly unknown[];
}

export interface AnalyticsApiContract {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly openApiSpec: unknown;
}

export interface AnalyticsDataModel {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly tables: readonly unknown[];
}

export interface ComplianceReport {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly passed: boolean;
  readonly violations: readonly unknown[];
}
