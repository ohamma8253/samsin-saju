# 삼신사주(三神四柱) — Product Requirements Document

> Version: 1.0 | Last Updated: 2026-02-22
> Status: Approved (Opus × Gemini 3-Round Consensus)

---

## 1. Product Overview

**삼신사주**는 사주팔자 · 자미두수 · 서양 점성술 3개 이론을 융합한 AI 운세/점술 웹앱이다.
세 이론이 각자 독립적으로 분석한 뒤 **교집합(합의)**에서 결론을 도출하는 것이 핵심 차별점.

### 1.1 Core Value Proposition

> "사주와 자미두수와 점성술이 동시에 가리키는 당신 인생의 골든타임"

- 단일 이론이 아닌 **3이론 교차 검증**으로 신뢰감 극대화
- 3캐릭터(신)의 차별화된 페르소나로 엔터테인먼트 가치 제공
- 실제 천문 데이터(@orrery/core) 기반 → LLM 환각 방어

### 1.2 Target Users

| Segment | 특성 |
|---------|------|
| Primary | 20~35세 여성 (운세 소비의 핵심층) |
| Secondary | 25~40세 남녀 (커플 궁합, 자기분석 관심) |
| Tertiary | 10대 후반~20대 초반 (바이럴 공유, 호기심) |

---

## 2. Three Characters (3신)

| 신 | 이모지 | 이론 | 어투 | 색상 |
|----|--------|------|------|------|
| 청운 | 🌿 | 사주팔자 | "~합니다" 단호 | `#4ca87d` |
| 태을 | ☁️ | 자미두수 | "~하십니다" 격조 | `#a78bfa` |
| 루나 | ✦ | 서양 점성술 | "~해요" 따뜻 | `#c9a84c` |

### 캐릭터 규칙
- 한자 사용 **완전 금지** (한국어 비유로 번역)
- 각 캐릭터는 자신의 이론 관점에서**만** 분석
- 실제 데이터(일주, 명궁 별, 태양 별자리)를 **반드시** 근거로 사용
- 모호한 위로/빈 말 금지

---

## 3. User Flow

```
1. 랜딩      → 이름 + 성별 + 생년월일 + 출생시간(선택) 입력
2. 로딩      → 3신 캐릭터 + 단계별 메시지 애니메이션
3. 총운 리포트 → 무료 (characterVoices + coreInsight + graphs + moments)
4. 심층 분석  → 유료 (청운 5섹션 / 태을 5섹션 / 루나 5섹션)
5. 삼신합의   → 유료 (verdict + 3기둥 + 처방 + 옥새)
6. 채팅      → 유료 (3신에게 자유 질문)
7. 궁합      → 유료 (초대 URL → 두 사람 궁합)
```

---

## 4. Content Structure

### 4.1 총운 리포트 (무료)

| 섹션 | 구조 |
|------|------|
| characterVoices | 3신 각 2문장 첫 마디 |
| coreInsight | headline(15자) + body(5문장) — 3이론 교집합 |
| moneyGraph | 7구간 × (sajuScore + ziweiScore + natalScore + note + phaseType) |
| careerGraph | 동일 구조 7구간 |
| **loveGraph** | **[v1.1] 7구간 × 3점수 — 연애/인연운** |
| peakMoments | TOP 5 (rank, timing, title 15자, desc 2문장) |
| hardMoments | TOP 5 동일 구조 |
| samsinMessage | 예언 한 문장 20자 |

### 4.2 심층 분석 (유료: 쿠키 3개/캐릭터)

**청운 (사주) 5섹션:** 기질 / 힘과 약점 / 큰 흐름 / 재능과 직업 / 당부
**태을 (자미) 5섹션:** 천명 / 재물과 관록 / 인연 / 큰 운 / 당부
**루나 (서양) 5섹션:** 자아 / 욕망과 에너지 / 성장과 시련 / 올해 신호 / 당부

→ **Progressive Disclosure**: 접기/탭 UI로 밀도 조절

### 4.3 삼신합의 최종 판결 (유료)

| 필드 | 설명 |
|------|------|
| verdict | 운명 본질 3문장 |
| **consensusLevel** | **[v1.0] 만장일치 / 2:1 격론 / 충돌** |
| pillars | 3기둥 (icon + title 15자 + body 3문장) |
| nowAdvice | 현재 처방 4문장 |
| **prescription** | **[v1.0] 삼신 합의 처방전 (행운 색/방향/숫자)** |
| voices | 3신 마지막 한마디 각 2문장 |
| seal | 옥새 예언 20자 + **스탬프 애니메이션** |

### 4.4 채팅 (유료)

- 3신 동시 응답 (각 3~4문장)
- **세션 기반 — 대화 휘발** (신비감 + 재소비 유도)
- 최종 판결문(부적) 카드만 이미지로 영구 보관

### 4.5 궁합 (유료)

