import type { BirthTimePrecision, EvidenceInputContext } from './evidence';

export type CalculationSex = 'male' | 'female' | 'unknown';
export type CalendarInputType = 'solar' | 'lunar';

export interface RawBirthInput {
  name?: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour?: number | string;
  minute?: number | string;
  gender?: 'M' | 'F' | string;
  calculationSex?: CalculationSex;
  displayGender?: string;
  city?: string;
  timezone?: string;
  unknownTime?: boolean | string | number;
  birthTimePrecision?: BirthTimePrecision;
  calendarInputType?: CalendarInputType;
  lunarLeapMonth?: boolean;
  analysisYear?: number | string;
}

export interface NormalizedBirthInput {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city: string;
  timezone: string;
  calculationSex: CalculationSex;
  displayGender?: string;
  legacyGender: 'M' | 'F';
  unknownTime: boolean;
  birthTimePrecision: BirthTimePrecision;
  calendarInputType: CalendarInputType;
  lunarLeapMonth: boolean;
  analysisYear: number;
}

function toBoolean(value: RawBirthInput['unknownTime']): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'unknown'].includes(value.trim().toLowerCase());
  }
  return false;
}

function toCalculationSex(input: RawBirthInput): CalculationSex {
  if (input.calculationSex) return input.calculationSex;
  if (input.gender === 'F') return 'female';
  if (input.gender === 'M') return 'male';
  return 'unknown';
}

export function toLegacyGender(calculationSex: CalculationSex): 'M' | 'F' {
  return calculationSex === 'female' ? 'F' : 'M';
}

export function normalizeBirthInput(input: RawBirthInput): NormalizedBirthInput {
  const unknownTime = toBoolean(input.unknownTime);
  const calculationSex = toCalculationSex(input);
  const nowYear = new Date().getFullYear();

  return {
    name: String(input.name ?? '').trim(),
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: unknownTime ? 12 : Number(input.hour ?? 12),
    minute: unknownTime ? 0 : Number(input.minute ?? 0),
    city: input.city ?? 'seoul',
    timezone: input.timezone ?? 'Asia/Seoul',
    calculationSex,
    displayGender: input.displayGender,
    legacyGender: toLegacyGender(calculationSex),
    unknownTime,
    birthTimePrecision: input.birthTimePrecision ?? (unknownTime ? 'unknown' : 'range'),
    calendarInputType: input.calendarInputType ?? 'solar',
    lunarLeapMonth: input.lunarLeapMonth ?? false,
    analysisYear: Number(input.analysisYear ?? nowYear),
  };
}

export function buildEvidenceInputContext(input: NormalizedBirthInput): EvidenceInputContext {
  return {
    birthDate: `${input.year.toString().padStart(4, '0')}-${input.month.toString().padStart(2, '0')}-${input.day.toString().padStart(2, '0')}`,
    birthTime: input.unknownTime
      ? undefined
      : `${input.hour.toString().padStart(2, '0')}:${input.minute.toString().padStart(2, '0')}`,
    birthTimePrecision: input.birthTimePrecision,
    timezone: input.timezone,
    location: input.city,
    calendarInputType: input.calendarInputType,
    lunarLeapMonth: input.lunarLeapMonth,
    analysisYear: input.analysisYear,
  };
}
