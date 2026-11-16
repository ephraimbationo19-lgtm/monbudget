import { addMonths, monthKey } from '@/lib/date';
import type {
  Budget,
  Category,
  Debt,
  DebtPayment,
  Goal,
  GoalContribution,
  Transaction,
} from '@/types';

export interface MonthTotals {
  income: number;
  expense: number;
  balance: number;
}

export function totalsForMonth(transactions: Transaction[], month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (monthKey(t.date) !== month) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export interface CategoryTotal extends Category {
  total: number;
  percent: number;
}

export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  month: string,
): CategoryTotal[] {
  const sums = new Map<number, number>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue;
    sums.set(t.category_id, (sums.get(t.category_id) ?? 0) + t.amount);
    total += t.amount;
  }
  return categories
    .filter((c) => c.type === 'expense' && (sums.get(c.id) ?? 0) > 0)
    .map((c) => {
      const value = sums.get(c.id) ?? 0;
      return { ...c, total: value, percent: total > 0 ? (value / total) * 100 : 0 };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MonthPoint {
  key: string;
  income: number;
  expense: number;
}

export function lastMonths(transactions: Transaction[], count: number, endMonth: string): MonthPoint[] {
  const months: MonthPoint[] = [];
  let cursor = endMonth;
  for (let i = 0; i < count; i += 1) {
    months.unshift({ key: cursor, income: 0, expense: 0 });
    cursor = addMonths(cursor, -1);
  }
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const t of transactions) {
    const i = index.get(monthKey(t.date));
    if (i === undefined) continue;
    if (t.type === 'income') months[i].income += t.amount;
    else months[i].expense += t.amount;
  }
  return months;
}

export interface BudgetStatus {
  budget: Budget;
  category: Category;
  spent: number;
  ratio: number;
  remaining: number;
}

export function budgetStatuses(
  budgets: Budget[],
  categories: Category[],
  transactions: Transaction[],
  month: string,
): BudgetStatus[] {
  return budgets
    .map((budget) => {
      const category = categories.find((c) => c.id === budget.category_id);
      if (!category) return null;
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === budget.category_id &&
            monthKey(t.date) === month,
        )
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        budget,
        category,
        spent,
        ratio: budget.amount > 0 ? spent / budget.amount : 0,
        remaining: budget.amount - spent,
      };
    })
    .filter((item): item is BudgetStatus => item !== null)
    .sort((a, b) => b.ratio - a.ratio);
}

export function goalSaved(goal: Goal, contributions: GoalContribution[]): number {
  return contributions
    .filter((c) => c.goal_id === goal.id)
    .reduce((sum, c) => sum + c.amount, 0);
}

export function debtRemaining(debt: Debt, payments: DebtPayment[]): number {
  const paid = payments
    .filter((p) => p.debt_id === debt.id)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, debt.total - paid);
}

export function debtPaid(debt: Debt, payments: DebtPayment[]): number {
  return payments.filter((p) => p.debt_id === debt.id).reduce((sum, p) => sum + p.amount, 0);
}
