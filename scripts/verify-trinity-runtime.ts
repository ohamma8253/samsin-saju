import assert from 'node:assert/strict';
import { calculateSamsin } from '../lib/saju';
import {
  buildTrinityAnalysisForRuntime,
  executeTrinityModelRoles,
  getTrinityRuntimeMode,
  type TrinityRuntimeOptions,
} from '../lib/interpretation/trinity-runtime';
import type { SamsinModelRole, SamsinRouteReceipt } from '../lib/llm/samsin-model-router';

const INPUT = {
  name: 'runtime-fixture',
  year: 1986,
  month: 4,
  day: 23,
  hour: 10,
  minute: 0,
  gender: 'M' as const,
  city: 'daegu',
  timezone: 'Asia/Seoul',
  calendarInputType: 'solar' as const,
  birthTimePrecision: 'exact' as const,
  analysisYear: 2026,
};

const EXPECTED_ROLES: SamsinModelRole[] = [
  'saju_native',
  'ziwei_native',
  'natal_native',
  'native_boundary_audit',
  'trinity_compare',
  'decision_apply',
  'korean_renderer',
  'final_safety_audit',
];

function receipt(role: SamsinModelRole): SamsinRouteReceipt {
  return {
    role,
    requestedModel: `${role}-primary`,
    fallbackModels: [`${role}-fallback`],
    usedModel: `${role}-primary`,
    fallbackUsed: false,
    schemaName: 'TrinityRoleCheck',
    latencyMs: 1,
    mode: 'openrouter',
  };
}

function passingRuntimeOptions(seenRoles: SamsinModelRole[] = []): TrinityRuntimeOptions {
  return {
    mode: 'openrouter',
    roleCaller: async (role, messages, schema) => {
      seenRoles.push(role);
      assert.equal(schema.name, 'TrinityRoleCheck');
      assert(messages.some(message => message.role === 'system'), `${role} must receive system prompt`);
      assert(messages.some(message => message.role === 'user'), `${role} must receive user prompt`);
      return {
        data: {
          accepted: true,
          notes: [`${role} checked`],
          blockedClaims: [],
        },
        receipt: receipt(role),
      };
    },
  };
}

const data = await calculateSamsin(INPUT);

assert.equal(getTrinityRuntimeMode({ mode: 'rule_fallback' }), 'rule_fallback');
assert.equal(getTrinityRuntimeMode({ mode: 'openrouter' }), 'openrouter');

const fallbackAnalysis = await buildTrinityAnalysisForRuntime(data, {
  concern: 'money_leak',
  now: new Date('2026-06-16T00:00:00+09:00'),
}, { mode: 'rule_fallback' });
assert.equal(fallbackAnalysis.modelRouting.mode, 'rule_fallback');
assert.equal(fallbackAnalysis.audit.passed, true);

const seenRoles: SamsinModelRole[] = [];
const openRouterAnalysis = await buildTrinityAnalysisForRuntime(data, {
  concern: 'money_leak',
  now: new Date('2026-06-16T00:00:00+09:00'),
}, passingRuntimeOptions(seenRoles));

assert.deepEqual(seenRoles, EXPECTED_ROLES);
assert.equal(openRouterAnalysis.modelRouting.mode, 'openrouter');
assert.deepEqual(
  openRouterAnalysis.modelRouting.receipts.map(item => item.role),
  EXPECTED_ROLES,
);
assert(openRouterAnalysis.audit.passed, `openrouter mock analysis should pass: ${openRouterAnalysis.audit.blockedClaims.join(', ')}`);
assert(openRouterAnalysis.audit.warnings.some(item => item.includes('saju_native: saju_native checked')));

const roleExecution = await executeTrinityModelRoles(fallbackAnalysis, passingRuntimeOptions());
assert.deepEqual(roleExecution.receipts.map(item => item.role), EXPECTED_ROLES);
assert.equal(roleExecution.blockedClaims.length, 0);

const blockedAnalysis = await buildTrinityAnalysisForRuntime(data, {
  concern: 'money_leak',
  now: new Date('2026-06-16T00:00:00+09:00'),
}, {
  mode: 'openrouter',
  roleCaller: async (role) => ({
    data: {
      accepted: role !== 'final_safety_audit',
      notes: [],
      blockedClaims: role === 'final_safety_audit' ? ['deterministic phrase'] : [],
    },
    receipt: receipt(role),
  }),
});
assert.equal(blockedAnalysis.audit.passed, false);
assert(blockedAnalysis.audit.blockedClaims.includes('final_safety_audit: deterministic phrase'));

const fallbackAfterFailure = await buildTrinityAnalysisForRuntime(data, {
  concern: 'money_leak',
  now: new Date('2026-06-16T00:00:00+09:00'),
}, {
  mode: 'openrouter',
  roleCaller: async () => {
    throw new Error('simulated failure');
  },
});
assert.equal(fallbackAfterFailure.modelRouting.mode, 'rule_fallback');
assert(fallbackAfterFailure.audit.passed, 'fallback after model failure should keep deterministic analysis usable');
assert(fallbackAfterFailure.audit.warnings.some(item => item.includes('openrouter_execution_failed')));

const blockedAfterFailure = await buildTrinityAnalysisForRuntime(data, {
  concern: 'money_leak',
  now: new Date('2026-06-16T00:00:00+09:00'),
}, {
  mode: 'openrouter',
  onModelError: 'block',
  roleCaller: async () => {
    throw new Error('simulated failure');
  },
});
assert.equal(blockedAfterFailure.audit.passed, false);
assert(blockedAfterFailure.audit.blockedClaims.some(item => item.includes('openrouter_execution_failed')));

console.log('verify:trinity-runtime passed');
