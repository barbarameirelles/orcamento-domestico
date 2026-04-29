import { useState } from 'react';
import { Card, SectionLabel, Btn } from '../components/Primitives';
import { CATEGORIES, CAT_COLORS, getCategoryRules, setCategoryRules, parseSplit } from '../data';
import type { CategoryRules } from '../types';

interface SettingsViewProps {
  onDataChange: () => void;
}

export function SettingsView({ onDataChange }: SettingsViewProps) {
  const [rules, setRules] = useState<CategoryRules>(getCategoryRules());
  const [customInputs, setCustomInputs] = useState<Record<string, { b: string; f: string }>>(() => {
    const r = getCategoryRules();
    const out: Record<string, { b: string; f: string }> = {};
    CATEGORIES.forEach(cat => {
      const [b, f] = parseSplit(r[cat] || '50/50');
      out[cat] = { b: String(b), f: String(f) };
    });
    return out;
  });

  function getSplitMode(cat: string) {
    const v = rules[cat] || '50/50';
    if (v === 'barbara') return 'barbara';
    if (v === 'felipe') return 'felipe';
    const [b, f] = parseSplit(v);
    if (b === 50 && f === 50) return '50/50';
    return 'custom';
  }

  function updateMode(cat: string, mode: string) {
    let val: string;
    if (mode === '50/50') val = '50/50';
    else if (mode === 'barbara') val = 'barbara';
    else if (mode === 'felipe') val = 'felipe';
    else {
      const ci = customInputs[cat];
      val = `${ci.b}/${ci.f}`;
    }
    const updated = { ...rules, [cat]: val };
    setRules(updated);
    setCategoryRules(updated);
    onDataChange();
  }

  function updateCustom(cat: string, field: 'b' | 'f', raw: string) {
    const num = Math.min(100, Math.max(0, parseInt(raw) || 0));
    const other = 100 - num;
    const newCI = {
      ...customInputs,
      [cat]: field === 'b' ? { b: String(num), f: String(other) } : { b: String(other), f: String(num) },
    };
    setCustomInputs(newCI);
    const val = `${newCI[cat].b}/${newCI[cat].f}`;
    const updated = { ...rules, [cat]: val };
    setRules(updated);
    setCategoryRules(updated);
    onDataChange();
  }

  function clearAll() {
    if (confirm('Apagar TODOS os dados? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('orc_expenses');
      localStorage.removeItem('orc_installments');
      localStorage.removeItem('orc_category_rules');
      window.location.reload();
    }
  }

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: '6px 28px 6px 10px', borderRadius: 8,
    border: '1.5px solid var(--orc-border)', background: '#fff', color: 'var(--orc-text)',
    width: 'auto', minWidth: 130, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A6A2' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: 'inherit', fontSize: 14,
    border: '1.5px solid var(--orc-border)', borderRadius: 8, padding: '6px 10px',
    background: '#fff', color: 'var(--orc-text)', width: '100%', outline: 'none',
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Regras de divisão por categoria</SectionLabel>
        <div style={{ fontSize: 13, color: 'var(--orc-text-2)', marginBottom: 16 }}>
          Define a divisão padrão para novos lançamentos. Pode ser ajustado individualmente em cada gasto.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {CATEGORIES.map((cat, i) => {
            const mode = getSplitMode(cat);
            const ci = customInputs[cat];
            return (
              <div key={cat} style={{ padding: '14px 0', borderBottom: i < CATEGORIES.length - 1 ? '1px solid var(--orc-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mode === 'custom' ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[cat] }} />
                    <span style={{ fontWeight: 500, color: 'var(--orc-text)' }}>{cat}</span>
                  </div>
                  <select value={mode} onChange={e => updateMode(cat, e.target.value)} style={selectStyle}>
                    <option value="50/50">50 / 50</option>
                    <option value="barbara">Só Barbara</option>
                    <option value="felipe">Só Felipe</option>
                    <option value="custom">Personalizado…</option>
                  </select>
                </div>
                {mode === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--orc-barbara)', fontWeight: 600, marginBottom: 3 }}>Barbara %</div>
                      <input type="number" min="0" max="100" value={ci.b}
                        onChange={e => updateCustom(cat, 'b', e.target.value)}
                        style={inputStyle} />
                    </div>
                    <div style={{ paddingTop: 16, color: 'var(--orc-text-3)', fontWeight: 700 }}>/</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--orc-felipe)', fontWeight: 600, marginBottom: 3 }}>Felipe %</div>
                      <input type="number" min="0" max="100" value={ci.f}
                        onChange={e => updateCustom(cat, 'f', e.target.value)}
                        style={inputStyle} />
                    </div>
                    <div style={{
                      paddingTop: 16, fontSize: 12, fontWeight: 600,
                      color: ci.b && ci.f && parseInt(ci.b) + parseInt(ci.f) === 100 ? 'var(--orc-green)' : 'var(--orc-barbara)',
                    }}>
                      {parseInt(ci.b || '0') + parseInt(ci.f || '0')}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionLabel>Dados</SectionLabel>
        <div style={{ fontSize: 13, color: 'var(--orc-text-2)', marginBottom: 12 }}>
          Todos os dados ficam salvos no seu navegador (localStorage).
        </div>
        <Btn variant="danger" onClick={clearAll}>Apagar todos os dados</Btn>
      </Card>
    </div>
  );
}
