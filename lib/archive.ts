'use client';

import type { DecisionContext } from './interpretation/decision-context';

export type ArchiveItemKind = 'free_report' | 'first_reading' | 'deep_bundle' | 'compatibility';

export interface ArchiveItem {
  id: string;
  kind: ArchiveItemKind;
  name: string;
  headline: string;
  summary: string;
  reportUrl: string;
  concern?: string;
  decisionContext?: DecisionContext;
  badges: string[];
  firstReadingUnlocked?: boolean;
  deepBundleUnlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

type ArchiveUpsert = Omit<ArchiveItem, 'createdAt' | 'updatedAt'>;

const ARCHIVE_KEY = 'samsin_report_archive';
const MAX_ARCHIVE_ITEMS = 30;

export function upsertArchiveItem(item: ArchiveUpsert): ArchiveItem[] {
  if (typeof window === 'undefined') return [];

  const now = new Date().toISOString();
  const existing = readArchiveItems();
  const previous = existing.find(record => record.id === item.id && record.kind === item.kind);
  const nextItem: ArchiveItem = {
    ...item,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  const next = [
    nextItem,
    ...existing.filter(record => !(record.id === item.id && record.kind === item.kind)),
  ].slice(0, MAX_ARCHIVE_ITEMS);

  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('samsin-archive-change'));
  return next;
}

export function readArchiveItems(): ArchiveItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ArchiveItem => (
      typeof item === 'object'
      && item !== null
      && 'id' in item
      && 'kind' in item
      && 'headline' in item
    ));
  } catch {
    return [];
  }
}
