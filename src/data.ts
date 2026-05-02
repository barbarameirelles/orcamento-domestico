import { supabase, isSupabaseEnabled } from './lib/supabase';
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

// ── localStorage helpers ──────────────────────────────────────────────────

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

// ── DB mappers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expenseFromDb(r: any): Expense {
  return {
    id: r.id,
    description: r.description,
    payer: r.payer,
    date: r.date,
    value: Number(r.value),
    category: r.category,
    splitType: r.split_type,
    source: r.source,
    createdAt: r.created_at,
  };
}

function expenseToDb(e: Expense) {
  return {
    id: e.id,
    description: e.description,
    payer: e.payer,
    date: e.date,
    value: e.value,
    category: e.category,
    split_type: e.splitType,
    source: e.source,
    created_at: e.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function planFromDb(r: any): InstallmentPlan {
  return {
    id: r.id,
    description: r.description,
    payer: r.payer,
    startDate: r.start_date,
    totalValue: Number(r.total_value),
    installmentCount: Number(r.installment_count),
    valuePerInstallment: Number(r.value_per_installment),
    category: r.category,
    splitType: r.split_type,
    createdAt: r.created_at,
  };
}

function planToDb(p: InstallmentPlan) {
  return {
    id: p.id,
    description: p.description,
    payer: p.payer,
    start_date: p.startDate,
    total_value: p.totalValue,
    installment_count: p.installmentCount,
    value_per_installment: p.valuePerInstallment,
    category: p.category,
    split_type: p.splitType,
    created_at: p.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recurringFromDb(r: any): RecurringExpense {
  return {
    id: r.id,
    description: r.description,
    payer: r.payer,
    startDate: r.start_date,
    value: Number(r.value),
    category: r.category,
    splitType: r.split_type,
    createdAt: r.created_at,
  };
}

function recurringToDb(r: RecurringExpense) {
  return {
    id: r.id,
    description: r.description,
    payer: r.payer,
    start_date: r.startDate,
    value: r.value,
    category: r.category,
    split_type: r.splitType,
    created_at: r.createdAt,
  };
}

// ── Expenses ──────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase!.from('expenses').select('*');
    if (error) throw error;
    return (data || []).map(expenseFromDb);
  }
  return load<Expense[]>(KEYS.expenses, []);
}

export async function addExpense(exp: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const newExp: Expense = { ...exp, id: uuid(), createdAt: new Date().toISOString() };
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('expenses').insert(expenseToDb(newExp));
    if (error) throw error;
  } else {
    const expenses = load<Expense[]>(KEYS.expenses, []);
    save(KEYS.expenses, [...expenses, newExp]);
  }
  return newExp;
}

export async function addExpenses(list: Omit<Expense, 'id' | 'createdAt'>[]): Promise<Expense[]> {
  const newOnes = list.map(e => ({ ...e, id: uuid(), createdAt: new Date().toISOString() } as Expense));
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('expenses').insert(newOnes.map(expenseToDb));
    if (error) throw error;
  } else {
    const expenses = load<Expense[]>(KEYS.expenses, []);
    save(KEYS.expenses, [...expenses, ...newOnes]);
  }
  return newOnes;
}

export async function deleteExpense(id: string): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('expenses').delete().eq('id', id);
    if (error) throw error;
  } else {
    save(KEYS.expenses, load<Expense[]>(KEYS.expenses, []).filter(e => e.id !== id));
  }
}

export async function updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
  if (isSupabaseEnabled) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.payer !== undefined) dbPatch.payer = patch.payer;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.splitType !== undefined) dbPatch.split_type = patch.splitType;
    if (patch.source !== undefined) dbPatch.source = patch.source;
    const { error } = await supabase!.from('expenses').update(dbPatch).eq('id', id);
    if (error) throw error;
  } else {
    save(KEYS.expenses, load<Expense[]>(KEYS.expenses, []).map(e => (e.id === id ? { ...e, ...patch } : e)));
  }
}

// ── Installment Plans ─────────────────────────────────────────────────────

export async function getInstallments(): Promise<InstallmentPlan[]> {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase!.from('installment_plans').select('*');
    if (error) throw error;
    return (data || []).map(planFromDb);
  }
  return load<InstallmentPlan[]>(KEYS.installments, []);
}

