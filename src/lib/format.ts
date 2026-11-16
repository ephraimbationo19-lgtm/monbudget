const NO_CENTS = new Set(['XOF', 'XAF', 'JPY', 'KRW', 'VND', 'CLP']);

export function formatMoney(amount: number, currency = 'XOF'): string {
  const digits = NO_CENTS.has(currency) ? 0 : 2;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatCompactMoney(amount: number, currency = 'XOF'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatMoney(amount, currency);
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

export function parseFloatInput(value: string): number | null {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
