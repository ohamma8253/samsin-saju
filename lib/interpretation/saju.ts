import type { SamsinData, WuxingCount } from '../saju';
import {
  type ClaimAxis,
  type EvidenceDomain,
  type EvidencePolarity,
  type InterpretationEvidence,
} from './evidence';
import { buildEvidenceInputContext } from './input';
import { buildRuleId } from './provenance';

const SAJU_EXTRACTOR_VERSION = 'SAMSIN_SAJU_EXTRACTOR_V1';
const SAJU_RULE_VERSION = 'SAMSIN_SAJU_RULES_V1';
const SAJU_CALCULATION_VERSION = 'SAMSIN_MANSELYEOK_V1';

const MONEY_SIPSIN = new Set(['正財', '偏財']);
const CAREER_SIPSIN = new Set(['正官', '偏官']);
const OUTPUT_SIPSIN = new Set(['食神', '傷官']);
const PEER_SIPSIN = new Set(['比肩', '劫財']);

function countSipsin(data: SamsinData, targets: Set<string>): number {
  return data.saju.pillars.reduce((count, pillar) => {
    const stemHit = targets.has(pillar.stemSipsin) ? 1 : 0;
    const branchHit = targets.has(pillar.branchSipsin) ? 1 : 0;
    return count + stemHit + branchHit;
  }, 0);
}

function strongestAndWeakestWuxing(wuxing: WuxingCount): {
  strongest: keyof WuxingCount;
  weakest: keyof WuxingCount;
  spread: number;
} {
  const entries = Object.entries(wuxing) as Array<[keyof WuxingCount, number]>;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0] ?? ['tree', 0];
  const weakest = sorted[sorted.length - 1] ?? ['water', 0];
  return {
    strongest: strongest[0],
    weakest: weakest[0],
    spread: strongest[1] - weakest[1],
  };
}

function makeEvidence(args: {
  data: SamsinData;
  id: string;
  domain: EvidenceDomain;
  claimAxis: ClaimAxis;
  ruleFamily: string;
  ruleName: string;
  weight: number;
  polarity: EvidencePolarity;
  confidence?: 'high' | 'medium' | 'low';
  title: string;
  claim: string;
  featurePath: string;
  featureValue: unknown;
  basis: string[];
  adviceHint?: string;
  caveat?: string;
  birthTimeSensitive?: boolean;
  maxClaimStrength?: 'weak' | 'moderate' | 'strong';
}): InterpretationEvidence {
  const birthTimeSensitive = args.birthTimeSensitive ?? false;
  const unknownTime = args.data.birthContext.unknownTime;
  const confidence = args.confidence ?? (birthTimeSensitive && unknownTime ? 'low' : 'medium');

  return {
    id: args.id,
    system: 'saju',
    domain: args.domain,
    claimAxis: args.claimAxis,
    weight: args.weight,
    polarity: args.polarity,
    confidence,
    title: args.title,
    claim: args.claim,
    source: {
      sourceType: 'rule_signal',
      sourceRefs: ['lib/manselyeok-core.ts', args.featurePath],
      researchNoteIds: [],
      licenseConstraint: 'own-rule; no AGPL copy',
    },
    provenance: {
      extractorVersion: SAJU_EXTRACTOR_VERSION,
      calculationVersion: SAJU_CALCULATION_VERSION,
      ruleId: buildRuleId('saju', args.ruleFamily, args.ruleName),
      ruleVersion: SAJU_RULE_VERSION,
      schoolOrMethod: 'samsin-saju-v1',
    },
    inputContext: buildEvidenceInputContext(args.data.birthContext),
    featureTrace: {
      rawFeatureRefs: ['saju.pillars', 'saju.daewoon', 'wuxing'],
      derivedFeatureRefs: [args.featurePath],
      featurePath: args.featurePath,
      featureValue: args.featureValue,
      normalizedScore: args.weight,
    },
    uncertainty: {
      level: confidence === 'high' ? 'low' : confidence === 'medium' ? 'medium' : 'high',
      reasons: birthTimeSensitive && unknownTime ? ['birth_time_unknown'] : [],
      birthTimeSensitive,
      schoolVariantSensitive: false,
      missingInputs: birthTimeSensitive && unknownTime ? ['birth_time'] : [],
    },
    claimBinding: {
      allowedClaimAxes: [String(args.claimAxis)],
      forbiddenClaimAxes: [
        'medical_diagnosis',
        'death_prediction',
        'investment_action',
        'guaranteed_marriage',
      ],
      maxClaimStrength: args.maxClaimStrength ?? 'moderate',
      requiresCaveat: confidence !== 'high',
      requiresSafetyDisclaimer: args.domain === 'wellbeing_reflection' || args.domain === 'timing',
    },
    userFacing: {
      basis: args.basis,
      adviceHint: args.adviceHint,
      caveat: args.caveat,
    },
  };
}

