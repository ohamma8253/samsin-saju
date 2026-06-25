# 삼신사주 — Technical Specification

> Version: 2.0 | Last Updated: 2026-05-21
> Status: v1 출시 MVP canonical

## 1. Architecture Overview

```text
Client: Next.js App Router + React
  - Landing
  - Report
  - Compatibility
  - ChatModal
  - CookieShopModal

API Routes
  - POST /api/report
  - POST /api/deep
  - POST /api/final
  - POST /api/chat
  - POST /api/compatibility

Domain Layer
  - lib/saju.ts
  - lib/samsin-agent.ts
  - lib/samsin-model.ts
  - lib/consensus.ts
  - lib/cookies.ts

AI/Data
  - lunar-javascript for calendar/lunar conversion support
  - astronomy-engine for production natal calculations
  - @orrery/core only as a dev oracle dependency; never production runtime
  - OpenRouter/Claude integration where enabled, with deterministic renderer fallback
```

## 2. Product Pricing Interface

쿠키는 v1의 사용자-facing 재화명이다.

| Constant | Meaning | Display |
|---|---|---:|
| `COOKIE_UNIT_VALUE` | 한 신의 관점 | 330원 상당 |
| `FIRST_READING_COST` | 세 관점 보기 | 3쿠키, 990원 |
| `DEEP_BUNDLE_COST` | 깊게 보기 번들 | 9쿠키, 3,000원 |
| `COMPATIBILITY_COST` | 궁합 보기 | 9쿠키, 3,000원 |
| `CHAT_SINGLE_DEITY_COST` | 한 신에게 묻기 | 1쿠키 |
| `CHAT_TRINITY_COST` | 삼신에게 묻기 | 3쿠키 |
| `CHAT_DEEP_SESSION_COST` | 깊은 고민 상담 | 9쿠키 |

`490원` 상품은 구현하지 않는다. 가격표에는 `330원 × 3신 = 990원` 서사를 노출한다.

## 3. Paywall Policy

| Feature | Entry Timing | Cost | Client 차감 지점 |
|---|---|---:|---|
| 무료 오늘운세/무료 총운 | 랜딩 입력 후 | 0쿠키 | 없음 |
| 세 관점 보기 | 무료 결과 하단 또는 랜딩 CTA | 3쿠키 | 세 관점 보기 CTA 클릭 시 |
| 깊게 보기 번들 | 결과의 깊게 보기 섹션 | 9쿠키 | 첫 깊게 보기/마지막 정리 CTA 클릭 시 |
| 마지막 정리 | 세 관점 보기 이후 | 깊게 보기 번들 포함 | 추가 차감 없음 |
| 채팅 첫 후속 질문 | 결과 직후 | 무료 1회 | 사용 기록만 저장 |
| 한 신에게 묻기 | ChatModal | 1쿠키 | 질문 전송 시 |
| 삼신에게 묻기 | ChatModal | 3쿠키 | 질문 전송 시 |
| 깊은 고민 상담 | ChatModal | 9쿠키 | 세션 시작 시 |
| 궁합 보기 | 초대/궁합 플로우 | 9쿠키 | 궁합 보기 CTA 클릭 시 |

현재 LocalStorage 쿠키는 데모 전용이다. 실제 결제 출시 전에는 서버 검증, 결제 이력 저장, 환불 상태 반영을 도입해야 한다.

## 4. API Endpoints

### 4.1 POST /api/report

- Input: `{ name, gender, year, month, day, hour, minute, city }`
- Output: `{ report, meta, consensusMetrics? }`
- Cost: 0쿠키
- Purpose: 무료 오늘운세/무료 총운 기반 데이터 생성
- Paid `first_reading` responses include oracle evidence/audit metadata and are blocked with 422 when audit fails.

### 4.2 POST /api/deep

- Input: `{ ...birthData, character: 'cheongwoon'|'taeeul'|'luna' }`
- Output: `{ report: { sections } }`
- Product Policy: 깊게 보기는 9쿠키/3,000원 상당 번들로 판매한다.
- Client Implementation: `app/report/page.tsx`에서 부족분 paywall, 번들 차감, 실패 시 환불을 처리한다.
- Safety: route output must pass oracle evidence audit before release to the client.

### 4.3 POST /api/final

- Input: `{ ...birthData }`
- Output: `{ synthesis, consensusMetrics }`
- Product Policy: 마지막 정리는 깊게 보기 번들에 포함되는 유료 핵심 기능이다.
- Client Implementation: `app/report/page.tsx`에서 깊게 보기 번들 unlock 후 추가 차감 없이 호출한다.
- Safety: route output must pass oracle evidence audit before release to the client.

### 4.4 POST /api/chat

- Input: `{ ...birthData, history, message, reportContext }`
- Output: `{ response: { cheongwoon, taeeul, luna } }`
- Product Policy:
  - 첫 후속 질문 무료 1회
  - 한 신에게 묻기 1쿠키
  - 삼신에게 묻기 3쿠키
  - 깊은 고민 상담 9쿠키
