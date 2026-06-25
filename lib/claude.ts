import type { SamsinData } from './saju';
import { formatSajuSummary, formatNatalSummary, formatZiweiSummary } from './saju';
import type { ConsensusMetrics, ConsensusLevel, DominantVoice } from './consensus';
import type { Prescription } from './prescription';
import type { ComputedScores, ScoredPeriod } from './scoring';
import { SAJU_DOMAIN_KNOWLEDGE, ZIWEI_DOMAIN_KNOWLEDGE, NATAL_DOMAIN_KNOWLEDGE, CROSS_SYSTEM_MAPPING } from './domain-knowledge';
import type { ChatQuestionMode, SamsinDeityKey } from './pricing';
import { formatOraclePromptContext } from './interpretation';
import type { DecisionContext } from './interpretation/decision-context';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

const EVIDENCE_RENDERING_RULES = `구조화 근거 사용 규칙:
- [삼신 오라클 ClaimPlan]의 claim_id, consensus_id, evidence를 우선 근거로 삼습니다.
- basis에 없는 내용을 건강, 투자, 관계 결정, 사고, 임신, 사망 예측으로 확장하지 않습니다.
- strength<=weak 항목은 확정이 아니라 가능성, 주의 리듬, 자기점검 언어로만 씁니다.
- 출생 시각 미상 caveat가 있으면 시주, 자미 궁위/시기, 어센던트/하우스 주장을 확정하지 않습니다.`;

function structuredEvidenceBlock(data: SamsinData, maxItems = 12): string {
  return `[삼신 오라클 ClaimPlan]\n${formatOraclePromptContext(data, maxItems)}\n\n${EVIDENCE_RENDERING_RULES}`;
}

export type PhaseType =
  | 'seeding'    // 씨앗기 — 낮은 점수, 지금 시작하면 좋은 때
  | 'rising'     // 상승기 — 점수가 오르는 구간, 에너지가 쌓이는 중
  | 'peak'       // 수확기 — 점수 고점, 노력의 결실이 열리는 때
  | 'plateau'    // 안정기 — 높은 점수 유지, 고원에서 숨 고르는 시기
  | 'declining'; // 하강기 — 점수가 내려가는 구간, 정리하고 보내는 시기

export interface GraphPeriod {
  label:       string;       // "20대 초반"
  score:       number;       // 0~100 — 종합 (3점수 단순 평균)
  note:        string;       // 한 줄 설명
  phaseType?:  PhaseType;    // 점수 궤적 (기존 유지)
  sajuScore?:  number;       // 0~100: 사주 십이운성 기반
  ziweiScore?: number;       // 0~100: 자미두수 화록/화기 기반
  natalScore?: number;       // 0~100: 서양점성 목성/토성 기반
}

export interface LifeMoment {
  rank:   number;
  timing: string;  // 예: "35~37세"
  title:  string;  // 15자 이내
  desc:   string;  // 2문장
}

export interface TotalReport {
  characterVoices: {
    cheongwoon: string;
    taeeul:     string;
    luna:       string;
  };
  coreInsight: {
    headline: string;
  body: string; // 세 이론 교집합 자세한 정리 4~5문장
  };
  moneyGraph:   GraphPeriod[];  // 5~7개 구간
  careerGraph:  GraphPeriod[];  // 5~7개 구간
  peakMoments:  LifeMoment[];   // TOP 5
  hardMoments:  LifeMoment[];   // TOP 5
  samsinMessage: string;
}

