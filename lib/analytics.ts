'use client';

export type SamsinAnalyticsEvent =
  | 'home_first_cta_viewed'
  | 'home_character_cta_clicked'
  | 'concern_selected'
  | 'start_onboarding_step'
  | 'start_birth_cta_clicked'
  | 'landing_free_click'
  | 'landing_990_click'
  | 'landing_intent_selected'
  | 'birth_form_submit'
  | 'birth_onboarding_step'
  | 'local_profile_saved'
  | 'free_report_loaded'
  | 'first_reading_cta_clicked'
  | 'report_loaded'
  | 'paywall_viewed'
  | 'shop_opened'
  | 'first_reading_unlocked'
  | 'ask_opened'
  | 'deep_bundle_unlocked'
  | 'deep_bundle_cta_clicked'
  | 'chat_question_sent'
  | 'compat_direct_started'
  | 'compat_invite_created'
  | 'result_saved';

type AnalyticsPayloadValue = string | number | boolean | null | undefined;

export interface SamsinAnalyticsRecord {
  name: SamsinAnalyticsEvent;
  payload: Record<string, AnalyticsPayloadValue>;
  path: string;
  createdAt: string;
}

const ANALYTICS_KEY = 'samsin_analytics_events';
const MAX_EVENTS = 200;

export function trackEvent(
  name: SamsinAnalyticsEvent,
  payload: Record<string, AnalyticsPayloadValue> = {},
): void {
  if (typeof window === 'undefined') return;

  const record: SamsinAnalyticsRecord = {
    name,
    payload,
    path: `${window.location.pathname}${window.location.search}`,
    createdAt: new Date().toISOString(),
  };

  const next = [record, ...readAnalyticsEvents()].slice(0, MAX_EVENTS);
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('samsin-analytics', { detail: record }));

  if (process.env.NODE_ENV !== 'production') {
    console.info('[samsin:event]', record);
  }
}

export function readAnalyticsEvents(): SamsinAnalyticsRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(ANALYTICS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SamsinAnalyticsRecord => (
      typeof item === 'object'
      && item !== null
      && 'name' in item
      && 'createdAt' in item
    ));
  } catch {
    return [];
  }
}