export async function addInstallment(plan: Omit<InstallmentPlan, 'id' | 'valuePerInstallment' | 'createdAt'>): Promise<InstallmentPlan> {
  const vpi = parseFloat((plan.totalValue / plan.installmentCount).toFixed(2));
  const newPlan: InstallmentPlan = { ...plan, id: uuid(), valuePerInstallment: vpi, createdAt: new Date().toISOString() };
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('installment_plans').insert(planToDb(newPlan));
    if (error) throw error;
  } else {
    const plans = load<InstallmentPlan[]>(KEYS.installments, []);
    save(KEYS.installments, [...plans, newPlan]);
  }
  return newPlan;
}

export async function updateInstallmentPlan(
  id: string,
  patch: Partial<Omit<InstallmentPlan, 'id' | 'createdAt'>>
): Promise<void> {
  if (isSupabaseEnabled) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.payer !== undefined) dbPatch.payer = patch.payer;
    if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.splitType !== undefined) dbPatch.split_type = patch.splitType;
    if (patch.totalValue !== undefined || patch.installmentCount !== undefined) {
      const { data } = await supabase!.from('installment_plans').select('total_value,installment_count').eq('id', id).single();
      const tv = patch.totalValue ?? Number(data?.total_value);
      const ic = patch.installmentCount ?? Number(data?.installment_count);
      dbPatch.total_value = tv;
      dbPatch.installment_count = ic;
      dbPatch.value_per_installment = parseFloat((tv / ic).toFixed(2));
    }
    const { error } = await supabase!.from('installment_plans').update(dbPatch).eq('id', id);
    if (error) throw error;
  } else {
    save(KEYS.installments, load<InstallmentPlan[]>(KEYS.installments, []).map(p => {
      if (p.id !== id) return p;
      const merged = { ...p, ...patch };
      if (patch.totalValue !== undefined || patch.installmentCount !== undefined) {
        merged.valuePerInstallment = parseFloat((merged.totalValue / merged.installmentCount).toFixed(2));
      }
      return merged;
    }));
  }
}

export async function deleteInstallment(id: string): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('installment_plans').delete().eq('id', id);
    if (error) throw error;
  } else {
    save(KEYS.installments, load<InstallmentPlan[]>(KEYS.installments, []).filter(p => p.id !== id));
  }
}

// ── Recurring Expenses ────────────────────────────────────────────────────

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase!.from('recurring_expenses').select('*');
    if (error) throw error;
    if (!data || data.length === 0) {
      // Semeia os defaults no banco para que edições futuras funcionem
      const { error: seedError } = await supabase!
        .from('recurring_expenses')
        .upsert(DEFAULT_RECURRING.map(recurringToDb), { onConflict: 'id' });
      if (seedError) console.warn('Seed recurring failed:', seedError);
      return DEFAULT_RECURRING;
    }
    return data.map(recurringFromDb);
  }
  const stored = load<RecurringExpense[] | null>(KEYS.recurring, null);
  if (stored === null) return DEFAULT_RECURRING;
  return stored;
}

export async function addRecurringExpense(r: Omit<RecurringExpense, 'id' | 'createdAt'>): Promise<RecurringExpense> {
  const newR: RecurringExpense = { ...r, id: uuid(), createdAt: new Date().toISOString() };
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('recurring_expenses').insert(recurringToDb(newR));
    if (error) throw error;
  } else {
    const list = load<RecurringExpense[] | null>(KEYS.recurring, null) ?? DEFAULT_RECURRING;
    save(KEYS.recurring, [...list, newR]);
  }
  return newR;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await supabase!.from('recurring_expenses').delete().eq('id', id);
    if (error) throw error;
  } else {
    const list = load<RecurringExpense[] | null>(KEYS.recurring, null) ?? DEFAULT_RECURRING;
    save(KEYS.recurring, list.filter(r => r.id !== id));
  }
}

export async function updateRecurringExpense(id: string, patch: Partial<RecurringExpense>): Promise<void> {
  if (isSupabaseEnabled) {
    // Busca o registro atual (pode ser um default que ainda não está no banco)
    const { data: existing } = await supabase!.from('recurring_expenses').select('*').eq('id', id).single();
    const base: RecurringExpense = existing ? recurringFromDb(existing) : (DEFAULT_RECURRING.find(r => r.id === id) ?? DEFAULT_RECURRING[0]);
    const merged = { ...base, ...patch };
    const { error } = await supabase!.from('recurring_expenses').upsert(recurringToDb(merged), { onConflict: 'id' });
    if (error) throw error;
  } else {
    const list = load<RecurringExpense[] | null>(KEYS.recurring, null) ?? DEFAULT_RECURRING;
    save(KEYS.recurring, list.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }
}

// ── Category Rules ────────────────────────────────────────────────────────

export async function getCategoryRules(): Promise<CategoryRules> {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase!.from('category_rules').select('*');
    if (error) throw error;
    const rules: CategoryRules = { ...DEFAULT_RULES };
    (data || []).forEach((r: { key: string; value: string }) => { rules[r.key] = r.value; });
    return rules;
  }
  return { ...DEFAULT_RULES, ...load<CategoryRules>(KEYS.categoryRules, {}) };
}