- Client Implementation: `components/ChatModal.tsx`에서 질문 유형별 비용과 첫 무료 질문 사용 여부를 분리한다.
- Safety: route validates `costCookie`, applies question-mode boundaries, and blocks unsafe/unsupported output through oracle audit.

### 4.5 POST /api/compatibility

- Input: `{ personA, personB, relationship, includeDeep }`
- Output: `{ report: CompatibilityReport }`
- Product Policy: 궁합 보기는 9쿠키/3,000원 상당이다.
- Client Implementation: `app/compatibility/page.tsx`에서 9쿠키 paywall, unlock, 실패 시 환불을 처리한다.
- Safety: compatibility is rule-based in v1 and passes plain-text safety audit before response.

## 5. Data Shapes

```typescript
type ConsensusLevel = 'unanimous' | 'majority' | 'conflict';

type GraphPeriod = {
  label: string;
  score: number;
  note: string;
  phaseType?: 'seeding' | 'rising' | 'peak' | 'plateau' | 'declining';
  sajuScore?: number;
  ziweiScore?: number;
  natalScore?: number;
};

type TotalReport = {
  characterVoices?: { cheongwoon: string; taeeul: string; luna: string };
  coreInsight?: { headline: string; body: string };
  moneyGraph?: GraphPeriod[];
  careerGraph?: GraphPeriod[];
  peakMoments?: LifeMoment[];
  hardMoments?: LifeMoment[];
  samsinMessage: string;
};

type FinalSynthesis = {
  verdict: string;
  consensusLevel?: ConsensusLevel;
  consensusNote?: string;
  dissent?: { voice: 'cheongwoon' | 'taeeul' | 'luna'; argument: string };
  pillars: { icon: string; title: string; body: string }[];
  nowAdvice: string;
  prescription?: Prescription;
  voices: { cheongwoon: string; taeeul: string; luna: string };
  seal: string;
};
```

## 6. Client Data Flow

```text
Landing
  -> free CTA: collect birth data, route to /report
  -> paid CTA: same route with first-reading intent

Report
  -> POST /api/report
  -> render free summary
  -> show 990원 세 관점 보기 CTA
  -> paid sections call /api/deep and /api/final after cookie deduction
  -> show chat and compatibility CTAs

Chat
  -> first follow-up free once
  -> later questions deduct cookies by mode

Compatibility
  -> invite URL
  -> second person input
  -> 9-cookie paywall
  -> POST /api/compatibility
```

## 7. Analytics Events

| Event | When |
|---|---|
| `landing_free_click` | 무료 오늘운세 CTA 클릭 |
| `landing_990_click` | 990원 세 관점 보기 CTA 클릭 |
| `birth_form_submit` | 입력 폼 제출 |
| `report_loaded` | 무료 리포트 렌더 완료 |
| `paywall_viewed` | 유료 CTA 또는 가격표 노출 |
| `shop_opened` | 쿠키/상품 모달 열림 |
| `deep_bundle_unlocked` | 깊게 보기 번들 unlock 성공 |
| `chat_question_sent` | 채팅 질문 전송 |
| `compat_invite_created` | 궁합 초대 URL 생성 |
| `result_saved` | 보관함 저장 |
| `accuracy_checked` | 적중 체크 제출 |

## 8. Storage And Payments

### 8.1 Demo State

- LocalStorage 쿠키는 개발/데모 전용이다.
- 실결제 전환 전에는 사용자가 조작할 수 있는 잔액을 신뢰하지 않는다.
- 개발 시드 쿠키는 제품 혜택 문구로 노출하지 않는다.

### 8.2 Production Requirements

- 서버 저장소에 사용자별 쿠키 잔액과 결제 이력을 저장한다.
- 모든 유료 API는 서버에서 권한을 검증한다.
- 결제 성공, 결제 실패, 환불, 사용 차감 이력을 분리해 보관한다.
- 개인정보 처리방침, AI 제3자 제공 동의, 엔터테인먼트 목적 면책 고지를 제공한다.

## 9. UI Requirements

- 가격표는 상품 가치 중심으로 노출한다: `한 신 330원`, `세 관점 990원`, `깊게 보기 3,000원`.
- 결과 상단은 통합 요약, 합의 수준, 반론을 먼저 보여준다.
- 3신 개별 목소리는 근거 영역에 배치한다.
- paywall 문구는 결과 맥락을 이어야 한다: `이유와 시기까지 더 볼게요`.
- 채팅 CTA는 결과 하단에 배치하고 첫 후속 질문 무료 1회를 명확히 보여준다.

## 10. Verification

- 문서 정책 검증:
  - 구버전 가격과 미정 항목이 남아 있지 않아야 한다.
  - 새 가격 정책이 PRD, SPEC, ROADMAP, PLAN에서 일치해야 한다.
- 앱 구현 검증은 `npm run lint`, `npm run build`, core verifier, `npm run verify:safety`, 주요 모바일 퍼널 브라우저 QA로 수행한다.
