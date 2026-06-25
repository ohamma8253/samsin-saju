# Technical Spec: Samsin Core Model v1

> Updated: 2026-05-28
> Status: implementation baseline
> Related: `docs/TRINITY_INTERPRETATION_STRUCTURE_PLAN.md`

## Summary

삼신사주 코어는 하나의 거대 LLM 프롬프트가 아니라, 계산 코어와 해석 코어를 분리한 파이프라인으로 구성한다.

```text
BirthInput
  -> BirthNormalization
  -> CalculationCore
  -> FeatureExtraction
  -> InterpretationEvidence
  -> DomainConsensus
  -> ClaimPlan
  -> KoreanRenderer
  -> SafetyAudit
```

## Goals

- 출생 정보의 불확실성을 계산 전부터 명시한다.
- 사주, 자미두수, 서양점성 계산 결과를 같은 evidence contract로 변환한다.
- LLM은 evidence와 ClaimPlan에 묶인 claim만 자연어로 렌더링한다.
- AGPL 코어는 production core가 아니라 legacy/oracle boundary로만 관리한다.

## Non-Goals

- 이 문서는 모든 해석 rule을 accepted 상태로 승격하지 않는다.
- 이 문서는 LLM renderer와 post-render audit의 출시 품질을 보증하지 않는다.

## Current Core Status

| System | Current Runtime | Production Target | Status |
|---|---|---|---|
| Saju | `lib/manselyeok-core.ts` + `lunar-javascript` | `samsin-manselyeok-core` | active |
| Ziwei | `lib/ziwei-core.ts` clean-room core | `samsin-ziwei-core` | active for lunar conversion, palace/daxian/liunian skeleton, 14 main stars, brightness, sihua, and auxiliary stars |
| Natal | `lib/natal-core.ts` + `astronomy-engine` | `samsin-natal-core` | active for P0 planets, signs, retrograde flags, major aspects, ASC/MC, and Placidus houses |

## Current Interpretation Status

| Layer | Code | Status |
|---|---|---|
| Evidence extraction | `lib/interpretation/saju.ts`, `lib/interpretation/ziwei.ts`, `lib/interpretation/natal.ts` | conservative v1 extractors active |
| Evidence bundle | `lib/interpretation/bundle.ts` | active |
| Consensus engine | `lib/interpretation/consensus.ts` | active; groups by `domain + claimAxis`, tracks convergence/conflict/single-system signals |
| ClaimPlan engine | `lib/interpretation/claim-plan.ts` | active; generates only evidence-backed and safety-passed ClaimPlans |
| Oracle context | `lib/interpretation/oracle.ts` | active; feeds runtime prompts as `ClaimPlan` context |
| Post-render audit primitive | `lib/interpretation/audit.ts` | active; rejects uncited, unsupported, unsafe, or overstated rendered claims |
| Integrity gate | `scripts/verify-interpretation-model.ts` | active; checks evidence, consensus, ClaimPlan, audit, unknown-time suppression, stale blockers, and AGPL runtime boundary |

`@orrery/core` is `AGPL-3.0-only`. It must not remain a production dependency or runtime import for a closed paid service unless the product accepts AGPL obligations; it is allowed only as a dev oracle for fixture comparison.

## Model Layers

### 1. Birth Model

Code: `lib/interpretation/input.ts`

Fields:

- `calculationSex`: `male | female | unknown`
- `displayGender`: optional user-facing label
- `unknownTime`: boolean
- `birthTimePrecision`: `exact | range | unknown`
- `timezone`: default `Asia/Seoul`
- `calendarInputType`: `solar | lunar`
- `lunarLeapMonth`: boolean
- `analysisYear`: fixed year for reproducible annual readings

Policy:

- Unknown birth time uses noon only as a calculation fallback.
- Unknown birth time must remove or downgrade hour-pillar, Ziwei palace/timing, ASC/house/MC claims.

### 2. Calculation Model

Code: `lib/interpretation/provenance.ts`

Every calculation source has:

- core id
- version
- license
- role
- productionAllowed

The current registry marks `samsin-ziwei-core` and `samsin-natal-core` as production-allowed calculation cores for the v1 oracle gate, and `orrery-core-legacy-adapter` as not production-allowed.

Calculation gate status is tracked in `docs/TRINITY_CORE_EXPERIMENTS.md`. Passing this gate means the tracked computation fields match the dev oracle over the configured 1000-sample experiment. It does not mean every interpretation rule is accepted.

### 3. Evidence Model

Code: `lib/interpretation/evidence.ts`

Every user-visible claim must trace to:

- `evidence.id`
- `provenance.ruleId`
- `provenance.ruleVersion`
- `provenance.extractorVersion`
- `provenance.calculationVersion`
- `featureTrace`
- `claimBinding`

Hard rule:

```text
No evidence id -> no claim.
No rule id -> no interpretation.
No consensus id -> no trinity verdict.
No birth-time confidence -> no time-sensitive claim.
```

### 4. Consensus Model

Consensus is evaluated by `domain + claimAxis`, not by a broad domain alone.

Example claim axes:

- `career_independence`
- `career_stability`
- `money_volatility`
- `relationship_autonomy`
- `timing_change_pressure`

Consensus types:

- `strong_convergence`
- `partial_convergence`
- `structured_conflict`
- `single_system_only`
- `insufficient_evidence`

### 5. ClaimPlan Model

LLM does not write the report directly. It receives approved `ClaimPlan[]`.

Each ClaimPlan must pass:

- `hasEvidence`
- `hasRule`
- `safetyPassed`
- unsupported expansion risk check

### 6. Safety Model

Code: `lib/interpretation/safety.ts`

Blocked deterministic areas:

- medical
- death
- accident
- pregnancy
- investment
- legal
- marriage
- divorce
- breakup

`wellbeing_reflection` is allowed only as lifestyle/self-reflection wording, not medical prediction.

## Rollout

1. Keep current UI/API running.
2. Route all birth input through `normalizeBirthInput`.
3. Keep Saju/Ziwei/Natal evidence extractors conservative and traceable.
4. Feed runtime prompts with oracle `ClaimPlan` context, not raw chart summaries alone.
5. Keep API-level audit enforcement active on paid report/chat routes and compatibility safety output.

## Private RC Residual Risks

- Full interpretation fixture corpus and human-review rubric are not implemented. Current private RC uses deterministic local gates plus manual browser QA.
- Paid report/chat API routes now reject unsupported or unsafe output through `auditOracleRouteText`; compatibility uses `auditPlainOracleTextSafety`.
- `npm run verify:safety` is the dedicated safety gate for policy disclaimers, adversarial phrases, API audit wiring, and generated route output.
- Chiron/node longitude precision is coverage-only in the current Natal gate; do not use those bodies for strong claims until a dedicated parity gate is added.
- Unknown-time fallback is enforced at evidence extraction level. Keep browser QA coverage for unknown-time paid paths in the RC checklist.