| 현재 | v1.1 보강 |
|------|-----------|
| 사주 데이터만 사용 | + 자미두수(부처궁/교우궁) |
| | + 서양점성(금성/화성 시나스트리) |
| light + deep 구조 | 3신 합의 형식으로 통합 |

### 4.6 올해의 삼신 예언 [v2.0]

- 12개월 × (sajuScore + ziweiScore + natalScore)
- 월별 핵심 메시지 + phaseType
- 데일리 예언은 v2.0 이후

---

## 5. 3곡선 그래프 시스템

```
곡선 1: 사주팔자 (파랑 #5b8ee6) — 대운 십이운성 기반
곡선 2: 자미두수 (금색 #c9a84c) — 화록/화기 기반
곡선 3: 서양점성 (보라 #a78bfa) — 목성/토성 트랜짓 기반

합의 강도:
  3개 모두 65+ → 금색 배경 (강력한 합의)
  3개 모두 40- → 회색 배경 (잠복기)
  score = Math.round((sajuScore + ziweiScore + natalScore) / 3)
```

---

## 6. Monetization

### 6.1 쿠키 시스템

| 항목 | 비용 |
|------|------|
| 첫 방문 무료 지급 | 7개 |
| 심층 분석 (캐릭터당) | 3개 |
| 삼신합의 | TBD |
| 궁합 | TBD |
| 채팅 (세션당) | TBD |

### 6.2 수익화 전략 [v1.1+]

- "3신 모두 열람 → Verdict 무료" 콤보 결제 유도 (ARPU 상승)
- 궁합 초대 URL → CAC 0원 바이럴 루프
- 부적 카드 이미지 → SNS 공유 바이럴

---

## 7. UI/UX Requirements

### 7.1 디자인 시스템
- **배경**: `#06060f` (deep space)
- **악센트**: `#c9a84c` (gold)
- **폰트**: Noto Serif KR (동양 신비감)
- **테마**: 다크 모드 only, 모바일 퍼스트

### 7.2 애니메이션
- StarsBg: 별 배경 파티클
- fade-up: 순차 등장
- 옥새 스탬프: 합의 판결 시 시각적 카타르시스

### 7.3 콘텐츠 골든 룰 (Opus × Gemini 합의)
1. **서사를 팔아라** — 3이론 충돌과 타결 과정 자체를 스토리로
2. **권위 × 현대성의 극단적 대비** — 문체는 초월적 존재, UI는 차가운 데이터 대시보드
3. **버려야 간직한다** — 텍스트는 휘발, 부적 카드 한 장만 남겨 희소성 극대화

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5, React 19 |
| AI | Claude Haiku 4.5 via OpenRouter |
| Astro Engine | @orrery/core 0.3.0 |
| Styling | Tailwind CSS 4, Custom dark theme |
| State | React hooks + LocalStorage (cookies) |
| Deploy | Vercel (planned) |

---

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM 생성 지연 (10~30s) | 이탈률 증가 | 스트리밍 UX + 비동기 생성 |
| 3신 해석 모순 | 신뢰 붕괴 | 합의율 메타데이터 + 후처리 검증 |
| 인지 과부하 (15섹션) | 이탈 | Progressive Disclosure |
| 프롬프트 일관성 | 캐릭터 붕괴 | 정교한 페르소나 프롬프트 (이미 구축) |
| 쿠키 과금 저항 | 낮은 전환율 | 무료 총운의 높은 품질 → 신뢰 축적 |
| 쿠키 LocalStorage 조작 | 결제 무력화 | DB 영속 저장 (Supabase/Firebase) |
| 개인정보 법적 리스크 | 서비스 중단 | 면책 조항 + 개인정보 처리방침 + AI 제공 동의 |
| OpenRouter Rate Limit | 서비스 불가 | 백오프/큐잉 전략 |
| @orrery/core 한계 | v2.0 불가 | 세운/월운/유년반 스펙 사전 확인 |

---

## 10. Legal & Compliance (Trinity Deep 합의 추가)

### 10.1 필수 법적 고지
- **면책 조항(Disclaimer)**: "본 서비스는 엔터테인먼트 목적이며, 실제 삶의 중요한 결정에 대한 책임을 지지 않습니다"
- 랜딩 페이지 하단 + 리포트 하단에 표시

### 10.2 개인정보 처리
- **수집 항목**: 이름, 생년월일, 출생시간, 성별
- **제3자 제공**: OpenRouter(Anthropic Claude) API로 전송
- **동의 절차**: 랜딩 페이지에 명시적 체크박스 필수
- **보관 기간**: 세션 종료 시 서버에서 삭제 (비영속)
- **처리방침 페이지**: `/privacy` 경로에 별도 페이지

### 10.3 데이터 영속화 계획
- 현재: LocalStorage (클라이언트 전용, 조작 가능)
- 목표: BaaS(Supabase/Firebase) 연동
  - 쿠키 잔액 + 결제 이력 영속 저장
  - 유저 인증 (소셜 로그인 or 익명 UUID)
  - 부적 카드 아카이브
