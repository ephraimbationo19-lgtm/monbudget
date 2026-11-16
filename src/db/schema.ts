import type { SQLiteDatabase } from 'expo-sqlite';

import { categoryPalette } from '@/theme';

const DEFAULT_CATEGORIES: { name: string; type: 'expense' | 'income'; icon: string }[] = [
  { name: 'Alimentation', type: 'expense', icon: 'food-apple' },
  { name: 'Logement', type: 'expense', icon: 'home' },
  { name: 'Transport', type: 'expense', icon: 'car' },
  { name: 'Santé', type: 'expense', icon: 'heart-pulse' },
  { name: 'Loisirs', type: 'expense', icon: 'gamepad-variant' },
  { name: 'Shopping', type: 'expense', icon: 'shopping' },
  { name: 'Abonnements', type: 'expense', icon: 'repeat' },
  { name: 'Autre', type: 'expense', icon: 'dots-horizontal' },
  { name: 'Salaire', type: 'income', icon: 'cash' },
  { name: 'Revenus divers', type: 'income', icon: 'currency-eur' },
  { name: 'Cadeau', type: 'income', icon: 'gift' },
];

const DATABASE_VERSION = 3;

/** Appelé par SQLiteProvider au démarrage. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = versionRow?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return;

  await db.withTransactionAsync(async () => {
    if (current < 1) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount REAL NOT NULL CHECK (amount > 0),
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          note TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          recurring_id INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring
          ON transactions(recurring_id, date) WHERE recurring_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
          amount REAL NOT NULL CHECK (amount > 0)
        );

        CREATE TABLE IF NOT EXISTS recurring (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount REAL NOT NULL CHECK (amount > 0),
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          note TEXT NOT NULL DEFAULT '',
          day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
          start_date TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          target REAL NOT NULL CHECK (target > 0),
          deadline TEXT,
          color TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS goal_contributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          amount REAL NOT NULL,
          date TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          person TEXT NOT NULL DEFAULT '',
          direction TEXT NOT NULL CHECK (direction IN ('owing', 'owed')),
          total REAL NOT NULL CHECK (total > 0),
          due_date TEXT,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
          amount REAL NOT NULL CHECK (amount > 0),
          date TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 1) {
        const cat = DEFAULT_CATEGORIES[i];
        await db.runAsync(
          'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 1)',
          cat.name,
          cat.type,
          categoryPalette[i % categoryPalette.length],
          cat.icon,
        );
      }
      await db.runAsync("INSERT INTO settings (key, value) VALUES ('currency', 'XOF')");
      current = 1;
    }

    if (current < 2) {
      // Migration : la devise par défaut devient le franc CFA (Burkina Faso).
      await db.runAsync(
        "UPDATE settings SET value = 'XOF' WHERE key = 'currency' AND value = 'EUR'",
      );
      current = 2;
    }

    if (current < 3) {
      // Suivi des SMS déjà importés + option d'import automatique.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS imported_sms (
          sms_id TEXT PRIMARY KEY,
          date TEXT,
          type TEXT,
          amount REAL,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await db.runAsync("INSERT OR IGNORE INTO settings (key, value) VALUES ('sms_auto_import', '1')");
      current = 3;
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
  });
}
