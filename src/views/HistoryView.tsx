import { Card } from '../components/Primitives';
import { PersonBadge } from '../components/Badges';
import { getAvailableMonths, computeMonth, fmt, fmtMonth } from '../data';

interface HistoryViewProps {
  currentMonth: string;
  onSelectMonth: (ym: string) => void;
}

export function HistoryView({ currentMonth, onSelectMonth }: HistoryViewProps) {
  const months = getAvailableMonths();

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {months.map(ym => {
          const s = computeMonth(ym);
          const isCurrent = ym === currentMonth;
          return (
            <Card
              key={ym}
              style={{ cursor: 'pointer', borderColor: isCurrent ? 'var(--orc-accent)' : 'var(--orc-border)', transition: 'border-color 0.15s' }}
              onClick={() => onSelectMonth(ym)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--orc-text)' }}>
                    {fmtMonth(ym)}
                    {isCurrent && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--orc-accent)', marginLeft: 8, background: 'var(--orc-felipe-light)', borderRadius: 100, padding: '2px 8px' }}>
                        Atual
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--orc-text-2)' }}>{s.items.length} lançamentos</div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--orc-text-3)' }}>Total</div>
                    <div style={{ fontWeight: 700, color: 'var(--orc-text)' }}>{fmt(s.total)}</div>
                  </div>
                  {s.owes ? (
                    <div style={{ fontSize: 13, color: 'var(--orc-text-2)' }}>
                      <PersonBadge person={s.owes.from} />{' '}→{' '}
                      <span style={{ fontWeight: 600 }}>{fmt(s.owes.amount)}</span>
                    </div>
                  ) : s.total > 0 ? (
                    <span style={{ fontSize: 13, color: 'var(--orc-green)', fontWeight: 600 }}>✓ Quites</span>
                  ) : null}
                  <span style={{ color: 'var(--orc-text-3)' }}>›</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