export interface DeepReport {
  character: 'cheongwoon' | 'taeeul' | 'luna';
  sections: { title: string; content: string }[];
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export type ChatResponse = Partial<Record<SamsinDeityKey, string>>;

export interface ChatRequestOptions {
  questionMode: ChatQuestionMode;
  selectedDeity?: SamsinDeityKey;
  isFirstFree?: boolean;
  costCookie?: number;
}

export interface FinalSynthesisPillar {
  icon:  string;   // 이모지
  title: string;   // 15자 이내
  body:  string;   // 3~4문장
}

export interface FinalSynthesis {
  verdict:    string;                   // 세 신의 마지막 정리 — 이 사람의 핵심 흐름 2~3문장
  pillars:    FinalSynthesisPillar[];   // 3개
  nowAdvice:  string;                   // 지금 이 시기 제안 3~4문장
  voices: {                             // 세 신이 마지막으로 한 마디씩
    cheongwoon: string;
    taeeul:     string;
    luna:       string;
  };
  seal: string;                         // 마무리 문장 — 기억할 한 문장
  consensusLevel?: ConsensusLevel;
  consensusNote?:  string;              // "세 신 모두 같은 방향" / "청운만 다른 관점"
  prescription?:   Prescription;
  dissent?: { voice: DominantVoice; argument: string }; // conflict 시만
}

export interface ReportContext {
  decisionContext?: DecisionContext;
  totalReport?: {
    coreInsightHeadline: string;
    coreInsightBody: string;
    samsinMessage: string;
    moneyGraphSummary: string;
    careerGraphSummary: string;
  };
  deepReports?: {
    cheongwoon?: string;
    taeeul?: string;
    luna?: string;
  };
  finalSynthesis?: {
    verdict: string;
    consensusLevel: ConsensusLevel;
    consensusNote: string;
    nowAdvice: string;
    prescription: string;
    seal: string;
  };
}

export interface CompatibilityReport {
  ohaengRelation: string;
  summary: string;
  light: {
    gijil:        { headline: string; body: string };
    sothrough:    { headline: string; body: string };
    strength:     { headline: string; body: string };
    samsinMessage: string;
  };
  deep?: {
    emotion:    { headline: string; body: string };
    longterm:   { headline: string; body: string };
    sokgungham: { headline: string; body: string };
    bestTime:   string;
  };
}

// ─── 캐릭터 페르소나 ──────────────────────────────────────────────
const CHEONGWOON_PERSONA = `당신은 청운입니다. 조선 후기 명리학의 대가로, 300년을 살아온 사주팔자 도사입니다.

절대 규칙:
- 한자 사용 완전 금지. 데이터에 한자가 있어도 반드시 한국어로 번역해 사용
  예) 辛 → "쇠 기운", 亥 → "깊은 물 기운", 壬午 → "큰 물과 강한 불의 기운", 甲 → "봄 나무 기운"
  예) 용신 → "이 사람에게 힘이 되는 기운", 기신 → "이 사람에게 독이 되는 기운"
  예) 합충 → "기운의 충돌", 대운 → "큰 흐름", 일간 → "타고난 기질의 핵심"

말투 규칙:
- "~합니다" 중심의 정중하고 분명한 현대 한국어
- 간결하고 핵심을 찌르는 문장. 군더더기 없음
- 모호한 표현을 남발하지 않되, 확정된 정답처럼 말하지 않기

정리 스타일:
- 반드시 실제 사주 데이터를 근거로 사용 (한자 번역해서)
- 오행의 과불급과 기운의 충돌·조화를 구체적으로 지적
- 큰 흐름과 현재 시기를 연결
- "언제", "어떤 상황에서" 같은 구체적 맥락 제시
- 현실적이고 실용적인 제안. 막연한 긍정이 아닌 실질적 방향`;

const TAEEUL_PERSONA = `당신은 태을입니다. 자미두수를 바탕으로 삶의 역할과 관계 패턴을 차분히 정리하는 해석자입니다.

절대 규칙:
- 한자 사용 완전 금지. 별 이름과 궁 이름은 한국어/한글로만 표현
  예) 紫微 → "자미", 天機 → "천기", 命宮 → "명궁", 財帛宮 → "재물 궁"
  예) 오행국 → "오행의 흐름", 대한 → "큰 운의 흐름"

말투 규칙:
- "~합니다" 중심의 정중하고 자연스러운 현대 한국어
- 신비로운 장식어보다 사용자가 바로 이해할 수 있는 설명을 우선
- 별 이름과 궁 이름은 필요할 때만 쉽게 풀어 쓰기
- 판단보다 관찰, 확정보다 참고 가능한 패턴

정리 스타일:
- 명궁의 주성은 "나를 드러내는 방식"처럼 쉬운 말로 풀어 설명
- 재물 궁·관록 궁·배우자 궁 등 핵심 궁은 돈, 일, 관계의 반복 패턴으로 번역
- 오행의 흐름과 음양의 기운으로 전체 그림 제시
- 인연의 결, 마음의 회복력 등 삶의 패턴을 현실 언어로 설명
- 큰 흐름과 현재 국면을 연결하되 사건 확정처럼 말하지 않기`;

const LUNA_PERSONA = `당신은 루나(Luna)입니다. 심리 점성술을 기반으로 인간의 내면을 읽는 현대 점성술사입니다.

말투 규칙:
- "~해요", "~거예요", "~답니다" — 따뜻하고 공감적인 현대 어조
- 행성 이름을 자연스럽게: "태양(Sun)", "금성(Venus)", "어센던트" 등
- "당신 안에는", "당신의 내면 깊은 곳에는" 같은 심리학적 접근
- 가능성과 선택을 강조. 정해진 결과보다 에너지와 성향으로 설명

정리 스타일:
- 반드시 태양 별자리·달 별자리·어센던트를 언급
- 심리적 동기, 내면의 욕구, 성장 방향을 탐구
- 행성 간 에너지 관계(긴장·조화)를 심리학적으로 해석
- 현재 시기에 어떤 에너지가 활성화되는지 언급
- 비판보다 가능성 중심. 따뜻하지만 솔직하게`;

// ─── API 호출 ─────────────────────────────────────────────────────
async function callAI(
  system: string,
  userPrompt: string,
  maxTokens = 2000,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.');

  const res = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Samshin-Saju',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

function parseJSON<T>(text: string, label: string): T {
  // 마크다운 코드 블록 제거
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');
  const m = stripped.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`${label} JSON 파싱 실패`);
  const raw = m[0];

  // 1차 시도: 그대로 파싱
  try {
    return JSON.parse(raw) as T;
  } catch { /* fallthrough */ }

  // 2차 시도: JSON 문자열 값 내부의 리터럴 줄바꿈을 \\n으로 교체
  const fixed = raw.replace(/"((?:[^"\\]|\\.)*)"/g, (_match, inner: string) =>
    `"${inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`,
  );
  try {
    return JSON.parse(fixed) as T;
  } catch { /* fallthrough */ }

  // 3차 시도: 마지막 완전한 객체만 추출 (트런케이션 대비)
  const lastBrace = raw.lastIndexOf('}');
  if (lastBrace > 0) {
    try {
      return JSON.parse(raw.slice(0, lastBrace + 1)) as T;
    } catch { /* fallthrough */ }
  }

  throw new Error(`${label} JSON 파싱 실패`);
}

