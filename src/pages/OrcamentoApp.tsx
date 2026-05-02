import { useState, useEffect } from 'react';
import { PersonBadge } from '../components/Badges';
import { MonthNav } from '../components/MonthNav';
import { Btn } from '../components/Primitives';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { DashboardView } from '../views/DashboardView';
import { ExpensesView } from '../views/ExpensesView';
import { ImportView } from '../views/ImportView';
import { InstallmentsView } from '../views/InstallmentsView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';
import { computeMonth, getCategoryRules, addInstallment, addExpense, currentYM, fmtMonth, DEFAULT_RULES } from '../data';
import type { NavTab, MonthlySummary, CategoryRules } from '../types';

const NAV: { id: NavTab; label: string; icon: string }[] = [
  { id: 'resumo',     label: 'Resumo',        icon: '◉' },
  { id: 'gastos',     label: 'Gastos',         icon: '↕' },
  { id: 'importar',   label: 'Importar CSV',   icon: '⬆' },
  { id: 'parcelados', label: 'Parcelamentos',  icon: '⊞' },
  { id: 'historico',  label: 'Histórico',      icon: '◷' },
  { id: 'config',     label: 'Configurações',  icon: '⚙' },
];

const TITLES: Record<NavTab, string> = {
  resumo: '',
  gastos: 'Gastos',
  importar: 'Importar CSV',
  parcelados: 'Parcelamentos',
  historico: 'Histórico',
  config: 'Configurações',
};

