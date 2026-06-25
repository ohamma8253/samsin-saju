import type { SamsinData } from '../saju';
import type { ZiweiPalace, ZiweiStar } from '../ziwei-core';
import {
  type ClaimAxis,
  type EvidenceDomain,
  type EvidencePolarity,
  type InterpretationEvidence,
} from './evidence';
import { buildEvidenceInputContext } from './input';
import { buildRuleId } from './provenance';

const ZIWEI_EXTRACTOR_VERSION = 'SAMSIN_ZIWEI_EXTRACTOR_V1';
const ZIWEI_RULE_VERSION = 'SAMSIN_ZIWEI_RULES_V1';
const ZIWEI_CALCULATION_VERSION = 'SAMSIN_ZIWEI_CORE_V1_ORACLE_GATE';

const BRIGHTNESS_SCORE: Record<string, number> = {
  廟: 92,
  旺: 84,
  得: 74,
  利: 66,
  平: 56,
  陷: 36,
};

const SUPPORT_STARS = new Set(['天魁', '天鉞', '左輔', '右弼', '文昌', '文曲', '祿存']);
const PRESSURE_STARS = new Set(['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '化忌']);
const MONEY_STARS = new Set(['武曲', '天府', '太陰', '貪狼', '祿存']);
const CAREER_STARS = new Set(['紫微', '天府', '武曲', '太陽', '天相', '天梁', '廉貞']);
const RELATIONSHIP_STARS = new Set(['天同', '太陰', '天相', '巨門', '貪狼']);

function starLabel(star: ZiweiStar): string {
  const details = [star.brightness, star.siHua].filter(Boolean).join('/');
  return details ? `${star.name}(${details})` : star.name;
}

function countStars(palace: ZiweiPalace | undefined, targets: Set<string>): number {
  return palace?.stars.filter(star => targets.has(star.name) || targets.has(star.siHua)).length ?? 0;
}

function palaceBrightnessAverage(palace: ZiweiPalace | undefined): number {
  if (!palace || palace.stars.length === 0) return 50;
  const scores = palace.stars.map(star => BRIGHTNESS_SCORE[star.brightness] ?? 55);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function siHuaByPalace(palace: ZiweiPalace | undefined): string[] {
  return palace?.stars
    .filter(star => Boolean(star.siHua))
    .map(star => `${star.name}${star.siHua}`) ?? [];
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
  maxClaimStrength?: 'weak' | 'moderate' | 'strong';
}): InterpretationEvidence {
  const confidence = args.confidence ?? 'medium';
  const birthTimeSensitive = true;

  return {
    id: args.id,
    system: 'ziwei',
    domain: args.domain,
    claimAxis: args.claimAxis,
    weight: args.weight,
    polarity: args.polarity,
    confidence,
    title: args.title,
    claim: args.claim,
    source: {
      sourceType: 'rule_signal',
      sourceRefs: ['lib/ziwei-core.ts', args.featurePath],
      researchNoteIds: [],
      licenseConstraint: 'own-rule; no AGPL copy',
    },
    provenance: {
      extractorVersion: ZIWEI_EXTRACTOR_VERSION,
      calculationVersion: ZIWEI_CALCULATION_VERSION,
      ruleId: buildRuleId('ziwei', args.ruleFamily, args.ruleName),
      ruleVersion: ZIWEI_RULE_VERSION,
      schoolOrMethod: 'samsin-ziwei-v1',
    },
    inputContext: buildEvidenceInputContext(args.data.birthContext),
    featureTrace: {
      rawFeatureRefs: ['ziwei.palaces', 'daxianList', 'currentLiunian'],
      derivedFeatureRefs: [args.featurePath],
      featurePath: args.featurePath,
      featureValue: args.featureValue,
      normalizedScore: args.weight,
    },
    uncertainty: {
      level: confidence === 'high' ? 'low' : confidence === 'medium' ? 'medium' : 'high',
      reasons: [],
      birthTimeSensitive,
      schoolVariantSensitive: true,
      missingInputs: [],
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
      requiresCaveat: confidence !== 'high' || args.domain === 'timing',
      requiresSafetyDisclaimer: args.domain === 'timing' || args.domain === 'risk_pattern',
    },
    userFacing: {
      basis: args.basis,
      adviceHint: args.adviceHint,
      caveat: args.caveat,
    },
  };
}

export function extractZiweiEvidence(data: SamsinData): InterpretationEvidence[] {
  if (data.birthContext.unknownTime) {
    return [];
  }

  const palaces = data.ziwei.palaces ?? {};
  const ming = palaces['命宮'];
  const money = palaces['財帛'];
  const career = palaces['官祿'];
  const relationship = palaces['夫妻'];
  const evidence: InterpretationEvidence[] = [];

  if (ming && ming.stars.length > 0) {
    evidence.push(makeEvidence({
      data,
      id: 'ziwei.temperament.ming-palace.v1',
      domain: 'temperament',
      claimAxis: 'self_expression',
      ruleFamily: 'temperament',
      ruleName: 'ming_palace_main_signal',
      weight: palaceBrightnessAverage(ming),
      polarity: countStars(ming, PRESSURE_STARS) > countStars(ming, SUPPORT_STARS) ? 'mixed' : 'supportive',
      confidence: 'high',
      title: '명궁 주성이 자기 표현의 중심 신호다',
      claim: '명궁의 주성과 밝기는 자미두수에서 기질과 자기 표현을 읽는 중심 근거다.',
      featurePath: 'ziwei.palaces.命宮',
      featureValue: ming.stars.map(starLabel),
      basis: [
        `명궁 지지: ${ming.zhi}`,
        `명궁 별: ${ming.stars.map(starLabel).join(', ') || '없음'}`,
        `오행국: ${data.ziwei.wuXingJu.name}`,
      ],
      adviceHint: '자기 표현의 방식은 명궁 주성만이 아니라 밝기와 보조 별의 압력까지 함께 본다.',
      maxClaimStrength: 'strong',
    }));
  }

  if (money && money.stars.length > 0) {
    const support = countStars(money, MONEY_STARS) + countStars(money, SUPPORT_STARS);
    const pressure = countStars(money, PRESSURE_STARS);
    evidence.push(makeEvidence({
      data,
      id: 'ziwei.money.caibo-palace.v1',
      domain: 'money_pattern',
      claimAxis: support >= pressure ? 'money_accumulation' : 'money_volatility',
      ruleFamily: 'money',
      ruleName: 'caibo_palace_star_pressure',
      weight: Math.max(35, Math.min(88, 50 + support * 12 - pressure * 10 + siHuaByPalace(money).length * 5)),
      polarity: pressure > support ? 'challenging' : support >= 2 ? 'supportive' : 'mixed',
      title: support >= pressure ? '재백궁 신호가 축적 방식을 보여준다' : '재백궁 압력이 돈의 변동성을 만든다',
      claim: '재백궁의 재물 별, 보조 별, 사화 압력으로 돈의 축적성과 변동성을 구분한다.',
      featurePath: 'ziwei.palaces.財帛',
      featureValue: {
        stars: money.stars.map(starLabel),
        support,
        pressure,
        siHua: siHuaByPalace(money),
      },
      basis: [
        `재백궁 별: ${money.stars.map(starLabel).join(', ') || '없음'}`,
        `재물/보조 신호: ${support}`,
        `압력 신호: ${pressure}`,
      ],
      adviceHint: '수익을 약속하는 말이 아니라 돈이 모이고 흩어지는 습관의 신호로만 해석한다.',
      caveat: '투자 판단이나 수익 예측으로 확장하지 않는다.',
    }));
  }

  if (career && career.stars.length > 0) {
    const support = countStars(career, CAREER_STARS) + countStars(career, SUPPORT_STARS);
    const pressure = countStars(career, PRESSURE_STARS);
    evidence.push(makeEvidence({
      data,
      id: 'ziwei.career.guanlu-palace.v1',
      domain: 'career',
      claimAxis: support >= pressure ? 'career_stability' : 'career_independence',
      ruleFamily: 'career',
      ruleName: 'guanlu_palace_role_signal',
      weight: Math.max(35, Math.min(90, 52 + support * 11 - pressure * 8 + palaceBrightnessAverage(career) / 8)),
      polarity: pressure > support ? 'mixed' : 'supportive',
      title: support >= pressure ? '관록궁 신호가 역할 안정성을 보강한다' : '관록궁 압력이 독립적 진로 압력을 만든다',
      claim: '관록궁의 주성과 보조 별은 직업 역할, 책임, 독립성의 근거로 사용한다.',
      featurePath: 'ziwei.palaces.官祿',
      featureValue: {
        stars: career.stars.map(starLabel),
        support,
        pressure,
        siHua: siHuaByPalace(career),
      },
      basis: [
        `관록궁 별: ${career.stars.map(starLabel).join(', ') || '없음'}`,
        `역할 보강 신호: ${support}`,
        `긴장 신호: ${pressure}`,
      ],
      adviceHint: '직업명 단정보다 역할 방식, 책임 구조, 일하는 환경의 결을 우선 설명한다.',
    }));
  }

  if (relationship && relationship.stars.length > 0) {
    const relational = countStars(relationship, RELATIONSHIP_STARS);
    const pressure = countStars(relationship, PRESSURE_STARS);
    evidence.push(makeEvidence({
      data,
      id: 'ziwei.relationship.fuqi-palace.v1',
      domain: 'relationship_pattern',
      claimAxis: pressure > relational ? 'relationship_autonomy' : 'relationship_commitment',
      ruleFamily: 'relationship',
      ruleName: 'fuqi_palace_relational_signal',
      weight: Math.max(32, Math.min(82, 45 + relational * 10 - pressure * 7 + siHuaByPalace(relationship).length * 5)),
      polarity: pressure > relational ? 'mixed' : 'supportive',
      title: '부처궁은 관계의 거리감과 몰입 방식을 보여준다',
      claim: '부처궁 별의 조합은 관계 결정이 아니라 관계 패턴의 성찰 근거로만 사용한다.',
      featurePath: 'ziwei.palaces.夫妻',
      featureValue: {
        stars: relationship.stars.map(starLabel),
        relational,
        pressure,
        siHua: siHuaByPalace(relationship),
      },
      basis: [
        `부처궁 별: ${relationship.stars.map(starLabel).join(', ') || '없음'}`,
        `관계 신호: ${relational}`,
        `긴장 신호: ${pressure}`,
      ],
      adviceHint: '결혼, 이별, 외도 확정이 아니라 관계에서 반복되는 반응 방식을 설명한다.',
      caveat: '관계 결정을 지시하거나 확정하지 않는다.',
      maxClaimStrength: 'weak',
    }));
  }

  if (data.currentLiunian) {
    evidence.push(makeEvidence({
      data,
      id: 'ziwei.timing.current-liunian.v1',
      domain: 'timing',
      claimAxis: 'timing_change_pressure',
      ruleFamily: 'timing',
      ruleName: 'liunian_daxian_overlay',
      weight: 58,
      polarity: Object.values(data.currentLiunian.siHua).includes('化忌') ? 'mixed' : 'neutral',
      confidence: 'medium',
      title: '유년과 대한은 현재 흐름의 보조 근거다',
      claim: '유년과 대한은 사건 확정이 아니라 현재 선택 압력과 주의 리듬을 읽는 약한 근거다.',
      featurePath: 'ziwei.currentLiunian',
      featureValue: data.currentLiunian,
      basis: [
        `유년: ${data.currentLiunian.year}년`,
        `유년 명궁 위치: ${data.currentLiunian.natalPalaceAtMing}`,
        `대한궁: ${data.currentLiunian.daxianPalaceName}`,
      ],
      adviceHint: '올해의 확정 사건보다 지금 강해진 관심사와 조정 포인트로 표현한다.',
      caveat: '정확한 사건 발생이나 결과를 보장하지 않는다.',
      maxClaimStrength: 'weak',
    }));
  }

  return evidence;
}
