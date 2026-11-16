import type { SQLiteDatabase } from 'expo-sqlite';

import { addMonths, dateInMonth, monthKey, todayISO } from '@/lib/date';
import type {
  Budget,
  Category,
  Debt,
  DebtPayment,
  Goal,
  GoalContribution,
  Recurring,
  Transaction,
  TransactionType,
} from '@/types';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type DESC, id ASC');
}

export async function getTransactions(db: SQLiteDatabase): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
}

export async function getBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  return db.getAllAsync<Budget>('SELECT * FROM budgets');
}

export async function getRecurring(db: SQLiteDatabase): Promise<Recurring[]> {
  return db.getAllAsync<Recurring>('SELECT * FROM recurring ORDER BY day_of_month ASC');
}

export async function getGoals(db: SQLiteDatabase): Promise<Goal[]> {
  return db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY id DESC');
}

export async function getContributions(db: SQLiteDatabase): Promise<GoalContribution[]> {
  return db.getAllAsync<GoalContribution>('SELECT * FROM goal_contributions ORDER BY date DESC');
}

export async function getDebts(db: SQLiteDatabase): Promise<Debt[]> {
  return db.getAllAsync<Debt>('SELECT * FROM debts ORDER BY due_date IS NULL, due_date ASC, id DESC');
}

export async function getPayments(db: SQLiteDatabase): Promise<DebtPayment[]> {
  return db.getAllAsync<DebtPayment>('SELECT * FROM debt_payments ORDER BY date DESC');
}

export async function getCurrency(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'currency'",
  );
  return row?.value ?? 'XOF';
}

export async function setCurrency(db: SQLiteDatabase, currency: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('currency', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    currency,
  );
}

export async function getSetting(db: SQLiteDatabase, key: string, fallback: string): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? fallback;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getImportedSmsIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ sms_id: string }>('SELECT sms_id FROM imported_sms');
  return rows.map((row) => row.sms_id);
}

export async function markSmsImported(
  db: SQLiteDatabase,
  id: string,
  date: string,
  type: string,
  amount: number,
  note: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO imported_sms (sms_id, date, type, amount, note) VALUES (?, ?, ?, ?, ?)',
    id,
    date,
    type,
    amount,
    note,
  );
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string;
  date: string;
}

export async function addTransaction(db: SQLiteDatabase, input: TransactionInput): Promise<void> {
  await db.runAsync(
    'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)',
    input.type,
    input.amount,
    input.categoryId,
    input.note.trim(),
    input.date,
  );
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: number,
  input: TransactionInput,
): Promise<void> {
  await db.runAsync(
    'UPDATE transactions SET type = ?, amount = ?, category_id = ?, note = ?, date = ? WHERE id = ?',
    input.type,
    input.amount,
    input.categoryId,
    input.note.trim(),
    input.date,
    id,
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

export async function saveBudget(
  db: SQLiteDatabase,
  categoryId: number,
  amount: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO budgets (category_id, amount) VALUES (?, ?)
     ON CONFLICT(category_id) DO UPDATE SET amount = excluded.amount`,
    categoryId,
    amount,
  );
}

export async function deleteBudget(db: SQLiteDatabase, categoryId: number): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE category_id = ?', categoryId);
}

export interface RecurringInput {
  type: TransactionType;
  amount: number;
  categoryId: number;
  note: string;
  dayOfMonth: number;
  startDate: string;
}

export async function addRecurring(db: SQLiteDatabase, input: RecurringInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO recurring (type, amount, category_id, note, day_of_month, start_date, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    input.type,
    input.amount,
    input.categoryId,
    input.note.trim(),
    input.dayOfMonth,
    input.startDate,
  );
}

export async function setRecurringActive(
  db: SQLiteDatabase,
  id: number,
  active: boolean,
): Promise<void> {
  await db.runAsync('UPDATE recurring SET active = ? WHERE id = ?', active ? 1 : 0, id);
}

export async function deleteRecurring(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE recurring_id = ?', id);
    await db.runAsync('DELETE FROM recurring WHERE id = ?', id);
  });
}

/** Crée les transactions mensuelles manquantes pour les éléments récurrents actifs. */
export async function generateRecurring(db: SQLiteDatabase): Promise<void> {
  const items = await db.getAllAsync<Recurring>('SELECT * FROM recurring WHERE active = 1');
  const currentMonth = monthKey(todayISO());

  for (const item of items) {
    let cursor = monthKey(item.start_date);
    let guard = 0;
    while (cursor <= currentMonth && guard < 240) {
      const date = dateInMonth(cursor, item.day_of_month);
      if (date >= item.start_date && date <= todayISO()) {
        await db.runAsync(
          `INSERT OR IGNORE INTO transactions (type, amount, category_id, note, date, recurring_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          item.type,
          item.amount,
          item.category_id,
          item.note,
          date,
          item.id,
        );
      }
      cursor = addMonths(cursor, 1);
      guard += 1;
    }
  }
}

