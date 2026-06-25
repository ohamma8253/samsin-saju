import {
  buildOpenRouterChatRequest,
  getSamsinModelRoute,
  type JsonSchemaRequest,
  type OpenRouterChatMessage,
  type SamsinModelRole,
  type SamsinRouteReceipt,
} from './samsin-model-router';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 30_000;

export type OpenRouterErrorCode =
  | 'missing_api_key'
  | 'timeout'
  | 'http_error'
  | 'invalid_response_json'
  | 'provider_error'
  | 'empty_choices'
  | 'empty_content'
  | 'invalid_content_json';

export class OpenRouterClientError extends Error {
  code: OpenRouterErrorCode;
  status?: number;
  details?: unknown;

  constructor(code: OpenRouterErrorCode, message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = 'OpenRouterClientError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
  }
}

export interface OpenRouterClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  referer?: string;
  title?: string;
}

export interface OpenRouterRoleResult<T> {
  data: T;
  receipt: SamsinRouteReceipt;
  rawContent: string;
}

interface OpenRouterResponseMessage {
  content?: string | Array<{ text?: string; type?: string }>;
}

interface OpenRouterChoice {
  message?: OpenRouterResponseMessage;
}

interface OpenRouterResponseBody {
  model?: string;
  choices?: OpenRouterChoice[];
  error?: {
    code?: string | number;
    message?: string;
  };
}

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

function configuredApiKey(options: OpenRouterClientOptions): string {
  const apiKey = options.apiKey ?? env('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new OpenRouterClientError('missing_api_key', 'OPENROUTER_API_KEY is required for OpenRouter execution.');
  }
  return apiKey;
}

function configuredFetch(options: OpenRouterClientOptions): typeof fetch {
  return options.fetchImpl ?? fetch;
}

function responseContentToText(content: OpenRouterResponseMessage['content']): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(item => item.text ?? '')
      .join('\n')
      .trim();
  }
  return '';
}

function parseJsonBody(text: string, status?: number): OpenRouterResponseBody {
  try {
    return JSON.parse(text) as OpenRouterResponseBody;
  } catch (error) {
    throw new OpenRouterClientError('invalid_response_json', 'OpenRouter response was not valid JSON.', {
      status,
      details: { text: text.slice(0, 500), error },
    });
  }
}

function parseContentJson<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new OpenRouterClientError('invalid_content_json', 'OpenRouter message content was not valid JSON.', {
      details: { content: content.slice(0, 500), error },
    });
  }
}

function createOpenRouterRouteReceipt(
  role: SamsinModelRole,
  usedModel: string | undefined,
  latencyMs: number,
  schemaName?: string,
): SamsinRouteReceipt {
  const route = getSamsinModelRoute(role);
  const resolvedModel = usedModel || route.primary;
  return {
    role,
    requestedModel: route.primary,
    fallbackModels: route.fallbacks,
    usedModel: resolvedModel,
    fallbackUsed: resolvedModel !== route.primary,
    schemaName,
    latencyMs,
    mode: 'openrouter',
  };
}

export async function callOpenRouterRole<T>(
  role: SamsinModelRole,
  messages: OpenRouterChatMessage[],
  schema?: JsonSchemaRequest,
  options: OpenRouterClientOptions = {},
): Promise<OpenRouterRoleResult<T>> {
  const startedAt = Date.now();
  const apiKey = configuredApiKey(options);
  const fetchImpl = configuredFetch(options);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const request = buildOpenRouterChatRequest(role, messages, schema);

  try {
    const response = await fetchImpl(options.baseUrl ?? OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': options.referer ?? env('SAMSIN_OPENROUTER_REFERER') ?? 'http://localhost:3000',
        'X-Title': options.title ?? 'Samsin Saju',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new OpenRouterClientError('http_error', `OpenRouter request failed with HTTP ${response.status}.`, {
        status: response.status,
        details: responseText.slice(0, 1000),
      });
    }

    const body = parseJsonBody(responseText, response.status);
    if (body.error) {
      throw new OpenRouterClientError('provider_error', body.error.message || 'OpenRouter provider returned an error.', {
        status: response.status,
        details: body.error,
      });
    }

    const choice = body.choices?.[0];
    if (!choice) {
      throw new OpenRouterClientError('empty_choices', 'OpenRouter response did not include a first choice.', {
        status: response.status,
        details: body,
      });
    }

    const rawContent = responseContentToText(choice.message?.content);
    if (!rawContent) {
      throw new OpenRouterClientError('empty_content', 'OpenRouter first choice did not include message content.', {
        status: response.status,
        details: body,
      });
    }

    return {
      data: parseContentJson<T>(rawContent),
      receipt: createOpenRouterRouteReceipt(role, body.model, Date.now() - startedAt, schema?.name),
      rawContent,
    };
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new OpenRouterClientError('timeout', `OpenRouter request timed out after ${timeoutMs}ms.`, {
        details: { role },
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
