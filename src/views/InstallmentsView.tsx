import { useState, useEffect } from 'react';
import { Card, Btn, EmptyState } from '../components/Primitives';
import { PersonBadge, CatBadge, SplitBadge } from '../components/Badges';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { getInstallments, addInstallment, deleteInstallment, getCategoryRules, addMonthsToYM, fmt, fmtMonth, DEFAULT_RULES } from '../data';
import type { InstallmentPlan, CategoryRules } from '../types';

interface InstallmentsViewProps {
  currentMonth: string;
  onDataChange: () => void;
  tick: number;
}

export function InstallmentsView({ currentMonth, onDataChange, tick }: InstallmentsViewProps) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [rules, setRules] = useState<CategoryRules>(DEFAULT_RULES);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    Promise.all([getInstallments(), getCategoryRules()]).then(([ps, rs]) => {
      setPlans(ps);
      setRules(rs);
    });
  }, [tick]);

  async function handleSave(type: 'installment' | 'expense', data: Record<string, unknown>) {
    if (type === 'installment') await addInstallment(data as Parameters<typeof addInstallment>[0]);
    onDataChange();
    setShowAdd(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Remover parcelamento? Ele será retirado de todos os meses.')) {
      await deleteInstallment(id);
      onDataChange();
    }
  }

  function calcElapsed(plan: InstallmentPlan): number {
    const start = plan.startDate.substring(0, 7);
    const end = addMonthsToYM(start, plan.installmentCount - 1);
    if (currentMonth >= start && currentMonth <= end) {
      const [cy, cm] = currentMonth.split('-').map(Number);
      const [sy, sm] = start.split('-').map(Number);
      return (cy - sy) * 12 + (cm - sm) + 1;
    }
    if (currentMonth > end) return plan.installmentCount;
    return 0;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowAdd(true)}>+ Novo parcelamento</Btn>
      </div>

      {plans.length === 0
        ? <EmptyState icon="📦" text="Nenhum parcelamento ativo" sub="Adicione gastos parcelados para vê-los aqui" />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(plan => {
              const start = plan.startDate.substring(0, 7);
              const end = addMonthsToYM(start, plan.installmentCount - 1);
              const elapsed = calcElapsed(plan);
              const pct = (elapsed / plan.installmentCount) * 100;

              return (
                <Card key={plan.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: 'var(--orc-text)' }}>{plan.description}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <PersonBadge person={plan.payer} />
                        <CatBadge cat={plan.category} />
                        <SplitBadge splitType={plan.splitType} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '4px 20px', fontSize: 13 }}>
                        <span style={{ color: 'var(--orc-text-2)' }}>Total</span>
                        <span style={{ fontWeight: 600 }}>{fmt(plan.totalValue)}</span>
                        <span style={{ color: 'var(--orc-text-2)' }}>Por mês</span>
                        <span style={{ fontWeight: 600 }}>{fmt(plan.valuePerInstallment)}</span>
                        <span style={{ color: 'var(--orc-text-2)' }}>Início</span>
                        <span style={{ fontWeight: 600 }}>{fmtMonth(start)}</span>
                        <span style={{ color: 'var(--orc-text-2)' }}>Fim</span>
                        <span style={{ fontWeight: 600 }}>{fmtMonth(end)}</span>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--orc-text-2)', marginBottom: 4 }}>
                          <span>Progresso</span>
                          <span>{elapsed}/{plan.installmentCount} parcelas</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--orc-bg)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--orc-accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(plan.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orc-text-3)', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          rules={rules}
          prefill={{ installments: true }} />
      )}
    </div>
  );
}
