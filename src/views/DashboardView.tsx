import { Card, SectionLabel } from '../components/Primitives';
import { PersonBadge, CatBadge, SplitBadge, RecurringBadge } from '../components/Badges';
import { DonutChart } from '../components/Charts';
import { CATEGORIES, CAT_COLORS, fmt, fmtDate, addMonthsToYM, fmtMonth } from '../data';
import type { MonthlySummary } from '../types';

interface DashboardViewProps {
  summary: MonthlySummary;
  onAddExpense: () => void;
  month: string;
}

export function DashboardView({ summary, month }: DashboardViewProps) {
  const { barbaraPaid, felipePaid, barbaraOwes, felipeOwes, barbaraBalance, felipeBalance, owes, byCategory, total } = summary;
  const nextMonth = fmtMonth(addMonthsToYM(month, 1));

  const catData = CATEGORIES
    .filter(c => byCategory[c] && byCategory[c].total > 0)
    .map(c => ({ label: c, value: byCategory[c].total, color: CAT_COLORS[c] }));

  const hasData = total > 0;

  return (
    <div>
      {/* Balance Hero */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <SectionLabel>Acerto do mês</SectionLabel>
            {!hasData && <div style={{ color: 'var(--orc-text-3)', fontSize: 14 }}>Nenhum lançamento ainda</div>}
            {hasData && !owes && (
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--orc-green)' }}>✓ Estão quites!</div>
            )}
            {hasData && owes && (
              <>
                <div style={{ fontWeight: 700, fontSize: 22 }}>
                  <PersonBadge person={owes.from} size="lg" />{' '}deve pagar{' '}
                  <span style={{ color: 'var(--orc-green)' }}>{fmt(owes.amount)}</span>{' '}para{' '}
                  <PersonBadge person={owes.to} size="lg" />
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--orc-text-3)' }}>
                  Pagamento no início de <strong style={{ color: 'var(--orc-text-2)' }}>{nextMonth}</strong>
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--orc-text-3)' }}>Total do mês</div>
            <div style={{ fontWeight: 700, fontSize: 26, color: 'var(--orc-text)' }}>{fmt(total)}</div>
          </div>
        </div>

        {hasData && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--orc-border)', margin: '16px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="orc-grid-2">
              {([['barbara', barbaraPaid, barbaraOwes, barbaraBalance], ['felipe', felipePaid, felipeOwes, felipeBalance]] as const).map(([p, paid, owesAmt, balance]) => (
                <div key={p} style={{ background: 'var(--orc-bg)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ marginBottom: 8 }}><PersonBadge person={p} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orc-text-2)' }}>Pagou</span>
                    <span style={{ fontWeight: 600 }}>{fmt(paid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orc-text-2)' }}>Responsabilidade</span>
                    <span style={{ fontWeight: 600 }}>{fmt(owesAmt)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--orc-text-3)', marginBottom: 8, lineHeight: 1.3 }}>
                    Soma dos gastos que cabem a {p === 'barbara' ? 'ela' : 'ele'} conforme as regras de divisão
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--orc-border)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--orc-text-2)' }}>Saldo</span>
                    <span style={{ fontWeight: 700, color: balance >= 0 ? 'var(--orc-green)' : 'var(--orc-barbara)' }}>
                      {balance >= 0 ? '+' : ''}{fmt(balance)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--orc-text-3)', marginTop: 2 }}>
                    {balance > 0.01
                      ? `A receber de ${p === 'barbara' ? 'Felipe' : 'Barbara'}`
                      : balance < -0.01
                      ? `A pagar para ${p === 'barbara' ? 'Felipe' : 'Barbara'}`
                      : 'Quite'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Charts */}
      {hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="orc-charts-grid">
          <Card>
            <SectionLabel>Por categoria</SectionLabel>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <DonutChart data={catData} size={130} stroke={24} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catData.map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--orc-text-2)' }}>{d.label}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionLabel>Gastos por pessoa</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              {([['barbara', barbaraPaid], ['felipe', felipePaid]] as const).map(([p, paid]) => {
                const pct = total > 0 ? (paid / total) * 100 : 0;
                return (
                  <div key={p}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <PersonBadge person={p} />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{fmt(paid)}</span>
                        <span style={{ fontSize: 12, color: 'var(--orc-text-3)' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'var(--orc-bg)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `var(--orc-${p})`, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: 'var(--orc-text-3)', paddingTop: 4, borderTop: '1px solid var(--orc-border)' }}>
                Total do mês: <strong style={{ color: 'var(--orc-text)' }}>{fmt(total)}</strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent transactions */}
      {hasData && (
        <Card padding={0}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--orc-border)' }}>
            <SectionLabel>Lançamentos do mês</SectionLabel>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--orc-bg)' }}>
                  {['Data', 'Descrição', 'Quem pagou', 'Categoria', 'Divisão', 'Valor'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--orc-text-3)', textAlign: 'left', padding: '9px 16px', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.items.slice(0, 8).map((item, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--orc-border)' }}
                    onMouseEnter={e => (e.currentTarget.querySelectorAll('td').forEach(td => (td.style.background = 'var(--orc-bg)')))}
                    onMouseLeave={e => (e.currentTarget.querySelectorAll('td').forEach(td => (td.style.background = '')))}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--orc-text-2)', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, maxWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                        {item.source === 'recurring' && <RecurringBadge />}
                      </div>
                      {item.source === 'installment' && <div style={{ fontSize: 11, color: 'var(--orc-text-3)' }}>Parcelado</div>}
                      {item.source === 'csv' && <div style={{ fontSize: 11, color: 'var(--orc-text-3)' }}>CSV</div>}
                    </td>
                    <td style={{ padding: '10px 16px' }}><PersonBadge person={item.payer} /></td>
                    <td style={{ padding: '10px 16px' }}><CatBadge cat={item.category} /></td>
                    <td style={{ padding: '10px 16px' }}><SplitBadge splitType={item.splitType} /></td>
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.items.length > 8 && (
            <div style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: 'var(--orc-text-3)', borderTop: '1px solid var(--orc-border)' }}>
              + {summary.items.length - 8} lançamentos — veja em Gastos
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
