import { fmt } from '../data';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 160, stroke = 28 }: { data: DonutSlice[]; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orc-text-3)', fontSize: 12 }}>
        Sem dados
      </div>
    );
  }

  let offset = -circ / 4;
  const slices = data.map(d => {
    const pct = d.value / total;
    const dash = pct * circ;
    const slice = { ...d, dash, offset };
    offset += dash;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset}
          style={{ transition: 'stroke-dasharray 0.5s' }} />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="white" />
    </svg>
  );
}

interface BarSlice {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({ data, height = 140 }: { data: BarSlice[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 20));
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--orc-text-3)', fontWeight: 500 }}>
              {fmt(d.value).replace('R$ ', '').replace('R$ ', '')}
            </div>
            <div style={{ width: '100%', height: h, background: d.color || 'var(--orc-accent)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s' }} />
            <div style={{ fontSize: 10, color: 'var(--orc-text-2)', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
