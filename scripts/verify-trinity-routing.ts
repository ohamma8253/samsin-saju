import assert from 'node:assert/strict';
import { callOpenRouterRole, OpenRouterClientError } from '../lib/llm/openrouter-client';
import { buildOpenRouterChatRequest, type OpenRouterChatRequest } from '../lib/llm/samsin-model-router';

const TEST_MESSAGES = [
  { role: 'system' as const, content: 'Return JSON only.' },
  { role: 'user' as const, content: 'Check routing.' },
];

const TEST_SCHEMA = {
  name: 'RoutingSmoke',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok'],
    properties: {
      ok: { type: 'boolean' },
    },
  },
};

function assertOpenRouterError(error: unknown, code: OpenRouterClientError['code']): void {
  assert(error instanceof OpenRouterClientError, `expected OpenRouterClientError for ${code}`);
  assert.equal(error.code, code);
}

function fakeJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function expectRejectsWithCode(promise: Promise<unknown>, code: OpenRouterClientError['code']): Promise<void> {
  try {
    await promise;
  } catch (error) {
    assertOpenRouterError(error, code);
    return;
  }
  throw new Error(`expected ${code} rejection`);
}

function assertRequestContract(): void {
  const request = buildOpenRouterChatRequest('saju_native', TEST_MESSAGES, TEST_SCHEMA);
  assert.equal(request.model, 'anthropic/claude-sonnet-4.5');
  assert.equal(request.provider.data_collection, 'deny');
  assert.equal(request.provider.allow_fallbacks, true);
  assert.equal(request.provider.require_parameters, true);
  assert.equal(request.response_format.type, 'json_schema');

  const renderRequest = buildOpenRouterChatRequest('korean_renderer', TEST_MESSAGES, TEST_SCHEMA);
  assert.equal(renderRequest.response_format.type, 'json_object');
  assert.equal(renderRequest.provider.require_parameters, false);
}

async function assertSuccessfulReceipt(): Promise<void> {
  let capturedRequest: OpenRouterChatRequest | undefined;
  const result = await callOpenRouterRole<{ ok: boolean }>('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
    apiKey: 'test-key',
    timeoutMs: 500,
    fetchImpl: async (_input, init) => {
      capturedRequest = JSON.parse(String(init?.body)) as OpenRouterChatRequest;
      return fakeJsonResponse({
        model: 'openai/gpt-5',
        choices: [{ message: { content: '{"ok":true}' } }],
      });
    },
  });

  assert.deepEqual(result.data, { ok: true });
  assert.equal(result.receipt.role, 'trinity_compare');
  assert.equal(result.receipt.requestedModel, 'openai/gpt-5');
  assert.equal(result.receipt.usedModel, 'openai/gpt-5');
  assert.equal(result.receipt.fallbackUsed, false);
  assert.equal(result.receipt.schemaName, 'RoutingSmoke');
  assert.equal(result.receipt.mode, 'openrouter');
  assert(capturedRequest, 'fetch should receive a request body');
  assert.equal(capturedRequest.provider.data_collection, 'deny');
}

async function assertFallbackReceipt(): Promise<void> {
  process.env.SAMSIN_LLM_COMPARE_FALLBACKS = 'openai/gpt-5-mini';
  try {
    const result = await callOpenRouterRole<{ ok: boolean }>('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => fakeJsonResponse({
        model: 'openai/gpt-5-mini',
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    assert.deepEqual(result.receipt.fallbackModels, ['openai/gpt-5-mini']);
    assert.equal(result.receipt.usedModel, 'openai/gpt-5-mini');
    assert.equal(result.receipt.fallbackUsed, true);
  } finally {
    delete process.env.SAMSIN_LLM_COMPARE_FALLBACKS;
  }
}

async function assertErrorClassification(): Promise<void> {
  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: '',
      timeoutMs: 500,
      fetchImpl: async () => fakeJsonResponse({}),
    }),
    'missing_api_key',
  );

  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => new Response('bad gateway', { status: 502 }),
    }),
    'http_error',
  );

  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => new Response('not-json', { status: 200 }),
    }),
    'invalid_response_json',
  );

  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => fakeJsonResponse({ error: { message: 'provider failed' } }),
    }),
    'provider_error',
  );

  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => fakeJsonResponse({ model: 'openai/gpt-5', choices: [] }),
    }),
    'empty_choices',
  );

  await expectRejectsWithCode(
    callOpenRouterRole('trinity_compare', TEST_MESSAGES, TEST_SCHEMA, {
      apiKey: 'test-key',
      timeoutMs: 500,
      fetchImpl: async () => fakeJsonResponse({
        model: 'openai/gpt-5',
        choices: [{ message: { content: 'not-json' } }],
      }),
    }),
    'invalid_content_json',
  );
}

assertRequestContract();
await assertSuccessfulReceipt();
await assertFallbackReceipt();
await assertErrorClassification();

console.log('verify:trinity-routing passed');