// ─── 총운 리포트 ───────────────────────────────────────────────────
function formatScoredPeriods(periods: ScoredPeriod[]): string {
  return periods.map(p =>
    `{"label":"${p.label}","sajuScore":${p.sajuScore},"ziweiScore":${p.ziweiScore},"natalScore":${p.natalScore},"score":${p.score},"phaseType":"${p.phaseType}","note":"이 구간의 흐름을 한 줄로 — 비유 포함"}`
  ).join(',\n    ');
}

export async function generateTotalReport(
  data: SamsinData,
  preComputedScores: ComputedScores,
): Promise<TotalReport> {
  const currentYear = new Date().getFullYear();
  const currentAge  = currentYear - data.input.year;
  const sajuSummary  = formatSajuSummary(data);
  const ziweiSummary = formatZiweiSummary(data);
  const natalSummary = formatNatalSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 14);

  const moneyCount = preComputedScores.moneyPeriods.length;
  const careerCount = preComputedScores.careerPeriods.length;

  const system = `당신은 삼신사주의 세 신입니다. 사주팔자·자미두수·서양 점성술 세 이론이 모두 가리키는 교집합만 말합니다.

아래 도메인 지식 레퍼런스를 반드시 참조하여 데이터를 정확히 해석하세요:
${SAJU_DOMAIN_KNOWLEDGE}
${ZIWEI_DOMAIN_KNOWLEDGE}
${NATAL_DOMAIN_KNOWLEDGE}

${CROSS_SYSTEM_MAPPING}

절대 규칙:
1. 한자 사용 금지. 정유일주 → "정유 기운", 불의 기운이 강하다 → "열정과 직관이 강하다" 식으로 쉽게
2. 어려운 용어는 반드시 쉬운 비유로 즉시 풀어쓰기. 독자는 사주를 전혀 모르는 일반인
3. 각 캐릭터 목소리가 완전히 달라야 함:
   - 청운: "~합니다" 분명하고 핵심만. 오래된 스승처럼 차분하게
   - 태을: "~합니다" 차분한 현대 한국어. 자미두수 용어는 쉬운 말로 풀어서
   - 루나: "~해요" 심리상담사처럼 따뜻하고 솔직하게
4. 점수는 이미 계산되어 있습니다. 아래 제공된 점수를 그대로 사용하세요. 당신의 역할은 note(한 줄 설명)를 작성하는 것입니다.
5. 그래프 설명(note)은 쉬운 비유 포함. 예: "씨앗을 뿌리는 시기" / "가장 많이 거두는 계절"
6. moneyGraph는 정확히 ${moneyCount}개, careerGraph는 정확히 ${careerCount}개 구간입니다. 구간 수를 변경하지 마세요.
7. 레퍼런스의 일간/십신/주성/별자리 테이블을 실제 데이터와 매칭하여 구체적으로 해석하세요. 일반론 금지.`;

  const userPrompt = `[사주팔자]
${sajuSummary}

[자미두수]
${ziweiSummary}

[서양 점성술]
${natalSummary}

${evidenceBlock}

${data.input.name}님, 현재 약 ${currentAge}세.

한자 금지. 쉬운 한국어 + 비유로만 작성하세요.
세 이론이 공통으로 가리키는 패턴만 담으세요.

아래 JSON의 note 필드만 채워주세요. 점수와 라벨은 이미 채워져 있습니다.

{
  "characterVoices": {
    "cheongwoon": "청운이 처음 이 사람을 보고 하는 말 2문장. '~합니다' 체. 불의 기운·나무 기운 등 쉬운 말로. 이 사람에게 맞는 핵심 흐름.",
    "taeeul":     "태을이 자미두수 관점에서 하는 말 2문장. '~합니다' 체. 별과 궁 이야기를 쉬운 생활 언어로 풀어서.",
    "luna":       "루나가 출생 차트를 보고 하는 말 2문장. '~해요' 따뜻하게. 황소자리·천칭자리 등 별자리를 심리 언어로."
  },
  "coreInsight": {
    "headline": "세 이론이 모두 동의하는 이 사람의 핵심 흐름 — 15자 이내, 한자 금지, 시적으로",
    "body": "CROSS_SYSTEM_MAPPING의 5개 영역(기질/재물/직업/연애/시기) 중 가장 특이한 영역을 선택 → 그 영역에서 사주/자미/점성 3이론 데이터를 대조 → 3이론 일치면 삼신이 한목소리로, 2:1이면 다수/소수 대비, 전부 다르면 시선이 갈리는 지점으로 서사화 → 데이터 근거 최소 3개 인용(예: 일간 X의 편재격 + 재백궁 Y화록 + 목성 Z하우스) → 지금 이 시기에 어떻게 작용하는지. 총 5문장. 쉬운 비유 필수."
  },
  "moneyGraph": [
    ${formatScoredPeriods(preComputedScores.moneyPeriods)}
  ],
  "careerGraph": [
    ${formatScoredPeriods(preComputedScores.careerPeriods)}
  ],
  "peakMoments": [
    {"rank": 1, "timing": "나이 (예: 38~41세)", "title": "이 시기 선물의 핵심 15자", "desc": "무슨 기회가 왜 오는지 2문장. 쉬운 언어."},
    {"rank": 2, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 3, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 4, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 5, "timing": "...", "title": "...", "desc": "..."}
  ],
  "hardMoments": [
    {"rank": 1, "timing": "나이 (예: 28~30세)", "title": "이 시기 속도 조절 핵심 15자", "desc": "무엇을 조심스럽게 봐야 하는지 2문장. 끝에 어떻게 넘기는지 한 마디 포함."},
    {"rank": 2, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 3, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 4, "timing": "...", "title": "...", "desc": "..."},
    {"rank": 5, "timing": "...", "title": "...", "desc": "..."}
  ],
  "samsinMessage": "오늘 기억할 핵심 문장 — 20자 이내, 한자 금지, 쉽고 시적으로"
}`;

  const text = await callAI(system, userPrompt, 8192);
  const parsed = parseJSON<TotalReport>(text, '총운');

  // 후처리: 사전 계산된 점수로 강제 덮어씌움
  overrideScores(parsed.moneyGraph, preComputedScores.moneyPeriods);
  overrideScores(parsed.careerGraph, preComputedScores.careerPeriods);

  return parsed;
}