export interface GoalInput {
  name: string;
  target: number;
  deadline: string | null;
  color: string;
}

export async function addGoal(db: SQLiteDatabase, input: GoalInput): Promise<void> {
  await db.runAsync(
    'INSERT INTO goals (name, target, deadline, color) VALUES (?, ?, ?, ?)',
    input.name.trim(),
    input.target,
    input.deadline,
    input.color,
  );
}

export async function updateGoal(db: SQLiteDatabase, id: number, input: GoalInput): Promise<void> {
  await db.runAsync(
    'UPDATE goals SET name = ?, target = ?, deadline = ?, color = ? WHERE id = ?',
    input.name.trim(),
    input.target,
    input.deadline,
    input.color,
    id,
  );
}

export async function deleteGoal(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}

export async function addContribution(
  db: SQLiteDatabase,
  goalId: number,
  amount: number,
  date: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO goal_contributions (goal_id, amount, date) VALUES (?, ?, ?)',
    goalId,
    amount,
    date,
  );
}

export interface DebtInput {
  name: string;
  person: string;
  direction: 'owing' | 'owed';
  total: number;
  dueDate: string | null;
  note: string;
}

export async function addDebt(db: SQLiteDatabase, input: DebtInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO debts (name, person, direction, total, due_date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.name.trim(),
    input.person.trim(),
    input.direction,
    input.total,
    input.dueDate,
    input.note.trim(),
  );
}

export async function deleteDebt(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM debts WHERE id = ?', id);
}

export async function addDebtPayment(
  db: SQLiteDatabase,
  debtId: number,
  amount: number,
  date: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO debt_payments (debt_id, amount, date) VALUES (?, ?, ?)',
    debtId,
    amount,
    date,
  );
}

/** Charge des données d'exemple pour découvrir l'application. */
export async function loadDemoData(db: SQLiteDatabase): Promise<void> {
  if ((await getTransactions(db)).length > 0) return;

  const cats = await getCategories(db);
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;
  const month = monthKey(todayISO());
  const d = (day: number) => dateInMonth(month, day);

  await db.withTransactionAsync(async () => {
    const rows: [TransactionType, number, string, string, string][] = [
      ['income', 2400, 'Salaire', 'Salaire du mois', d(1)],
      ['expense', 620, 'Logement', 'Loyer', d(2)],
      ['expense', 78.5, 'Alimentation', 'Courses', d(3)],
      ['expense', 12.99, 'Abonnements', 'Musique', d(4)],
      ['expense', 45, 'Transport', 'Carburant', d(6)],
      ['expense', 32, 'Loisirs', 'Cinéma', d(8)],
      ['expense', 96.4, 'Alimentation', 'Courses', d(11)],
      ['income', 150, 'Revenus divers', 'Vente en ligne', d(12)],
      ['expense', 24, 'Santé', 'Pharmacie', d(14)],
      ['expense', 34.9, 'Abonnements', 'Internet', d(15)],
    ];
    for (const [type, amount, name, note, date] of rows) {
      await db.runAsync(
        'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)',
        type,
        amount,
        cat(name),
        note,
        date,
      );
    }

    await db.runAsync('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', cat('Alimentation'), 250);
    await db.runAsync('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', cat('Loisirs'), 100);
    await db.runAsync('INSERT INTO budgets (category_id, amount) VALUES (?, ?)', cat('Transport'), 80);

    const goalResult = await db.runAsync(
      'INSERT INTO goals (name, target, deadline, color) VALUES (?, ?, ?, ?)',
      'Voyage au Japon',
      2500,
      null,
      '#8B5CF6',
    );
    await db.runAsync(
      'INSERT INTO goal_contributions (goal_id, amount, date) VALUES (?, ?, ?)',
      goalResult.lastInsertRowId,
      650,
      d(5),
    );

    const debtResult = await db.runAsync(
      `INSERT INTO debts (name, person, direction, total, due_date, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      'Prêt voiture',
      'Banque',
      'owing',
      4000,
      null,
      'Remboursement mensuel',
    );
    await db.runAsync(
      'INSERT INTO debt_payments (debt_id, amount, date) VALUES (?, ?, ?)',
      debtResult.lastInsertRowId,
      500,
      d(10),
    );

    await db.runAsync(
      `INSERT INTO recurring (type, amount, category_id, note, day_of_month, start_date, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      'expense',
      620,
      cat('Logement'),
      'Loyer',
      2,
      d(1),
    );
  });
}

export async function clearAllData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of [
      'transactions',
      'recurring',
      'budgets',
      'goal_contributions',
      'goals',
      'debt_payments',
      'debts',
    ]) {
      await db.execAsync(`DELETE FROM ${table};`);
    }
  });
}
