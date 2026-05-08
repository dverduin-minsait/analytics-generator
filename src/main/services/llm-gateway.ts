/**
 * LLM Gateway — abstract interface + provider registry.
 *
 * Design principles:
 * - The gateway is a THIN PROXY. It never makes autonomous decisions.
 * - All prompts are assembled by deterministic phase engines.
 * - Responses are returned raw; parsing/validation is the engine's job.
 * - Provider configuration is persisted to disk (settings.json).
 *
 * TODO: Implement real provider adapters in a follow-up iteration.
 *       Currently all providers are stubbed to return mock responses.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type {
  LLMRequest,
  LLMResponse,
  LLMSettings,
  LLMProviderType,
} from '../../shared/llm-config';
import type { LLMTestConnectionResult } from '../../shared/ipc-api';

const SETTINGS_FILE = path.join(
  os.homedir(),
  '.analytics-platform',
  'settings.json',
);

const DEFAULT_SETTINGS: LLMSettings = {
  defaultProvider: 'openai',
  providers: {},
};

export class LLMGateway {
  private static instance: LLMGateway;
  private settings: LLMSettings = DEFAULT_SETTINGS;
  private loaded = false;

  private constructor() {}

  static getInstance(): LLMGateway {
    if (!LLMGateway.instance) {
      LLMGateway.instance = new LLMGateway();
    }
    return LLMGateway.instance;
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  async getSettings(): Promise<LLMSettings> {
    await this.ensureLoaded();
    return this.settings;
  }

  async saveSettings(settings: LLMSettings): Promise<void> {
    this.settings = settings;
    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  }

  async testConnection(providerType: string): Promise<LLMTestConnectionResult> {
    // TODO: implement real connection tests per provider
    void providerType;
    return { success: false, error: 'Provider not yet configured' };
  }

  // ── Completion ────────────────────────────────────────────────────────────

  /**
   * Send a completion request to the configured default provider.
   * Throws if the provider is not configured or the request fails.
   *
   * IMPORTANT: This method must only be called from within PhaseEngine
   * implementations that have declared llmUsage: 'required' | 'optional'.
   */
  async complete(request: LLMRequest, provider?: LLMProviderType): Promise<LLMResponse> {
    await this.ensureLoaded();
    const targetProvider = provider ?? this.settings.defaultProvider;
    const config = this.settings.providers[targetProvider];

    if (!config) {
      throw new Error(
        `LLM provider "${targetProvider}" is not configured. ` +
        'Open Settings → LLM Configuration to set it up.',
      );
    }

    // TODO: dispatch to real provider adapters
    // For now, return a stub response so the engine skeleton can be tested
    return this.stubComplete(request, targetProvider);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
      this.settings = JSON.parse(raw) as LLMSettings;
    } catch {
      // File not found or corrupt — use defaults
      this.settings = DEFAULT_SETTINGS;
    }
    this.loaded = true;
  }

  /** Stub implementation — returns a hardcoded response for development. */
  private stubComplete(request: LLMRequest, provider: LLMProviderType): LLMResponse {
    void request;
    return {
      content: JSON.stringify({
        flows: [
          {
            id: 'stub-flow-1',
            name: 'Stub Flow',
            description: 'LLM provider not yet configured — this is a stub response.',
            userStories: [],
            features: [],
            events: [],
            confidence: 0,
            llmAssisted: true,
          },
        ],
        globalEvents: [],
      }),
      model: 'stub',
      provider,
      promptTokens: 0,
      completionTokens: 0,
      durationMs: 0,
    };
  }
}
