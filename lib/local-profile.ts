'use client';

import type { ConcernKey } from './concerns';

export interface LocalSamsinProfile {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  gender: 'M' | 'F';
  city: string;
  unknownTime: string;
  birthTimePrecision: 'unknown' | 'range';
  concern: ConcernKey;
  createdAt: string;
  updatedAt: string;
}

type LocalSamsinProfileInput = Omit<LocalSamsinProfile, 'createdAt' | 'updatedAt'>;

const LOCAL_PROFILE_KEY = 'samsin_local_profile';

export function saveLocalSamsinProfile(input: LocalSamsinProfileInput): LocalSamsinProfile | null {
  if (typeof window === 'undefined') return null;

  const previous = readLocalSamsinProfile();
  const now = new Date().toISOString();
  const profile: LocalSamsinProfile = {
    ...input,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event('samsin-local-profile-change'));
  return profile;
}

export function readLocalSamsinProfile(): LocalSamsinProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY) ?? 'null') as unknown;
    if (
      typeof value === 'object'
      && value !== null
      && 'name' in value
      && 'year' in value
      && 'month' in value
      && 'day' in value
      && 'gender' in value
    ) {
      return value as LocalSamsinProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildReportHrefFromProfile(
  profile: LocalSamsinProfile,
  concernOverride?: ConcernKey,
): string {
  const params = new URLSearchParams({
    name: profile.name,
    year: profile.year,
    month: profile.month,
    day: profile.day,
    hour: profile.hour,
    minute: profile.minute,
    gender: profile.gender,
    city: profile.city,
    unknownTime: profile.unknownTime,
    birthTimePrecision: profile.birthTimePrecision,
    intent: 'free',
    concern: concernOverride ?? profile.concern,
  });

  return `/report?${params.toString()}`;
}
