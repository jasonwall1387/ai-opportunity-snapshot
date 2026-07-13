import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import type { Usage } from './types.ts';

export interface LlmConfig {
  apiKey: string;
  model: string;
  priceInPerM: number;
  priceOutPerM: number;
  priceWebSearchPerCall: number;
  maxRunCostUsd: number;
  safetyIdentifier?: string;
}

export class CostCeilingError extends Error {
  constructor(spent: number, ceiling: number) {
    super(`Run cost estimate $${spent.toFixed(2)} exceeded ceiling $${ceiling.toFixed(2)}`);
    this.name = 'CostCeilingError';
  }
}

const DEFAULT_PRICE_IN_PER_M = 5;
const DEFAULT_PRICE_OUT_PER_M = 30;
const DEFAULT_WEB_SEARCH_PRICE = 0.01;

function envNumber(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return parsed;
}

export interface LlmEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_PRICE_IN_PER_M?: string;
  OPENAI_PRICE_OUT_PER_M?: string;
  OPENAI_PRICE_WEB_SEARCH?: string;
  MAX_RUN_COST_USD?: string;
}

export function llmConfigFromEnv(env: LlmEnv): LlmConfig {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');

  return {
    apiKey,
    model: env.OPENAI_MODEL ?? 'gpt-5.6',
    priceInPerM: envNumber(
      env.OPENAI_PRICE_IN_PER_M,
      DEFAULT_PRICE_IN_PER_M,
      'OPENAI_PRICE_IN_PER_M',
    ),
    priceOutPerM: envNumber(
      env.OPENAI_PRICE_OUT_PER_M,
      DEFAULT_PRICE_OUT_PER_M,
      'OPENAI_PRICE_OUT_PER_M',
    ),
    priceWebSearchPerCall: envNumber(
      env.OPENAI_PRICE_WEB_SEARCH,
      DEFAULT_WEB_SEARCH_PRICE,
      'OPENAI_PRICE_WEB_SEARCH',
    ),
    maxRunCostUsd: envNumber(env.MAX_RUN_COST_USD, 1.5, 'MAX_RUN_COST_USD'),
  };
}

export interface JsonCallOpts {
  instructions: string;
  input: string;
  schemaName: string;
  schema: object;
  webSearch?: boolean;
}

interface RawResponse {
  output_text: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export type LlmRequest = ResponseCreateParamsNonStreaming;
type Transport = (request: LlmRequest) => Promise<RawResponse>;

function defaultTransport(config: LlmConfig): Transport {
  const client = new OpenAI({ apiKey: config.apiKey });
  return async (request) => {
    const response = await client.responses.create(request);
    return {
      output_text: response.output_text,
      usage: response.usage
        ? {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          }
        : undefined,
    };
  };
}

function statusFromError(error: unknown): number | undefined {
  if (error instanceof OpenAI.APIError) return error.status;
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/\b([45]\d\d)\b/);
  return match ? Number(match[1]) : undefined;
}

function isRetriable(error: unknown): boolean {
  const status = statusFromError(error);
  return status === undefined || status === 408 || status === 409 || status === 429 || status >= 500;
}

export class Llm {
  private readonly transport: Transport;
  private total: Usage = { inputTokens: 0, outputTokens: 0, estCostUsd: 0 };

  constructor(
    private readonly config: LlmConfig,
    transport?: Transport,
  ) {
    this.transport = transport ?? defaultTransport(config);
  }

  model(): string {
    return this.config.model;
  }

  usage(): Usage {
    return { ...this.total };
  }

  private track(usage: RawResponse['usage'], usedWebSearch: boolean): void {
    const inputTokens = usage?.input_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? 0;
    const tokenCost =
      (inputTokens / 1_000_000) * this.config.priceInPerM +
      (outputTokens / 1_000_000) * this.config.priceOutPerM;
    const webSearchCost = usedWebSearch ? this.config.priceWebSearchPerCall : 0;

    this.total.inputTokens += inputTokens;
    this.total.outputTokens += outputTokens;
    this.total.estCostUsd += tokenCost + webSearchCost;

    if (this.total.estCostUsd > this.config.maxRunCostUsd) {
      throw new CostCeilingError(this.total.estCostUsd, this.config.maxRunCostUsd);
    }
  }

  async json<T>(options: JsonCallOpts): Promise<T> {
    const request: LlmRequest = {
      model: this.config.model,
      instructions: options.instructions,
      input: options.input,
      reasoning: { effort: 'low' },
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: options.schemaName,
          schema: { ...options.schema },
          strict: true,
        },
      },
      ...(this.config.safetyIdentifier
        ? { safety_identifier: this.config.safetyIdentifier }
        : {}),
      ...(options.webSearch
        ? { tools: [{ type: 'web_search' }], tool_choice: 'required' }
        : {}),
    };

    let response: RawResponse;
    try {
      response = await this.transport(request);
    } catch (error) {
      if (!isRetriable(error)) throw error;
      response = await this.transport(request);
    }

    this.track(response.usage, options.webSearch === true);
    return JSON.parse(response.output_text);
  }
}