export async function setCategoryRules(rules: CategoryRules): Promise<void> {
  if (isSupabaseEnabled) {
    const rows = Object.entries(rules).map(([key, value]) => ({ key, value }));
    const { error } = await supabase!.from('category_rules').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  } else {
    save(KEYS.categoryRules, rules);
  }
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
  if (splitType === 'barbara') return [100, 0]; // Barbara arca com 100%, Felipe 0%
  if (splitType === 'felipe') return [0, 100];  // Felipe arca com 100%, Barbara 0%
  const m = splitType.match(/^(\d+)\/(\d+)$/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  return [50, 50];
}

export function computeItemDebt(item: { value: number; splitType: SplitType; payer: 'barbara' | 'felipe' }): { debtor: 'barbara' | 'felipe'; amount: number } {
  const [bPct, fPct] = parseSplit(item.splitType);
  if (item.payer === 'barbara') {
    return { debtor: 'felipe', amount: item.value * fPct / 100 };
  }
  return { debtor: 'barbara', amount: item.value * bPct / 100 };
}

// ── Monthly Computation ───────────────────────────────────────────────────

export async function computeMonth(yearMonth: string): Promise<MonthlySummary> {
  const [expenses, recurringList, installmentList] = await Promise.all([
    getExpenses(),
    getRecurringExpenses(),
    getInstallments(),
  ]);

  const monthExpenses = expenses.filter(e => toYM(e.date) === yearMonth);

  const recurringItems: ExpenseItem[] = [];
  recurringList.forEach(r => {
    if (yearMonth >= toYM(r.startDate)) {
      recurringItems.push({
        id: r.id + '_' + yearMonth,
        recurringId: r.id,
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
  installmentList.forEach(plan => {
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

  return computeSummary([...recurringItems, ...monthExpenses, ...installmentItems]);
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

export async function getAvailableMonths(): Promise<string[]> {
  const [expenses, installments] = await Promise.all([getExpenses(), getInstallments()]);
  const months = new Set<string>();
  expenses.forEach(e => months.add(toYM(e.date)));
  installments.forEach(p => {
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

function parseMoney(raw: string): number {
  const clean = raw.replace(/[^\d.,\-]/g, '');
  if (!clean) return NaN;
  const sign = clean.startsWith('-') ? -1 : 1;
  const digits = clean.replace(/^-/, '');
  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep === -1) return sign * parseFloat(digits);
  const decDigits = digits.length - 1 - lastSep;
  if (decDigits >= 1 && decDigits <= 2) {
    const intPart = digits.substring(0, lastSep).replace(/[.,]/g, '');
    const decPart = digits.substring(lastSep + 1);
    return sign * parseFloat((intPart || '0') + '.' + decPart);
  }
  return sign * parseFloat(digits.replace(/[.,]/g, ''));
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

  const rawRows: { date: string; description: string; value: number; line: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;

    let date: string | null = null;
    const raw = cols[dI] || '';
    const dm = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const dm2 = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dm) date = `${dm[3]}-${dm[2]}-${dm[1]}`;
    else if (dm2) date = raw.substring(0, 10);

    const v = parseMoney(cols[valI] || '');
    if (!date || isNaN(v) || v === 0) continue;

    rawRows.push({ date, description: cols[descI] || 'Importado', value: v, line: lines[i] });
  }

  // Auto-detect sign convention: keep the dominant side (by sum), drop refunds/payments on the other side.
  const posSum = rawRows.filter(r => r.value > 0).reduce((s, r) => s + r.value, 0);
  const negSum = rawRows.filter(r => r.value < 0).reduce((s, r) => s - r.value, 0);
  const expenseSign = posSum >= negSum ? 1 : -1;

  return rawRows
    .filter(r => (r.value > 0 ? 1 : -1) === expenseSign)
    .map(r => ({
      description: r.description,
      date: r.date,
      value: Math.abs(r.value),
      category: 'Outros',
      splitType: '50/50',
      source: 'csv' as const,
      _raw: r.line,
    }));
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