export function extractSajuEvidence(data: SamsinData): InterpretationEvidence[] {
  const dayPillar = data.saju.pillars[1];
  const monthPillar = data.saju.pillars[2];
  const moneyCount = countSipsin(data, MONEY_SIPSIN);
  const careerCount = countSipsin(data, CAREER_SIPSIN);
  const outputCount = countSipsin(data, OUTPUT_SIPSIN);
  const peerCount = countSipsin(data, PEER_SIPSIN);
  const wuxingProfile = strongestAndWeakestWuxing(data.wuxing);
  const age = data.birthContext.analysisYear - data.birthContext.year;
  const currentDaewoon = data.saju.daewoon.find(item => age >= item.age && age <= item.age + 9);

  const evidence: InterpretationEvidence[] = [];

  if (dayPillar) {
    evidence.push(makeEvidence({
      data,
      id: 'saju.temperament.day-pillar.v1',
      domain: 'temperament',
      claimAxis: 'self_expression',
      ruleFamily: 'temperament',
      ruleName: 'day_pillar_identity',
      weight: 72,
      polarity: 'neutral',
      confidence: 'high',
      title: '일간과 일지가 기질의 중심을 만든다',
      claim: '일간과 일지는 성향 해석의 중심 근거다.',
      featurePath: 'saju.pillars.day',
      featureValue: dayPillar.pillar.ganzi,
      basis: [
        `일주: ${dayPillar.pillar.ganzi}`,
        `일간: ${dayPillar.pillar.stem}`,
        `일지: ${dayPillar.pillar.branch}`,
      ],
      adviceHint: '자기 표현 방식과 관계 반응을 먼저 함께 읽는다.',
      maxClaimStrength: 'strong',
    }));
  }

  evidence.push(makeEvidence({
    data,
    id: 'saju.money.resource-flow.v1',
    domain: 'money_pattern',
    claimAxis: moneyCount >= 2 ? 'money_accumulation' : 'money_volatility',
    ruleFamily: 'money',
    ruleName: 'wealth_output_peer_balance',
    weight: Math.min(90, 45 + moneyCount * 14 + outputCount * 6 - peerCount * 4),
    polarity: peerCount > moneyCount ? 'challenging' : moneyCount >= 2 ? 'supportive' : 'mixed',
    title: moneyCount >= 2 ? '재성 신호가 돈의 흐름을 만든다' : '돈의 흐름은 보조 근거가 더 필요하다',
    claim: '재성, 식상, 비겁의 균형으로 돈의 축적성과 변동성을 판단한다.',
    featurePath: 'saju.features.moneySipsinBalance',
    featureValue: { moneyCount, outputCount, peerCount },
    basis: [
      `재성 신호: ${moneyCount}`,
      `식상 신호: ${outputCount}`,
      `비겁 신호: ${peerCount}`,
    ],
    adviceHint: '돈 자체보다 돈이 만들어지는 방식과 새는 지점을 함께 본다.',
    caveat: '투자 수익이나 손실 회피를 보장하는 근거로 쓰지 않는다.',
  }));

  evidence.push(makeEvidence({
    data,
    id: 'saju.career.structure.v1',
    domain: 'career',
    claimAxis: careerCount >= 2 ? 'career_stability' : 'career_independence',
    ruleFamily: 'career',
    ruleName: 'official_output_balance',
    weight: Math.min(88, 48 + careerCount * 14 + outputCount * 5),
    polarity: careerCount >= 2 ? 'supportive' : 'mixed',
    title: careerCount >= 2 ? '관성 신호가 역할과 책임을 강조한다' : '직업 방향은 독립성과 표현력이 함께 작동한다',
    claim: '관성, 인성, 식상 구조를 통해 조직 적합성과 독립성을 나눠 본다.',
    featurePath: 'saju.features.careerSipsinBalance',
    featureValue: { careerCount, outputCount, monthBranchSipsin: monthPillar?.branchSipsin },
    basis: [
      `관성 신호: ${careerCount}`,
      `식상 신호: ${outputCount}`,
      `월지 십신: ${monthPillar?.branchSipsin || '미상'}`,
    ],
    adviceHint: '역할이 고정된 환경과 스스로 판을 짜는 환경 중 어느 쪽 근거가 강한지 비교한다.',
  }));

  if (currentDaewoon) {
    evidence.push(makeEvidence({
      data,
      id: 'saju.timing.current-daewoon.v1',
      domain: 'timing',
      claimAxis: 'timing_change_pressure',
      ruleFamily: 'timing',
      ruleName: 'current_daewoon_signal',
      weight: 65,
      polarity: 'mixed',
      title: '현재 대운이 시기 판단의 큰 배경이 된다',
      claim: '현재 대운은 장기 흐름의 배경 근거로만 사용한다.',
      featurePath: 'saju.daewoon.current',
      featureValue: currentDaewoon,
      basis: [
        `현재 나이: ${age}세`,
        `현재 대운: ${currentDaewoon.age}~${currentDaewoon.age + 9}세 ${currentDaewoon.ganzi}`,
        `대운 십신: ${currentDaewoon.stemSipsin}/${currentDaewoon.branchSipsin}`,
      ],
      adviceHint: '올해의 단정이 아니라 장기 흐름의 압력과 선택 리듬으로 설명한다.',
      caveat: '정확한 사건 발생 시점을 보장하지 않는다.',
      birthTimeSensitive: true,
      maxClaimStrength: 'weak',
    }));
  }

  if (wuxingProfile.spread >= 3) {
    evidence.push(makeEvidence({
      data,
      id: 'saju.wellbeing.rhythm.v1',
      domain: 'wellbeing_reflection',
      claimAxis: 'emotional_recovery',
      ruleFamily: 'wellbeing',
      ruleName: 'wuxing_spread_reflection',
      weight: Math.min(80, 50 + wuxingProfile.spread * 8),
      polarity: 'mixed',
      title: '오행 편차는 생활 리듬의 자기점검 근거다',
      claim: '오행 편차는 의학적 판단이 아니라 생활 리듬과 회복 습관의 성찰 근거로만 사용한다.',
      featurePath: 'saju.wuxing.spread',
      featureValue: wuxingProfile,
      basis: [
        `가장 강한 오행: ${wuxingProfile.strongest}`,
        `가장 약한 오행: ${wuxingProfile.weakest}`,
        `오행 편차: ${wuxingProfile.spread}`,
      ],
      adviceHint: '과로, 회복, 루틴 같은 생활 선택 언어로만 표현한다.',
      caveat: '건강, 질병, 임신, 사고 예측으로 확장하지 않는다.',
      maxClaimStrength: 'weak',
    }));
  }

  return evidence;
}
