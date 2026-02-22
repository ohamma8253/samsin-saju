import type { SamsinInput } from './saju';

export function encodeInvite(input: SamsinInput): string {
  const data = JSON.stringify(input);
  return btoa(encodeURIComponent(data));
}

export function decodeInvite(encoded: string): SamsinInput | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

export function buildInviteUrl(input: SamsinInput, base: string = ''): string {
  return `${base}/invite/${encodeInvite(input)}`;
}