/** AI 응답의 점수를 사전 계산 점수로 강제 덮어씌움 */
function overrideScores(
  aiGraph: GraphPeriod[],
  preComputed: ScoredPeriod[],
): void {
  // 구간 수 맞추기: AI가 다른 수를 반환해도 사전 계산 기준으로 재구성
  if (aiGraph.length !== preComputed.length) {
    // AI가 만든 note를 최대한 살림
    const notes = aiGraph.map(g => g.note);
    aiGraph.length = 0;
    for (let i = 0; i < preComputed.length; i++) {
      aiGraph.push({
        label: preComputed[i].label,
        sajuScore: preComputed[i].sajuScore,
        ziweiScore: preComputed[i].ziweiScore,
        natalScore: preComputed[i].natalScore,
        score: preComputed[i].score,
        phaseType: preComputed[i].phaseType,
        note: notes[i] ?? `${preComputed[i].label} 시기의 흐름`,
      });
    }
    return;
  }

  // 길이 일치 시 점수만 덮어씌움
  for (let i = 0; i < preComputed.length; i++) {
    aiGraph[i].label = preComputed[i].label;
    aiGraph[i].sajuScore = preComputed[i].sajuScore;
    aiGraph[i].ziweiScore = preComputed[i].ziweiScore;
    aiGraph[i].natalScore = preComputed[i].natalScore;
    aiGraph[i].score = preComputed[i].score;
    aiGraph[i].phaseType = preComputed[i].phaseType;
  }
}

// ─── 청운 깊게 보기 ───────────────────────────────────────────────
export async function generateDeepCheongwoon(data: SamsinData): Promise<DeepReport> {
  const sajuSummary = formatSajuSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 8);
  const pillars = data.saju.pillars;
  const dayStem     = pillars[1]?.pillar.stem ?? '';

  const userPrompt = `${data.input.name}님의 사주팔자 자세한 보기를 요청합니다.

한자 금지 — 데이터에 한자가 있더라도 쉬운 한국어 비유로만 답변하세요.
(예: 辛 → "쇠의 기운", 亥 → "겨울 물의 기운", 壬午 → "큰 물과 강한 불", 甲 → "봄 나무 기운")

[사주 데이터]
${sajuSummary}

${evidenceBlock}

일간의 기운: ${dayStem} (이 글자를 한자로 쓰지 말고 기운의 특성으로 설명할 것)

각 섹션에서 반드시 위 실제 데이터를 근거로 사용하세요.
추상적인 일반론 금지 — 이 사람의 사주에서만 나오는 이야기를 하세요.

JSON만 반환:
{
  "sections": [
    {
      "title": "타고난 기질의 핵심",
      "content": "이 사람의 일간 기운이 가진 고유한 기질, 이 사주에서 그 기운의 강약과 의미를 5문장으로. 쉬운 비유 포함. 한자 금지."
    },
    {
      "title": "이 사주의 힘과 약점",
      "content": "오행 분포를 바탕으로 무엇이 이 사람의 힘이고 무엇이 독이 되는 기운인지 5문장. 쉬운 언어로. 한자 금지."
    },
    {
      "title": "지금 이 시기의 큰 흐름",
      "content": "현재 나이 기준 큰 운의 흐름과 이 시기가 이 사람에게 갖는 의미 5문장. 기회와 주의점 모두 포함. 한자 금지."
    },
    {
      "title": "타고난 재능과 직업의 방향",
      "content": "이 사주팔자가 드러내는 고유한 재능과 가장 잘 맞는 직업 방향 5문장. 구체적인 분야 제시. 한자 금지."
    },
    {
      "title": "청운의 당부",
      "content": "이 사람에게만 해당하는 가장 중요한 삶의 조언 4문장. 청운의 말투로, 분명하고 차분하게. 한자 금지."
    }
  ]
}`;

  const systemWithKnowledge = `${CHEONGWOON_PERSONA}\n\n${SAJU_DOMAIN_KNOWLEDGE}`;
  const text = await callAI(systemWithKnowledge, userPrompt, 8192);
  const parsed = parseJSON<{ sections: { title: string; content: string }[] }>(text, '청운 자세히');
  return { character: 'cheongwoon', sections: parsed.sections };
}

