# 삼신사주 — Technical Specification

> Version: 1.0 | Last Updated: 2026-02-22

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Client (React 19)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Landing   │ │ Report   │ │ Compatibility    │ │
│  │ page.tsx  │ │ page.tsx │ │ page.tsx         │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ StarsBg   │ │ChatModal │ │CookieShopModal   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└────────────────────┬────────────────────────────┘
                     │ POST /api/*
┌────────────────────▼────────────────────────────┐
│              API Routes (Next.js)                │
│  /api/report  /api/deep  /api/final             │
│  /api/chat    /api/compatibility                │
└────────────────────┬────────────────────────────┘
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  @orrery/core    │  │  Claude Haiku    │
│  (천문 계산)      │  │  (via OpenRouter) │
│  - Saju          │  │  - 캐릭터 페르소나 │
│  - Ziwei         │  │  - JSON 생성     │
│  - Natal         │  │  - 3단계 파싱    │
└──────────────────┘  └──────────────────┘
```

---

## 2. Data Flow

### 2.1 Report Generation Pipeline

```
Input (name, gender, birthDate, birthTime?)
  │
  ▼
calculateSamsin(input)                    ← @orrery/core
  │ returns SamsinData {saju, ziwei, natal}
  │
  ├── formatSajuSummary(data)             ← 대운 십이운성 포함
  ├── formatZiweiSummary(data)            ← 화록/화기 + 5궁 배치
  └── formatNatalSummary(data)            ← 목성/토성 위치
  │
  ▼
callAI(system, userPrompt, maxTokens)     ← Claude Haiku
  │ returns JSON string
  │
  ▼
parseJSON<TotalReport>(text)              ← 3-stage fallback parser
  │
  ▼
TotalReport {
  characterVoices, coreInsight,
  moneyGraph[7], careerGraph[7],
  peakMoments[5], hardMoments[5],
  samsinMessage
}
```

### 2.2 GraphPeriod Schema

```typescript
interface GraphPeriod {
  label:       string;       // "20대 초반"
  score:       number;       // 0~100 (3점수 단순 평균)
  note:        string;       // 한 줄 설명
  phaseType?:  PhaseType;    // seeding|rising|peak|plateau|declining
  sajuScore?:  number;       // 0~100: 십이운성 기반
  ziweiScore?: number;       // 0~100: 화록/화기 기반
  natalScore?: number;       // 0~100: 목성/토성 기반
}
```

### 2.3 3곡선 그래프 렌더링

```
SVG (500 × 90)
├── defs: 3 linearGradient (lg-sajuScore, lg-ziweiScore, lg-natalScore)
├── 합의 배경 bands (gold glow / gray shade)
├── 3 fill paths (opacity 0.12)
├── 3 stroke paths (strokeWidth 1.8, opacity 0.85)
├── 3 × n dots (r=2.5 normal, r=4+6 pulse for current)
├── hover zones (invisible rect per period)
├── tooltip (四72 紫85 ☿61 + consensus indicator)
└── legend (3 colored circles + "3곡선 겹칠수록 강한 합의")
```

---

## 3. API Endpoints

### 3.1 POST /api/report

**Input:** `{ name, gender, year, month, day, hour? }`
**Output:** `TotalReport` (JSON)
**AI Model:** Claude Haiku 4.5
**Max Tokens:** 8192
**Latency:** ~5-15s

### 3.2 POST /api/deep

**Input:** `{ ...birthData, character: 'cheongwoon'|'taeeul'|'luna' }`
**Output:** `DeepReport { character, sections[5] }`
**Cookie Cost:** 3
**Max Tokens:** 8192

### 3.3 POST /api/final

**Input:** `{ ...birthData }`
**Output:** `FinalSynthesis { verdict, pillars[3], nowAdvice, voices, seal }`
**Max Tokens:** 8192

### 3.4 POST /api/chat

**Input:** `{ ...birthData, history: ChatMessage[], message: string }`
**Output:** `ChatResponse { cheongwoon, taeeul, luna }`
**Max Tokens:** 1800

### 3.5 POST /api/compatibility

**Input:** `{ personA: birthData, personB: birthData, relationship, includeDeep }`
**Output:** `CompatibilityReport { ohaengRelation, summary, light, deep? }`
**Max Tokens:** 8192

---

## 4. File Structure

```
samsin-saju/
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── compatibility/route.ts
│   │   ├── deep/route.ts
│   │   ├── final/route.ts
│   │   └── report/route.ts
│   ├── compatibility/page.tsx
│   ├── invite/[id]/page.tsx
│   ├── report/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CharacterBadge.tsx
│   ├── ChatModal.tsx
│   ├── CookieBar.tsx
│   ├── CookieShopModal.tsx
│   └── StarsBg.tsx
├── lib/
│   ├── claude.ts          # AI 프롬프트 + 타입 + API 호출 (678 lines)
│   ├── saju.ts            # 천문 계산 + format 함수
│   ├── cookies.ts         # LocalStorage 쿠키 관리
│   └── invite.ts          # Base64 초대 URL
├── docs/
│   ├── PRD.md
│   ├── SPEC.md
│   ├── ROADMAP.md
│   └── CONTENT_REVIEW.md
├── public/
├── CLAUDE.md
├── TODO.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## 5. Type Definitions (lib/claude.ts)

```typescript
// 핵심 타입 (현재 구현됨)
PhaseType        = 'seeding' | 'rising' | 'peak' | 'plateau' | 'declining'
GraphPeriod      = { label, score, note, phaseType?, sajuScore?, ziweiScore?, natalScore? }
LifeMoment       = { rank, timing, title, desc }
TotalReport      = { characterVoices, coreInsight, moneyGraph, careerGraph, peakMoments, hardMoments, samsinMessage }
DeepReport       = { character, sections[] }
ChatMessage      = { role, content }
ChatResponse     = { cheongwoon, taeeul, luna }
FinalSynthesis   = { verdict, pillars[], nowAdvice, voices, seal }
CompatibilityReport = { ohaengRelation, summary, light, deep? }

// v1.0 추가 예정
ConsensusLevel   = 'unanimous' | 'majority' | 'conflict'
Prescription     = { luckyColor, luckyDirection, luckyNumber, talisman }

// v1.1 추가 예정
LoveGraphPeriod  = GraphPeriod  // loveGraph용 (동일 스키마)
```

---

## 6. AI Prompt Architecture

### 6.1 System Prompt Structure

```
[캐릭터 규칙 7개]
  1. 한자 금지
  2. 쉬운 비유
  3. 캐릭터 말투 분화 (청운/태을/루나)
  4. 점수 0~100 현실적
  5. note에 비유 포함
  6. phaseType 선택 기준
  7. 3레이어 점수 (sajuScore/ziweiScore/natalScore 독립 산출)
```

### 6.2 Data Injection

```
callAI(system, userPrompt)
  └── userPrompt includes:
      ├── formatSajuSummary(data)   ← 원국 + 대운 흐름 (십이운성)
      ├── formatZiweiSummary(data)  ← 명궁 + 화록/화기 + 5궁
      └── formatNatalSummary(data)  ← 태양/달/ASC + 목성/토성
```

### 6.3 JSON Parsing (3-stage fallback)

```
Stage 1: JSON.parse(raw)              ← 정상 케이스
Stage 2: fix newlines/escapes → parse ← 문자열 내 줄바꿈
Stage 3: extract last valid object    ← 트런케이션 대비
```

---

## 7. Cookie System (lib/cookies.ts)

```
Storage: LocalStorage ('samsin-cookies')
Initial: 7 cookies on first visit
Deduct:  deductCookies(count) → boolean (false if insufficient)
Check:   getCookieCount() → number
Init:    initCookies() → void (idempotent)
```

---

## 8. Environment Variables

```
OPENROUTER_API_KEY   # Required: OpenRouter API key for Claude Haiku
```

---

## 9. Performance Considerations

| Metric | Current | Target |
|--------|---------|--------|
| Total Report generation | 5-15s | <10s (streaming) |
| Deep Report generation | 3-8s | <5s |
| Final Synthesis | 3-8s | <5s |
| Chat response | 2-5s | <3s |
| Bundle size | TBD | <200KB gzipped |
| Lighthouse Mobile | TBD | >90 |

### 9.1 Latency Mitigation (v1.0)

- 로딩 중 3신 격론 스트리밍으로 시선 고정
- 비동기: 총운 먼저 → 심층/합의는 백그라운드
- Claude Haiku 선택 (속도/비용 최적)
