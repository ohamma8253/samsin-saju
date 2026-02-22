# 삼신사주 (三神四柱)

> 사주팔자 · 자미두수 · 서양 점성술 — 3개 이론이 합의하는 당신의 운명

## What is this?

삼신사주는 동서양 3대 명리학을 AI로 융합한 운세 웹앱입니다.
3명의 캐릭터(신)가 각자 독립적으로 분석한 뒤, **교집합에서 합의**하여 당신의 운명을 읽어줍니다.

### 3신 (Three Gods)

| 신 | 이론 | 성격 |
|----|------|------|
| 🌿 **청운** | 사주팔자 | 300년 살아온 도사. 단호하고 핵심을 찌른다 |
| ☁️ **태을** | 자미두수 | 하늘의 명반을 읽는 신선. 격조 높은 어조 |
| ✦ **루나** | 서양 점성술 | 심리 점성술사. 따뜻하고 공감적 |

### Features

- **총운 리포트** — 3신의 첫 마디, 3곡선 교차 그래프, 인생 최고/최악 순간
- **심층 분석** — 각 신별 5개 섹션 상세 해석
- **삼신합의** — 최종 판결 + 옥새 예언
- **채팅** — 세 신에게 직접 질문
- **궁합** — 초대 URL로 두 사람 궁합 분석

### 3곡선 그래프

```
🔵 사주팔자 — 대운 십이운성 기반
🟡 자미두수 — 화록/화기 기반
🟣 서양점성 — 목성/토성 트랜짓 기반

세 곡선이 겹칠수록 강한 합의 → 당신 인생의 확실한 순간
```

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Claude Haiku 4.5 (via OpenRouter)
- @orrery/core (실제 천문 데이터 계산)
- Tailwind CSS 4 (다크 테마)

## Getting Started

```bash
# Install
npm install

# Set environment
echo "OPENROUTER_API_KEY=your-key-here" > .env.local

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

- [PRD](docs/PRD.md) — Product Requirements
- [SPEC](docs/SPEC.md) — Technical Specification
- [ROADMAP](docs/ROADMAP.md) — Implementation Roadmap
- [CONTENT_REVIEW](docs/CONTENT_REVIEW.md) — Content Completeness Review
- [TODO](TODO.md) — Task List
