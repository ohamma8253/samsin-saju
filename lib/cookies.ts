const COOKIE_KEY = 'samsin_cookies';
const FIRST_VISIT_KEY = 'samsin_first_visit';
const UNLOCKED_KEY = 'samsin_unlocked';
const FREE_COOKIES = 7;

export function initCookies(): number {
  if (typeof window === 'undefined') return FREE_COOKIES;
  const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
  if (!firstVisit) {
    localStorage.setItem(FIRST_VISIT_KEY, 'true');
    localStorage.setItem(COOKIE_KEY, String(FREE_COOKIES));
    return FREE_COOKIES;
  }
  return getCookieCount();
}

export function getCookieCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(COOKIE_KEY) ?? '0', 10);
}

export function deductCookies(amount: number): boolean {
  const current = getCookieCount();
  if (current < amount) return false;
  localStorage.setItem(COOKIE_KEY, String(current - amount));
  window.dispatchEvent(new Event('cookie-change'));
  return true;
}

export function addCookies(amount: number): number {
  const current = getCookieCount();
  const next = current + amount;
  localStorage.setItem(COOKIE_KEY, String(next));
  window.dispatchEvent(new Event('cookie-change'));
  return next;
}

export function isUnlocked(key: string): boolean {
  if (typeof window === 'undefined') return false;
  const unlocked = readUnlocked();
  return unlocked.includes(key);
}

export function setUnlocked(key: string): void {
  if (typeof window === 'undefined') return;
  const unlocked = readUnlocked();
  if (!unlocked.includes(key)) {
    unlocked.push(key);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked));
  }
}

export function clearUnlocked(key: string): void {
  if (typeof window === 'undefined') return;
  const next = readUnlocked().filter(item => item !== key);
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(next));
}

function readUnlocked(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
