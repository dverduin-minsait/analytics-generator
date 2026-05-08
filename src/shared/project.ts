import type { PhaseId } from './phase-descriptor';

// ─── Phase state ─────────────────────────────────────────────────────────────

export type PhaseStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface PhaseState {
  readonly phaseId: PhaseId;
  status: PhaseStatus;
  /** ISO 8601 */
  startedAt?: string;
  /** ISO 8601 */
  completedAt?: string;
  /**
   * Maps each OutputDescriptor.id to a path relative to the project root.
   * Populated when the phase completes successfully.
   */
  artifactPaths: Record<string, string>;
  /** True if any step in this phase was assisted by an LLM */
  llmAssisted: boolean;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface ProjectMetadata {
  readonly id: string; // UUID v4
  name: string;
  description?: string;
  /** ISO 8601 */
  readonly createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
  /** Bumped on schema-breaking changes to enable forward migrations */
  readonly schemaVersion: string;
}

export interface Project {
  metadata: ProjectMetadata;
  /** The phase currently open/active. null means only the dashboard is shown. */
  currentPhaseId: PhaseId | null;
  phases: PhaseState[];
  /** Absolute path to ~/.analytics-platform/projects/<id>/ */
  readonly rootPath: string;
}
