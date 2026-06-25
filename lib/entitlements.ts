import type { ProductId } from './pricing';

interface BirthIdentity {
  year: number | string;
  month: number | string;
  day: number | string;
  hour?: number | string;
  minute?: number | string;
  gender?: string;
  city?: string;
  unknownTime?: boolean | string;
  birthTimePrecision?: string;
  analysisYear?: number | string;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeBirthIdentity(input: BirthIdentity): string {
  return [
    input.year,
    input.month,
    input.day,
    input.hour ?? 12,
    input.minute ?? 0,
    input.gender ?? 'M',
    input.city ?? 'seoul',
    input.unknownTime ? 'unknown-time' : 'known-time',
    input.birthTimePrecision ?? 'range',
    input.analysisYear ?? new Date().getFullYear(),
  ].map(part => String(part).trim().toLowerCase()).join('|');
}

export function buildReportId(input: BirthIdentity | string): string {
  if (typeof input === 'string') return `r_${hashString(input.trim().toLowerCase())}`;
  return `r_${hashString(normalizeBirthIdentity(input))}`;
}

export function buildCompatibilityId(
  personA: BirthIdentity,
  personB: BirthIdentity,
  relationship: string,
): string {
  const left = normalizeBirthIdentity(personA);
  const right = normalizeBirthIdentity(personB);
  return `c_${hashString(`${left}::${right}::${relationship}`)}`;
}

export function buildEntitlementKey(productId: ProductId, birthParamsOrReportId: BirthIdentity | string): string {
  const scopeId = typeof birthParamsOrReportId === 'string'
    ? buildReportId(birthParamsOrReportId)
    : buildReportId(birthParamsOrReportId);
  return `${productId}:${scopeId}`;
}
