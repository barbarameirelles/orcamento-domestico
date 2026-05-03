import { useState } from 'react';
import { Card, EmptyState, Btn, UndoToast } from '../components/Primitives';
import { PersonBadge, CatBadge, SplitBadge } from '../components/Badges';
import { AddExpenseModal } from '../components/AddExpenseModal';
import {
  CATEGORIES, addInstallment, addExpense, updateExpense, updateInstallmentPlan,
  updateRecurringExpense, deleteExpense, deleteExpenses, restoreExpenses,
  deleteInstallment, getInstallments,
  fmt, fmtDate, computeItemDebt,
} from '../data';
import type { ExpenseItem, InstallmentPlan, MonthlySummary, Person, CategoryRules, ExpenseSource } from '../types';

interface ExpensesViewProps {
  summary: MonthlySummary;
  rules: CategoryRules;
  onDataChange: () => void;
}

type SortKey = 'date' | 'description' | 'payer' | 'category' | 'splitType' | 'value' | 'debt' | 'source';

const SOURCE_LABEL: Record<ExpenseSource, string> = {
  manual: 'Manual',
  csv: 'Cartão',
  installment: 'Parcelado',
  recurring: 'Fixo',
};

const SOURCE_STYLE: Record<ExpenseSource, { bg: string; color: string }> = {
  manual: { bg: '#EFEDE8', color: '#6A6864' },
  csv: { bg: '#E8E0F5', color: '#6A4FB5' },
  installment: { bg: '#E8F0FF', color: '#3A7BC8' },
  recurring: { bg: '#FFF3CD', color: '#9A6B00' },
};

function SourcePill({ source }: { source: ExpenseSource }) {
  const s = SOURCE_STYLE[source];
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100,
      background: s.bg, color: s.color,
      fontWeight: 600, fontSize: 11, padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {SOURCE_LABEL[source]}
    </span>
  );
}

// Only manual/csv expenses live as real rows in the `expenses` table and can
// be safely bulk-deleted. Installments and recurring are virtualized per month.
function isBulkDeletable(item: ExpenseItem): boolean {
  return item.source === 'manual' || item.source === 'csv';
}

