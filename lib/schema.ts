import { z } from 'zod';

// ─── API 입력 검증 ───────────────────────────────────────────────────
export const BirthParamsSchema = z.object({
  name: z.string().min(1).max(20),
  year: z.coerce.number().int().min(1920).max(2010),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  hour: z.coerce.number().int().min(0).max(23).default(12),
  minute: z.coerce.number().int().min(0).max(59).default(0),
  gender: z.enum(['M', 'F']).default('M'),
  city: z.string().default('seoul'),
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
