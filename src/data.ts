import type { Expense, InstallmentPlan, RecurringExpense, CategoryRules, MonthlySummary, ExpenseItem, SplitType } from './types';

const KEYS = {
  expenses: 'orc_expenses',
  installments: 'orc_installments',
  categoryRules: 'orc_category_rules',
  recurring: 'orc_recurring',
} as const;

const DEFAULT_RECURRING: RecurringExpense[] = [
  { id: 'fixed_moradia', description: 'Moradia', payer: 'barbara', startDate: '2026-01-01', value: 1300, category: 'Moradia', splitType: 'barbara', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fixed_saude', description: 'Plano de Saúde', payer: 'barbara', startDate: '2026-01-01', value: 700, category: 'Saúde', splitType: 'barbara', createdAt: '2026-01-01T00:00:00.000Z' },
];

export const CATEGORIES = ['Moradia', 'Alimentação', 'Lazer', 'Assinaturas', 'Pets', 'Saúde', 'Outros'] as const;

export const CAT_COLORS: Record<string, string> = {
  Moradia: '#5B8DB8',
  Alimentação: '#C47D3A',
  Lazer: '#8B5FB5',
  Assinaturas: '#3A8A7A',
  Pets: '#6A9E6A',
  Saúde: '#D4707A',
  Outros: '#9E7070',
};

export const DEFAULT_RULES: CategoryRules = {
  Moradia: '50/50',
  Alimentação: '50/50',
  Lazer: '50/50',
  Assinaturas: '50/50',
  Pets: '50/50',
  Saúde: '50/50',
  Outros: '50/50',
};

function load<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Expenses ──────────────────────────────────────────────────────────────

export function getExpenses(): Expense[] {
  return load<Expense[]>(KEYS.expenses, []);
}

export function addExpense(exp: Omit<Expense, 'id' | 'createdAt'>): Expense {
  const expenses = getExpenses();
  const newExp: Expense = { ...exp, id: uuid(), createdAt: new Date().toISOString() };
  save(KEYS.expenses, [...expenses, newExp]);
  return newExp;
}

export function addExpenses(list: Omit<Expense, 'id' | 'createdAt'>[]): Expense[] {
  const expenses = getExpenses();
  const newOnes = list.map(e => ({ ...e, id: uuid(), createdAt: new Date().toISOString() } as Expense));
  save(KEYS.expenses, [...expenses, ...newOnes]);
  return newOnes;
}

export function deleteExpense(id: string) {
  save(KEYS.expenses, getExpenses().filter(e => e.id !== id));
}

export function updateExpense(id: string, patch: Partial<Expense>) {
  save(KEYS.expenses, getExpenses().map(e => (e.id === id ? { ...e, ...patch } : e)));
}

// ── Installment Plans ─────────────────────────────────────────────────────

export function getInstallments(): InstallmentPlan[] {
  return load<InstallmentPlan[]>(KEYS.installments, []);
}

export function addInstallment(plan: Omit<InstallmentPlan, 'id' | 'valuePerInstallment' | 'createdAt'>): InstallmentPlan {
  const plans = getInstallments();
  const vpi = parseFloat((plan.totalValue / plan.installmentCount).toFixed(2));
  const newPlan: InstallmentPlan = { ...plan, id: uuid(), valuePerInstallment: vpi, createdAt: new Date().toISOString() };
  save(KEYS.installments, [...plans, newPlan]);
  return newPlan;
}

export function deleteInstallment(id: string) {
  save(KEYS.installments, getInstallments().filter(p => p.id !== id));
}

// ── Recurring Expenses ────────────────────────────────────────────────────

export function getRecurringExpenses(): RecurringExpense[] {
  const stored = load<RecurringExpense[] | null>(KEYS.recurring, null);
  if (stored === null) return DEFAULT_RECURRING;
  return stored;
}

export function addRecurringExpense(r: Omit<RecurringExpense, 'id' | 'createdAt'>): RecurringExpense {
  const list = getRecurringExpenses();
  const newR: RecurringExpense = { ...r, id: uuid(), createdAt: new Date().toISOString() };
  save(KEYS.recurring, [...list, newR]);
  return newR;
}

export function deleteRecurringExpense(id: string) {
  const list = getRecurringExpenses();
  save(KEYS.recurring, list.filter(r => r.id !== id));
}

export function updateRecurringExpense(id: string, patch: Partial<RecurringExpense>) {
  save(KEYS.recurring, getRecurringExpenses().map(r => (r.id === id ? { ...r, ...patch } : r)));
}

// ── Category Rules ────────────────────────────────────────────────────────

export function getCategoryRules(): CategoryRules {
  return { ...DEFAULT_RULES, ...load<CategoryRules>(KEYS.categoryRules, {}) };
}

export function setCategoryRules(rules: CategoryRules) {
  save(KEYS.categoryRules, rules);
}

// ── Time Helpers ──────────────────────────────────────────────────────────

export function toYM(date: string): string {
  return date.substring(0, 7);
}

export function addMonthsToYM(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

// ── Split Parsing ─────────────────────────────────────────────────────────

export function parseSplit(splitType: SplitType): [number, number] {
  if (!splitType) return [50, 50];
  if (splitType === 'barbara') return [0, 100];
  if (splitType === 'felipe') return [100, 0];
  const m = splitType.match(/^(\d+)\/(\d+)$/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  return [50, 50];
}

// ── Monthly Computation ───────────────────────────────────────────────────

export function computeMonth(yearMonth: string): MonthlySummary {
  const expenses = getExpenses().filter(e => toYM(e.date) === yearMonth);

  const recurringItems: ExpenseItem[] = [];
  getRecurringExpenses().forEach(r => {
    if (yearMonth >= toYM(r.startDate)) {
      recurringItems.push({
        id: r.id + '_' + yearMonth,
        description: r.description,
        payer: r.payer,
        date: yearMonth + '-01',
        value: r.value,
        category: r.category,
        splitType: r.splitType,
        source: 'recurring',
        createdAt: r.createdAt,
      });
    }
  });

  const installmentItems: ExpenseItem[] = [];
  getInstallments().forEach(plan => {
    const start = toYM(plan.startDate);
    const end = addMonthsToYM(start, plan.installmentCount - 1);
    if (yearMonth >= start && yearMonth <= end) {
      const num = monthDiff(start, yearMonth) + 1;
      installmentItems.push({
        id: plan.id + '_' + yearMonth,
        description: `${plan.description} (${num}/${plan.installmentCount})`,
        payer: plan.payer,
        date: yearMonth + '-01',
        value: plan.valuePerInstallment,
        category: plan.category,
        splitType: plan.splitType,
        source: 'installment',
        installmentPlanId: plan.id,
        createdAt: plan.createdAt,
      });
    }
  });

  return computeSummary([...recurringItems, ...expenses, ...installmentItems]);
}

export function computeSummary(items: ExpenseItem[]): MonthlySummary {
  let barbaraPaid = 0, felipePaid = 0;
  let barbaraOwes = 0, felipeOwes = 0;
  const byCategory: Record<string, { total: number; barbara: number; felipe: number }> = {};

  items.forEach(item => {
    const v = Number(item.value) || 0;
    if (item.payer === 'barbara') barbaraPaid += v;
    else felipePaid += v;

    const [bPct, fPct] = parseSplit(item.splitType);
    const bCost = v * bPct / 100;
    const fCost = v * fPct / 100;

    barbaraOwes += bCost;
    felipeOwes += fCost;

    const cat = item.category || 'Outros';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, barbara: 0, felipe: 0 };
    byCategory[cat].total += v;
    byCategory[cat].barbara += bCost;
    byCategory[cat].felipe += fCost;
  });

  const barbaraBalance = barbaraPaid - barbaraOwes;
  const felipeBalance = felipePaid - felipeOwes;

  let owes: MonthlySummary['owes'] = null;
  if (barbaraBalance < -0.01) owes = { from: 'barbara', to: 'felipe', amount: Math.abs(barbaraBalance) };
  else if (felipeBalance < -0.01) owes = { from: 'felipe', to: 'barbara', amount: Math.abs(felipeBalance) };

  return {
    items,
    barbaraPaid,
    felipePaid,
    barbaraOwes,
    felipeOwes,
    barbaraBalance,
    felipeBalance,
    byCategory,
    owes,
    total: barbaraPaid + felipePaid,
  };
}

export function getAvailableMonths(): string[] {
  const months = new Set<string>();
  getExpenses().forEach(e => months.add(toYM(e.date)));
  getInstallments().forEach(p => {
    const start = toYM(p.startDate);
    for (let i = 0; i < p.installmentCount; i++) months.add(addMonthsToYM(start, i));
  });
  const now = new Date();
  months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  return Array.from(months).sort().reverse();
}

// ── CSV Parsing ───────────────────────────────────────────────────────────

export interface ParsedCSVRow {
  description: string;
  date: string;
  value: number;
  category: string;
  splitType: SplitType;
  source: 'csv';
  _raw: string;
}

export function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map(c => c.trim().replace(/"/g, '').toLowerCase());

  const dateIdx = header.findIndex(h => h.includes('data') || h.includes('date'));
  const descIdx = header.findIndex(h => h.includes('hist') || h.includes('lan') || h.includes('desc') || h.includes('memo'));
  const valIdx = header.reduce((last, h, i) => (h.includes('valor') || h.includes('value') || h.includes('amount') ? i : last), -1);

  const dI = dateIdx >= 0 ? dateIdx : 0;
  const descI = descIdx >= 0 ? descIdx : 1;
  const valI = valIdx >= 0 ? valIdx : 2;

  const results: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;

    let date: string | null = null;
    const raw = cols[dI] || '';
    const dm = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const dm2 = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dm) date = `${dm[3]}-${dm[2]}-${dm[1]}`;
    else if (dm2) date = raw.substring(0, 10);

    const rawVal = (cols[valI] || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
    const v = parseFloat(rawVal);

    if (!date || isNaN(v)) continue;
    if (v >= 0) continue;

    const description = cols[descI] || 'Importado';
    results.push({ description, date, value: Math.abs(v), category: 'Outros', splitType: '50/50', source: 'csv', _raw: lines[i] });
  }
  return results;
}

// ── Formatting ────────────────────────────────────────────────────────────

export function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${names[parseInt(m) - 1]} ${y}`;
}

export function fmtDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function currentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
