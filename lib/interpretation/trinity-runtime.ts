import type { SamsinData } from '../saju';
import {
  callOpenRouterRole,
  OpenRouterClientError,
  type OpenRouterClientOptions,
} from '../llm/openrouter-client';
import {
  createRuleBasedRouteReceipt,
  type OpenRouterChatMessage,
  type SamsinModelRole,
  type SamsinRouteReceipt,
} from '../llm/samsin-model-router';
import {
  auditTrinityAnalysis,
  buildTrinityAnalysis,
  type TrinityAnalysis,
  type TrinityBuildOptions,
} from './decision';

const LOCKED_ROLES: SamsinModelRole[] = [
  'saju_native',
  'ziwei_native',
  'natal_native',
  'native_boundary_audit',
  'trinity_compare',
  'decision_apply',
  'korean_renderer',
  'final_safety_audit',
];

const ROLE_SCHEMA = {
  name: 'TrinityRoleCheck',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['accepted', 'notes', 'blockedClaims'],
    properties: {
      accepted: { type: 'boolean' },
      notes: {
        type: 'array',
        maxItems: 5,
        items: { type: 'string' },
      },
      blockedClaims: {
        type: 'array',
        maxItems: 10,
        items: { type: 'string' },
      },
    },
  },
};

interface TrinityRoleCheck {
  accepted: boolean;
  notes: string[];
  blockedClaims: string[];
}

export interface TrinityRoleExecution {
  role: SamsinModelRole;
  accepted: boolean;
  notes: string[];
  blockedClaims: string[];
  receipt: SamsinRouteReceipt;
}

export interface TrinityModelExecutionResult {
  receipts: SamsinRouteReceipt[];
  warnings: string[];
  blockedClaims: string[];
  roleExecutions: TrinityRoleExecution[];
}

export interface TrinityRuntimeOptions extends OpenRouterClientOptions {
  mode?: 'rule_fallback' | 'openrouter';
  onModelError?: 'fallback' | 'block';
  roleCaller?: (
    role: SamsinModelRole,
    messages: OpenRouterChatMessage[],
    schema: typeof ROLE_SCHEMA,
    options: OpenRouterClientOptions,
  ) => Promise<{ data: TrinityRoleCheck; receipt: SamsinRouteReceipt }>;
}

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

export function getTrinityRuntimeMode(options: TrinityRuntimeOptions = {}): 'rule_fallback' | 'openrouter' {
  if (options.mode) return options.mode;
  return env('SAMSIN_TRINITY_MODEL_MODE') === 'openrouter' ? 'openrouter' : 'rule_fallback';
}

function compactClaims(analysis: TrinityAnalysis): Array<Record<string, unknown>> {
  return analysis.normalizedClaims.slice(0, 12).map(claim => ({
    id: claim.id,
    sourceClaimId: claim.sourceClaimId,
    sourceNativeClaimId: claim.sourceNativeClaimId,
    system: claim.system,
    axis: claim.axis,
    domain: claim.domain,
    statement: claim.normalizedStatement,
    meaning: claim.normalizedMeaning,
    confidence: claim.confidence,
  }));
}

function compactAnalysisForRole(role: SamsinModelRole, analysis: TrinityAnalysis): Record<string, unknown> {
  return {
    role,
    version: analysis.meta.version,
    calculationId: analysis.meta.calculationId,
    nativePortraits: {
      saju: {
        summary: analysis.portrait.saju.nativeSummary,
        claims: analysis.portrait.saju.coreClaims.map(claim => ({
          id: claim.id,
          statement: claim.statement,
          evidence: claim.sourceEvidenceIds,
        })),
      },
      ziwei: {
        summary: analysis.portrait.ziwei.nativeSummary,
        claims: analysis.portrait.ziwei.coreClaims.map(claim => ({
          id: claim.id,
          statement: claim.statement,
          evidence: claim.sourceEvidenceIds,
        })),
      },
      natal: {
        summary: analysis.portrait.natal.nativeSummary,
        claims: analysis.portrait.natal.coreClaims.map(claim => ({
          id: claim.id,
          statement: claim.statement,
          evidence: claim.sourceEvidenceIds,
        })),
      },
    },
    normalizedClaims: compactClaims(analysis),
    comparison: {
      convergence: analysis.comparison.convergence.slice(0, 6),
      divergence: analysis.comparison.divergence.slice(0, 6),
    },
    situation: analysis.situation,
    actionPlan: analysis.actionPlan,
    userFacingSummary: analysis.userFacingSummary,
  };
}

