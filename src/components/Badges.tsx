import { CAT_COLORS, parseSplit } from '../data';
import type { Person, SplitType } from '../types';

export function PersonBadge({ person, size = 'sm' }: { person: Person; size?: 'sm' | 'lg' }) {
  const label = person === 'barbara' ? 'Barbara' : 'Felipe';
  const bg = person === 'barbara' ? 'var(--orc-barbara-light)' : 'var(--orc-felipe-light)';
  const color = person === 'barbara' ? 'var(--orc-barbara)' : 'var(--orc-felipe)';
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100, background: bg, color,
      fontWeight: 600, fontSize: size === 'sm' ? 11 : 13,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
    }}>
      {label}
    </span>
  );
}

export function SplitBadge({ splitType }: { splitType: SplitType }) {
  const [bPct, fPct] = parseSplit(splitType);
  let label: string, bg: string, color: string;
  if (bPct === 100) {
    label = 'Barbara'; bg = 'var(--orc-barbara-light)'; color = 'var(--orc-barbara)';
  } else if (fPct === 100) {
    label = 'Felipe'; bg = 'var(--orc-felipe-light)'; color = 'var(--orc-felipe)';
  } else {
    label = `${bPct}/${fPct}`; bg = '#E8F4FF'; color = '#3A7BC8';
  }
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100, background: bg, color,
      fontWeight: 600, fontSize: 11, padding: '2px 8px',
    }}>
      {label}
    </span>
  );
}

export function RecurringBadge() {
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100,
      background: '#FFF3CD', color: '#9A6B00',
      fontWeight: 600, fontSize: 10, padding: '2px 7px',
      letterSpacing: '0.03em',
    }}>
      ↻ Fixo
    </span>
  );
}

export function CatBadge({ cat }: { cat: string }) {
  const color = CAT_COLORS[cat] || '#888';
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100,
      background: color + '20', color,
      fontWeight: 600, fontSize: 11, padding: '2px 8px',
    }}>
      {cat}
    </span>
  );
}
