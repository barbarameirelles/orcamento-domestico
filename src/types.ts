export type Person = 'barbara' | 'felipe';
export type SplitType = '50/50' | 'barbara' | 'felipe' | string;
export type ExpenseSource = 'manual' | 'csv' | 'installment';

export interface Expense {
  id: string;
  description: string;
  payer: Person;
  date: string; // YYYY-MM-DD
  value: number;
  category: string;
  splitType: SplitType;
  source: ExpenseSource;
  createdAt: string;
}

export interface InstallmentPlan {
  id: string;
  description: string;
  payer: Person;
  startDate: string; // YYYY-MM-DD
  totalValue: number;
  installmentCount: number;
  valuePerInstallment: number;
  category: string;
  splitType: SplitType;
  createdAt: string;
}

export type CategoryRules = Record<string, SplitType>;

export interface ExpenseItem extends Omit<Expense, 'id'> {
  id: string;
  source: ExpenseSource;
  installmentPlanId?: string;
}

export interface MonthlySummary {
  items: ExpenseItem[];
  barbaraPaid: number;
  felipePaid: number;
  barbaraOwes: number;
  felipeOwes: number;
  barbaraBalance: number;
  felipeBalance: number;
  byCategory: Record<string, { total: number; barbara: number; felipe: number }>;
  owes: { from: Person; to: Person; amount: number } | null;
  total: number;
}

export type NavTab = 'resumo' | 'gastos' | 'importar' | 'parcelados' | 'historico' | 'config';
