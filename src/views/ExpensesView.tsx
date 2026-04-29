import { useState } from 'react';
import { Card, Btn, EmptyState } from '../components/Primitives';
import { PersonBadge, CatBadge, SplitBadge } from '../components/Badges';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { computeMonth, getCategoryRules, CATEGORIES, addInstallment, addExpense, deleteExpense, deleteInstallment, fmt, fmtDate } from '../data';
import type { Person } from '../types';

interface ExpensesViewProps {
  month: string;
  onDataChange: () => void;
}

export function ExpensesView({ month, onDataChange }: ExpensesViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterPerson, setFilterPerson] = useState<'all' | Person>('all');
  const [filterCat, setFilterCat] = useState('all');
  const rules = getCategoryRules();

  const allItems = computeMonth(month).items;
  const filtered = allItems.filter(e =>
    (filterPerson === 'all' || e.payer === filterPerson) &&
    (filterCat === 'all' || e.category === filterCat)
  );

  function handleSave(type: 'installment' | 'expense', data: Record<string, unknown>) {
    if (type === 'installment') addInstallment(data as Parameters<typeof addInstallment>[0]);
    else addExpense(data as Parameters<typeof addExpense>[0]);
    onDataChange();
  }

  function handleDelete(item: typeof allItems[number]) {
    if (item.source === 'installment') {
      if (confirm('Este é um gasto parcelado. Deseja remover o parcelamento inteiro?')) {
        deleteInstallment(item.installmentPlanId!);
        onDataChange();
      }
    } else {
      if (confirm('Remover este lançamento?')) {
        deleteExpense(item.id);
        onDataChange();
      }
    }
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
                    {['Data', 'Descrição', 'Quem pagou', 'Categoria', 'Divisão', 'Valor', ''].map(h => (
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
                        {item.description}
                        {item.source === 'installment' && <div style={{ fontSize: 11, color: 'var(--orc-text-3)' }}>Parcelado</div>}
                        {item.source === 'csv' && <span style={{ fontSize: 11, color: 'var(--orc-text-3)', marginLeft: 6 }}>CSV</span>}
                      </td>
                      <td style={{ padding: '10px 16px' }}><PersonBadge person={item.payer} /></td>
                      <td style={{ padding: '10px 16px' }}><CatBadge cat={item.category} /></td>
                      <td style={{ padding: '10px 16px' }}><SplitBadge splitType={item.splitType} /></td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(item.value)}</td>
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

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} onSave={handleSave} rules={rules} />}
    </div>
  );
}
