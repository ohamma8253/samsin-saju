import type { GraphPeriod } from './claude';

// ─── 타입 ──────────────────────────────────────────────────────────
export type ConsensusLevel = 'unanimous' | 'majority' | 'conflict';
export type DominantVoice = 'cheongwoon' | 'taeeul' | 'luna' | 'balanced';

export interface DomainConsensus {
  alignmentScore: number;
  level: ConsensusLevel;
  dominantVoice: DominantVoice;
  avgScores: { saju: number; ziwei: number; natal: number };
  stdDev: number;
}

export interface ConsensusMetrics {
  alignmentScore: number;         // 0~100 (표준편차 기반)
  level: ConsensusLevel;
  dominantVoice: DominantVoice;   // 편차가 가장 큰 신
  money: DomainConsensus;
  career: DomainConsensus;
}

// ─── 계산 유틸 ─────────────────────────────────────────────────────
function stdDev(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function toLevel(score: number): ConsensusLevel {
  if (score >= 67) return 'unanimous';   // stdDev < 10
  if (score >= 33) return 'majority';    // stdDev < 20
  return 'conflict';
}

function findDominantVoice(
  avgSaju: number, avgZiwei: number, avgNatal: number,
): DominantVoice {
  const overall = (avgSaju + avgZiwei + avgNatal) / 3;
  const diffs = [
    { voice: 'cheongwoon' as const, diff: Math.abs(avgSaju - overall) },
    { voice: 'taeeul' as const, diff: Math.abs(avgZiwei - overall) },
    { voice: 'luna' as const, diff: Math.abs(avgNatal - overall) },
  ];
  const maxDiff = Math.max(...diffs.map(d => d.diff));
  if (maxDiff < 5) return 'balanced';
  return diffs.find(d => d.diff === maxDiff)!.voice;
}

// ─── 도메인 합의 계산 ──────────────────────────────────────────────
function calculateDomainConsensus(graph: GraphPeriod[]): DomainConsensus {
  const valid = graph.filter(
    d => d.sajuScore !== undefined && d.ziweiScore !== undefined && d.natalScore !== undefined,
  );

  if (valid.length === 0) {
    return {
      alignmentScore: 50,
      level: 'majority',
      dominantVoice: 'balanced',
      avgScores: { saju: 50, ziwei: 50, natal: 50 },
      stdDev: 15,
    };
  }

  // 각 구간의 3점수 표준편차 → 평균 stdDev
  const stdDevs = valid.map(d =>
    stdDev([d.sajuScore!, d.ziweiScore!, d.natalScore!]),
  );
  const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;

  // alignmentScore: 표준편차 30 이상이면 0, 0이면 100
  const alignmentScore = Math.max(0, Math.round(100 - (avgStdDev * 100 / 30)));

  const avgSaju = valid.reduce((s, d) => s + d.sajuScore!, 0) / valid.length;
  const avgZiwei = valid.reduce((s, d) => s + d.ziweiScore!, 0) / valid.length;
  const avgNatal = valid.reduce((s, d) => s + d.natalScore!, 0) / valid.length;

  return {
    alignmentScore,
    level: toLevel(alignmentScore),
    dominantVoice: findDominantVoice(avgSaju, avgZiwei, avgNatal),
    avgScores: {
      saju: Math.round(avgSaju),
      ziwei: Math.round(avgZiwei),
      natal: Math.round(avgNatal),
    },
    stdDev: Math.round(avgStdDev * 10) / 10,
  };
}

// ─── 메인 함수 ─────────────────────────────────────────────────────
export function calculateConsensusMetrics(
  moneyGraph: GraphPeriod[],
  careerGraph: GraphPeriod[],
): ConsensusMetrics {
  const money = calculateDomainConsensus(moneyGraph);
  const career = calculateDomainConsensus(careerGraph);

  // 전체 합의: 금전·직업 평균
  const alignmentScore = Math.round((money.alignmentScore + career.alignmentScore) / 2);

  // 전체 dominantVoice: 두 도메인 평균
  const overallAvgSaju = (money.avgScores.saju + career.avgScores.saju) / 2;
  const overallAvgZiwei = (money.avgScores.ziwei + career.avgScores.ziwei) / 2;
  const overallAvgNatal = (money.avgScores.natal + career.avgScores.natal) / 2;

  return {
    alignmentScore,
    level: toLevel(alignmentScore),
    dominantVoice: findDominantVoice(overallAvgSaju, overallAvgZiwei, overallAvgNatal),
    money,
    career,
  };
}
