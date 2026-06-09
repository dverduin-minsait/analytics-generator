/**
 * Phase 1 — Intent Analysis Engine
 *
 * Input : paths to documentation files (.md, .txt, .pdf)
 * Output: IntentModel
 * LLM   : REQUIRED — semantic parsing of natural language documentation
 *
 * Execution pipeline:
 *   1. [deterministic] Read and normalize document text
 *   2. [deterministic] Build structured prompt from normalized text
 *   3. [LLM]           Send prompt to configured LLM provider
 *   4. [deterministic] Parse and validate LLM response as IntentModel
 *   5. [deterministic] Persist IntentModel to disk (handled by IPC layer)
 *
 * Invariant: the LLM output is NEVER accepted as source of truth without
 * deterministic validation. Steps 1, 2, 4, and 5 are always deterministic.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { PhaseEngine, ExecutionOptions, ProgressEvent, ValidationResult } from '../../../shared/phase-engine';
import type { PhaseDescriptor } from '../../../shared/phase-descriptor';
import { PhaseId } from '../../../shared/phase-descriptor';
import type { IntentModel, IntentFlow, IntentEvent } from '../../../shared/artifacts';
import { LLMGateway } from '../../services/llm-gateway';

// ─── Descriptor (defined inline to avoid circular import with PhaseRegistry) ──

const INTENT_ANALYSIS_DESCRIPTOR: PhaseDescriptor = {
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
};

// ─── Input type for Phase 1 ────────────────────────────────────────────────────

export interface IntentAnalysisInput {
  /** Absolute paths to documentation files (.md, .txt, .pdf) */
  readonly filePaths: string[];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class IntentAnalysisEngine
  implements PhaseEngine<IntentAnalysisInput, IntentModel>
{
  private cancelRequested = false;

  get descriptor(): PhaseDescriptor {
    return INTENT_ANALYSIS_DESCRIPTOR;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  validate(input: IntentAnalysisInput): ValidationResult {
    const errors = [];

    if (!input.filePaths || input.filePaths.length === 0) {
      errors.push({ field: 'filePaths', message: 'At least one documentation file is required.' });
    }

    const unsupported = (input.filePaths ?? []).filter(
      (p) => !['.md', '.txt', '.pdf'].includes(path.extname(p).toLowerCase()),
    );
    if (unsupported.length > 0) {
      errors.push({
        field: 'filePaths',
        message: `Unsupported file types: ${unsupported.join(', ')}. Only .md, .txt, and .pdf are accepted.`,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  async *execute(
    input: IntentAnalysisInput,
    options: ExecutionOptions,
  ): AsyncGenerator<ProgressEvent, IntentModel, unknown> {
    this.cancelRequested = false;
    const phaseId = PhaseId.IntentAnalysis;

    yield this.event(phaseId, 'started', 'Starting Intent Analysis…', 0);

    // ── Step 1: Read documents ───────────────────────────────────────────────
    yield this.event(phaseId, 'progress', 'Reading documentation files…', 10);

    const documents: { name: string; content: string }[] = [];
    for (const filePath of input.filePaths) {
      if (this.cancelRequested) {
        yield this.event(phaseId, 'cancelled', 'Cancelled by user.', undefined);
        return this.emptyModel(input.filePaths);
      }
      const content = await this.readDocument(filePath);
      documents.push({ name: path.basename(filePath), content });
      yield this.event(phaseId, 'progress', `Read: ${path.basename(filePath)}`, undefined);
    }

    if (this.cancelRequested) {
      yield this.event(phaseId, 'cancelled', 'Cancelled by user.', undefined);
      return this.emptyModel(input.filePaths);
    }

    // ── Step 2: Build prompt ─────────────────────────────────────────────────
    yield this.event(phaseId, 'progress', 'Building analysis prompt…', 30);
    const prompt = this.buildPrompt(documents);

    // ── Step 3: Call LLM ──────────────────────────────────────────────────────
    let rawLLMResponse: string;

    if (options.manualLLMResponse !== undefined) {
      yield this.event(phaseId, 'progress', 'Using manually provided LLM response…', 40, true);
      rawLLMResponse = options.manualLLMResponse;
    } else {
      yield this.event(
        phaseId,
        'progress',
        options.useLLM
          ? 'Sending to LLM for semantic analysis… (this may take a moment)'
          : 'LLM disabled — producing stub output',
        40,
        true,
      );

      if (options.useLLM) {
        const gateway = LLMGateway.getInstance();
        const response = await gateway.complete(
          { systemPrompt: prompt.system, userPrompt: prompt.user },
          options.llmProvider as Parameters<typeof gateway.complete>[1],
        );
        rawLLMResponse = response.content;
      } else {
        rawLLMResponse = this.stubLLMResponse(documents);
      }
    }

    if (this.cancelRequested) {
      yield this.event(phaseId, 'cancelled', 'Cancelled by user.', undefined);
      return this.emptyModel(input.filePaths);
    }

    // ── Step 4: Parse & validate LLM response ──────────────────────────────
    yield this.event(phaseId, 'progress', 'Parsing and validating LLM response…', 80);
    const intentModel = this.parseLLMResponse(
      rawLLMResponse,
      input.filePaths,
      options.useLLM || options.manualLLMResponse !== undefined,
      options.llmProvider ?? (options.manualLLMResponse !== undefined ? 'manual' : undefined),
    );

    // ── Step 5: Done ─────────────────────────────────────────────────────────
    yield this.event(
      phaseId,
      'completed',
      `Intent Model generated: ${intentModel.flows.length} flows, ${intentModel.globalEvents.length} global events.`,
      100,
    );

    return intentModel;
  }

  async cancel(): Promise<void> {
    this.cancelRequested = true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Generates a self-contained, clipboard-ready prompt by reading all input
   * files and embedding their content. The user can paste this verbatim into
   * any chatbot (ChatGPT, Claude, Gemini, etc.) and paste the JSON response
   * back into the app for manual submission.
   */
  async generateClipboardPrompt(filePaths: string[]): Promise<string> {
    const documents: { name: string; content: string }[] = [];
    for (const filePath of filePaths) {
      const content = await this.readDocument(filePath);
      documents.push({ name: path.basename(filePath), content });
    }
    const { system, user } = this.buildPrompt(documents);

    return [
      '# Analytics Compiler — Intent Analysis Prompt',
      '',
      '> Paste this entire prompt into ChatGPT, Claude, Gemini, or any chatbot.',
      '> Copy the JSON response and paste it back into the app.',
      '',
      '---',
      '',
      '## System Instructions',
      '',
      system,
      '',
      '---',
      '',
      '## Documentation to Analyze',
      '',
      user,
      '',
      '---',
      '',
      '## Concrete Example of a Valid Response',
      '',
      'The response you return must look exactly like this (with your own content):',
      '',
      '```json',
      '{',
      '  "flows": [',
      '    {',
      '      "id": "user-registration",',
      '      "name": "User Registration",',
      '      "description": "The end-to-end journey a new visitor takes to create an account.",',
      '      "userStories": [',
      '        "As a visitor, I want to sign up so I can access the product."',
      '      ],',
      '      "features": ["Sign-up form", "Email verification"],',
      '      "confidence": 0.95,',
      '      "events": [',
      '        {',
      '          "id": "sign-up-started",',
      '          "name": "SIGN_UP_STARTED",',
      '          "description": "Fired when the user opens the registration form.",',
      '          "trigger": "User clicks the Sign Up button on the landing page.",',
      '          "expectedProperties": ["referral_source", "plan_type"],',
      '          "source": "explicit"',
      '        },',
      '        {',
      '          "id": "sign-up-completed",',
      '          "name": "SIGN_UP_COMPLETED",',
      '          "description": "Fired when account creation succeeds.",',
      '          "trigger": "Server returns 200 after form submission.",',
      '          "expectedProperties": ["user_id", "plan_type", "email_verified"],',
      '          "source": "explicit"',
      '        }',
      '      ]',
      '    }',
      '  ],',
      '  "globalEvents": [',
      '    {',
      '      "id": "app-launched",',
      '      "name": "APP_LAUNCHED",',
      '      "description": "Fired every time the application starts.",',
      '      "trigger": "Application initializes on any page load.",',
      '      "expectedProperties": ["app_version", "platform"],',
      '      "source": "inferred"',
      '    }',
      '  ]',
      '}',
      '```',
    ].join('\n');
  }

  private async readDocument(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      // TODO: integrate pdf-parse for real PDF text extraction
      // For now, return a placeholder
      return `[PDF content from ${path.basename(filePath)} — pdf-parse integration pending]`;
    }
    return fs.readFile(filePath, 'utf-8');
  }

  private buildPrompt(docs: { name: string; content: string }[]): {
    system: string;
    user: string;
  } {
    const system = `You are an analytics architect. Your only job is to read product documentation and produce a structured JSON object called an Intent Model.

## What you must return

Return ONLY a JSON object with exactly two top-level keys: "flows" and "globalEvents".
Do NOT include markdown code fences, explanations, comments, or any text outside the JSON object.

## Schema

### Event object (used inside flows and in globalEvents)
{
  "id":                 string,   // short kebab-case identifier, e.g. "user-signed-up"
  "name":               string,   // SCREAMING_SNAKE_CASE tracking name, e.g. "USER_SIGNED_UP"
  "description":        string,   // one sentence: what this event represents
  "trigger":            string,   // the exact user action or system condition that fires it
  "expectedProperties": string[], // list of property keys sent with this event, e.g. ["plan_type", "user_id"]
  "source":             "explicit" | "inferred"
                        // "explicit" = the doc names this event or property verbatim
                        // "inferred" = you deduced it from context; flag these for human review
}

### Flow object
{
  "id":          string,    // short kebab-case identifier, e.g. "onboarding-flow"
  "name":        string,    // human-readable title, e.g. "User Onboarding"
  "description": string,    // one paragraph: what the user is trying to accomplish
  "userStories": string[],  // "As a <role>, I want to <goal>" sentences extracted from the docs
  "features":    string[],  // named product features mentioned in this flow
  "events":      Event[],   // ordered list of analytics events that occur during this flow
  "confidence":  number     // 0.0–1.0 — your confidence that this flow is correctly identified;
                            // use < 0.7 for flows you largely inferred
}

### Root object
{
  "flows":        Flow[], // every distinct user journey found in the documentation
  "globalEvents": Event[] // events that are not tied to a single flow (e.g. app launch, crash)
}

## Rules
- Every "id" must be unique across the entire response.
- "name" in events must be SCREAMING_SNAKE_CASE.
- "expectedProperties" keys must be snake_case.
- If a flow or event has no clear evidence, mark it with source "inferred" and set confidence ≤ 0.6.
- If information is missing, use an empty array [] rather than omitting the field.
- Do not invent flows or events that are not at all implied by the documentation.`;

    const docParts = docs
      .map((d) => `=== ${d.name} ===\n${d.content}`)
      .join('\n\n');

    const user = `Analyze the following product documentation and extract the Intent Model as described in the system instructions.

${docParts}`;

    return { system, user };
  }

  private parseLLMResponse(
    raw: string,
    filePaths: string[],
    llmAssisted: boolean,
    llmProvider?: string,
  ): IntentModel {
    let parsed: { flows?: unknown[]; globalEvents?: unknown[] };

    try {
      parsed = JSON.parse(raw) as { flows?: unknown[]; globalEvents?: unknown[] };
    } catch {
      throw new Error(
        'LLM returned invalid JSON. The response could not be parsed as an IntentModel. ' +
        'Try again or check your LLM configuration.',
      );
    }

    const flows = this.normalizeFlows(parsed.flows ?? []);
    const globalEvents = this.normalizeEvents(parsed.globalEvents ?? []);

    return {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      llmAssisted,
      llmProvider,
      sourceDocuments: filePaths.map((p) => path.basename(p)),
      flows,
      globalEvents,
      metadata: {},
    };
  }

  private normalizeFlows(raw: unknown[]): IntentFlow[] {
    return raw.map((item) => {
      const f = item as Record<string, unknown>;
      return {
        id: typeof f['id'] === 'string' ? f['id'] : randomUUID(),
        name: typeof f['name'] === 'string' ? f['name'] : 'Unnamed Flow',
        description: typeof f['description'] === 'string' ? f['description'] : '',
        userStories: Array.isArray(f['userStories']) ? (f['userStories'] as string[]) : [],
        features: Array.isArray(f['features']) ? (f['features'] as string[]) : [],
        events: Array.isArray(f['events']) ? this.normalizeEvents(f['events'] as unknown[]) : [],
        confidence: typeof f['confidence'] === 'number' ? f['confidence'] : 0.5,
        llmAssisted: true,
      };
    });
  }

  private normalizeEvents(raw: unknown[]): IntentEvent[] {
    return raw.map((item) => {
      const e = item as Record<string, unknown>;
      return {
        id: typeof e['id'] === 'string' ? e['id'] : randomUUID(),
        name: typeof e['name'] === 'string' ? e['name'] : 'unnamed_event',
        description: typeof e['description'] === 'string' ? e['description'] : '',
        trigger: typeof e['trigger'] === 'string' ? e['trigger'] : '',
        expectedProperties: Array.isArray(e['expectedProperties'])
          ? (e['expectedProperties'] as string[])
          : [],
        source: e['source'] === 'explicit' ? 'explicit' : 'inferred',
      };
    });
  }

  private stubLLMResponse(docs: { name: string; content: string }[]): string {
    return JSON.stringify({
      flows: [
        {
          id: randomUUID(),
          name: 'Sample Flow (LLM disabled)',
          description: `Stub flow derived from: ${docs.map((d) => d.name).join(', ')}`,
          userStories: ['As a user, I want to see a sample flow'],
          features: ['Sample feature'],
          events: [
            {
              id: randomUUID(),
              name: 'sample_event',
              description: 'A stub event generated without LLM',
              trigger: 'User interaction',
              expectedProperties: ['user_id', 'timestamp'],
              source: 'explicit',
            },
          ],
          confidence: 0,
          llmAssisted: false,
        },
      ],
      globalEvents: [],
    });
  }

  private emptyModel(filePaths: string[]): IntentModel {
    return {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      llmAssisted: false,
      sourceDocuments: filePaths.map((p) => path.basename(p)),
      flows: [],
      globalEvents: [],
      metadata: { cancelled: true },
    };
  }

  private event(
    phaseId: PhaseId,
    type: ProgressEvent['type'],
    message: string,
    percentComplete?: number,
    llmAssisted = false,
    detail?: unknown,
  ): ProgressEvent {
    return {
      type,
      phaseId,
      message,
      percentComplete,
      detail,
      timestamp: new Date().toISOString(),
      llmAssisted,
    };
  }
}
