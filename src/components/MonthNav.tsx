import { getAvailableMonths, fmtMonth } from '../data';

interface MonthNavProps {
  month: string;
  onChange: (ym: string) => void;
}

export function MonthNav({ month, onChange }: MonthNavProps) {
  const months = getAvailableMonths();
  const idx = months.indexOf(month);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => idx < months.length - 1 && onChange(months[idx + 1])}
        disabled={idx >= months.length - 1}
        style={{
          padding: '4px 10px', fontSize: 16, background: 'transparent', border: 'none',
          cursor: idx >= months.length - 1 ? 'not-allowed' : 'pointer',
          color: 'var(--orc-text-2)', opacity: idx >= months.length - 1 ? 0.4 : 1,
          borderRadius: 8, fontFamily: 'inherit',
        }}
      >‹</button>
      <div style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center', color: 'var(--orc-text)' }}>
        {fmtMonth(month)}
      </div>
      <button
        onClick={() => idx > 0 && onChange(months[idx - 1])}
        disabled={idx <= 0}
        style={{
          padding: '4px 10px', fontSize: 16, background: 'transparent', border: 'none',
          cursor: idx <= 0 ? 'not-allowed' : 'pointer',
          color: 'var(--orc-text-2)', opacity: idx <= 0 ? 0.4 : 1,
          borderRadius: 8, fontFamily: 'inherit',
        }}
      >›</button>
    </div>
  );
}
