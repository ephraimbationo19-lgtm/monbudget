export type TransactionType = 'expense' | 'income';
export type DebtDirection = 'owing' | 'owed';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_default: number;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  note: string;
  date: string;
  created_at: string;
  recurring_id: number | null;
}

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
}

export interface Recurring {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  note: string;
  day_of_month: number;
  start_date: string;
  active: number;
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  deadline: string | null;
  color: string;
  created_at: string;
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
}

export interface Debt {
  id: number;
  name: string;
  person: string;
  direction: DebtDirection;
  total: number;
  due_date: string | null;
  note: string;
  created_at: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  date: string;
}
