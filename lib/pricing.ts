export const COOKIE_UNIT_VALUE = 330;
export const FIRST_READING_COST = 3;
export const DEEP_BUNDLE_COST = 9;
export const COMPATIBILITY_COST = 9;
export const CHAT_SINGLE_DEITY_COST = 1;
export const CHAT_TRINITY_COST = 3;
export const CHAT_DEEP_SESSION_COST = 9;
export const MONTHLY_REPORT_COST = 30;
export const DEMO_INITIAL_COOKIE_GRANT = 0;

export type ProductId =
  | 'first_reading'
  | 'deep_bundle'
  | 'chat_single_deity'
  | 'chat_trinity'
  | 'chat_deep_session'
  | 'chat_first_free'
  | 'compatibility'
  | 'monthly_report';

export type ChatQuestionMode = 'single_deity' | 'trinity' | 'deep_session';
export type SamsinDeityKey = 'cheongwoon' | 'taeeul' | 'luna';

export const CHAT_MODE_COSTS: Record<ChatQuestionMode, number> = {
  single_deity: CHAT_SINGLE_DEITY_COST,
  trinity: CHAT_TRINITY_COST,
  deep_session: CHAT_DEEP_SESSION_COST,
};

export const PRODUCT_COOKIE_COSTS: Record<ProductId, number> = {
  first_reading: FIRST_READING_COST,
  deep_bundle: DEEP_BUNDLE_COST,
  chat_single_deity: CHAT_SINGLE_DEITY_COST,
  chat_trinity: CHAT_TRINITY_COST,
  chat_deep_session: CHAT_DEEP_SESSION_COST,
  chat_first_free: 0,
  compatibility: COMPATIBILITY_COST,
  monthly_report: MONTHLY_REPORT_COST,
};

export function formatCookieValue(cookieCount: number): string {
  if (cookieCount === FIRST_READING_COST) return '990원';
  if (cookieCount === DEEP_BUNDLE_COST) return '3,000원';
  if (cookieCount === MONTHLY_REPORT_COST) return '9,900원';
  return `${(cookieCount * COOKIE_UNIT_VALUE).toLocaleString('ko-KR')}원`;
}
