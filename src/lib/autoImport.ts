import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import * as repo from '@/db/repository';
import { isoFromTimestamp } from '@/lib/date';
import { parseMoneySms } from '@/lib/sms';
import { readMoneySms } from '@/lib/smsReader';
import type { Category, TransactionType } from '@/types';

function pickCategory(categories: Category[], body: string, type: TransactionType): Category | undefined {
  const text = body.toLowerCase();
  if (type === 'income') {
    return (
      categories.find((c) => c.name === 'Revenus divers') ?? categories.find((c) => c.type === 'income')
    );
  }
  if (/carburant|essence|taxi|transport|bus/.test(text)) {
    return categories.find((c) => c.name === 'Transport');
  }
  if (/courses|march[ée]|aliment|restaurant|supermarch[ée]/.test(text)) {
    return categories.find((c) => c.name === 'Alimentation');
  }
  if (/abonnement|internet|forfait|data/.test(text)) {
    return categories.find((c) => c.name === 'Abonnements');
  }
  return (
    categories.find((c) => c.name === 'Autre') ?? categories.find((c) => c.type === 'expense')
  );
}

/**
 * Importe automatiquement les nouveaux SMS Mobile Money.
 * Appelé au démarrage et à chaque retour au premier plan (Android uniquement).
 */
export async function autoImportMoneySms(db: SQLiteDatabase): Promise<number> {
  if (Platform.OS !== 'android') return 0;

  const enabled = await repo.getSetting(db, 'sms_auto_import', '1');
  if (enabled !== '1') return 0;

  let messages;
  try {
    messages = await readMoneySms(150);
  } catch (error) {
    console.warn('Import SMS ignoré :', error);
    return 0;
  }

  const alreadyImported = new Set(await repo.getImportedSmsIds(db));
  const categories = await repo.getCategories(db);
  let count = 0;

  for (const message of messages) {
    const id = String(message.id);
    if (alreadyImported.has(id)) continue;

    const parsed = parseMoneySms(message.body);
    if (!parsed) continue;

    const category = pickCategory(categories, message.body, parsed.type);
    if (!category) continue;

    const date = message.date ? isoFromTimestamp(message.date) : parsed.date;
    await repo.addTransaction(db, {
      type: parsed.type,
      amount: parsed.amount,
      categoryId: category.id,
      note: parsed.note,
      date,
    });
    await repo.markSmsImported(db, id, date, parsed.type, parsed.amount, parsed.note);
    count += 1;
  }

  return count;
}
