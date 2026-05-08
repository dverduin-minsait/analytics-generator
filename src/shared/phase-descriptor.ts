/**
 * Phase identifiers — one per product phase, 1-indexed.
 * Phases 1-9 are core; Phase 10 is premium (CI/CD drift detection).
 */
export enum PhaseId {
  IntentAnalysis = 1,
  RepositoryAnalysis = 2,
  Reconciliation = 3,
  GovernedAnalyticsSpec = 4,
  HumanReviewApproval = 5,
  AnalyticsApiContract = 6,
  AnalyticsDataModel = 7,
  AutomaticInstrumentation = 8,
  ValidationCompliance = 9,
  ContinuousDriftDetection = 10,
}

/**
 * Declares whether and how a phase uses LLMs.
 *
 * - 'none'     — fully deterministic; LLMs never involved
 * - 'optional' — LLM can be toggled on ("POWER UP"); output is marked as assisted
 * - 'required' — phase cannot run without an LLM; UI shows a required badge
 * - 'partial'  — some sub-steps use LLM (e.g., semantic similarity); others are deterministic
 */
export type LLMUsage = 'none' | 'optional' | 'required' | 'partial';

export interface InputDescriptor {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly type: 'file' | 'folder' | 'files' | 'text';
  /** Accepted file extensions, e.g. ['.md', '.txt', '.pdf'] */
  readonly accept?: readonly string[];
  readonly required: boolean;
}

export interface OutputDescriptor {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Maps to an artifact type key in artifacts.ts */
  readonly artifactType: string;
}

export interface PhaseDescriptor {
  readonly id: PhaseId;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  /** One-sentence goal statement shown at the top of the phase screen */
  readonly goalStatement: string;
  readonly llmUsage: LLMUsage;
  readonly inputs: readonly InputDescriptor[];
  readonly outputs: readonly OutputDescriptor[];
  readonly isPremium: boolean;
  /** Phase IDs whose outputs this phase requires as inputs */
  readonly dependsOn: readonly PhaseId[];
}
