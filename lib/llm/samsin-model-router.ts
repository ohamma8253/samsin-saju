export type SamsinModelRole =
  | 'saju_native'
  | 'ziwei_native'
  | 'natal_native'
  | 'native_boundary_audit'
  | 'trinity_compare'
  | 'decision_apply'
  | 'korean_renderer'
  | 'final_safety_audit';

export interface SamsinModelRoute {
  role: SamsinModelRole;
  primary: string;
  fallbacks: string[];
  responseFormat: 'json_schema' | 'json_object';
  temperature: number;
  maxTokens: number;
}

export interface JsonSchemaRequest {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export interface SamsinRouteReceipt {
  role: SamsinModelRole;
  requestedModel: string;
  fallbackModels: string[];
  usedModel: string;
  fallbackUsed: boolean;
  schemaName?: string;
  latencyMs: number;
  mode: 'openrouter' | 'rule_fallback' | 'mock';
}

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  models?: string[];
  messages: OpenRouterChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format:
    | { type: 'json_object' }
    | {
        type: 'json_schema';
        json_schema: {
          name: string;
          strict: boolean;
          schema: Record<string, unknown>;
        };
      };
  provider: {
    require_parameters: boolean;
    allow_fallbacks: boolean;
    data_collection: 'deny';
  };
}

const DEFAULT_MODELS: Record<SamsinModelRole, string> = {
  saju_native: 'anthropic/claude-sonnet-4.5',
  ziwei_native: 'anthropic/claude-sonnet-4.5',
  natal_native: 'anthropic/claude-sonnet-4.5',
  native_boundary_audit: 'openai/gpt-5-mini',
  trinity_compare: 'openai/gpt-5',
  decision_apply: 'openai/gpt-5',
  korean_renderer: 'anthropic/claude-sonnet-4.5',
  final_safety_audit: 'openai/gpt-5-mini',
};

const DEFAULT_TEMPERATURES: Record<SamsinModelRole, number> = {
  saju_native: 0.25,
  ziwei_native: 0.25,
  natal_native: 0.35,
  native_boundary_audit: 0.05,
  trinity_compare: 0.2,
  decision_apply: 0.2,
  korean_renderer: 0.55,
  final_safety_audit: 0.05,
};

const DEFAULT_MAX_TOKENS: Record<SamsinModelRole, number> = {
  saju_native: 1600,
  ziwei_native: 1600,
  natal_native: 1600,
  native_boundary_audit: 900,
  trinity_compare: 1800,
  decision_apply: 1800,
  korean_renderer: 2200,
  final_safety_audit: 900,
};

const ENV_BY_ROLE: Record<SamsinModelRole, { primary: string; fallbacks: string }> = {
  saju_native: {
    primary: 'SAMSIN_LLM_SAJU_PRIMARY',
    fallbacks: 'SAMSIN_LLM_SAJU_FALLBACKS',
  },
  ziwei_native: {
    primary: 'SAMSIN_LLM_ZIWEI_PRIMARY',
    fallbacks: 'SAMSIN_LLM_ZIWEI_FALLBACKS',
  },
  natal_native: {
    primary: 'SAMSIN_LLM_NATAL_PRIMARY',
    fallbacks: 'SAMSIN_LLM_NATAL_FALLBACKS',
  },
  native_boundary_audit: {
    primary: 'SAMSIN_LLM_NATIVE_AUDIT_PRIMARY',
    fallbacks: 'SAMSIN_LLM_NATIVE_AUDIT_FALLBACKS',
  },
  trinity_compare: {
    primary: 'SAMSIN_LLM_COMPARE_PRIMARY',
    fallbacks: 'SAMSIN_LLM_COMPARE_FALLBACKS',
  },
  decision_apply: {
    primary: 'SAMSIN_LLM_DECISION_PRIMARY',
    fallbacks: 'SAMSIN_LLM_DECISION_FALLBACKS',
  },
  korean_renderer: {
    primary: 'SAMSIN_LLM_RENDER_PRIMARY',
    fallbacks: 'SAMSIN_LLM_RENDER_FALLBACKS',
  },
  final_safety_audit: {
    primary: 'SAMSIN_LLM_SAFETY_PRIMARY',
    fallbacks: 'SAMSIN_LLM_SAFETY_FALLBACKS',
  },
};

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

function parseFallbacks(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function routeResponseFormat(role: SamsinModelRole): SamsinModelRoute['responseFormat'] {
  return role === 'korean_renderer' ? 'json_object' : 'json_schema';
}

export function getSamsinModelRoute(role: SamsinModelRole): SamsinModelRoute {
  const keys = ENV_BY_ROLE[role];
  return {
    role,
    primary: env(keys.primary) || DEFAULT_MODELS[role],
    fallbacks: parseFallbacks(env(keys.fallbacks)),
    responseFormat: routeResponseFormat(role),
    temperature: DEFAULT_TEMPERATURES[role],
    maxTokens: DEFAULT_MAX_TOKENS[role],
  };
}

export function buildOpenRouterChatRequest(
  role: SamsinModelRole,
  messages: OpenRouterChatMessage[],
  schema?: JsonSchemaRequest,
): OpenRouterChatRequest {
  const route = getSamsinModelRoute(role);
  const useSchema = Boolean(schema) && route.responseFormat === 'json_schema';
  return {
    model: route.primary,
    ...(route.fallbacks.length > 0 ? { models: route.fallbacks } : {}),
    messages,
    temperature: route.temperature,
    max_tokens: route.maxTokens,
    response_format: useSchema && schema
      ? {
          type: 'json_schema',
          json_schema: {
            name: schema.name,
            strict: schema.strict ?? true,
            schema: schema.schema,
          },
        }
      : { type: 'json_object' },
    provider: {
      require_parameters: useSchema,
      allow_fallbacks: true,
      data_collection: 'deny',
    },
  };
}

export function createRuleBasedRouteReceipt(
  role: SamsinModelRole,
  schemaName?: string,
): SamsinRouteReceipt {
  const route = getSamsinModelRoute(role);
  return {
    role,
    requestedModel: route.primary,
    fallbackModels: route.fallbacks,
    usedModel: 'rule-based',
    fallbackUsed: true,
    schemaName,
    latencyMs: 0,
    mode: 'rule_fallback',
  };
}