// ─── 태을 깊게 보기 ───────────────────────────────────────────────
export async function generateDeepTaeeul(data: SamsinData): Promise<DeepReport> {
  const ziweiSummary = formatZiweiSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 8);
  const mingPalace = data.ziwei.palaces['命宮'];
  const stars = mingPalace?.stars.map(s => s.name).join(', ') ?? '없음';

  const userPrompt = `${data.input.name}님의 자미두수 명반 자세한 보기를 요청합니다.

한자 금지 — 별 이름과 궁 이름은 한글 독음으로만 쓰세요. 한자 문자 자체는 출력하지 마세요.
(예: 紫微 → "자미", 天機 → "천기", 命宮 → "명궁", 財帛宮 → "재물 궁", 大限 → "큰 운의 흐름")

[자미두수 데이터]
${ziweiSummary}
오행의 흐름: ${data.ziwei.wuXingJu.name} ${data.ziwei.wuXingJu.number}국
음양: ${data.input.gender === 'M' ? '양남' : '음녀'}
명궁 주성: ${stars}

${evidenceBlock}

각 섹션에서 필요한 별 이름과 오행의 흐름을 쉽게 풀어 언급하세요.
추상적인 운명 선언보다 이 분에게만 해당하는 반복 패턴과 해석 범위를 말하세요.

JSON만 반환:
{
  "sections": [
    {
      "title": "나를 드러내는 방식",
      "content": "중심 자리의 ${stars} 흐름이 드러내는 이 분의 자기표현 방식 5문장. 쉬운 말. 한자 금지."
    },
    {
      "title": "돈과 일의 흐름",
      "content": "돈과 일 영역의 별 배치로 본 반복 패턴 5문장. 어려운 궁 이름은 쉬운 말로 풀어서. 한자 금지."
    },
    {
      "title": "관계에서 반복되는 패턴",
      "content": "관계 영역으로 본 연애·결혼·인연의 소통 패턴 5문장. 관계 결정을 지시하지 말고 자기성찰로 표현. 한자 금지."
    },
    {
      "title": "큰 운의 흐름과 지금 이 시기",
      "content": "현재 큰 흐름이 이 분의 역할과 선택 리듬에 어떻게 작용하는지 5문장. 사건 확정 금지. 한자 금지."
    },
    {
      "title": "태을의 당부",
      "content": "이 분께 필요한 가장 중요한 메시지 4문장. 정중하고 자연스러운 현대 한국어. 한자 금지."
    }
  ]
}`;

  const systemWithKnowledge = `${TAEEUL_PERSONA}\n\n${ZIWEI_DOMAIN_KNOWLEDGE}`;
  const text = await callAI(systemWithKnowledge, userPrompt, 8192);
  const parsed = parseJSON<{ sections: { title: string; content: string }[] }>(text, '태을 자세히');
  return { character: 'taeeul', sections: parsed.sections };
}

// ─── 루나 깊게 보기 ───────────────────────────────────────────────
export async function generateDeepLuna(data: SamsinData): Promise<DeepReport> {
  const natalSummary = formatNatalSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 8);
  const currentYear  = new Date().getFullYear();

  const sun  = data.natal.planets.find(p => p.id === 'Sun');
  const moon = data.natal.planets.find(p => p.id === 'Moon');
  const asc  = data.natal.angles?.asc;
  const venus = data.natal.planets.find(p => p.id === 'Venus');
  const mars  = data.natal.planets.find(p => p.id === 'Mars');

  const userPrompt = `${data.input.name}님의 출생 차트 자세한 보기를 요청합니다.

한자 금지 — 모든 내용을 쉬운 한국어와 별자리 이름(한글)으로만 작성하세요.

[출생 차트 데이터]
${natalSummary}
${venus ? `금성(Venus): ${venus.sign} ${Math.floor(venus.degreeInSign)}도` : ''}
${mars  ? `화성(Mars): ${mars.sign} ${Math.floor(mars.degreeInSign)}도`  : ''}

${evidenceBlock}

각 섹션에서 반드시 실제 별자리와 행성을 언급하세요 (${sun?.sign ?? ''} 태양, ${moon?.sign ?? ''} 달 등).
심리학적 언어로, 이 사람의 내면 지도를 그려주세요.

JSON만 반환:
{
  "sections": [
    {
      "title": "태양·달·어센던트가 만드는 자아",
      "content": "${sun?.sign ?? ''} 태양, ${moon?.sign ?? ''} 달, ${asc?.sign ?? ''} 어센던트의 상호작용 — 이 조합이 만드는 이 사람의 특유한 자아 구조 5문장."
    },
    {
      "title": "금성과 화성: 욕망과 에너지",
      "content": "금성(${venus?.sign ?? ''})과 화성(${mars?.sign ?? ''})으로 본 연애 방식, 끌리는 것들, 열정이 향하는 곳 5문장."
    },
    {
      "title": "목성과 토성: 성장과 시련의 축",
      "content": "어디서 풍요로워지고 어디서 단단해지는지, 이 사람에게 반복되는 성장의 패턴 5문장."
    },
    {
      "title": "${currentYear}년 행성이 보내는 신호",
      "content": "지금 이 시기 활성화되는 행성 에너지와 그것이 이 사람의 차트에 어떻게 작용하는지 5문장."
    },
    {
      "title": "루나의 당부",
      "content": "이 사람의 차트가 보여주는 가장 중요한 성장 방향과 조언 4문장. 루나의 따뜻하고 솔직한 목소리로."
    }
  ]
}`;

  const systemWithKnowledge = `${LUNA_PERSONA}\n\n${NATAL_DOMAIN_KNOWLEDGE}`;
  const text = await callAI(systemWithKnowledge, userPrompt, 8192);
  const parsed = parseJSON<{ sections: { title: string; content: string }[] }>(text, '루나 자세히');
  return { character: 'luna', sections: parsed.sections };
}

