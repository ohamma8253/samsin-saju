import type { SamsinData } from '../saju';
import type { NatalAspectCore, PlanetId, PlanetPositionCore } from '../natal-core';
import {
  type ClaimAxis,
  type EvidenceDomain,
  type EvidencePolarity,
  type InterpretationEvidence,
} from './evidence';
import { buildEvidenceInputContext } from './input';
import { buildRuleId } from './provenance';

const NATAL_EXTRACTOR_VERSION = 'SAMSIN_NATAL_EXTRACTOR_V1';
const NATAL_RULE_VERSION = 'SAMSIN_NATAL_RULES_V1';
const NATAL_CALCULATION_VERSION = 'SAMSIN_NATAL_CORE_V1_P0_ORACLE_GATE';

const P0_PLANETS = new Set<PlanetId>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]);

const CORE_PERSONAL_PLANETS = new Set<PlanetId>(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);
const CAREER_PLANETS = new Set<PlanetId>(['Sun', 'Mars', 'Jupiter', 'Saturn']);
const MONEY_PLANETS = new Set<PlanetId>(['Venus', 'Jupiter', 'Saturn']);
const SYNTHETIC_PLANETS = new Set<PlanetId>(['Chiron', 'NorthNode', 'SouthNode']);

const ELEMENT_BY_SIGN: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
};

const HARMONIC_ASPECTS = new Set(['trine', 'sextile', 'conjunction']);
const PRESSURE_ASPECTS = new Set(['square', 'opposition']);

function planet(data: SamsinData, id: PlanetId): PlanetPositionCore | undefined {
  return data.natal.planets.find(item => item.id === id);
}

function p0Planets(data: SamsinData): PlanetPositionCore[] {
  return data.natal.planets.filter(item => P0_PLANETS.has(item.id));
}

function planetLabel(item: PlanetPositionCore | undefined): string {
  if (!item) return 'missing';
  const retro = item.isRetrograde ? 'R' : 'direct';
  return `${item.id}:${item.sign}:${item.degreeInSign.toFixed(1)}:${retro}`;
}

function aspectLabel(aspect: NatalAspectCore): string {
  return `${aspect.planet1}-${aspect.planet2}:${aspect.type}:orb${aspect.orb.toFixed(1)}`;
}

function elementBalance(planets: PlanetPositionCore[]): Record<'fire' | 'earth' | 'air' | 'water', number> {
  return planets.reduce((acc, item) => {
    const element = ELEMENT_BY_SIGN[item.sign] ?? 'fire';
    acc[element] += 1;
    return acc;
  }, { fire: 0, earth: 0, air: 0, water: 0 });
}

function strongestElement(balance: Record<'fire' | 'earth' | 'air' | 'water', number>): string {
  return Object.entries(balance).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fire';
}

function relevantAspect(data: SamsinData): NatalAspectCore | undefined {
  return data.natal.aspects
    .filter(aspect => !SYNTHETIC_PLANETS.has(aspect.planet1) && !SYNTHETIC_PLANETS.has(aspect.planet2))
    .filter(aspect => CORE_PERSONAL_PLANETS.has(aspect.planet1) || CORE_PERSONAL_PLANETS.has(aspect.planet2))
    .sort((a, b) => a.orb - b.orb)[0];
}

