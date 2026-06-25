import type { SamsinData } from '../saju';
import {
  createRuleBasedRouteReceipt,
  type SamsinModelRole,
  type SamsinRouteReceipt,
} from '../llm/samsin-model-router';
import { extractSamsinEvidence } from './bundle';
import type {
  DivinationSystem,
  EvidenceDomain,
  EvidencePolarity,
  InterpretationEvidence,
} from './evidence';
import { containsForbiddenPhrase } from './safety';

export const SYSTEM_LENSES = {
  saju: {
    label: '현실 운영 렌즈',
    role: '실행력, 자원 배분, 돈의 흐름, 역할 압박, 반복 리스크를 본다.',
    forbiddenScope: '심리 욕망이나 서구 점성술식 자아 표현으로 해석하지 않는다.',
  },
  ziwei: {
    label: '인생 무대 렌즈',
    role: '삶의 무대, 궁위별 힘의 배치, 시기별 전환과 사회적 자리 변화를 본다.',
    forbiddenScope: '사주 십성이나 네이탈 하우스 언어로 바꾸지 않는다.',
  },
  natal: {
    label: '심리 동기 렌즈',
    role: '욕망, 표현 방식, 관계 패턴, 사회적 이미지, 내적 긴장을 본다.',
    forbiddenScope: '사주식 재성/관성/비겁 판단으로 해석하지 않는다.',
  },
} as const;

export type DecisionClaimAxis =
  | 'job_search_fit'
  | 'business_model_focus'
  | 'cashflow_risk'
  | 'contract_boundary'
  | 'public_authority'
  | 'asset_base'
  | 'energy_management'
  | 'role_pressure'
  | 'visibility_strategy'
  | 'collaboration_risk'
  | 'income_model'
  | 'decision_timing'
  | 'relationship_pattern'
  | 'execution_style'
  | 'stability_need'
  | 'expansion_timing';

export type DecisionDomain =
  | 'career'
  | 'money'
  | 'relationship'
  | 'timing'
  | 'identity'
  | 'energy'
  | 'asset';

export interface EvidenceRef {
  evidenceId: string;
  sourceSystem: DivinationSystem;
  sourcePath: string;
  basis: string[];
  caveat?: string;
}

export interface NativeClaim {
  id: string;
  system: DivinationSystem;
  title: string;
  statement: string;
  sourceEvidenceIds: string[];
  basis: EvidenceRef[];
  confidence: number;
  nativeTerms: string[];
  caveat?: string;
}

export interface NativeSystemReading {
  role: Extract<SamsinModelRole, 'saju_native' | 'ziwei_native' | 'natal_native'>;
  system: DivinationSystem;
  lensTitle: string;
  lensRole: string;
  forbiddenScope: string;
  nativeSummary: string;
  personPortrait: string;
  keySymbols: string[];
  coreClaims: NativeClaim[];
  caveats: string[];
  routeReceipt: SamsinRouteReceipt;
}

export interface Claim {
  id: string;
  system: DivinationSystem;
  sourceNativeClaimId: string;
  axis: DecisionClaimAxis;
  domain: DecisionDomain;
  statement: string;
  polarity: 'supportive' | 'caution' | 'mixed' | 'neutral';
  strength: 'low' | 'medium' | 'high';
  confidence: number;
  timeframe?: {
    type:
      | 'now'
      | '3_months'
      | '6_12_months'
      | 'year'
      | 'multi_year'
      | 'life_pattern';
    label: string;
    start?: string;
    end?: string;
  };
  evidence: EvidenceRef[];
  interpretation: string;
  caveat?: string;
}

