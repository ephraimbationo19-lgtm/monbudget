import { todayISO } from '@/lib/date';
import type { TransactionType } from '@/types';

export interface ParsedSms {
  type: TransactionType;
  amount: number;
  operator: string | null;
  person: string;
  note: string;
  date: string;
  detected: boolean;
}

function normalize(raw: string): string {
  return raw
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAmount(text: string): number | null {
  const match = text.match(/(\d[\d\s.,]*)\s*(?:fcfa|xof|francs?|cfa)\b/i);
  if (!match) return null;
  let cleaned = match[1].replace(/[\s.]/g, '');
  if (cleaned.includes(',')) cleaned = cleaned.replace(',', '.');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractOperator(text: string): string | null {
  if (/\borange\b/i.test(text)) return 'Orange Money';
  if (/\bwave\b/i.test(text)) return 'Wave';
  if (/\bmoov\b/i.test(text)) return 'Moov Money';
  if (/\bmtn\b/i.test(text)) return 'MTN MoMo';
  return null;
}

function extractPerson(text: string): string {
  const match = text.match(/\b(?:de|d'|du|à|au|pour)\s+([^,.;]{2,40})/i);
  if (!match) return '';
  return match[1]
    .replace(/\b(réf|ref|motif|solde|transaction|date|le)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectType(text: string): { type: TransactionType; detected: boolean } {
  const outgoing =
    /\b(vous avez envoy|j'ai envoy|paiement|pay[ée]|d[ée]bit|achat|retir|retrait|transfert vers|versement de|d[ée]p[ôo]t)\b/i.test(
      text,
    );
  const incoming =
    /\b(re[çc]u|r[ée]ception|[ée]t cr[ée]dit[ée]|vous a envoy|encaissement|virement re[çc]u|cr[ée]dit[ée])\b/i.test(
      text,
    );

  if (outgoing && !incoming) return { type: 'expense', detected: true };
  if (incoming && !outgoing) return { type: 'income', detected: true };
  if (/\b(envoy|vers|transf)/i.test(text)) return { type: 'expense', detected: false };
  return { type: 'expense', detected: false };
}

/** Analyse un SMS de mobile money (Orange Money, Wave, Moov, MTN…). */
export function parseMoneySms(raw: string): ParsedSms | null {
  const text = normalize(raw);
  if (!text) return null;

  const amount = extractAmount(text);
  if (amount === null) return null;

  const { type, detected } = detectType(text);
  const operator = extractOperator(text);
  const person = extractPerson(text);
  const label = type === 'income' ? 'Entrée d’argent' : 'Sortie d’argent';
  const parts = [operator ?? 'Mobile Money', label];
  if (person) parts.push(person);

  return {
    type,
    amount,
    operator,
    person,
    note: parts.join(' · ').slice(0, 90),
    date: todayISO(),
    detected,
  };
}

/** Vrai si le message ressemble à un SMS de paiement mobile. */
export function looksLikeMoneySms(body: string): boolean {
  const text = normalize(body).toLowerCase();
  return (
    /(fcfa|xof|francs? cfa)/.test(text) &&
    /(orange|wave|moov|mtn|money|versement|virement|transfert|paiement|re[çc]u|envoy)/.test(text)
  );
}