function housePlanets(data: SamsinData, houses: Set<number>, targets: Set<PlanetId>): PlanetPositionCore[] {
  return data.natal.planets.filter(item => houses.has(item.house) && targets.has(item.id));
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
    system: 'natal',
    domain: args.domain,
    claimAxis: args.claimAxis,
    weight: args.weight,
    polarity: args.polarity,
    confidence,
    title: args.title,
    claim: args.claim,
    source: {
      sourceType: 'rule_signal',
      sourceRefs: ['lib/natal-core.ts', args.featurePath],
      researchNoteIds: [],
      licenseConstraint: 'MIT astronomy-engine + own-rule; no AGPL copy',
    },
    provenance: {
      extractorVersion: NATAL_EXTRACTOR_VERSION,
      calculationVersion: NATAL_CALCULATION_VERSION,
      ruleId: buildRuleId('natal', args.ruleFamily, args.ruleName),
      ruleVersion: NATAL_RULE_VERSION,
      schoolOrMethod: 'tropical-placidus-samsin-v1',
    },
    inputContext: buildEvidenceInputContext(args.data.birthContext),
    featureTrace: {
      rawFeatureRefs: ['natal.planets', 'natal.aspects', 'natal.angles', 'natal.houses'],
      derivedFeatureRefs: [args.featurePath],
      featurePath: args.featurePath,
      featureValue: args.featureValue,
      normalizedScore: args.weight,
    },
    uncertainty: {
      level: confidence === 'high' ? 'low' : confidence === 'medium' ? 'medium' : 'high',
      reasons: birthTimeSensitive && unknownTime ? ['birth_time_unknown'] : [],
      birthTimeSensitive,
      schoolVariantSensitive: birthTimeSensitive,
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

export function extractNatalEvidence(data: SamsinData): InterpretationEvidence[] {
  const sun = planet(data, 'Sun');
  const moon = planet(data, 'Moon');
  const jupiter = planet(data, 'Jupiter');
  const saturn = planet(data, 'Saturn');
  const venus = planet(data, 'Venus');
  const unknownTime = data.birthContext.unknownTime;
  const evidence: InterpretationEvidence[] = [];

  if (sun) {
    evidence.push(makeEvidence({
      data,
      id: 'natal.temperament.sun-moon.v1',
      domain: 'temperament',
      claimAxis: 'self_expression',
      ruleFamily: 'temperament',
      ruleName: 'sun_moon_identity',
      weight: unknownTime ? 62 : 76,
      polarity: 'neutral',
      confidence: unknownTime ? 'medium' : 'high',
      title: '태양과 달은 기본 기질의 축이다',
      claim: '태양 별자리와 달 별자리는 서양점성에서 자기 표현과 감정 반응의 기본 근거다.',
      featurePath: 'natal.planets.sunMoon',
      featureValue: { sun: planetLabel(sun), moon: planetLabel(moon) },
      basis: [
        `태양: ${planetLabel(sun)}`,
        `달: ${planetLabel(moon)}`,
        unknownTime ? '출생 시각 미상: 달 위치는 보수적으로만 사용' : '출생 시각 있음: 달 위치 사용 가능',
      ],
      adviceHint: '성격 단정보다 표현 방식과 감정 회복 리듬을 분리해 설명한다.',
      caveat: unknownTime ? '출생 시각 미상에서는 달의 세부 각도와 하우스 해석을 약하게 둔다.' : undefined,
      birthTimeSensitive: unknownTime,
      maxClaimStrength: unknownTime ? 'moderate' : 'strong',
    }));
  }

  const balance = elementBalance(p0Planets(data));
  evidence.push(makeEvidence({
    data,
    id: 'natal.temperament.element-balance.v1',
    domain: 'temperament',
    claimAxis: strongestElement(balance) === 'air' ? 'learning_style' : 'self_expression',
    ruleFamily: 'temperament',
    ruleName: 'p0_element_balance',
    weight: Math.min(86, 48 + Math.max(...Object.values(balance)) * 7),
    polarity: 'neutral',
    title: '행성 원소 분포가 반복 성향을 보여준다',
    claim: 'P0 행성의 원소 분포는 사고, 행동, 회복 방식의 반복 패턴을 읽는 보조 근거다.',
    featurePath: 'natal.features.p0ElementBalance',
    featureValue: balance,
    basis: [
      `불 원소: ${balance.fire}`,
      `흙 원소: ${balance.earth}`,
      `공기 원소: ${balance.air}`,
      `물 원소: ${balance.water}`,
    ],
    adviceHint: '한 별자리 일반론보다 전체 행성 분포에서 반복되는 결을 먼저 본다.',
  }));

  const aspect = relevantAspect(data);
  if (aspect) {
    const pressure = PRESSURE_ASPECTS.has(aspect.type);
    evidence.push(makeEvidence({
      data,
      id: 'natal.growth.major-aspect.v1',
      domain: pressure ? 'risk_pattern' : 'growth',
      claimAxis: pressure ? 'emotional_recovery' : 'learning_style',
      ruleFamily: 'growth',
      ruleName: 'tight_major_aspect',
      weight: Math.max(40, Math.min(82, 82 - aspect.orb * 6)),
      polarity: pressure ? 'mixed' : HARMONIC_ASPECTS.has(aspect.type) ? 'supportive' : 'neutral',
      confidence: aspect.planet1 === 'Moon' || aspect.planet2 === 'Moon' ? (unknownTime ? 'low' : 'medium') : 'medium',
      title: pressure ? '긴장 애스펙트가 반복 과제를 만든다' : '조화 애스펙트가 성장 자원을 만든다',
      claim: '주요 행성의 타이트한 애스펙트는 반복되는 성장 과제나 강점을 설명하는 근거다.',
      featurePath: 'natal.aspects.majorRelevant',
      featureValue: aspect,
      basis: [
        `주요 애스펙트: ${aspectLabel(aspect)}`,
        `오브: ${aspect.orb.toFixed(1)}도`,
        `성격: ${pressure ? '긴장/조정' : '조화/활용'}`,
      ],
      adviceHint: '좋고 나쁨보다 반복되는 반응 패턴과 조정법으로 렌더링한다.',
      caveat: unknownTime && (aspect.planet1 === 'Moon' || aspect.planet2 === 'Moon')
        ? '출생 시각 미상에서는 달 관련 애스펙트를 약한 근거로만 둔다.'
        : undefined,
      birthTimeSensitive: aspect.planet1 === 'Moon' || aspect.planet2 === 'Moon',
      maxClaimStrength: pressure ? 'weak' : 'moderate',
    }));
  }

  if (!unknownTime) {
    const careerPlanets = housePlanets(data, new Set([10, 6, 1]), CAREER_PLANETS);
    const mc = data.natal.angles.mc;
    evidence.push(makeEvidence({
      data,
      id: 'natal.career.mc-house.v1',
      domain: 'career',
      claimAxis: careerPlanets.some(item => item.id === 'Saturn') ? 'career_stability' : 'public_visibility',
      ruleFamily: 'career',
      ruleName: 'mc_and_work_houses',
      weight: Math.max(44, Math.min(86, 50 + careerPlanets.length * 10)),
      polarity: careerPlanets.some(item => item.id === 'Saturn') ? 'mixed' : 'supportive',
      title: 'MC와 일 관련 하우스가 사회적 역할을 보여준다',
      claim: 'MC와 1, 6, 10하우스의 주요 행성은 사회적 역할과 일하는 방식의 근거다.',
      featurePath: 'natal.angles.mcAndWorkHouses',
      featureValue: {
        mc,
        careerPlanets: careerPlanets.map(planetLabel),
      },
      basis: [
        `MC: ${mc.sign} ${mc.degreeInSign.toFixed(1)}도`,
        `일 관련 하우스 행성: ${careerPlanets.map(planetLabel).join(', ') || '없음'}`,
      ],
      adviceHint: '직업명 단정보다 공개 역할, 책임 방식, 일의 리듬을 먼저 설명한다.',
      birthTimeSensitive: true,
    }));

    const moneyPlanets = housePlanets(data, new Set([2, 8]), MONEY_PLANETS);
    if (venus || jupiter || saturn || moneyPlanets.length > 0) {
      evidence.push(makeEvidence({
        data,
        id: 'natal.money.venus-jupiter-saturn.v1',
        domain: 'money_pattern',
        claimAxis: moneyPlanets.some(item => item.id === 'Saturn') ? 'money_volatility' : 'money_accumulation',
        ruleFamily: 'money',
        ruleName: 'money_planets_and_houses',
        weight: Math.max(38, Math.min(80, 44 + moneyPlanets.length * 11)),
        polarity: moneyPlanets.some(item => item.id === 'Saturn') ? 'mixed' : 'neutral',
        title: '금성과 목성, 돈 관련 하우스가 자원 감각을 보여준다',
        claim: '금성, 목성, 토성 및 2/8하우스는 돈을 대하는 습관과 자원 관리 방식의 보조 근거다.',
        featurePath: 'natal.features.moneyPlanetsHouses',
        featureValue: {
          venus: planetLabel(venus),
          jupiter: planetLabel(jupiter),
          saturn: planetLabel(saturn),
          moneyPlanets: moneyPlanets.map(planetLabel),
        },
        basis: [
          `금성: ${planetLabel(venus)}`,
          `목성: ${planetLabel(jupiter)}`,
          `토성: ${planetLabel(saturn)}`,
          `2/8하우스 주요 행성: ${moneyPlanets.map(planetLabel).join(', ') || '없음'}`,
        ],
        adviceHint: '소비, 축적, 확장, 제한의 습관 언어로만 설명한다.',
        caveat: '투자 수익이나 특정 매수/매도 판단으로 확장하지 않는다.',
        birthTimeSensitive: true,
      }));
    }
  }

  return evidence;
}
