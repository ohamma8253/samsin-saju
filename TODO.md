# 삼신사주 — TODO

> Last Updated: 2026-02-22
> Based on: Opus × Gemini YingYang 3R Consensus (88.5/100)

---

## v0.9 — 사전 보완 (Trinity Deep 합의 — 착수 전 필수)

### DB 도입 계획
- [ ] BaaS 선정 (Supabase / Firebase / PlanetScale)
- [ ] 쿠키 시스템 LocalStorage → DB 마이그레이션 설계
- [ ] 유저 인증 체계 (소셜 로그인 or 익명 UUID)
- [ ] 결제 내역 영속 저장 스키마

### 법적 고지 (최소한)
- [ ] 랜딩 페이지에 면책 조항 (엔터테인먼트 목적 고지)
- [ ] 개인정보 제3자(AI) 제공 동의 체크박스

### @orrery/core 스펙 확인
- [ ] 세운(연운) 계산 메서드 존재 여부 확인
- [ ] 월운 계산 메서드 존재 여부 확인
- [ ] 자미두수 유년반(流年盤) 지원 여부 확인
- [ ] 미지원 시 v2.0 대안 검토 (자체 구현 or 다른 라이브러리)

### 에러 처리 강화
- [ ] JSON 파싱 전실패 시 → Graceful Degradation (성공 섹션 먼저 렌더 + 부분 재요청)
- [ ] 재시도 UX ("삼신이 점괘를 다시 짚어보고 있습니다..." 톤 유지)
- [ ] 실패 시 쿠키 반환 로직
- [ ] OpenRouter 429 Rate Limit → 백오프/큐잉 전략
- [ ] 에러 바운더리 컴포넌트

---

## v1.0 — 핵심 경험 & 바이럴

### 합의율 메타데이터 시스템
- [ ] `ConsensusLevel` 타입 정의 (lib/claude.ts)
- [ ] FinalSynthesis에 `consensusLevel` 필드 추가
- [ ] 합의 강도 계산 로직: 3점수 기반 자동 판정
- [ ] AI 프롬프트에 합의 뉘앙스 규칙 추가 (만장일치/격론/충돌)
- [ ] report/page.tsx에 합의 배지 렌더링

### 옥새 스탬프 애니메이션
- [ ] CSS keyframes: stamp-drop + shake + afterimage
- [ ] 합의 강도별 색상 (금/은/적)
- [ ] globals.css에 애니메이션 추가

### 삼신 합의 처방전 (개운법)
- [ ] `Prescription` 타입 정의
- [ ] FinalSynthesis에 `prescription` 필드 추가
- [ ] 오행 Rule-based 상수맵 (목→파랑/동, 화→빨강/남, ...) + AI 말투 윤색
- [ ] AI 프롬프트: "삼신이 하사한 비책" 형식 규칙
- [ ] 처방전 카드 UI 컴포넌트
- [ ] 공유 버튼 (카카오/인스타/링크)

### Progressive Disclosure UI
- [ ] 심층 분석 15섹션 → 아코디언 컴포넌트
- [ ] 총운 리포트 → 핵심 요약 + 펼치기
- [ ] 모바일 스와이프 탭 (재물/직업/관계)

### 부적 카드 저장/공유
- [ ] Canvas/SVG → PNG 변환 유틸
- [ ] 최종 판결문 → 시각적 카드 레이아웃
- [ ] 공유 API 연동 (Web Share API)
- [ ] 채팅 히스토리 세션 종료 시 자동 삭제 확인

---

## v1.1 — 관계 확장 & 리텐션

### 궁합 3신 데이터 연동
- [ ] generateCompatibility() 리팩토링
- [ ] formatZiweiSummary() 궁합용 확장 (부처궁/교우궁)
- [ ] formatNatalSummary() 궁합용 확장 (금성/화성 시나스트리)
- [ ] 프롬프트: 3신 개별 궁합 견해 → 합의
- [ ] CompatibilityReport 타입 확장

### 연애/인연운 3곡선 그래프
- [ ] TotalReport에 `loveGraph: GraphPeriod[]` 추가
- [ ] AI 프롬프트: 연애운 3점수 산출 규칙
  - sajuScore: 도화살/홍염살/천을귀인
  - ziweiScore: 부처궁 화록/화기
  - natalScore: 금성 트랜짓 + 7하우스
- [ ] report/page.tsx에 loveGraph 섹션 추가
- [ ] 연애운 peakMoments (인연의 시기 TOP 3)

### 쿠키 콤보 결제
- [ ] "3신 모두 열람 → Verdict 무료" 로직
- [ ] 할인 번들 UI (CookieShopModal 확장)

---

## v2.0 — 일상 침투 & 수익화

### 올해의 삼신 예언
- [ ] @orrery/core 세운/월운 지원 여부 확인
- [ ] 12개월 타임라인 × 3점수 데이터 구조
- [ ] AI 프롬프트: 월별 운세 규칙
- [ ] 월별 타임라인 UI 컴포넌트
- [ ] API route: /api/yearly

### 부적 콜렉션 앨범
- [ ] LocalStorage or DB 기반 판결문 아카이브
- [ ] 갤러리 UI (날짜별/주제별)

### 데일리 예언
- [ ] 일일 운세 데이터 구조
- [ ] PWA 설정 + Push 알림
- [ ] 간소화된 일일 카드 UI

---

## 인프라 & 품질

- [ ] Vercel 배포 설정
- [ ] 환경변수 관리 (.env.local)
- [ ] Lighthouse 모바일 90+ 최적화
- [ ] 에러 바운더리 + 로딩 스켈레톤
- [ ] OG 이미지 메타태그 (궁합 공유용)
- [ ] 접근성 (aria-label, 키보드 네비게이션)
- [ ] 채팅 Rate Limit (IP/세션 기반 턴 수 제한)

---

## 출시 준비 (앱 오픈 전)

- [ ] 개인정보 처리방침 페이지 (/privacy)
- [ ] 이용약관 페이지 (/terms)
- [ ] PG사 심사용 면책 체크박스 (결제 화면 직전)
- [ ] 디지털 콘텐츠 환불 규정 명시
- [ ] 사업자 정보 Footer (사업자등록번호, 통신판매업, 대표자, 주소)
- [ ] CS 채널 (카카오톡 채널 등)
- [ ] 서비스 제공/이용 기간 약관 기재

---

## 완료된 항목 ✅

- [x] 3곡선 그래프 시스템 (sajuScore/ziweiScore/natalScore)
- [x] 캐릭터 페르소나 프롬프트 (한자 금지 + 어투 + 분석 스타일)
- [x] formatSajuSummary 강화 (대운 십이운성)
- [x] formatZiweiSummary 강화 (화록/화기 + 5궁)
- [x] formatNatalSummary 강화 (목성/토성 위치)
- [x] JSON 3단계 fallback 파서
- [x] 쿠키 시스템 (첫 방문 7개)
- [x] 궁합 초대 URL 시스템
- [x] 별 배경 애니메이션 (StarsBg)
- [x] 다크 테마 + 모바일 퍼스트 UI