export default function OrcamentoApp() {
  const [tab, setTab] = useState<NavTab>('resumo');
  const [month, setMonth] = useState(currentYM());
  const [tick, setTick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [rules, setRules] = useState<CategoryRules>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([computeMonth(month), getCategoryRules()]).then(([s, r]) => {
      setSummary(s);
      setRules(r);
      setLoading(false);
    });
  }, [month, tick]);

  function onDataChange() { setTick(t => t + 1); }

  function handleNavSelect(id: NavTab) { setTab(id); }

  function handleSelectMonth(ym: string) {
    setMonth(ym);
    setTab('resumo');
  }

  async function handleFABSave(type: 'installment' | 'expense', data: Record<string, unknown>) {
    try {
      if (type === 'installment') await addInstallment(data as Parameters<typeof addInstallment>[0]);
      else await addExpense(data as Parameters<typeof addExpense>[0]);
      onDataChange();
    } catch (err) {
      console.error('[Salvar] Erro ao salvar no Supabase:', err);
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  }

  const showMonthNav = tab === 'resumo' || tab === 'gastos';
  const title = tab === 'resumo' ? fmtMonth(month) : TITLES[tab];

  return (
    <>
      <style>{`
        .orc-root {
          --orc-bg:            #F7F6F2;
          --orc-card:          #FFFFFF;
          --orc-text:          #1A1917;
          --orc-text-2:        #6A6864;
          --orc-text-3:        #A8A6A2;
          --orc-border:        #E5E3DE;
          --orc-barbara:       oklch(56% 0.17 22);
          --orc-barbara-light: oklch(95% 0.05 22);
          --orc-felipe:        oklch(50% 0.16 238);
          --orc-felipe-light:  oklch(94% 0.05 238);
          --orc-accent:        oklch(50% 0.16 238);
          --orc-green:         oklch(50% 0.16 150);
          --orc-green-light:   oklch(95% 0.05 150);
          font-family: 'DM Sans', -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .orc-root * { box-sizing: border-box; }
        .orc-root button { transition: opacity 0.15s, background 0.15s, color 0.15s; }
        .orc-root button:active { opacity: 0.7; }
        .orc-root input, .orc-root select, .orc-root textarea { font-size: 16px; }
        .orc-root ::-webkit-scrollbar { width: 6px; height: 6px; }
        .orc-root ::-webkit-scrollbar-track { background: transparent; }
        .orc-root ::-webkit-scrollbar-thumb { background: var(--orc-border); border-radius: 3px; }

        /* Default desktop/mobile visibility toggles */
        .orc-only-mobile { display: none; }
        .orc-only-desktop { display: block; }

        @media (max-width: 768px) {
          .orc-sidebar { display: none !important; }
          .orc-main { margin-left: 0 !important; }
          .orc-main-content { padding: 12px 12px 96px !important; }
          .orc-header { padding: 10px 12px !important; flex-wrap: wrap; gap: 8px !important; }
          .orc-header-actions { width: 100%; justify-content: space-between; gap: 8px !important; }
          .orc-bottom-nav { display: flex !important; }
          .orc-grid-2 { grid-template-columns: 1fr !important; }
          .orc-modal-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .orc-fab { display: flex !important; }
          .orc-only-mobile { display: block; }
          .orc-only-desktop { display: none !important; }
          .orc-card-pad { padding: 14px !important; }
        }
        @media (max-width: 560px) {
          .orc-charts-grid { grid-template-columns: 1fr !important; }
        }

        /* Touch target minimums on mobile */
        @media (hover: none) and (pointer: coarse) {
          .orc-touch { min-height: 40px; min-width: 40px; }
        }
      `}</style>

      <div className="orc-root" style={{ display: 'flex', minHeight: '100vh', background: 'var(--orc-bg)', color: 'var(--orc-text)' }}>

        {/* Sidebar */}
        <aside className="orc-sidebar" style={{
          width: 220, background: '#fff', borderRight: '1px solid var(--orc-border)',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--orc-border)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--orc-text)' }}>
              Orçamento
            </div>
            <div style={{ fontSize: 12, color: 'var(--orc-text-3)', marginTop: 2 }}>Barbara & Felipe</div>
          </div>

          <nav style={{ flex: 1, paddingTop: 8 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => handleNavSelect(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', width: '100%', textAlign: 'left',
                  border: 'none', borderRadius: 0, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: tab === n.id ? 600 : 400,
                  color: tab === n.id ? 'var(--orc-text)' : 'var(--orc-text-2)',
                  background: tab === n.id ? 'var(--orc-bg)' : 'transparent',
                  transition: 'all 0.12s', position: 'relative',
                }}>
                {tab === n.id && (
                  <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 28, background: 'var(--orc-accent)', borderRadius: '0 2px 2px 0' }} />
                )}
                <span style={{ fontSize: 13, opacity: 0.7 }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--orc-border)', display: 'flex', gap: 8 }}>
            <PersonBadge person="barbara" />
            <PersonBadge person="felipe" />
          </div>
        </aside>

        {/* Main */}
        <div className="orc-main" style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          <header className="orc-header" style={{
            background: '#fff', borderBottom: '1px solid var(--orc-border)',
            padding: '13px 28px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5,
          }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--orc-text)' }}>{title}</div>
            <div className="orc-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showMonthNav && <MonthNav month={month} onChange={setMonth} />}
              <span className="orc-only-desktop">
                <Btn onClick={() => setAddOpen(true)} style={{ padding: '7px 14px' }}>+ Lançar</Btn>
              </span>
            </div>
          </header>

          <main className="orc-main-content" style={{ padding: '24px 28px', flex: 1, paddingBottom: 32 }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--orc-text-3)', fontSize: 14 }}>
                Carregando…
              </div>
            )}
            {!loading && summary && (
              <>
                {tab === 'resumo'     && <DashboardView summary={summary} onAddExpense={() => setAddOpen(true)} month={month} />}
                {tab === 'gastos'     && <ExpensesView summary={summary} rules={rules} onDataChange={onDataChange} />}
                {tab === 'importar'   && <ImportView onDataChange={onDataChange} tick={tick} />}
                {tab === 'parcelados' && <InstallmentsView currentMonth={month} onDataChange={onDataChange} tick={tick} />}
                {tab === 'historico'  && <HistoryView currentMonth={month} onSelectMonth={handleSelectMonth} tick={tick} />}
                {tab === 'config'     && <SettingsView onDataChange={onDataChange} tick={tick} />}
              </>
            )}
          </main>
        </div>

        {/* FAB for + Lançar (mobile) */}
        <button
          className="orc-fab"
          onClick={() => setAddOpen(true)}
          aria-label="Novo lançamento"
          style={{
            display: 'none', position: 'fixed', bottom: 76, right: 16, zIndex: 15,
            width: 56, height: 56, borderRadius: 28, border: 'none',
            background: 'var(--orc-accent)', color: '#fff',
            fontSize: 28, fontWeight: 300, lineHeight: 1, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(58,123,200,0.35), 0 2px 6px rgba(0,0,0,0.12)',
            alignItems: 'center', justifyContent: 'center',
          }}>+</button>

        {/* Bottom nav (mobile) */}
        <nav className="orc-bottom-nav" style={{
          display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid var(--orc-border)', zIndex: 10,
          padding: '6px 0', paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
        }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => handleNavSelect(n.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'inherit', padding: '6px 2px', minHeight: 52,
                color: tab === n.id ? 'var(--orc-accent)' : 'var(--orc-text-3)',
                fontSize: 10, fontWeight: tab === n.id ? 700 : 500,
              }}>
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              {n.label.split(' ')[0]}
            </button>
          ))}
        </nav>

        {addOpen && (
          <AddExpenseModal
            onClose={() => setAddOpen(false)}
            onSave={handleFABSave}
            rules={rules} />
        )}
      </div>
    </>
  );
}