export function ExpensesView({ summary, rules, onDataChange }: ExpensesViewProps) {
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);
  const [filterPerson, setFilterPerson] = useState<'all' | Person>('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | ExpenseSource>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ ids: string[]; message: string } | null>(null);

  async function handleUndo() {
    if (!undo) return;
    try {
      await restoreExpenses(undo.ids);
      setUndo(null);
      onDataChange();
    } catch (err) {
      console.error('[ExpensesView] Undo failed:', err);
      alert('Erro ao restaurar: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteExpenses(ids);
      setSelectedIds(new Set());
      onDataChange();
      setUndo({
        ids,
        message: `${ids.length} ${ids.length === 1 ? 'lançamento removido' : 'lançamentos removidos'}`,
      });
    } catch (err) {
      console.error('[ExpensesView] Bulk delete failed:', err);
      alert('Erro ao remover: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'value' || key === 'debt' ? 'desc' : 'asc');
    }
  }

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
          // Preserve original source — modal always sends 'manual' on save, but
          // editing a CSV/imported expense should keep its origin.
          const { source: _ignored, ...patch } = data as Record<string, unknown>;
          await updateExpense(editingItem.id, patch as Parameters<typeof updateExpense>[1]);
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
      // Installments hard-delete the entire plan, so still gate with confirm.
      if (confirm('Este é um gasto parcelado. Deseja remover o parcelamento inteiro?')) {
        await deleteInstallment(item.installmentPlanId!);
        onDataChange();
      }
      return;
    }
    if (item.source === 'recurring') {
      // Recurring items are virtualized — deletion is handled in Configurações.
      alert('Para remover um gasto fixo, vá em Configurações → Gastos fixos mensais.');
      return;
    }
    // Manual / CSV: soft delete with undo.
    try {
      await deleteExpense(item.id);
      onDataChange();
      setUndo({ ids: [item.id], message: 'Lançamento removido' });
    } catch (err) {
      console.error('[ExpensesView] Delete failed:', err);
      alert('Erro ao remover: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
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

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'date':
        return dir * a.date.localeCompare(b.date);
      case 'description':
        return dir * a.description.localeCompare(b.description, 'pt-BR');
      case 'payer':
        return dir * a.payer.localeCompare(b.payer);
      case 'category':
        return dir * a.category.localeCompare(b.category, 'pt-BR');
      case 'splitType':
        return dir * a.splitType.localeCompare(b.splitType);
      case 'value':
        return dir * (a.value - b.value);
      case 'debt':
        return dir * (computeItemDebt(a).amount - computeItemDebt(b).amount);
      case 'source':
        return dir * a.source.localeCompare(b.source);
      default:
        return 0;
    }
  });

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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
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
        <select
          className="orc-only-mobile"
          value={`${sortKey}:${sortDir}`}
          onChange={e => {
            const [k, d] = e.target.value.split(':') as [SortKey, 'asc' | 'desc'];
            setSortKey(k); setSortDir(d);
          }}
          style={selectStyle}>
          <option value="date:desc">Data ↓</option>
          <option value="date:asc">Data ↑</option>
          <option value="value:desc">Valor ↓</option>
          <option value="value:asc">Valor ↑</option>
          <option value="debt:desc">Acerto ↓</option>
          <option value="debt:asc">Acerto ↑</option>
          <option value="description:asc">Descrição A→Z</option>
          <option value="description:desc">Descrição Z→A</option>
          <option value="category:asc">Categoria A→Z</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 4,
          marginBottom: 12, padding: '10px 14px',
          background: 'oklch(94% 0.05 238)', border: '1px solid var(--orc-accent)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 14, color: 'var(--orc-text)' }}>
            <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" small onClick={() => setSelectedIds(new Set())}>Limpar</Btn>
            <Btn variant="danger" small onClick={handleBulkDelete}>Remover {selectedIds.size}</Btn>
          </div>
        </div>
      )}

      {sorted.length === 0
        ? <EmptyState icon="📋" text="Nenhum lançamento" sub="Clique em '+ Novo lançamento' para começar" />
        : (
          <Card padding={0}>
            <div className="orc-only-desktop" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--orc-bg)' }}>
                    <th style={{ padding: '9px 8px 9px 16px', width: 36 }}>
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos"
                        checked={(() => {
                          const eligible = sorted.filter(isBulkDeletable);
                          return eligible.length > 0 && eligible.every(i => selectedIds.has(i.id));
                        })()}
                        onChange={e => {
                          const eligible = sorted.filter(isBulkDeletable).map(i => i.id);
                          setSelectedIds(prev => {
                            if (e.target.checked) return new Set([...prev, ...eligible]);
                            const next = new Set(prev);
                            eligible.forEach(id => next.delete(id));
                            return next;
                          });
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--orc-accent)' }} />
                    </th>
                    {([
                      ['Data', 'date'],
                      ['Descrição', 'description'],
                      ['Origem', 'source'],
                      ['Quem pagou', 'payer'],
                      ['Categoria', 'category'],
                      ['Quem arca', 'splitType'],
                      ['Valor', 'value'],
                      ['Acerto', 'debt'],
                    ] as [string, SortKey][]).map(([label, key]) => {
                      const active = sortKey === key;
                      const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
                      return (
                        <th key={key}
                          onClick={() => toggleSort(key)}
                          style={{
                            fontSize: 11, fontWeight: 700,
                            color: active ? 'var(--orc-text)' : 'var(--orc-text-3)',
                            textAlign: 'left', padding: '9px 16px', textTransform: 'uppercase',
                            letterSpacing: '0.07em', whiteSpace: 'nowrap',
                            cursor: 'pointer', userSelect: 'none',
                          }}>
                          {label}{arrow && <span style={{ marginLeft: 4 }}>{arrow}</span>}
                        </th>
                      );
                    })}
                    <th style={{ padding: '9px 16px' }}></th>
                    <th style={{ padding: '9px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => {
                    const checked = selectedIds.has(item.id);
                    const canSelect = isBulkDeletable(item);
                    return (
                    <tr key={item.id}
                      style={{
                        borderTop: '1px solid var(--orc-border)',
                        transition: 'background 0.1s',
                        background: checked ? 'oklch(94% 0.05 238 / 0.4)' : undefined,
                      }}>
                      <td style={{ padding: '10px 8px 10px 16px' }}>
                        {canSelect && (
                          <input
                            type="checkbox"
                            aria-label="Selecionar lançamento"
                            checked={checked}
                            onChange={() => toggleSelect(item.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--orc-accent)' }} />
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--orc-text-2)', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>{item.description}</td>
                      <td style={{ padding: '10px 16px' }}><SourcePill source={item.source} /></td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="orc-only-mobile">
              {sorted.map(item => {
                const debt = computeItemDebt(item);
                const checked = selectedIds.has(item.id);
                const canSelect = isBulkDeletable(item);
                return (
                  <div key={item.id} style={{
                    padding: '14px 14px 12px', borderTop: '1px solid var(--orc-border)',
                    background: checked ? 'oklch(94% 0.05 238 / 0.4)' : undefined,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                        {canSelect && (
                          <input type="checkbox" aria-label="Selecionar"
                            checked={checked}
                            onChange={() => toggleSelect(item.id)}
                            style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer', accentColor: 'var(--orc-accent)' }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--orc-text-3)', marginBottom: 2 }}>{fmtDate(item.date)}</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--orc-text)', wordBreak: 'break-word' }}>{item.description}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(item.value)}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      <SourcePill source={item.source} />
                      <PersonBadge person={item.payer} />
                      <CatBadge cat={item.category} />
                      <SplitBadge splitType={item.splitType} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--orc-border)', paddingTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--orc-text-2)' }}>
                        {debt.amount < 0.01 ? (
                          <span>Sem acerto</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Acerto <PersonBadge person={debt.debtor} /> <strong style={{ color: 'var(--orc-text)' }}>{fmt(debt.amount)}</strong>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleEditClick(item)} aria-label="Editar"
                          style={{ background: 'var(--orc-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--orc-text-2)', fontSize: 14, width: 36, height: 36 }}>✎</button>
                        <button onClick={() => handleDelete(item)} aria-label="Remover"
                          style={{ background: 'var(--orc-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--orc-text-2)', fontSize: 18, width: 36, height: 36 }}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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

      {undo && (
        <UndoToast
          message={undo.message}
          onUndo={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  );
}
