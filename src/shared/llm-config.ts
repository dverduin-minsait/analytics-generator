export type LLMProviderType = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface OpenAIConfig {
  readonly type: 'openai';
  apiKey: string;
  model: string;
  /** Override for OpenAI-compatible endpoints (e.g. Azure OpenAI) */
  baseUrl?: string;
  maxTokens?: number;
}

export interface AnthropicConfig {
  readonly type: 'anthropic';
  apiKey: string;
  model: string;
  maxTokens?: number;
}

export interface OllamaConfig {
  readonly type: 'ollama';
  /** e.g. http://localhost:11434 */
  baseUrl: string;
  model: string;
}

export interface CustomConfig {
  readonly type: 'custom';
  baseUrl: string;
  apiKey?: string;
  model: string;
  headers?: Record<string, string>;
}

export type LLMProviderConfig =
  | OpenAIConfig
  | AnthropicConfig
  | OllamaConfig
  | CustomConfig;

export interface LLMSettings {
  defaultProvider: LLMProviderType;
  providers: Partial<Record<LLMProviderType, LLMProviderConfig>>;
}

export interface LLMRequest {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface LLMResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: LLMProviderType;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly durationMs: number;
}
