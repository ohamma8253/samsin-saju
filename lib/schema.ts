import { z } from 'zod';

const BooleanishSchema = z.preprocess(value => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === undefined || value === null || value === '') return false;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'unknown'].includes(value.trim().toLowerCase());
  return value;
}, z.boolean());

const SituationContextSchema = z.object({
  mode: z.enum(['job_search', 'business', 'both']).optional(),
  cashflowPressure: z.enum(['low', 'medium', 'high']).optional(),
  runwayMonths: z.coerce.number().min(0).max(120).optional(),
  projectStage: z.enum(['idea', 'prototype', 'paid_test', 'growth']).optional(),
  mainQuestion: z.string().max(240).optional(),
  currentConstraints: z.array(z.string().max(120)).max(12).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  timeAvailablePerWeek: z.coerce.number().min(0).max(168).optional(),
  incomeNeed: z.enum(['urgent', 'soon', 'stable']).optional(),
  decisionDeadline: z.string().max(40).optional(),
  preferredOutcome: z.string().max(160).optional(),
}).optional();

// ─── API 입력 검증 ───────────────────────────────────────────────────
export const BirthParamsSchema = z.object({
  name: z.string().min(1).max(20),
  year: z.coerce.number().int().min(1920).max(2010),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  hour: z.coerce.number().int().min(0).max(23).default(12),
  minute: z.coerce.number().int().min(0).max(59).default(0),
  gender: z.enum(['M', 'F']).default('M'),
  calculationSex: z.enum(['male', 'female', 'unknown']).optional(),
  displayGender: z.string().max(30).optional(),
  unknownTime: BooleanishSchema.default(false),
  birthTimePrecision: z.enum(['exact', 'range', 'unknown']).optional(),
  analysisYear: z.coerce.number().int().min(1900).max(2200).optional(),
  city: z.string().default('seoul'),
  concern: z.string().max(40).optional(),
  situation: SituationContextSchema,
});
export type ValidatedBirthParams = z.infer<typeof BirthParamsSchema>;

// ─── SamsinData 경계 검증 (scoring.ts + format 함수가 접근하는 필드만) ───
export const SamsinDataSchema = z.object({
  saju: z.object({
    pillars: z.array(z.object({
      pillar: z.object({ ganzi: z.string(), stem: z.string(), branch: z.string() }),
    }).passthrough()).min(4),
    daewoon: z.array(z.object({
      age: z.number(), ganzi: z.string(), unseong: z.string(),
      stemSipsin: z.string(), branchSipsin: z.string(), sinsal: z.string(),
    }).passthrough()),
  }).passthrough(),
  ziwei: z.object({
    palaces: z.record(z.string(), z.object({
      name: z.string(),
      stars: z.array(z.object({
        name: z.string(), brightness: z.string(), siHua: z.string(),
      })),
    }).passthrough()),
    wuXingJu: z.object({ name: z.string(), number: z.number() }),
  }).passthrough(),
  natal: z.object({
    planets: z.array(z.object({
      id: z.string(), longitude: z.number(), sign: z.string(),
      degreeInSign: z.number(), isRetrograde: z.boolean(), house: z.number(),
    }).passthrough()).min(2),
    houses: z.array(z.object({
      number: z.number(), cuspLongitude: z.number(),
    }).passthrough()).min(12),
    angles: z.object({
      asc: z.object({ sign: z.string(), degreeInSign: z.number() }).passthrough(),
      mc: z.object({ sign: z.string(), degreeInSign: z.number() }).passthrough(),
    }).passthrough(),
    aspects: z.array(z.object({
      planet1: z.string(), planet2: z.string(), type: z.string(), orb: z.number(),
    }).passthrough()),
  }).passthrough(),
  wuxing: z.object({
    tree: z.number(), fire: z.number(), earth: z.number(),
    metal: z.number(), water: z.number(),
  }),
  daxianList: z.array(z.object({
    ageStart: z.number(), ageEnd: z.number(), palaceName: z.string(),
    ganZhi: z.string(), mainStars: z.array(z.string()),
  })),
}).passthrough();

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSamsinData(data: unknown): ValidationResult {
  const result = SamsinDataSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
