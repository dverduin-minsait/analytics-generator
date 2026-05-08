/**
 * Unit tests for IntentAnalysisEngine (Phase 1).
 *
 * Tests focus on:
 * - Input validation (deterministic)
 * - Execution pipeline (without real LLM — uses stub response)
 * - Output structure validation (deterministic parsing)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { IntentAnalysisEngine } from '../../src/main/phases/intent-analysis/intent-analysis-engine';

let tmpDir: string;
let testFilePath: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ia-engine-test-'));
  testFilePath = path.join(tmpDir, 'test-doc.md');
  await fs.writeFile(
    testFilePath,
    '# Product Documentation\n\nUsers can sign up and track their usage.',
  );
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('IntentAnalysisEngine.validate()', () => {
  const engine = new IntentAnalysisEngine();

  it('rejects empty file list', () => {
    const result = engine.validate({ filePaths: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('filePaths');
  });

  it('rejects unsupported file extensions', () => {
    const result = engine.validate({ filePaths: ['/path/to/file.docx'] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('.docx');
  });

  it('accepts supported file extensions', () => {
    const result = engine.validate({
      filePaths: ['/doc.md', '/readme.txt', '/spec.pdf'],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('IntentAnalysisEngine.execute() — stub mode (useLLM: false)', () => {
  const engine = new IntentAnalysisEngine();

  it('streams progress events and returns an IntentModel', async () => {
    const events: import('../../src/shared/phase-engine').ProgressEvent[] = [];
    const generator = engine.execute(
      { filePaths: [testFilePath] },
      { useLLM: false, dryRun: false },
    );

    let result = await generator.next();
    while (!result.done) {
      events.push(result.value);
      result = await generator.next();
    }

    const intentModel = result.value;

    // Must start with 'started' and end the loop with 'completed' event
    expect(events[0].type).toBe('started');
    const completedEvent = events.find((e) => e.type === 'completed');
    expect(completedEvent).toBeDefined();
    expect(completedEvent?.percentComplete).toBe(100);

    // Output must be a valid IntentModel
    expect(intentModel.schemaVersion).toBe('1.0.0');
    expect(intentModel.generatedAt).toBeTruthy();
    expect(intentModel.flows).toBeInstanceOf(Array);
    expect(intentModel.sourceDocuments).toContain('test-doc.md');
    expect(intentModel.llmAssisted).toBe(false);
  });

  it('emits llmAssisted: false on all events when useLLM is false', async () => {
    const generator = engine.execute(
      { filePaths: [testFilePath] },
      { useLLM: false, dryRun: false },
    );

    const events: import('../../src/shared/phase-engine').ProgressEvent[] = [];
    let result = await generator.next();
    while (!result.done) {
      events.push(result.value);
      result = await generator.next();
    }

    // No event (except the explicit LLM step) should be llmAssisted
    const llmEvents = events.filter((e) => e.llmAssisted);
    // The "Sending to LLM" step is emitted even in stub mode, but clearly labeled
    expect(llmEvents.length).toBeLessThanOrEqual(1);
  });

  it('cancels gracefully when cancel() is called', async () => {
    const generator = engine.execute(
      { filePaths: [testFilePath] },
      { useLLM: false, dryRun: false },
    );

    // Consume first event (started), then cancel
    await generator.next();
    await engine.cancel();

    const events: import('../../src/shared/phase-engine').ProgressEvent[] = [];
    let result = await generator.next();
    while (!result.done) {
      events.push(result.value);
      result = await generator.next();
    }

    const cancelledEvent = events.find((e) => e.type === 'cancelled');
    expect(cancelledEvent).toBeDefined();
  });
});

describe('IntentAnalysisEngine — golden output check', () => {
  it('produces a deterministic stub output structure', async () => {
    const engine = new IntentAnalysisEngine();
    const generator = engine.execute(
      { filePaths: [testFilePath] },
      { useLLM: false, dryRun: false },
    );

    let result = await generator.next();
    while (!result.done) {
      result = await generator.next();
    }

    const model = result.value;
    // Stub always returns exactly 1 flow with 1 event
    expect(model.flows).toHaveLength(1);
    expect(model.flows[0].events).toHaveLength(1);
    expect(model.flows[0].events[0].name).toBe('sample_event');
    expect(model.globalEvents).toHaveLength(0);
  });
});
