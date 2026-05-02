import { useState } from 'react';
import { Card, Btn, EmptyState } from '../components/Primitives';
import { PersonBadge, CatBadge, SplitBadge, RecurringBadge, CSVBadge } from '../components/Badges';
import { AddExpenseModal } from '../components/AddExpenseModal';
import {
  CATEGORIES, addInstallment, addExpense, updateExpense, updateInstallmentPlan,
  updateRecurringExpense, deleteExpense, deleteInstallment, getInstallments,
  fmt, fmtDate, computeItemDebt,
} from '../data';
import type { ExpenseItem, InstallmentPlan, MonthlySummary, Person, CategoryRules, ExpenseSource } from '../types';

interface ExpensesViewProps {
  summary: MonthlySummary;
  rules: CategoryRules;
  onDataChange: () => void;
}

export function ExpensesView({ summary, rules, onDataChange }: ExpensesViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);
  const [filterPerson, setFilterPerson] = useState<'all' | Person>('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | ExpenseSource>('all');

  const allItems = summary.items;
  const filtered = allItems.filter(e =>
    (filterPerson === 'all' || e.payer === filterPerson) &&
    (filterCat === 'all' || e.category === filterCat) &&
    (filterSource === 'all' || e.source === filterSource)
  );

  async function handleSave(type: 'installment' | 'expense', data: Record<string, unknown>) {
    try {
      if (editingItem) {
        if (editingItem.source === 'recurring' && editingItem.recurringId) {
          await updateRecurringExpense(editingItem.recurringId, {
            description: data.description as string,
            payer: data.payer as Person,
            category: data.category as string,
            splitType: data.splitType as string,
            value: data.value as number,
            startDate: (data.startDate ?? data.date) as string,
          });
        } else if (editingItem.source === 'installment' && editingItem.installmentPlanId) {
          await updateInstallmentPlan(editingItem.installmentPlanId, {
            description: data.description as string,
            payer: data.payer as Person,
            category: data.category as string,
            splitType: data.splitType as string,
            totalValue: (data.totalValue ?? data.value) as number,
            installmentCount: data.installmentCount as number,
            startDate: (data.startDate ?? data.date) as string,
          });
        } else {
          await updateExpense(editingItem.id, data as Parameters<typeof updateExpense>[1]);
        }
        setEditingItem(null);
        setEditingPlan(null);
        onDataChange();
        return;
      }

      if (type === 'installment') {
        await addInstallment(data as Parameters<typeof addInstallment>[0]);
      } else {
        await addExpense(data as Parameters<typeof addExpense>[0]);
      }
      onDataChange();
    } catch (err) {
      console.error('[ExpensesView] Erro ao salvar:', err);
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  }

  async function handleDelete(item: ExpenseItem) {
    if (item.source === 'installment') {
      if (confirm('Este é um gasto parcelado. Deseja remover o parcelamento inteiro?')) {
        await deleteInstallment(item.installmentPlanId!);
        onDataChange();
      }
    } else {
      if (confirm('Remover este lançamento?')) {
        await deleteExpense(item.id);
        onDataChange();
      }
    }
  }

  async function handleEditClick(item: ExpenseItem) {
    if (item.source === 'installment' && item.installmentPlanId) {
      const plans = await getInstallments();
      const plan = plans.find(p => p.id === item.installmentPlanId) ?? null;
      setEditingPlan(plan);
    } else {
      setEditingPlan(null);
    }
    setEditingItem(item);
  }

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: '6px 10px', borderRadius: 8,
    border: '1.5px solid var(--orc-border)', background: '#fff', color: 'var(--orc-text)',
    width: 'auto', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A6A2' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  function buildPrefill() {
    if (!editingItem) return undefined;
    if (editingItem.source === 'installment' && editingPlan) {
      return {
        installments: true,
        payer: editingPlan.payer,
        description: editingPlan.description,
        date: editingPlan.startDate,
        value: editingPlan.totalValue,
        category: editingPlan.category,
        splitType: editingPlan.splitType,
        installmentCount: editingPlan.installmentCount,
      };
    }
    return {
      payer: editingItem.payer,
      description: editingItem.description,
      date: editingItem.date,
      value: editingItem.value,
      category: editingItem.category,
      splitType: editingItem.splitType,
    };
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filterPerson} onChange={e => setFilterPerson(e.target.value as 'all' | Person)} style={selectStyle}>
            <option value="all">Todos</option>
            <option value="barbara">Barbara</option>
            <option value="felipe">Felipe</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
            <option value="all">Todas categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as 'all' | ExpenseSource)} style={selectStyle}>
            <option value="all">Todas origens</option>
            <option value="manual">Manual</option>
            <option value="csv">Cartão (CSV)</option>
            <option value="installment">Parcelado</option>
            <option value="recurring">Fixo</option>
          </select>
        </div>
        <Btn onClick={() => setShowAdd(true)}>+ Novo lançamento</Btn>
      </div>

      {sorted.length === 0
        ? <EmptyState icon="📋" text="Nenhum lançamento" sub="Clique em '+ Novo lançamento' para começar" />
        : (
          <Card padding={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--orc-bg)' }}>
                    {['Data', 'Descrição', 'Quem pagou', 'Categoria', 'Quem arca', 'Valor', 'Acerto', '', ''].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--orc-text-3)', textAlign: 'left', padding: '9px 16px', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--orc-border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.querySelectorAll('td').forEach(td => (td.style.background = 'var(--orc-bg)'))}
                      onMouseLeave={e => e.currentTarget.querySelectorAll('td').forEach(td => (td.style.background = ''))}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--orc-text-2)', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {item.description}
                          {item.source === 'recurring' && <RecurringBadge />}
                          {item.source === 'csv' && <CSVBadge />}
                        </div>
                        {item.source === 'installment' && <div style={{ fontSize: 11, color: 'var(--orc-text-3)' }}>Parcelado</div>}
                      </td>
                      <td style={{ padding: '10px 16px' }}><PersonBadge person={item.payer} /></td>
                      <td style={{ padding: '10px 16px' }}><CatBadge cat={item.category} /></td>
                      <td style={{ padding: '10px 16px' }}><SplitBadge splitType={item.splitType} /></td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(item.value)}</div>
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const debt = computeItemDebt(item);
                          if (debt.amount < 0.01) {
                            return <span style={{ fontSize: 12, color: 'var(--orc-text-3)' }}>—</span>;
                          }
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <PersonBadge person={debt.debtor} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(debt.amount)}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => handleEditClick(item)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orc-text-3)', fontSize: 14, lineHeight: 1 }}
                          title="Editar">✎</button>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => handleDelete(item)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orc-text-3)', fontSize: 16, lineHeight: 1 }}
                          title="Remover">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onSave={handleSave} rules={rules} />
      )}

      {editingItem && (
        <AddExpenseModal
          onClose={() => { setEditingItem(null); setEditingPlan(null); }}
          onSave={handleSave}
          rules={rules}
          editMode
          prefill={buildPrefill()}
        />
      )}
    </div>
  );
}
