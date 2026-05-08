/**
 * Phase Registry — central catalog of all 10 phase descriptors and their engines.
 *
 * The registry is the authoritative source for:
 * - What phases exist and in what order
 * - Each phase's LLM usage declaration
 * - Which phase engine to instantiate for execution
 *
 * Engines are created lazily on first access to avoid loading heavy modules
 * until they are actually needed.
 */

import type { PhaseDescriptor } from '../../shared/phase-descriptor';
import { PhaseId } from '../../shared/phase-descriptor';
import type { PhaseEngine } from '../../shared/phase-engine';
import { IntentAnalysisEngine } from './intent-analysis/intent-analysis-engine';

// ─── Phase descriptor catalog ─────────────────────────────────────────────────

const PHASE_DESCRIPTORS: PhaseDescriptor[] = [
  {
    id: PhaseId.IntentAnalysis,
    name: 'Intent Analysis',
    shortName: 'Intent',
    description:
      'Parse your functional documentation into a structured Intent Model that captures user flows, features, and the analytics events they imply.',
    goalStatement:
      'Transform product documentation into a structured, machine-readable Intent Model.',
    llmUsage: 'required',
    inputs: [
      {
        id: 'documents',
        label: 'Documentation Files',
        description: 'Markdown, plain-text, or PDF files describing product functionality.',
        type: 'files',
        accept: ['.md', '.txt', '.pdf'],
        required: true,
      },
    ],
    outputs: [
      {
        id: 'intentModel',
        label: 'Intent Model',
        description: 'Structured representation of user flows, features, and expected events.',
        artifactType: 'IntentModel',
      },
    ],
    isPremium: false,
    dependsOn: [],
  },
  {
    id: PhaseId.RepositoryAnalysis,
    name: 'Repository Analysis',
    shortName: 'Repository',
    description:
      'Analyze your source code repositories using AST-based static analysis to produce a deterministic Execution Model of existing tracking calls and code structure.',
    goalStatement:
      'Build a deterministic Execution Model from your codebase — no LLMs involved.',
    llmUsage: 'none',
    inputs: [
      {
        id: 'repositories',
        label: 'Repository Folders',
        description: 'Root folders of source code repositories to analyze.',
        type: 'folder',
        required: true,
      },
    ],
    outputs: [
      {
        id: 'executionModel',
        label: 'Execution Model',
        description: 'AST-derived map of existing tracking calls and code structure.',
        artifactType: 'ExecutionModel',
      },
    ],
    isPremium: false,
    dependsOn: [],
  },
  {
    id: PhaseId.Reconciliation,
    name: 'Reconciliation',
    shortName: 'Reconcile',
    description:
      'Cross-reference the Intent Model against the Execution Model to identify gaps, conflicts, and reconciled flows with confidence scores.',
    goalStatement:
      'Reconcile what the product intends with what the code actually tracks.',
    llmUsage: 'partial',
    inputs: [],
    outputs: [
      {
        id: 'reconciliationReport',
        label: 'Reconciliation Report',
        description: 'Reconciled flows with confidence levels and identified gaps.',
        artifactType: 'ReconciliationReport',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.IntentAnalysis, PhaseId.RepositoryAnalysis],
  },
  {
    id: PhaseId.GovernedAnalyticsSpec,
    name: 'Governed Analytics Specification',
    shortName: 'Spec',
    description:
      'Generate a human-readable, governed analytics specification from the validated reconciled model.',
    goalStatement:
      'Produce a governed, auditable analytics specification from validated models.',
    llmUsage: 'none',
    inputs: [],
    outputs: [
      {
        id: 'analyticsSpec',
        label: 'Analytics Specification',
        description: 'Complete governed specification of all analytics events and properties.',
        artifactType: 'AnalyticsSpecification',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.Reconciliation],
  },
  {
    id: PhaseId.HumanReviewApproval,
    name: 'Human Review & Approval',
    shortName: 'Review',
    description:
      'Review the analytics specification and approve it with a full audit trail before any code generation begins.',
    goalStatement: 'Human approval gate — the spec cannot proceed without explicit sign-off.',
    llmUsage: 'none',
    inputs: [],
    outputs: [
      {
        id: 'approvedSpec',
        label: 'Approved Specification',
        description: 'The analytics spec with approval status and reviewer audit trail.',
        artifactType: 'AnalyticsSpecification',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.GovernedAnalyticsSpec],
  },
  {
    id: PhaseId.AnalyticsApiContract,
    name: 'Analytics API Contract',
    shortName: 'Contract',
    description:
      'Generate a formal, versioned API schema (OpenAPI) from the approved analytics specification.',
    goalStatement: 'Generate a formal API contract — deterministic, no LLMs.',
    llmUsage: 'none',
    inputs: [],
    outputs: [
      {
        id: 'apiContract',
        label: 'API Contract',
        description: 'OpenAPI schema defining the analytics ingestion API.',
        artifactType: 'AnalyticsApiContract',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.HumanReviewApproval],
  },
  {
    id: PhaseId.AnalyticsDataModel,
    name: 'Analytics Data Model',
    shortName: 'Data Model',
    description:
      'Generate the storage schema with consent constraints and PII annotations from the API contract.',
    goalStatement: 'Generate the storage schema with consent constraints.',
    llmUsage: 'none',
    inputs: [],
    outputs: [
      {
        id: 'dataModel',
        label: 'Data Model',
        description: 'Storage schema with consent constraints and PII annotations.',
        artifactType: 'AnalyticsDataModel',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.AnalyticsApiContract],
  },
  {
    id: PhaseId.AutomaticInstrumentation,
    name: 'Automatic Instrumentation',
    shortName: 'Instrument',
    description:
      'Apply deterministic AST-based code modifications to instrument your codebase. Supports dry-run and PR-style diff preview.',
    goalStatement:
      'Instrument your codebase deterministically via AST — LLMs never modify production code.',
    llmUsage: 'optional',
    inputs: [],
    outputs: [
      {
        id: 'instrumentationDiff',
        label: 'Instrumentation Diff',
        description: 'PR-style diff of all code changes to be applied.',
        artifactType: 'InstrumentationDiff',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.AnalyticsDataModel],
  },
  {
    id: PhaseId.ValidationCompliance,
    name: 'Validation & Compliance',
    shortName: 'Validate',
    description:
      'Verify that the instrumented code matches the API contract and data model, and generate a compliance report.',
    goalStatement: 'Verify compliance — deterministic validation, no LLMs.',
    llmUsage: 'none',
    inputs: [],
    outputs: [
      {
        id: 'complianceReport',
        label: 'Compliance Report',
        description: 'Full compliance and consistency report against the contract.',
        artifactType: 'ComplianceReport',
      },
    ],
    isPremium: false,
    dependsOn: [PhaseId.AutomaticInstrumentation],
  },
  {
    id: PhaseId.ContinuousDriftDetection,
    name: 'Continuous Drift Detection',
    shortName: 'Drift',
    description:
      'CI integration that detects product, code, or consent drift over time and generates actionable reports.',
    goalStatement: 'Detect drift continuously — keep intent and implementation in sync.',
    llmUsage: 'partial',
    inputs: [],
    outputs: [
      {
        id: 'driftReport',
        label: 'Drift Report',
        description: 'Detected drift events and remediation recommendations.',
        artifactType: 'DriftReport',
      },
    ],
    isPremium: true,
    dependsOn: [PhaseId.ValidationCompliance],
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export class PhaseRegistry {
  private static instance: PhaseRegistry;
  // Engines are lazily instantiated; one instance per phase per app session
  private engines = new Map<PhaseId, PhaseEngine<unknown, unknown>>();

  private constructor() {}

  static getInstance(): PhaseRegistry {
    if (!PhaseRegistry.instance) {
      PhaseRegistry.instance = new PhaseRegistry();
    }
    return PhaseRegistry.instance;
  }

  getAllDescriptors(): PhaseDescriptor[] {
    return PHASE_DESCRIPTORS;
  }

  getDescriptor(phaseId: PhaseId): PhaseDescriptor | undefined {
    return PHASE_DESCRIPTORS.find((d) => d.id === phaseId);
  }

  getEngine(phaseId: PhaseId): PhaseEngine<unknown, unknown> | undefined {
    if (!this.engines.has(phaseId)) {
      const engine = this.createEngine(phaseId);
      if (engine) {
        this.engines.set(phaseId, engine as PhaseEngine<unknown, unknown>);
      }
    }
    return this.engines.get(phaseId);
  }

  private createEngine(phaseId: PhaseId): PhaseEngine<unknown, unknown> | null {
    switch (phaseId) {
      case PhaseId.IntentAnalysis:
        return new IntentAnalysisEngine();
      // TODO: implement remaining engines in follow-up iterations
      default:
        return null;
    }
  }
}