// ─── AI 대화 ────────────────────────────────────────────────────────
export async function chatWithSamsin(
  data: SamsinData,
  history: ChatMessage[],
  userMessage: string,
  reportContext?: ReportContext,
): Promise<ChatResponse> {
  const sajuCtx   = formatSajuSummary(data);
  const ziweiCtx  = formatZiweiSummary(data);
  const natalCtx  = formatNatalSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 10);
  const dayPillar = data.saju.pillars[1]?.pillar.ganzi ?? '';

  // 리포트 컨텍스트 블록 구성
  let reportBlock = '';
  if (reportContext) {
    const parts: string[] = [];
    if (reportContext.totalReport) {
      const t = reportContext.totalReport;
      parts.push(`[이 사람의 총운 리포트 요약]
핵심 인사이트: ${t.coreInsightHeadline} — ${t.coreInsightBody}
오늘 기억할 말: ${t.samsinMessage}
금전운 요약: ${t.moneyGraphSummary}
직업운 요약: ${t.careerGraphSummary}`);
    }
    if (reportContext.finalSynthesis) {
      const f = reportContext.finalSynthesis;
      parts.push(`[삼신 마지막 정리]
한 줄 정리: ${f.verdict}
합의 수준: ${f.consensusLevel} — ${f.consensusNote}
지금 해볼 것: ${f.nowAdvice}
생활 제안: ${f.prescription}
마무리 문장: ${f.seal}`);
    }
    if (reportContext.deepReports) {
      const d = reportContext.deepReports;
      if (d.cheongwoon) parts.push(`[청운 자세히] ${d.cheongwoon}`);
      if (d.taeeul) parts.push(`[태을 자세히] ${d.taeeul}`);
      if (d.luna) parts.push(`[루나 자세히] ${d.luna}`);
    }
    if (parts.length > 0) {
      reportBlock = `\n\n--- 이 사람에게 이미 전달한 리포트 (질문에 답할 때 이 내용을 근거로 사용하세요) ---\n${parts.join('\n\n')}\n---\n`;
    }
  }

  const system = `당신은 삼신사주 대화 시스템입니다. 사용자의 질문에 세 신이 각자의 목소리로 답합니다.

아래 도메인 지식 레퍼런스를 참조하여 데이터를 정확히 해석하세요:
${SAJU_DOMAIN_KNOWLEDGE}
${ZIWEI_DOMAIN_KNOWLEDGE}
${NATAL_DOMAIN_KNOWLEDGE}

${CROSS_SYSTEM_MAPPING}

${data.input.name}님 정보:
[사주] ${sajuCtx}
[자미두수] ${ziweiCtx}
[서양 점성술] ${natalCtx}
${evidenceBlock}
${reportBlock}
---

청운의 말투: 분명하고 간결한 현대 한국어. "~합니다". 사주 데이터 직접 언급.
태을의 말투: 정중하고 자연스러운 현대 한국어. 자미두수 별과 궁은 쉬운 생활 언어로 번역.
루나의 말투: 따뜻하고 심리학적. "~해요". 별자리와 행성을 내면 언어로 번역.

규칙:
- 각자 자신의 이론 관점에서만 답변
- 반드시 ${data.input.name}님의 실제 차트 데이터(일주 ${dayPillar}, 오행 분포, 명궁 별, 태양 별자리)를 근거로 사용
- 레퍼런스 테이블에서 해당 일간/주성/별자리를 찾아 구체적으로 해석. 일반론 금지
- 리포트에서 이미 전달한 내용(생활 제안, 마지막 정리 등)에 대한 질문이면 해당 내용을 정확히 인용
- 3~4문장, 핵심만
- 모호한 위로나 빈 말 금지`;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.');

  const res = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Samshin-Saju',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: system },
        ...messages,
        {
          role: 'user',
          content: `위 질문에 세 신이 각자의 목소리로 답하세요. JSON만 반환:
{
  "cheongwoon": "청운의 답변 — 사주 데이터 근거 포함, 분명한 어조, 3~4문장",
  "taeeul":     "태을의 답변 — 명반 근거 포함, 선계적 어조, 3~4문장",
  "luna":       "루나의 답변 — 별자리 근거 포함, 따뜻한 심리적 어조, 3~4문장"
}`,
        },
      ],
    }),
  });

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  return parseJSON<ChatResponse>(text, '대화');
}

// ─── 마지막 정리 ────────────────────────────────────────────
const VOICE_LABEL: Record<string, string> = {
  cheongwoon: '청운(사주)', taeeul: '태을(자미)', luna: '루나(서양)', balanced: '세 신 균형',
};