export interface Advice {
  id: string;
  priority: 'urgent' | 'important' | 'optional';
  action: string;
  reason: string;
  basedOnClaims: string[];
  avoid?: string;
  timeframe: 'now' | '3_months' | '6_12_months';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SystemReading {
  system: DivinationSystem;
  lens: typeof SYSTEM_LENSES[DivinationSystem];
  coreClaims: Claim[];
  currentSignals: Claim[];
  careerSignals: Claim[];
  moneySignals: Claim[];
  relationshipSignals: Claim[];
  timingSignals: Claim[];
  risks: Claim[];
  caveats: string[];
}

export interface NormalizedClaim {
  id: string;
  sourceClaimId: string;
  sourceNativeClaimId: string;
  system: DivinationSystem;
  axis: DecisionClaimAxis;
  domain: DecisionDomain;
  normalizedStatement: string;
  normalizedMeaning: string;
  polarity: Claim['polarity'];
  confidence: number;
  strength: Claim['strength'];
  timeframe?: Claim['timeframe'];
}

export type DivergenceType =
  | 'lens_difference'
  | 'timing_difference'
  | 'risk_condition'
  | 'priority_conflict'
  | 'scope_difference';

export interface DivergenceResolution {
  type: DivergenceType;
  explanation: string;
  translatedAdvice: string;
  doNow?: string;
  delay?: string;
  avoid?: string;
}

export interface ComparedClaim {
  axis: DecisionClaimAxis;
  summary: string;
  systems: DivinationSystem[];
  claimIds: string[];
  agreementLevel: 'single' | 'two_systems' | 'all_three';
  confidence: number;
  situationRelevance: 'low' | 'medium' | 'high';
  decisionImpact: 'low' | 'medium' | 'high';
  finalWeight: 'reference' | 'important' | 'core_strategy';
  resolution?: DivergenceResolution;
}

export interface ComparisonMatrix {
  convergence: ComparedClaim[];
  divergence: ComparedClaim[];
  timingDifferences: ComparedClaim[];
  missingSignals: ComparedClaim[];
}

export interface SituationContext {
  mode: 'job_search' | 'business' | 'both';
  cashflowPressure: 'low' | 'medium' | 'high';
  runwayMonths?: number;
  projectStage: 'idea' | 'prototype' | 'paid_test' | 'growth';
  mainQuestion: string;
  currentConstraints: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
  timeAvailablePerWeek?: number;
  incomeNeed?: 'urgent' | 'soon' | 'stable';
  decisionDeadline?: string;
  preferredOutcome?: string;
}

export interface SituationDiagnosis {
  pressureLevel: 'low' | 'medium' | 'high';
  primaryConstraint: string;
  opportunityWindow?: string;
  recommendedPosture: 'stabilize' | 'test_small' | 'prepare' | 'expand' | 'delay';
  rationale: string;
}

export interface TrinityAnalysis {
  meta: {
    generatedAt: string;
    version: string;
    calculationId: string;
  };
  portrait: {
    saju: NativeSystemReading;
    ziwei: NativeSystemReading;
    natal: NativeSystemReading;
  };
  readings: {
    saju: SystemReading;
    ziwei: SystemReading;
    natal: SystemReading;
  };
  normalizedClaims: NormalizedClaim[];
  comparison: ComparisonMatrix;
  situation: {
    input: SituationContext;
    diagnosis: SituationDiagnosis;
  };
  actionPlan: {
    now: Advice[];
    next3Months: Advice[];
    next6To12Months: Advice[];
    avoid: Advice[];
  };
  userFacingSummary: {
    headline: string;
    shortSummary: string;
    mainStrategy: string;
    caution: string;
  };
  audit: {
    passed: boolean;
    warnings: string[];
    blockedClaims: string[];
  };
  modelRouting: {
    mode: 'rule_fallback' | 'openrouter';
    receipts: SamsinRouteReceipt[];
  };
}

export interface TrinityBuildOptions {
  concern?: string;
  situation?: Partial<SituationContext>;
  now?: Date;
}

const VERSION = 'TRINITY_DECISION_V1';
const HANJA_PATTERN = /[\u3400-\u9fff]/;
const DECISION_FORBIDDEN_PATTERNS = [
  /반드시\s*성공/,
  /무조건\s*성공/,
  /확실히\s*성공/,
  /돈을\s*번다/,
  /돈을\s*벌게\s*된다/,
  /병이\s*생긴다/,
  /투자하면\s*좋다/,
  /(?:헤어진다|헤어져야\s*한다|이별한다)/,
  /무조건\s*이직/,
  /반드시\s*이직/,
];

const DOMAIN_MAP: Record<EvidenceDomain, DecisionDomain> = {
  temperament: 'identity',
  money_pattern: 'money',
  career: 'career',
  relationship_pattern: 'relationship',
  timing: 'timing',
  risk_pattern: 'energy',
  growth: 'identity',
  wellbeing_reflection: 'energy',
};

const AXIS_MEANING: Record<DecisionClaimAxis, string> = {
  job_search_fit: '구직이나 조직 선택에서 맞는 조건을 따지는 축',
  business_model_focus: '무엇을 어떤 형태로 팔지 좁히는 축',
  cashflow_risk: '돈이 들어와도 새거나 압박이 커질 수 있는 축',
  contract_boundary: '계약, 역할, 책임 범위를 분리해야 하는 축',
  public_authority: '공개 역할, 신뢰, 전문성을 쌓는 축',
  asset_base: '집, 기반, 장기 구조, 자산 안정성을 다지는 축',
  energy_management: '체력, 회복, 실행 지속성을 관리하는 축',
  role_pressure: '맡은 책임과 역할 압박을 조정하는 축',
  visibility_strategy: '노출과 브랜드를 어떤 순서로 키울지 정하는 축',
  collaboration_risk: '협업과 인간관계에서 비용이 커지는 축',
  income_model: '수입원이 만들어지고 반복되는 방식을 보는 축',
  decision_timing: '지금 할 일과 미룰 일을 구분하는 축',
  relationship_pattern: '관계에서 반복되는 반응과 거리감을 보는 축',
  execution_style: '실행 방식과 판단 습관을 보는 축',
  stability_need: '안정 기반과 반복 루틴이 필요한 축',
  expansion_timing: '확장과 공개 무대가 열리는 시기를 보는 축',
};

const NATIVE_ROLES: Record<DivinationSystem, NativeSystemReading['role']> = {
  saju: 'saju_native',
  ziwei: 'ziwei_native',
  natal: 'natal_native',
};

const NATIVE_TERMS: Record<DivinationSystem, string[]> = {
  saju: ['일간', '월지', '오행', '십성', '대운', '재성', '관성', '비겁', '식상'],
  ziwei: ['명궁', '재물 궁', '관록 궁', '전택 궁', '대한', '유년', '별 배치'],
  natal: ['태양', '달', 'ASC', 'MC', '하우스', '행성', '각'],
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}

function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/[一-龯]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function evidenceRefFromEvidence(evidence: InterpretationEvidence): EvidenceRef {
  return {
    evidenceId: evidence.id,
    sourceSystem: evidence.system,
    sourcePath: evidence.featureTrace.featurePath,
    basis: evidence.userFacing.basis.map(cleanText).filter(Boolean),
    caveat: cleanText(evidence.userFacing.caveat),
  };
}

function confidenceNumber(evidence: InterpretationEvidence): number {
  const base = evidence.confidence === 'high' ? 0.82 : evidence.confidence === 'medium' ? 0.64 : 0.42;
  return clamp(base + (evidence.weight - 60) / 250);
}

function strengthFromWeight(weight: number): Claim['strength'] {
  if (weight >= 74) return 'high';
  if (weight >= 55) return 'medium';
  return 'low';
}

function polarityFromEvidence(polarity: EvidencePolarity): Claim['polarity'] {
  if (polarity === 'challenging') return 'caution';
  return polarity;
}

function mapAxis(evidence: InterpretationEvidence): DecisionClaimAxis {
  if (evidence.system === 'ziwei' && evidence.domain === 'career') return 'public_authority';
  if (evidence.system === 'ziwei' && evidence.domain === 'money_pattern') return 'asset_base';
  if (evidence.system === 'natal' && evidence.domain === 'career') return 'visibility_strategy';
  if (evidence.system === 'saju' && evidence.domain === 'career') {
    return String(evidence.claimAxis) === 'career_stability' ? 'role_pressure' : 'business_model_focus';
  }

  switch (String(evidence.claimAxis)) {
    case 'career_independence':
      return 'business_model_focus';
    case 'career_stability':
      return 'job_search_fit';
    case 'money_volatility':
      return 'cashflow_risk';
    case 'money_accumulation':
      return 'income_model';
    case 'relationship_autonomy':
      return 'contract_boundary';
    case 'relationship_commitment':
      return 'relationship_pattern';
    case 'public_visibility':
      return 'public_authority';
    case 'learning_style':
      return 'execution_style';
    case 'timing_change_pressure':
      return 'decision_timing';
    case 'emotional_recovery':
      return 'energy_management';
    case 'self_expression':
      return 'execution_style';
    default:
      return 'execution_style';
  }
}

function statementFor(axis: DecisionClaimAxis, polarity: Claim['polarity']): string {
  const caution = polarity === 'caution' || polarity === 'mixed';
  const statements: Record<DecisionClaimAxis, [string, string]> = {
    job_search_fit: ['구직이나 조직 선택에서는 역할 조건과 지속 가능성을 먼저 비교해야 한다.', '구직 선택은 가능하지만 조건 검증 없이 움직이면 같은 부담이 반복될 수 있다.'],
    business_model_focus: ['스스로 판을 짜는 일이나 좁은 상품 구조가 맞는 신호가 있다.', '사업 모델은 넓히기보다 팔 수 있는 단위로 좁혀야 한다.'],
    cashflow_risk: ['현금흐름과 지출 기준을 먼저 정리해야 한다.', '돈의 기회보다 새는 구조와 분배 비용을 먼저 관리해야 한다.'],
    contract_boundary: ['계약, 역할, 책임 범위를 문서로 나누는 것이 중요하다.', '관계와 일이 섞이면 책임과 돈의 경계가 흐려질 수 있다.'],
    public_authority: ['공개 역할, 신뢰, 전문성을 쌓는 방향이 중요하다.', '공개 역할은 좋지만 책임과 평판 부담도 함께 커질 수 있다.'],
    asset_base: ['집, 기반, 장기 구조, 자산 안정성을 다지는 흐름이 있다.', '기반을 만들 수 있지만 고정비와 장기 부담을 함께 점검해야 한다.'],
    energy_management: ['체력과 회복 루틴이 의사결정의 전제가 된다.', '과로와 소진을 관리하지 않으면 좋은 기회도 비용이 커질 수 있다.'],
    role_pressure: ['맡은 역할과 책임이 커지는 흐름을 현실적으로 다뤄야 한다.', '역할 압박이 커질 수 있으니 책임 범위를 먼저 제한해야 한다.'],
    visibility_strategy: ['노출, 브랜드, 커뮤니티를 키우는 방향성이 있다.', '노출을 키우기 전 수익화와 운영 구조가 먼저 필요하다.'],
    collaboration_risk: ['협업은 기회가 되지만 사람과 역할을 선별해야 한다.', '협업이 돈, 시간, 감정 비용을 키울 수 있다.'],
    income_model: ['반복 가능한 수입 구조를 만들 여지가 있다.', '수입 기회가 있어도 반복성과 정산 구조를 확인해야 한다.'],
    decision_timing: ['지금은 선택의 순서를 정리해야 하는 시기다.', '지금 당장 결론보다 조건과 순서 정리가 먼저다.'],
    relationship_pattern: ['관계에서는 반복되는 반응과 거리감을 관찰해야 한다.', '관계 결론보다 소통 방식과 기대치 조정이 먼저다.'],
    execution_style: ['판단과 실행 방식에 반복되는 강점이 있다.', '익숙한 실행 방식이 고집이나 과속으로 바뀌지 않게 점검해야 한다.'],
    stability_need: ['안정 기반과 반복 루틴이 성과의 바탕이 된다.', '안정 장치 없이 확장하면 부담이 커질 수 있다.'],
    expansion_timing: ['확장과 공개 무대는 시기를 보고 준비할 필요가 있다.', '확장 신호가 있어도 지금 당장 크게 벌리는 것은 조건부로 봐야 한다.'],
  };
  return statements[axis][caution ? 1 : 0];
}

function timeframeFor(evidence: InterpretationEvidence): Claim['timeframe'] {
  if (evidence.domain === 'timing') {
    return { type: 'year', label: '현재 기준연도' };
  }
  if (String(evidence.claimAxis) === 'timing_change_pressure') {
    return { type: 'now', label: '현재 선택 압력' };
  }
  return { type: 'life_pattern', label: '반복 패턴' };
}

function nativeStatementFor(evidence: InterpretationEvidence): string {
  if (evidence.system === 'saju') {
    if (evidence.domain === 'money_pattern') {
      return '재성, 비겁, 식상 흐름에서 돈의 유입보다 분배와 지출 경계가 먼저 눈에 띈다.';
    }
    if (evidence.domain === 'career') {
      return '월지와 십성 구조에서 역할을 넓히는 힘과 책임을 가르는 힘이 함께 보인다.';
    }
    if (evidence.domain === 'timing') {
      return '대운은 사건 확정보다 장기 선택 압력이 올라오는 배경으로 읽힌다.';
    }
    if (evidence.domain === 'risk_pattern' || evidence.domain === 'wellbeing_reflection') {
      return '오행과 십성의 균형에서 무리한 실행보다 회복 리듬이 필요한 구조가 보인다.';
    }
    return '일간과 월지 흐름에서 일을 처리할 때 현실 기준을 먼저 세우는 구조가 보인다.';
  }

  if (evidence.system === 'ziwei') {
    if (evidence.domain === 'career') {
      return '관록 궁의 별 배치가 맡는 자리와 책임의 안정 신호를 보강한다.';
    }
    if (evidence.domain === 'money_pattern') {
      return '재물 궁과 전택 궁의 흐름은 돈 자체보다 기반과 자리 관리의 문제로 읽힌다.';
    }
    if (evidence.domain === 'timing') {
      return '대한과 유년은 지금의 무대가 어디로 옮겨지는지 보는 보조 신호다.';
    }
    if (evidence.domain === 'relationship_pattern') {
      return '관계 궁위의 별 배치는 관계 결론보다 거리감과 몰입 방식의 패턴을 보여준다.';
    }
    return '명궁과 별 배치에서 이 사람이 어느 자리에서 힘을 얻는지 먼저 드러난다.';
  }

  if (evidence.domain === 'career') {
    return 'MC와 일 관련 하우스는 사회적 이미지와 드러나는 방식에 힘이 실리는 신호다.';
  }
  if (evidence.domain === 'money_pattern') {
    return '금성, 목성, 토성 흐름은 자원을 다루는 습관과 안정감의 리듬을 보여준다.';
  }
  if (evidence.domain === 'risk_pattern' || evidence.domain === 'wellbeing_reflection') {
    return '달과 행성의 각은 감정 반응과 추진력이 부딪히는 반복 긴장을 만든다.';
  }
  if (evidence.domain === 'relationship_pattern') {
    return '달과 금성의 리듬은 가까운 관계에서 표현 방식과 기대가 엇갈리는 지점을 보여준다.';
  }
  return '태양과 달, 행성 배치는 자기 표현과 감정 리듬이 반복되는 방식을 보여준다.';
}

function nativePortraitFor(system: DivinationSystem, claims: NativeClaim[]): string {
  const domains = new Set(claims.flatMap(claim => claim.basis.map(ref => ref.sourcePath)));
  if (system === 'saju') {
    return domains.size > 0
      ? '현실 운영 구조에서는 돈, 역할, 책임의 경계가 성과의 지속성과 연결되는 사람으로 읽힌다.'
      : '현실 운영 구조에서는 강한 단정 대신 기본 재료를 보수적으로 읽는다.';
  }
  if (system === 'ziwei') {
    return domains.size > 0
      ? '삶의 자리에서는 맡는 역할의 이름과 무대가 함께 변할 때 힘이 커지는 사람으로 읽힌다.'
      : '삶의 자리에서는 강한 단정 대신 궁위 신호를 보수적으로 읽는다.';
  }
  return domains.size > 0
    ? '내적 리듬에서는 감정 반응과 사회적 표현 욕구가 함께 움직이는 사람으로 읽힌다.'
    : '내적 리듬에서는 강한 단정 대신 행성 신호를 보수적으로 읽는다.';
}

function nativeSummaryFor(system: DivinationSystem, claims: NativeClaim[]): string {
  const top = claims[0];
  if (!top) return '강한 단독 신호가 부족해 보수적으로 본다.';
  if (system === 'saju') return '사주는 현실 기준, 돈의 흐름, 책임 경계가 어디서 흔들리는지 먼저 본다.';
  if (system === 'ziwei') return '자미두수는 명궁과 관록 궁, 대한 흐름으로 맡는 자리의 변화를 먼저 본다.';
  return '서양점성은 태양, 달, MC와 하우스로 욕망과 압박의 리듬을 먼저 본다.';
}

function keySymbolsFor(system: DivinationSystem, evidence: InterpretationEvidence[]): string[] {
  const terms = NATIVE_TERMS[system];
  const domainTerms = evidence
    .slice(0, 4)
    .map(item => cleanText(item.title))
    .filter(Boolean);
  return uniq([...terms.slice(0, 4), ...domainTerms]).slice(0, 6);
}

function nativeClaimFromEvidence(evidence: InterpretationEvidence): NativeClaim {
  const ref = evidenceRefFromEvidence(evidence);
  return {
    id: `native.${evidence.id}`,
    system: evidence.system,
    title: cleanText(evidence.title),
    statement: nativeStatementFor(evidence),
    sourceEvidenceIds: [evidence.id],
    basis: [ref],
    confidence: confidenceNumber(evidence),
    nativeTerms: NATIVE_TERMS[evidence.system].slice(0, 5),
    caveat: ref.caveat,
  };
}

function blankNativeReading(system: DivinationSystem): NativeSystemReading {
  return {
    role: NATIVE_ROLES[system],
    system,
    lensTitle: SYSTEM_LENSES[system].label,
    lensRole: SYSTEM_LENSES[system].role,
    forbiddenScope: SYSTEM_LENSES[system].forbiddenScope,
    nativeSummary: '강한 단독 신호가 부족해 보수적으로 본다.',
    personPortrait: '강한 단정 대신 확인 가능한 근거만 읽는다.',
    keySymbols: NATIVE_TERMS[system].slice(0, 4),
    coreClaims: [],
    caveats: [],
    routeReceipt: createRuleBasedRouteReceipt(NATIVE_ROLES[system], `${NATIVE_ROLES[system]}Reading`),
  };
}

function buildNativeReadings(evidence: InterpretationEvidence[]): TrinityAnalysis['portrait'] {
  const grouped: Record<DivinationSystem, InterpretationEvidence[]> = {
    saju: [],
    ziwei: [],
    natal: [],
  };
  for (const item of evidence) grouped[item.system].push(item);

  const build = (system: DivinationSystem): NativeSystemReading => {
    const claims = grouped[system]
      .map(nativeClaimFromEvidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);
    return {
      ...blankNativeReading(system),
      nativeSummary: nativeSummaryFor(system, claims),
      personPortrait: nativePortraitFor(system, claims),
      keySymbols: keySymbolsFor(system, grouped[system]),
      coreClaims: claims,
      caveats: uniq(claims.map(claim => claim.caveat).filter(isNonEmptyString)).slice(0, 4),
    };
  };

  return {
    saju: build('saju'),
    ziwei: build('ziwei'),
    natal: build('natal'),
  };
}

function nativeClaimIdForEvidence(portrait: TrinityAnalysis['portrait'], evidenceId: string): string {
  for (const reading of Object.values(portrait)) {
    const found = reading.coreClaims.find(claim => claim.sourceEvidenceIds.includes(evidenceId));
    if (found) return found.id;
  }
  return `native.${evidenceId}`;
}

function claimFromEvidence(evidence: InterpretationEvidence, sourceNativeClaimId: string): Claim {
  const axis = mapAxis(evidence);
  const polarity = polarityFromEvidence(evidence.polarity);
  return {
    id: `decision.claim.${evidence.id}`,
    system: evidence.system,
    sourceNativeClaimId,
    axis,
    domain: DOMAIN_MAP[evidence.domain],
    statement: statementFor(axis, polarity),
    polarity,
    strength: strengthFromWeight(evidence.weight),
    confidence: confidenceNumber(evidence),
    timeframe: timeframeFor(evidence),
    evidence: [evidenceRefFromEvidence(evidence)],
    interpretation: cleanText(evidence.userFacing.adviceHint || evidence.claim || evidence.title),
    caveat: cleanText(evidence.userFacing.caveat),
  };
}

function blankReading(system: DivinationSystem): SystemReading {
  return {
    system,
    lens: SYSTEM_LENSES[system],
    coreClaims: [],
    currentSignals: [],
    careerSignals: [],
    moneySignals: [],
    relationshipSignals: [],
    timingSignals: [],
    risks: [],
    caveats: [],
  };
}

function buildSystemReadings(
  evidence: InterpretationEvidence[],
  portrait: TrinityAnalysis['portrait'],
): TrinityAnalysis['readings'] {
  const readings = {
    saju: blankReading('saju'),
    ziwei: blankReading('ziwei'),
    natal: blankReading('natal'),
  };

  for (const item of evidence) {
    const claim = claimFromEvidence(item, nativeClaimIdForEvidence(portrait, item.id));
    const reading = readings[item.system];
    reading.coreClaims.push(claim);
    if (claim.timeframe?.type === 'now' || claim.domain === 'timing') reading.currentSignals.push(claim);
    if (claim.domain === 'career') reading.careerSignals.push(claim);
    if (claim.domain === 'money' || claim.domain === 'asset') reading.moneySignals.push(claim);
    if (claim.domain === 'relationship') reading.relationshipSignals.push(claim);
    if (claim.domain === 'timing') reading.timingSignals.push(claim);
    if (claim.polarity === 'caution' || claim.polarity === 'mixed' || claim.domain === 'energy') reading.risks.push(claim);
    if (claim.caveat) reading.caveats.push(claim.caveat);
  }

  for (const reading of Object.values(readings)) {
    reading.coreClaims.sort((a, b) => b.confidence - a.confidence);
    reading.caveats = uniq(reading.caveats).slice(0, 4);
  }

  return readings;
}

function normalizeClaims(readings: TrinityAnalysis['readings']): NormalizedClaim[] {
  return Object.values(readings).flatMap(reading =>
    reading.coreClaims.map(claim => ({
      id: `decision.normalized.${claim.id}`,
      sourceClaimId: claim.id,
      sourceNativeClaimId: claim.sourceNativeClaimId,
      system: claim.system,
      axis: claim.axis,
      domain: claim.domain,
      normalizedStatement: claim.statement,
      normalizedMeaning: AXIS_MEANING[claim.axis],
      polarity: claim.polarity,
      confidence: claim.confidence,
      strength: claim.strength,
      timeframe: claim.timeframe,
    })),
  );
}

function buildDefaultSituationContext(concern?: string): SituationContext {
  switch (concern) {
    case 'money_leak':
      return {
        mode: 'both',
        cashflowPressure: 'high',
        projectStage: 'paid_test',
        mainQuestion: '돈이 남지 않는 구조를 어떻게 조정할지',
        currentConstraints: ['지출 기준이 흐려질 수 있음'],
        incomeNeed: 'soon',
        riskTolerance: 'low',
      };
    case 'income_anxiety':
      return {
        mode: 'business',
        cashflowPressure: 'high',
        projectStage: 'paid_test',
        mainQuestion: '불규칙한 수입을 어떻게 안정화할지',
        currentConstraints: ['입금일과 마감일이 어긋날 수 있음'],
        incomeNeed: 'urgent',
        riskTolerance: 'low',
      };
    case 'career_timing':
      return {
        mode: 'job_search',
        cashflowPressure: 'medium',
        projectStage: 'prototype',
        mainQuestion: '이직이나 퇴사 판단 전에 어떤 조건을 봐야 할지',
        currentConstraints: ['역할 조건 확인 필요'],
        incomeNeed: 'soon',
        riskTolerance: 'medium',
      };
    case 'work_overload':
    case 'work_drift':
      return {
        mode: 'job_search',
        cashflowPressure: 'medium',
        projectStage: 'prototype',
        mainQuestion: '현재 역할 압박을 어떻게 조정할지',
        currentConstraints: ['책임 범위가 커질 수 있음'],
        incomeNeed: 'stable',
        riskTolerance: 'medium',
      };
    case 'next_3_months':
      return {
        mode: 'both',
        cashflowPressure: 'medium',
        projectStage: 'prototype',
        mainQuestion: '앞으로 3개월 동안 무엇을 우선할지',
        currentConstraints: ['선택 순서 정리 필요'],
        incomeNeed: 'soon',
        riskTolerance: 'medium',
      };
    default:
      return {
        mode: 'both',
        cashflowPressure: 'medium',
        projectStage: 'prototype',
        mainQuestion: '현재 선택을 어떤 순서로 정리할지',
        currentConstraints: [],
        incomeNeed: 'soon',
        riskTolerance: 'medium',
      };
  }
}

function normalizeSituation(concern: string | undefined, partial?: Partial<SituationContext>): SituationContext {
  const base = buildDefaultSituationContext(concern);
  return {
    ...base,
    ...partial,
    currentConstraints: partial?.currentConstraints ?? base.currentConstraints,
    mainQuestion: partial?.mainQuestion || base.mainQuestion,
    projectStage: partial?.projectStage ?? base.projectStage,
    mode: partial?.mode ?? base.mode,
    cashflowPressure: partial?.cashflowPressure ?? base.cashflowPressure,
  };
}

function systemsFor(items: NormalizedClaim[]): DivinationSystem[] {
  return uniq(items.map(item => item.system));
}

function agreementLevel(count: number): ComparedClaim['agreementLevel'] {
  if (count >= 3) return 'all_three';
  if (count === 2) return 'two_systems';
  return 'single';
}

function situationRelevance(axis: DecisionClaimAxis, situation: SituationContext): ComparedClaim['situationRelevance'] {
  if (['cashflow_risk', 'income_model'].includes(axis) && (situation.cashflowPressure === 'high' || situation.incomeNeed === 'urgent')) return 'high';
  if (['job_search_fit', 'role_pressure'].includes(axis) && situation.mode === 'job_search') return 'high';
  if (['business_model_focus', 'visibility_strategy', 'public_authority'].includes(axis) && situation.mode === 'business') return 'high';
  if (axis === 'decision_timing' && situation.decisionDeadline) return 'high';
  if (axis === 'energy_management' && situation.timeAvailablePerWeek !== undefined && situation.timeAvailablePerWeek <= 20) return 'high';
  if (situation.mode === 'both') return 'medium';
  return 'medium';
}

function decisionImpact(axis: DecisionClaimAxis): ComparedClaim['decisionImpact'] {
  if (['cashflow_risk', 'contract_boundary', 'collaboration_risk', 'decision_timing', 'energy_management'].includes(axis)) return 'high';
  if (['public_authority', 'business_model_focus', 'income_model', 'asset_base', 'role_pressure'].includes(axis)) return 'medium';
  return 'low';
}

function finalWeight(
  level: ComparedClaim['agreementLevel'],
  confidence: number,
  relevance: ComparedClaim['situationRelevance'],
  impact: ComparedClaim['decisionImpact'],
): ComparedClaim['finalWeight'] {
  if (level === 'single') return 'reference';
  const score =
    (level === 'all_three' ? 3 : 2) +
    (confidence >= 0.72 ? 2 : confidence >= 0.58 ? 1 : 0) +
    (relevance === 'high' ? 2 : relevance === 'medium' ? 1 : 0) +
    (impact === 'high' ? 2 : impact === 'medium' ? 1 : 0);
  if (score >= 7) return 'core_strategy';
  if (score >= 5) return 'important';
  return 'reference';
}

function hasPolarityConflict(items: NormalizedClaim[]): boolean {
  const polarities = new Set(items.map(item => item.polarity));
  return polarities.has('supportive') && (polarities.has('caution') || polarities.has('mixed'));
}

function comparedSummary(axis: DecisionClaimAxis, items: NormalizedClaim[], level: ComparedClaim['agreementLevel']): string {
  const prefix = level === 'all_three'
    ? '세 체계가 모두'
    : level === 'two_systems'
      ? '두 체계가'
      : '한 체계가';
  return `${prefix} ${AXIS_MEANING[axis]}을 말한다.`;
}

function buildComparedClaim(axis: DecisionClaimAxis, items: NormalizedClaim[], situation: SituationContext): ComparedClaim {
  const systems = systemsFor(items);
  const confidence = clamp(items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(items.length, 1));
  const level = agreementLevel(systems.length);
  const relevance = situationRelevance(axis, situation);
  const impact = decisionImpact(axis);
  return {
    axis,
    summary: comparedSummary(axis, items, level),
    systems,
    claimIds: items.map(item => item.sourceClaimId),
    agreementLevel: level,
    confidence: Math.round(confidence * 100) / 100,
    situationRelevance: relevance,
    decisionImpact: impact,
    finalWeight: finalWeight(level, confidence, relevance, impact),
  };
}

function resolveDivergence(axis: DecisionClaimAxis): DivergenceResolution {
  if (axis === 'decision_timing' || axis === 'expansion_timing') {
    return {
      type: 'timing_difference',
      explanation: '체계들이 같은 방향을 보더라도 지금 움직일 일과 나중에 키울 일이 다르게 잡힌다.',
      translatedAdvice: '지금은 조건을 정리하고, 확장은 검증 가능한 작은 단위로 늦춰 잡는 편이 안전하다.',
      doNow: '조건, 비용, 역할 범위를 먼저 적는다.',
      delay: '큰 확장과 장기 약속은 검증 뒤로 미룬다.',
    };
  }
  return {
    type: 'lens_difference',
    explanation: '각 체계가 같은 주제를 다른 층위에서 본다.',
    translatedAdvice: '가능성은 살리되 리스크 조건을 먼저 충족한 뒤 실행한다.',
    doNow: '현실 조건과 비용을 확인한다.',
    avoid: '좋은 신호만 보고 바로 결론내리지 않는다.',
  };
}

function buildRiskConditionDivergence(grouped: Map<DecisionClaimAxis, NormalizedClaim[]>): ComparedClaim | undefined {
  const visibility = [
    ...(grouped.get('public_authority') ?? []),
    ...(grouped.get('visibility_strategy') ?? []),
  ].filter(item => item.polarity === 'supportive' || item.polarity === 'neutral');
  const risks = [
    ...(grouped.get('cashflow_risk') ?? []),
    ...(grouped.get('contract_boundary') ?? []),
    ...(grouped.get('energy_management') ?? []),
    ...(grouped.get('collaboration_risk') ?? []),
  ].filter(item => item.polarity === 'caution' || item.polarity === 'mixed');

  if (visibility.length === 0 || risks.length === 0) return undefined;

  const items = [...visibility, ...risks];
  return {
    axis: 'visibility_strategy',
    summary: '공개 확장 신호와 현실 운영 리스크가 함께 잡힌다.',
    systems: systemsFor(items),
    claimIds: items.map(item => item.sourceClaimId),
    agreementLevel: agreementLevel(systemsFor(items).length),
    confidence: Math.round((items.reduce((sum, item) => sum + item.confidence, 0) / items.length) * 100) / 100,
    situationRelevance: 'high',
    decisionImpact: 'high',
    finalWeight: 'core_strategy',
    resolution: {
      type: 'risk_condition',
      explanation: '공개 확장은 맞지만 계약, 수익, 역할 구조가 정리되어 있을 때 좋다.',
      translatedAdvice: '정리 없이 공개되면 주목은 받아도 소진되거나 돈이 새기 쉽다.',
      doNow: '작은 유료 검증, 명확한 역할 범위, 정산 기준을 먼저 만든다.',
      delay: '큰 노출, 장기 협업, 고정비가 큰 확장은 뒤로 둔다.',
      avoid: '무료 노출과 역할이 흐린 협업을 피한다.',
    },
  };
}

function buildComparisonMatrix(normalizedClaims: NormalizedClaim[], situation: SituationContext): ComparisonMatrix {
  const grouped = new Map<DecisionClaimAxis, NormalizedClaim[]>();
  for (const claim of normalizedClaims) {
    grouped.set(claim.axis, [...(grouped.get(claim.axis) ?? []), claim]);
  }

  const convergence: ComparedClaim[] = [];
  const divergence: ComparedClaim[] = [];
  const timingDifferences: ComparedClaim[] = [];

  for (const [axis, items] of grouped.entries()) {
    const compared = buildComparedClaim(axis, items, situation);
    if (hasPolarityConflict(items)) {
      divergence.push({ ...compared, resolution: resolveDivergence(axis) });
    } else if (axis === 'decision_timing' || axis === 'expansion_timing') {
      timingDifferences.push(compared);
    } else {
      convergence.push(compared);
    }
  }

  const crossDivergence = buildRiskConditionDivergence(grouped);
  if (crossDivergence) divergence.unshift(crossDivergence);

  const expectedAxes: DecisionClaimAxis[] = situation.mode === 'job_search'
    ? ['job_search_fit', 'role_pressure', 'cashflow_risk', 'decision_timing']
    : situation.mode === 'business'
      ? ['business_model_focus', 'income_model', 'cashflow_risk', 'contract_boundary']
      : ['business_model_focus', 'job_search_fit', 'cashflow_risk', 'decision_timing'];

  const missingSignals = expectedAxes
    .filter(axis => !grouped.has(axis))
    .map(axis => ({
      axis,
      summary: `${AXIS_MEANING[axis]}은 강한 단독 신호가 부족하다.`,
      systems: [],
      claimIds: [],
      agreementLevel: 'single' as const,
      confidence: 0,
      situationRelevance: situationRelevance(axis, situation),
      decisionImpact: decisionImpact(axis),
      finalWeight: 'reference' as const,
    }));

  const sortCompared = (a: ComparedClaim, b: ComparedClaim) => {
    const rank = { core_strategy: 3, important: 2, reference: 1 };
    return rank[b.finalWeight] - rank[a.finalWeight] || b.confidence - a.confidence;
  };

  return {
    convergence: convergence.sort(sortCompared),
    divergence: divergence.sort(sortCompared),
    timingDifferences: timingDifferences.sort(sortCompared),
    missingSignals,
  };
}

function claimIdsForAxis(claims: NormalizedClaim[], axis: DecisionClaimAxis): string[] {
  return claims.filter(claim => claim.axis === axis).map(claim => claim.sourceClaimId).slice(0, 4);
}

function diagnoseSituation(situation: SituationContext, comparison: ComparisonMatrix): SituationDiagnosis {
  const highPressure =
    situation.cashflowPressure === 'high' ||
    situation.incomeNeed === 'urgent' ||
    (situation.runwayMonths !== undefined && situation.runwayMonths <= 3);
  const hasExpansion = [...comparison.convergence, ...comparison.timingDifferences]
    .some(item => ['public_authority', 'visibility_strategy', 'expansion_timing'].includes(item.axis));

  if (highPressure) {
    return {
      pressureLevel: 'high',
      primaryConstraint: '현금흐름과 생존 안정성',
      opportunityWindow: hasExpansion ? '확장 신호는 작게 검증한 뒤 키우는 편이 안전함' : undefined,
      recommendedPosture: 'stabilize',
      rationale: '현실 압박이 높을 때는 좋은 신호도 큰 확장보다 작은 유료 검증과 비용 통제로 번역해야 한다.',
    };
  }

  if (situation.projectStage === 'growth' && situation.cashflowPressure === 'low') {
    return {
      pressureLevel: 'low',
      primaryConstraint: '확장 우선순위',
      opportunityWindow: hasExpansion ? '공개 역할과 수익 구조를 함께 키울 수 있음' : undefined,
      recommendedPosture: 'expand',
      rationale: '현금흐름 압박이 낮고 성장 단계라면 공통 신호를 확장 전략으로 사용할 수 있다.',
    };
  }

  return {
    pressureLevel: 'medium',
    primaryConstraint: '검증 가능한 선택 순서',
    opportunityWindow: hasExpansion ? '공개 활동은 가능하지만 조건 정리가 먼저임' : undefined,
    recommendedPosture: 'test_small',
    rationale: '중간 압박에서는 결론보다 작은 판매, 조건 검증, 역할 경계가 먼저다.',
  };
}

function buildActionPlan(
  normalizedClaims: NormalizedClaim[],
  comparison: ComparisonMatrix,
  situation: SituationContext,
  diagnosis: SituationDiagnosis,
): TrinityAnalysis['actionPlan'] {
  const now: Advice[] = [];
  const next3Months: Advice[] = [];
  const next6To12Months: Advice[] = [];
  const avoid: Advice[] = [];

  if (diagnosis.recommendedPosture === 'stabilize') {
    now.push({
      id: 'advice.now.cashflow-stabilize',
      priority: 'urgent',
      action: '생존 현금흐름을 먼저 확보하고, 큰 확장보다 작은 유료 검증을 우선한다.',
      reason: '현실 압박이 높으면 확장 신호도 비용과 정산 구조를 통과한 뒤 실행해야 한다.',
      basedOnClaims: [
        ...claimIdsForAxis(normalizedClaims, 'cashflow_risk'),
        ...claimIdsForAxis(normalizedClaims, 'income_model'),
      ],
      avoid: '무료 노출, 무보수 협업, 고정비가 큰 시도',
      timeframe: 'now',
      riskLevel: 'high',
    });
  }

  if (claimIdsForAxis(normalizedClaims, 'contract_boundary').length > 0 || claimIdsForAxis(normalizedClaims, 'collaboration_risk').length > 0) {
    now.push({
      id: 'advice.now.boundary',
      priority: 'important',
      action: '협업이나 제안은 역할, 책임, 정산 기준을 문서로 남긴 뒤 진행한다.',
      reason: '관계와 일이 섞일수록 좋은 기회도 비용이 커질 수 있다.',
      basedOnClaims: [
        ...claimIdsForAxis(normalizedClaims, 'contract_boundary'),
        ...claimIdsForAxis(normalizedClaims, 'collaboration_risk'),
      ],
      avoid: '친분만 믿고 시작하는 장기 약속',
      timeframe: 'now',
      riskLevel: 'medium',
    });
  }

  if (claimIdsForAxis(normalizedClaims, 'energy_management').length > 0) {
    now.push({
      id: 'advice.now.energy',
      priority: 'important',
      action: '일정과 회복 루틴을 먼저 고정하고, 체력을 갈아 넣는 방식의 실행은 줄인다.',
      reason: '에너지 비용을 계산하지 않으면 좋은 선택도 지속 가능성이 떨어진다.',
      basedOnClaims: claimIdsForAxis(normalizedClaims, 'energy_management'),
      timeframe: 'now',
      riskLevel: 'medium',
    });
  }

  next3Months.push({
    id: 'advice.3m.offer',
    priority: diagnosis.recommendedPosture === 'expand' ? 'important' : 'urgent',
    action: '구직 포트폴리오와 작은 유료 상품을 같은 증거 자산으로 정리한다.',
    reason: '구직과 사업을 분리하기보다 검증 가능한 결과물로 묶을 때 선택지가 넓어진다.',
    basedOnClaims: [
      ...claimIdsForAxis(normalizedClaims, 'business_model_focus'),
      ...claimIdsForAxis(normalizedClaims, 'job_search_fit'),
      ...claimIdsForAxis(normalizedClaims, 'public_authority'),
    ],
    timeframe: '3_months',
    riskLevel: 'medium',
  });

  if (comparison.divergence[0]?.resolution) {
    next3Months.push({
      id: 'advice.3m.resolve-divergence',
      priority: 'important',
      action: comparison.divergence[0].resolution.doNow ?? comparison.divergence[0].resolution.translatedAdvice,
      reason: comparison.divergence[0].resolution.explanation,
      basedOnClaims: comparison.divergence[0].claimIds,
      avoid: comparison.divergence[0].resolution.avoid,
      timeframe: '3_months',
      riskLevel: 'medium',
    });
  }

  next6To12Months.push({
    id: 'advice.12m.structure',
    priority: 'important',
    action: '반복 판매, 가격, 계약, 운영 루틴을 갖춘 구조로 키운다.',
    reason: '공개 역할과 수입 모델은 장기 구조가 있을 때 자산으로 남는다.',
    basedOnClaims: [
      ...claimIdsForAxis(normalizedClaims, 'income_model'),
      ...claimIdsForAxis(normalizedClaims, 'asset_base'),
      ...claimIdsForAxis(normalizedClaims, 'visibility_strategy'),
    ],
    timeframe: '6_12_months',
    riskLevel: 'medium',
  });

  avoid.push({
    id: 'advice.avoid.deterministic',
    priority: 'urgent',
    action: '운세 신호만으로 이직, 투자, 관계 결정을 확정하지 않는다.',
    reason: '삼신사주는 선택지를 정리하는 도구이지 현실 결정을 대신하지 않는다.',
    basedOnClaims: normalizedClaims.slice(0, 4).map(claim => claim.sourceClaimId),
    avoid: '성공이나 결과를 확정하는 표현',
    timeframe: 'now',
    riskLevel: 'high',
  });

  if (situation.cashflowPressure === 'high') {
    avoid.push({
      id: 'advice.avoid.expensive-expansion',
      priority: 'urgent',
      action: '고정비가 큰 확장과 장기 약속은 현금흐름이 안정될 때까지 보류한다.',
      reason: '현금흐름 압박이 높으면 확장보다 비용 통제가 먼저다.',
      basedOnClaims: claimIdsForAxis(normalizedClaims, 'cashflow_risk'),
      timeframe: 'now',
      riskLevel: 'high',
    });
  }

  return {
    now: now.slice(0, 4),
    next3Months: next3Months.slice(0, 4),
    next6To12Months: next6To12Months.slice(0, 3),
    avoid: avoid.slice(0, 3),
  };
}

function buildSummary(
  comparison: ComparisonMatrix,
  diagnosis: SituationDiagnosis,
  actionPlan: TrinityAnalysis['actionPlan'],
): TrinityAnalysis['userFacingSummary'] {
  const top = comparison.divergence[0] ?? comparison.convergence[0] ?? comparison.timingDifferences[0];
  const headline = diagnosis.recommendedPosture === 'stabilize'
    ? '확장보다 생존 구조가 먼저입니다'
    : diagnosis.recommendedPosture === 'expand'
      ? '검증된 구조를 공개 역할로 키울 때입니다'
      : '작게 검증하고 조건을 정리할 때입니다';
  return {
    headline,
    shortSummary: top?.summary ?? '세 체계의 강한 공통 신호는 아직 제한적이므로 현실 조건을 먼저 본다.',
    mainStrategy: actionPlan.now[0]?.action ?? '지금은 결론보다 선택 조건을 정리한다.',
    caution: actionPlan.avoid[0]?.action ?? '현실 결정을 운세 신호만으로 확정하지 않는다.',
  };
}

function buildModelRouting(portrait: TrinityAnalysis['portrait']): TrinityAnalysis['modelRouting'] {
  return {
    mode: 'rule_fallback',
    receipts: [
      portrait.saju.routeReceipt,
      portrait.ziwei.routeReceipt,
      portrait.natal.routeReceipt,
      createRuleBasedRouteReceipt('native_boundary_audit', 'NativeBoundaryAudit'),
      createRuleBasedRouteReceipt('trinity_compare', 'ComparisonMatrix'),
      createRuleBasedRouteReceipt('decision_apply', 'DecisionAdvice'),
      createRuleBasedRouteReceipt('korean_renderer', 'KoreanRenderer'),
      createRuleBasedRouteReceipt('final_safety_audit', 'TrinityFinalAudit'),
    ],
  };
}

function collectAuditText(analysis: Omit<TrinityAnalysis, 'audit'>): Array<{ id: string; text: string; system?: DivinationSystem }> {
  const items: Array<{ id: string; text: string; system?: DivinationSystem }> = [];
  for (const reading of Object.values(analysis.portrait)) {
    items.push({
      id: `native.${reading.system}.summary`,
      text: `${reading.nativeSummary} ${reading.personPortrait} ${reading.caveats.join(' ')}`,
      system: reading.system,
    });
    for (const claim of reading.coreClaims) {
      const basis = claim.basis.flatMap(ref => ref.basis).join(' ');
      items.push({
        id: claim.id,
        text: `${claim.title} ${claim.statement} ${basis} ${claim.caveat ?? ''}`,
        system: claim.system,
      });
    }
  }
  for (const reading of Object.values(analysis.readings)) {
    for (const claim of reading.coreClaims) {
      items.push({ id: claim.id, text: `${claim.statement} ${claim.interpretation} ${claim.caveat ?? ''}`, system: claim.system });
    }
  }
  for (const claim of analysis.normalizedClaims) {
    items.push({ id: claim.id, text: `${claim.normalizedStatement} ${claim.normalizedMeaning}`, system: claim.system });
  }
  for (const item of [
    ...analysis.comparison.convergence,
    ...analysis.comparison.divergence,
    ...analysis.comparison.timingDifferences,
    ...analysis.comparison.missingSignals,
  ]) {
    items.push({
      id: `compared.${item.axis}`,
      text: `${item.summary} ${item.resolution?.explanation ?? ''} ${item.resolution?.translatedAdvice ?? ''}`,
    });
  }
  for (const group of Object.values(analysis.actionPlan)) {
    for (const advice of group) {
      items.push({ id: advice.id, text: `${advice.action} ${advice.reason} ${advice.avoid ?? ''}` });
    }
  }
  items.push({ id: 'summary', text: Object.values(analysis.userFacingSummary).join(' ') });
  return items;
}

function auditSystemBoundary(system: DivinationSystem, text: string): string | undefined {
  const natalTerms = /(하우스|행성|어센던트|MC|금성|화성|목성|토성|네이탈)/;
  const ziweiTerms = /(명궁|재물 궁|관록 궁|전택 궁|대한|유년|자미두수)/;
  const sajuTerms = /(십성|재성|관성|비겁|식상|일간|월지|사주팔자)/;

  if (system === 'saju' && (natalTerms.test(text) || ziweiTerms.test(text))) return 'saju claim includes non-saju terminology';
  if (system === 'ziwei' && (natalTerms.test(text) || sajuTerms.test(text))) return 'ziwei claim includes non-ziwei terminology';
  if (system === 'natal' && (ziweiTerms.test(text) || sajuTerms.test(text))) return 'natal claim includes non-natal terminology';
  return undefined;
}

export function auditTrinityAnalysis(analysis: Omit<TrinityAnalysis, 'audit'>): TrinityAnalysis['audit'] {
  const warnings: string[] = [];
  const blockedClaims: string[] = [];

  for (const item of collectAuditText(analysis)) {
    if (containsForbiddenPhrase(item.text) || DECISION_FORBIDDEN_PATTERNS.some(pattern => pattern.test(item.text))) {
      blockedClaims.push(`${item.id}: forbidden deterministic phrase`);
    }
    if (HANJA_PATTERN.test(item.text)) {
      blockedClaims.push(`${item.id}: contains hanja`);
    }
    if (item.system) {
      const boundaryIssue = auditSystemBoundary(item.system, item.text);
      if (boundaryIssue) blockedClaims.push(`${item.id}: ${boundaryIssue}`);
    }
  }

  const hasAdviceWithoutClaims = Object.values(analysis.actionPlan)
    .flat()
    .filter(advice => advice.basedOnClaims.length === 0)
    .map(advice => advice.id);
  if (hasAdviceWithoutClaims.length > 0) {
    warnings.push(`advice_without_claims: ${hasAdviceWithoutClaims.join(', ')}`);
  }

  for (const reading of Object.values(analysis.portrait)) {
    for (const claim of reading.coreClaims) {
      if (claim.sourceEvidenceIds.length === 0 || claim.basis.length === 0) {
        blockedClaims.push(`${claim.id}: native claim without evidence`);
      }
    }
  }

  const requiredNativeRoles: SamsinModelRole[] = ['saju_native', 'ziwei_native', 'natal_native'];
  const routedRoles = new Set(analysis.modelRouting.receipts.map(receipt => receipt.role));
  for (const role of requiredNativeRoles) {
    if (!routedRoles.has(role)) {
      blockedClaims.push(`modelRouting.${role}: missing route receipt`);
    }
  }

  return {
    passed: blockedClaims.length === 0,
    warnings,
    blockedClaims,
  };
}

function calculationId(data: SamsinData): string {
  return [
    data.input.year,
    data.input.month,
    data.input.day,
    data.input.hour,
    data.input.minute,
    data.input.gender,
    data.input.city ?? 'unknown',
    data.input.analysisYear ?? 'analysis-year',
  ].join('-');
}

export function buildTrinityAnalysis(data: SamsinData, options: TrinityBuildOptions = {}): TrinityAnalysis {
  const evidence = extractSamsinEvidence(data);
  const situation = normalizeSituation(options.concern, options.situation);
  const portrait = buildNativeReadings(evidence);
  const readings = buildSystemReadings(evidence, portrait);
  const normalizedClaims = normalizeClaims(readings);
  const comparison = buildComparisonMatrix(normalizedClaims, situation);
  const diagnosis = diagnoseSituation(situation, comparison);
  const actionPlan = buildActionPlan(normalizedClaims, comparison, situation, diagnosis);
  const userFacingSummary = buildSummary(comparison, diagnosis, actionPlan);
  const modelRouting = buildModelRouting(portrait);
  const withoutAudit: Omit<TrinityAnalysis, 'audit'> = {
    meta: {
      generatedAt: (options.now ?? new Date()).toISOString(),
      version: VERSION,
      calculationId: calculationId(data),
    },
    portrait,
    readings,
    normalizedClaims,
    comparison,
    situation: {
      input: situation,
      diagnosis,
    },
    actionPlan,
    userFacingSummary,
    modelRouting,
  };
  return {
    ...withoutAudit,
    audit: auditTrinityAnalysis(withoutAudit),
  };
}
