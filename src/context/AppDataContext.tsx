import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import * as repo from '@/db/repository';
import { autoImportMoneySms } from '@/lib/autoImport';
import type {
  Budget,
  Category,
  Debt,
  DebtPayment,
  Goal,
  GoalContribution,
  Recurring,
  Transaction,
} from '@/types';

interface AppData {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  goals: Goal[];
  contributions: GoalContribution[];
  debts: Debt[];
  payments: DebtPayment[];
  currency: string;
  smsAutoImport: boolean;
}

const EMPTY_DATA: AppData = {
  categories: [],
  transactions: [],
  budgets: [],
  recurring: [],
  goals: [],
  contributions: [],
  debts: [],
  payments: [],
  currency: 'XOF',
  smsAutoImport: true,
};

interface AppDataContextValue extends AppData {
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await repo.generateRecurring(db);
      const [
        categories,
        transactions,
        budgets,
        recurring,
        goals,
        contributions,
        debts,
        payments,
        currency,
        smsAutoImport,
      ] = await Promise.all([
        repo.getCategories(db),
        repo.getTransactions(db),
        repo.getBudgets(db),
        repo.getRecurring(db),
        repo.getGoals(db),
        repo.getContributions(db),
        repo.getDebts(db),
        repo.getPayments(db),
        repo.getCurrency(db),
        repo.getSetting(db, 'sms_auto_import', '1'),
      ]);
      setData({
        categories,
        transactions,
        budgets,
        recurring,
        goals,
        contributions,
        debts,
        payments,
        currency,
        smsAutoImport: smsAutoImport === '1',
      });
    } catch (error) {
      console.error('Impossible de charger les données', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    // Chargement initial depuis la base SQLite (système externe).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let mounted = true;
    const runImport = async () => {
      try {
        const count = await autoImportMoneySms(db);
        if (count > 0 && mounted) await refresh();
      } catch (error) {
        console.warn('Import automatique des SMS :', error);
      }
    };
    void runImport();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runImport();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [db, refresh]);

  return <AppDataContext.Provider value={{ ...data, loading, refresh }}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData doit être utilisé dans AppDataProvider');
  return context;
}
