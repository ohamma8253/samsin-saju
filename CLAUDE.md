# 삼신사주 (三神四柱) Project

## Overview
사주팔자 · 자미두수 · 서양 점성술 3개 이론을 융합한 AI 운세 웹앱.
Next.js 16 + Claude Haiku 4.5 (OpenRouter) + @orrery/core.

## 핵심 원칙

### 3신 캐릭터 규칙
- **청운** 🌿: 사주팔자. "~합니다" 단호. 색상 `#4ca87d`
- **태을** ☁️: 자미두수. "~하십니다" 격조. 색상 `#a78bfa`
- **루나** ✦: 서양 점성술. "~해요" 따뜻. 색상 `#c9a84c`
- **한자 사용 완전 금지** — 모든 한자는 쉬운 한국어 비유로 번역
- 각 신은 자신의 이론 관점에서**만** 분석. 실제 데이터 근거 필수

### 3곡선 그래프 시스템
```
sajuScore  (파랑 #5b8ee6) — 대운 십이운성 기반
ziweiScore (금색 #c9a84c) — 화록/화기 기반
natalScore (보라 #a78bfa) — 목성/토성 트랜짓 기반
score = Math.round((sajuScore + ziweiScore + natalScore) / 3)
```

### 콘텐츠 골든 룰
1. **서사를 팔아라** — 3이론 충돌과 타결 과정을 스토리로
2. **권위 × 현대성** — 문체는 초월적 존재, UI는 차가운 데이터 대시보드
3. **버려야 간직한다** — 채팅 텍스트는 휘발, 부적 카드만 남겨 희소성 극대화

## 기술 스택
- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **AI**: Claude Haiku 4.5 via OpenRouter (`OPENROUTER_API_KEY`)
- **천문 계산**: @orrery/core 0.3.0
- **Styling**: Tailwind CSS 4, 다크 테마 (`#06060f` 배경, `#c9a84c` 금색 악센트)
- **Font**: Noto Serif KR

## 프로젝트 구조
```
app/           # Next.js App Router (4 pages + 5 API routes)
components/    # React components (5개)
lib/           # Core logic
  claude.ts    # AI 프롬프트 + 타입 + API 호출
  saju.ts      # 천문 계산 + format 함수
  cookies.ts   # LocalStorage 쿠키 관리
  invite.ts    # Base64 초대 URL
docs/          # PRD, SPEC, ROADMAP, CONTENT_REVIEW
```

## 코드 규칙
- AI 프롬프트 수정 시 → 3신 캐릭터 규칙 7개 유지 확인
- GraphPeriod 수정 시 → sajuScore/ziweiScore/natalScore 3개 독립 유지
- JSON 파싱 → 3단계 fallback 구조 유지
- 한자가 출력되면 즉시 수정 (프롬프트 규칙 위반)

## 문서
- `docs/PRD.md` — 제품 요구사항
- `docs/SPEC.md` — 기술 스펙
- `docs/ROADMAP.md` — 구현 로드맵 (v1.0 → v1.1 → v2.0)
- `docs/CONTENT_REVIEW.md` — Opus × Gemini 콘텐츠 완성도 리뷰
- `TODO.md` — 작업 목록

## 보안
- `.env` 파일 커밋 금지 (.gitignore에 포함)
- API 키는 환경변수로만 관리