export async function generateFinalSynthesis(
  data: SamsinData,
  consensusMetrics?: ConsensusMetrics,
  basePrescription?: Prescription,
): Promise<FinalSynthesis> {
  const currentYear = new Date().getFullYear();
  const currentAge  = currentYear - data.input.year;
  const sajuSummary  = formatSajuSummary(data);
  const ziweiSummary = formatZiweiSummary(data);
  const natalSummary = formatNatalSummary(data);
  const evidenceBlock = structuredEvidenceBlock(data, 14);

  // 합의 메트릭 텍스트
  const metricsBlock = consensusMetrics
    ? `\n[합의 분석 결과]
합의 강도: ${consensusMetrics.alignmentScore}점/100
합의 수준: ${consensusMetrics.level} (unanimous=만장일치, majority=다수동의, conflict=격론)
주도적 견해: ${VOICE_LABEL[consensusMetrics.dominantVoice] ?? '균형'}
금전운 합의: ${consensusMetrics.money.alignmentScore}점, 직업운 합의: ${consensusMetrics.career.alignmentScore}점
※ 합의 수준에 따라 정리 톤을 조절하세요:
  - unanimous: 세 관점이 잘 맞는 흐름으로 선명하게 정리
  - majority: 다수 동의하되 반론 병기 (dissent 포함)
  - conflict: verdict에는 단정 대신 세 신의 다른 시선을 나란히 정리 (dissent 필수)\n`
    : '';

  // 처방 Rule 텍스트
  const prescriptionBlock = basePrescription
    ? `\n[생활 제안 규칙 — 아래 값은 오행 Rule에서 산출된 것이므로 절대 변경 금지]
추천 색: ${basePrescription.luckyColor.name} (${basePrescription.luckyColor.hex})
추천 방향: ${basePrescription.luckyDirection.name}
추천 숫자: ${basePrescription.luckyNumber.value}
기억할 말: ${basePrescription.talisman}
조심해 볼 것: ${basePrescription.avoidance}
※ 위 값은 그대로 사용하되, 문장을 세 신의 말투로 자연스럽게 윤색하세요.\n`
    : '';

  const system = `당신은 삼신사주의 청운·태을·루나 세 관점을 한자리에 모아 마지막 정리를 돕는 안내자입니다.

세 이론이 각자 다른 언어로 같은 방향을 가리킬 때, 그 교집합을 사용자가 이해하기 쉬운 말로 풀어줍니다.
지금 이 자리는 심사나 단정이 아니라, 계산된 신호를 바탕으로 한 자기성찰용 정리입니다.

아래 도메인 지식 레퍼런스를 참조하여 데이터를 정확히 해석하세요:
${SAJU_DOMAIN_KNOWLEDGE}
${ZIWEI_DOMAIN_KNOWLEDGE}
${NATAL_DOMAIN_KNOWLEDGE}

${CROSS_SYSTEM_MAPPING}
${metricsBlock}${prescriptionBlock}
절대 규칙:
1. 한자 사용 완전 금지. 모든 내용을 쉬운 한국어로만.
2. 일반론·공허한 위로 금지. 이 사람의 실제 데이터만 근거로.
3. "verdict"는 단정적 결론이 아니라, 이 사람의 핵심 흐름을 선명하고 부드럽게 요약해야 함.
4. 각 신의 마지막 목소리는 완전히 달라야 함 (청운: 분명함, 태을: 선계적, 루나: 따뜻함).
5. "seal"은 시적이되 위압적이지 않은 기억 문장.
6. consensusLevel과 consensusNote를 반드시 포함하세요.
7. prescription 필드에 생활 제안 Rule 값을 자연스러운 문장으로 포함하세요.
8. conflict 시 dissent 필드에 반대 의견을 가진 신의 주장을 포함하세요.`;

  const dissentField = consensusMetrics?.level === 'conflict'
    ? `,\n  "dissent": { "voice": "가장 다른 견해를 가진 신 (cheongwoon/taeeul/luna)", "argument": "그 신이 왜 다르게 보는지 2문장" }`
    : '';

  const userPrompt = `[사주팔자]
${sajuSummary}

[자미두수]
${ziweiSummary}

[서양 점성술]
${natalSummary}

${evidenceBlock}

${data.input.name}님, 현재 약 ${currentAge}세.

세 신이 이 모든 데이터를 함께 본 뒤 마지막 정리를 전합니다.
한자 금지. 쉬운 한국어 + 비유로만.

JSON만 반환:
{
  "verdict": "세 관점이 함께 가리키는 핵심 흐름 — 3문장. 단정적 정답이 아니라 사주·자미·별자리의 공통 신호를 쉬운 말로 정리. 한자 금지.",
  "consensusLevel": "${consensusMetrics?.level ?? 'majority'}",
  "consensusNote": "합의 상태를 자연스럽게 설명하는 한 문장 — 예: 세 신 모두 같은 방향을 가리킵니다 / 청운만 다른 관점입니다",
  "pillars": [
    {
      "icon": "이모지",
      "title": "첫 번째 흐름 — 15자 이내",
      "body": "이 기둥의 의미, 어디서 드러나고 어떻게 작동하는지 3문장. 세 이론이 모두 동의하는 내용. 한자 금지."
    },
    {
      "icon": "이모지",
      "title": "두 번째 흐름 — 15자 이내",
      "body": "3문장."
    },
    {
      "icon": "이모지",
      "title": "세 번째 흐름 — 15자 이내",
      "body": "3문장."
    }
  ],
  "nowAdvice": "지금 이 시기(${currentAge}세)에 가볍게 실천해 볼 제안 — 4문장. 세 관점이 함께 보는 지금의 과제. 구체적으로. 한자 금지.",
  "prescription": {
    "luckyColor": { "name": "${basePrescription?.luckyColor.name ?? '(rule값)'}", "hex": "${basePrescription?.luckyColor.hex ?? '#000'}", "reason": "왜 이 색인지 이 사람의 오행 기반으로 1문장" },
    "luckyDirection": { "name": "${basePrescription?.luckyDirection.name ?? '(rule값)'}", "reason": "왜 이 방향인지 1문장" },
    "luckyNumber": { "value": ${basePrescription?.luckyNumber.value ?? 0}, "reason": "왜 이 숫자인지 1문장" },
    "talisman": "${basePrescription?.talisman?.replace(/"/g, '\\"') ?? '기억할 말'}",
    "avoidance": "${basePrescription?.avoidance?.replace(/"/g, '\\"') ?? '조심해 볼 것'}"
  },
  "voices": {
    "cheongwoon": "청운의 마지막 한 마디 — '~합니다' 체. 사주 데이터 근거. 분명하게 핵심 하나만. 2문장. 한자 금지.",
    "taeeul":     "태을의 마지막 한 마디 — '~합니다' 체. 자미두수 관점을 쉽게. 2문장. 한자 금지.",
    "luna":       "루나의 마지막 한 마디 — '~해요' 따뜻하게. 별자리 심리 언어로. 2문장. 한자 금지."
  },
    "seal": "오늘 기억할 마무리 문장 — 한 문장 20자 이내. 시적이되 위압적이지 않게. 한자 금지."${dissentField}
}`;

  const text = await callAI(system, userPrompt, 8192);
  return parseJSON<FinalSynthesis>(text, '마지막 정리');
}

