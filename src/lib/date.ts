/** Toutes les dates sont stockées au format YYYY-MM-DD (local). */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthKey(value: string | Date = todayISO()): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
  }
  return value.slice(0, 7);
}

export function addMonths(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string): number {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function dateInMonth(key: string, day: number): string {
  const clamped = Math.min(Math.max(day, 1), daysInMonth(key));
  return `${key}-${pad(clamped)}`;
}

export function isoFromTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string, withYear = false): string {
  if (!isValidISODate(iso)) return iso;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(toLocalDate(iso));
}

export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(y, m - 1, 1));
  return label.replace('.', '').charAt(0).toUpperCase() + label.replace('.', '').slice(1);
}

export function daysUntil(iso: string): number {
  const today = toLocalDate(todayISO());
  const target = toLocalDate(iso);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
