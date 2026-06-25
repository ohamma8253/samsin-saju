import type { DivinationSystem } from './evidence';

export type CalculationCoreId =
  | 'samsin-manselyeok-core'
  | 'samsin-ziwei-core'
  | 'samsin-natal-core'
  | 'orrery-core-legacy-adapter';

export interface CalculationCoreProfile {
  id: CalculationCoreId;
  system: DivinationSystem;
  version: string;
  license: 'internal' | 'MIT' | 'AGPL-3.0-only' | 'unknown';
  role: 'production_core' | 'dev_oracle' | 'legacy_adapter';
  productionAllowed: boolean;
  notes: string;
}

export const CORE_MODEL_VERSION = 'SAMSIN_CORE_MODEL_V1';
export const EVIDENCE_CONTRACT_VERSION = 'SAMSIN_EVIDENCE_V1';
export const CONSENSUS_CONTRACT_VERSION = 'SAMSIN_CONSENSUS_V1';
export const CLAIM_PLAN_CONTRACT_VERSION = 'SAMSIN_CLAIM_PLAN_V1';

export const CALCULATION_CORE_REGISTRY: Record<CalculationCoreId, CalculationCoreProfile> = {
  'samsin-manselyeok-core': {
    id: 'samsin-manselyeok-core',
    system: 'saju',
    version: 'SAMSIN_MANSELYEOK_V1',
    license: 'internal',
    role: 'production_core',
    productionAllowed: true,
    notes: 'Own saju core backed by lunar-javascript calendar calculations.',
  },
  'samsin-ziwei-core': {
    id: 'samsin-ziwei-core',
    system: 'ziwei',
    version: 'SAMSIN_ZIWEI_CORE_V1_ORACLE_GATE',
    license: 'internal',
    role: 'production_core',
    productionAllowed: true,
    notes: 'Clean-room ziwei core for lunar conversion, palace skeleton, wuxing ju, daxian, liunian, main stars, brightness, sihua, and auxiliary stars. Current 1000-sample oracle gate passes.',
  },
  'samsin-natal-core': {
    id: 'samsin-natal-core',
    system: 'natal',
    version: 'SAMSIN_NATAL_CORE_V1_P0_ORACLE_GATE',
    license: 'MIT',
    role: 'production_core',
    productionAllowed: true,
    notes: 'Permissive natal core backed by astronomy-engine for P0 planets, retrograde flags, major aspects, angles, and Placidus houses. Chiron and lunar nodes have coverage-only status until a dedicated longitude parity gate is added.',
  },
  'orrery-core-legacy-adapter': {
    id: 'orrery-core-legacy-adapter',
    system: 'ziwei',
    version: 'ORRERY_CORE_0_3_0',
    license: 'AGPL-3.0-only',
    role: 'dev_oracle',
    productionAllowed: false,
    notes: 'Dev-only oracle for fixture comparison scripts. Must not be imported by production runtime paths.',
  },
};

export function getBlockedProductionCores(): CalculationCoreProfile[] {
  return Object.values(CALCULATION_CORE_REGISTRY).filter(core => !core.productionAllowed);
}

export function getCoreProfile(id: CalculationCoreId): CalculationCoreProfile {
  return CALCULATION_CORE_REGISTRY[id];
}

export function buildRuleId(system: DivinationSystem, family: string, name: string): string {
  return `${system}.${family}.${name}`;
}