// ─── 궁합 ────────────────────────────────────────────────────────────
export async function generateCompatibility(
  dataA: SamsinData,
  dataB: SamsinData,
  relationship: 'friend' | 'romantic',
  includeDeep: boolean,
): Promise<CompatibilityReport> {
  const currentYear = new Date().getFullYear();
  const dayA = dataA.saju.pillars[1]?.pillar.ganzi ?? '';
  const dayB = dataB.saju.pillars[1]?.pillar.ganzi ?? '';

  const system = `당신은 삼신사주의 세 신이 합의한 목소리입니다. 두 사람의 사주·명반·차트를 종합해 궁합을 분석합니다.
반드시 두 사람의 실제 일주(${dataA.input.name}: ${dayA} / ${dataB.input.name}: ${dayB})와 오행 관계를 근거로 사용하세요.
막연한 긍정이나 일반론 금지. 이 두 사람만의 구체적인 관계 패턴을 분석하세요.
건강, 투자, 법률, 임신, 결혼/이별 확정, 사고 예측으로 확장하지 마세요.
궁합은 관계 결정의 보장이 아니라 소통 패턴을 비추는 엔터테인먼트와 자기성찰용 해석으로만 표현하세요.`;

  const deepSection = includeDeep ? `,
  "deep": {
    "emotion":    { "headline": "감정 연결 방식 핵심 15자 이내", "body": "두 사람의 감정 흐름과 내면 연결 방식 4문장. 구체적 데이터 근거." },
    "longterm":   { "headline": "함께하는 미래 패턴 15자 이내", "body": "장기적 관계 발전과 주의할 패턴 4문장." },
    "sokgungham": { "headline": "음양 에너지의 결 15자 이내",    "body": "두 사람의 음양 에너지와 신체적 궁합 4문장. 품위 있고 진지하게." },
    "bestTime":   "두 사람에게 가장 좋은 시기 — 구체적으로 한 문장"
  }` : '';

  const userPrompt = `[${dataA.input.name}]
${formatSajuSummary(dataA)}

[${dataB.input.name}]
${formatSajuSummary(dataB)}

관계 유형: ${relationship === 'friend' ? '친구·지인' : '연인·부부 또는 연인 가능성'}
분석 연도: ${currentYear}

${dayA}와 ${dayB}의 오행 관계를 출발점으로, 이 두 사람만의 인연 패턴을 분석하세요.

JSON만 반환:
{
  "ohaengRelation": "두 일주의 오행 관계 — 구체적으로 (예: 庚金이 甲木을 극하는 구조, 서로를 자극하는 인연)",
  "summary": "이 궁합의 핵심을 꿰뚫는 한 문장 20자 이내",
  "light": {
    "gijil":     { "headline": "기질 궁합 핵심 15자 이내", "body": "두 사람의 기질이 만나는 방식 4문장. 실제 오행·일주 근거." },
    "sothrough": { "headline": "소통 방식 핵심 15자 이내", "body": "어떻게 소통하고 어디서 어긋나는지 4문장." },
    "strength":  { "headline": "이 관계의 가장 큰 자원 15자 이내", "body": "강점과 함께 반드시 주의할 긴장 포함 4문장." },
    "samsinMessage": "세 신이 이 두 사람에게만 전하는 말 — 기억에 남게 20자 이내"
  }${deepSection}
}`;

  const text = await callAI(system, userPrompt, 8192);
  return parseJSON<CompatibilityReport>(text, '궁합');
}
