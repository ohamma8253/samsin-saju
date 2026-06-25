import type { SamsinData } from './saju';
import type { ComputedScores, ScoredPeriod } from './scoring';
import type { GraphPeriod } from './claude';
import type { BirthTimePrecision } from './interpretation/evidence';

interface CachedSession {
  data: SamsinData;
  scores: ComputedScores;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30분
const MAX_SESSIONS = 200;
const cache = new Map<string, CachedSession>();

function makeKey(p: { name: string; year: number; month: number; day: number;
                      hour: number; minute: number; gender: string; city?: string;
                      unknownTime?: boolean; birthTimePrecision?: BirthTimePrecision; analysisYear?: number }): string {
  return [
    p.name,
    p.year,
    p.month,
    p.day,
    p.hour,
    p.minute,
    p.gender,
    p.city ?? 'seoul',
    p.unknownTime ? 'unknown-time' : 'known-time',
    p.birthTimePrecision ?? 'range',
    p.analysisYear ?? new Date().getFullYear(),
  ].join('|');
}

function evict(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > TTL_MS) cache.delete(key);
  }
  if (cache.size > MAX_SESSIONS) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < sorted.length - MAX_SESSIONS; i++) cache.delete(sorted[i][0]);
  }
}

export async function getSession(params: {
  name: string; year: number; month: number; day: number;
  hour: number; minute: number; gender: 'M' | 'F'; city?: string;
  unknownTime?: boolean; birthTimePrecision?: BirthTimePrecision; analysisYear?: number;
}): Promise<{ data: SamsinData; scores: ComputedScores }> {
  const key = makeKey(params);
  const existing = cache.get(key);
  if (existing && Date.now() - existing.createdAt < TTL_MS) {
    return { data: existing.data, scores: existing.scores };
  }

  const { calculateSamsin } = await import('./saju');
  const { computeAllScores } = await import('./scoring');
  const { validateSamsinData } = await import('./schema');

  const data = await calculateSamsin(params);

  // Shadow validation: 로그만, 블로킹 안 함
  const validation = validateSamsinData(data);
  if (!validation.valid) {
    console.warn('[SamsinData validation failed]', validation.errors.slice(0, 5));
  }

  const scores = computeAllScores(data);
  evict();
  cache.set(key, { data, scores, createdAt: Date.now() });
  return { data, scores };
}

/** ScoredPeriod[] → GraphPeriod[] 변환 (consensus 계산용) */
export function scoredToGraph(periods: ScoredPeriod[]): GraphPeriod[] {
  return periods.map(p => ({
    label: p.label, score: p.score, note: '',
    phaseType: p.phaseType,
    sajuScore: p.sajuScore, ziweiScore: p.ziweiScore, natalScore: p.natalScore,
  }));
}