function systemPromptForRole(role: SamsinModelRole): string {
  const shared = [
    'You are a locked-role audit step inside Samsin Saju.',
    'Return JSON only.',
    'Do not create new fortune claims, advice, medical, legal, investment, or relationship decisions.',
    'Only check whether the provided analysis respects the role boundary and evidence chain.',
  ].join('\n');

  const roleRules: Record<SamsinModelRole, string> = {
    saju_native: 'Check only the Saju native lens. Saju claims must stay about operating reality, resources, responsibility, money flow, and repeat risk.',
    ziwei_native: 'Check only the Ziwei native lens. Ziwei claims must stay about palace, role, life stage, and social position patterns.',
    natal_native: 'Check only the Natal native lens. Natal claims must stay about psychological rhythm, expression, pressure, and timing.',
    native_boundary_audit: 'Check that Saju, Ziwei, and Natal native claims do not borrow terminology or authority from each other.',
    trinity_compare: 'Check that comparison is based on normalized claims and preserves convergence and divergence instead of blending the systems.',
    decision_apply: 'Check that advice appears only after comparison and cites claims. Reality pressure can change advice, not native claims.',
    korean_renderer: 'Check that user-facing Korean copy is natural, grounded, and does not add new claims beyond the analysis.',
    final_safety_audit: 'Check deterministic wording and unsafe health, investment, legal, or relationship decisions. Block unsafe output.',
  };

  return `${shared}\n${roleRules[role]}`;
}

function userPromptForRole(role: SamsinModelRole, analysis: TrinityAnalysis): string {
  return JSON.stringify(compactAnalysisForRole(role, analysis));
}

function formatModelError(error: unknown): string {
  if (error instanceof OpenRouterClientError) {
    return `${error.code}${error.status ? `:${error.status}` : ''}`;
  }
  return error instanceof Error ? error.message : 'unknown_error';
}

async function defaultRoleCaller(
  role: SamsinModelRole,
  messages: OpenRouterChatMessage[],
  schema: typeof ROLE_SCHEMA,
  options: OpenRouterClientOptions,
): Promise<{ data: TrinityRoleCheck; receipt: SamsinRouteReceipt }> {
  return callOpenRouterRole<TrinityRoleCheck>(role, messages, schema, options);
}

export async function executeTrinityModelRoles(
  analysis: TrinityAnalysis,
  options: TrinityRuntimeOptions = {},
): Promise<TrinityModelExecutionResult> {
  const caller = options.roleCaller ?? defaultRoleCaller;
  const roleExecutions = await Promise.all(
    LOCKED_ROLES.map(async (role) => {
      const messages: OpenRouterChatMessage[] = [
        { role: 'system', content: systemPromptForRole(role) },
        { role: 'user', content: userPromptForRole(role, analysis) },
      ];
      const result = await caller(role, messages, ROLE_SCHEMA, options);
      return {
        role,
        accepted: result.data.accepted,
        notes: result.data.notes,
        blockedClaims: result.data.blockedClaims,
        receipt: result.receipt,
      };
    }),
  );

  return {
    receipts: roleExecutions.map(item => item.receipt),
    warnings: roleExecutions.flatMap(item => item.notes.map(note => `${item.role}: ${note}`)),
    blockedClaims: roleExecutions.flatMap(item => item.blockedClaims.map(claim => `${item.role}: ${claim}`)),
    roleExecutions,
  };
}

export async function buildTrinityAnalysisForRuntime(
  data: SamsinData,
  buildOptions: TrinityBuildOptions = {},
  runtimeOptions: TrinityRuntimeOptions = {},
): Promise<TrinityAnalysis> {
  const baseAnalysis = buildTrinityAnalysis(data, buildOptions);
  if (getTrinityRuntimeMode(runtimeOptions) !== 'openrouter') {
    return baseAnalysis;
  }

  try {
    const modelExecution = await executeTrinityModelRoles(baseAnalysis, runtimeOptions);
    const withoutAudit: Omit<TrinityAnalysis, 'audit'> = {
      ...baseAnalysis,
      modelRouting: {
        mode: 'openrouter',
        receipts: modelExecution.receipts,
      },
    };
    const audit = auditTrinityAnalysis(withoutAudit);
    return {
      ...withoutAudit,
      audit: {
        passed: audit.passed && modelExecution.blockedClaims.length === 0,
        warnings: [...audit.warnings, ...modelExecution.warnings],
        blockedClaims: [...audit.blockedClaims, ...modelExecution.blockedClaims],
      },
    };
  } catch (error) {
    const failure = `openrouter_execution_failed: ${formatModelError(error)}`;
    if (runtimeOptions.onModelError === 'block') {
      return {
        ...baseAnalysis,
        audit: {
          ...baseAnalysis.audit,
          passed: false,
          blockedClaims: [...baseAnalysis.audit.blockedClaims, failure],
        },
      };
    }

    return {
      ...baseAnalysis,
      audit: {
        ...baseAnalysis.audit,
        warnings: [...baseAnalysis.audit.warnings, failure],
      },
      modelRouting: {
        mode: 'rule_fallback',
        receipts: LOCKED_ROLES.map(role => createRuleBasedRouteReceipt(role, `${role}FallbackAfterOpenRouterFailure`)),
      },
    };
  }
}
