'use client';

import type { ReportContext } from './claude';

export interface ReportChatParams {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  gender: string;
  city?: string;
  unknownTime?: string;
  birthTimePrecision?: string;
  concern?: string;
}

export interface ReportContextSnapshot {
  reportId: string;
  reportUrl: string;
  params: ReportChatParams;
  reportContext: ReportContext;
  concern: string;
  name: string;
  headline: string;
  firstReadingUnlocked: boolean;
  deepBundleUnlocked: boolean;
  updatedAt: string;
}

const REPORT_CONTEXT_KEY = 'samsin_report_contexts';
const MAX_REPORT_CONTEXTS = 20;

export function buildAskHref(reportId: string): string {
  return `/ask?reportId=${encodeURIComponent(reportId)}`;
}

export function saveReportContextSnapshot(
  snapshot: Omit<ReportContextSnapshot, 'updatedAt'>,
): ReportContextSnapshot[] {
  if (typeof window === 'undefined') return [];

  const nextSnapshot: ReportContextSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  const next = [
    nextSnapshot,
    ...readReportContextSnapshots().filter(item => item.reportId !== snapshot.reportId),
  ].slice(0, MAX_REPORT_CONTEXTS);

  localStorage.setItem(REPORT_CONTEXT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('samsin-report-context-change'));
  return next;
}

export function readReportContextSnapshot(reportId: string | null | undefined): ReportContextSnapshot | null {
  if (!reportId) return null;
  return readReportContextSnapshots().find(item => item.reportId === reportId) ?? null;
}

export function readReportContextSnapshots(): ReportContextSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(REPORT_CONTEXT_KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ReportContextSnapshot => (
      typeof item === 'object'
      && item !== null
      && 'reportId' in item
      && 'reportUrl' in item
      && 'params' in item
      && 'reportContext' in item
    ));
  } catch {
    return [];
  }
}
