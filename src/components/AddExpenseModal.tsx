import { useState, useEffect } from 'react';
import { Modal, FormRow, SegmentedControl, Btn, OrcInput, OrcSelect } from './Primitives';
import { CATEGORIES, parseSplit, fmt, fmtMonth, addMonthsToYM } from '../data';
import type { CategoryRules, Person } from '../types';

interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (type: 'installment' | 'expense', data: Record<string, unknown>) => void;
  rules: CategoryRules;
  prefill?: { installments?: boolean; payer?: Person; description?: string; date?: string; value?: number; category?: string; splitType?: string };
  editMode?: boolean;
}

export function AddExpenseModal({ onClose, onSave, rules, prefill, editMode }: AddExpenseModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState(prefill?.installments ? 'parcelado' : 'unico');
  const [payer, setPayer] = useState<Person>(prefill?.payer || 'barbara');
  const [desc, setDesc] = useState(prefill?.description || '');
  const [date, setDate] = useState(prefill?.date || today);
  const [value, setValue] = useState(prefill?.value ? String(prefill.value) : '');
  const [parcelas, setParcelas] = useState('2');
  const [cat, setCat] = useState(prefill?.category || 'Outros');
  const [split, setSplit] = useState(prefill?.splitType || rules['Outros'] || '50/50');
  const [customB, setCustomB] = useState('50');
  const [customF, setCustomF] = useState('50');

  const isCustom = split === 'custom';
  const effectiveSplit = isCustom ? `${customB}/${customF}` : split;

  useEffect(() => {
    const rule = rules[cat] || '50/50';
    const [bPct, fPct] = parseSplit(rule);
    if (bPct !== 50 || fPct !== 50) {
      setCustomB(String(bPct));
      setCustomF(String(fPct));
    }
    if (rule === 'barbara' || rule === 'felipe' || rule === '50/50') {
      setSplit(rule);
    } else {
      setSplit('custom');
      const [b2, f2] = parseSplit(rule);
      setCustomB(String(b2));
      setCustomF(String(f2));
    }
  }, [cat]);

  const valNum = parseFloat(value.replace(',', '.')) || 0;
  const parcNum = parseInt(parcelas) || 2;
  const perMonth = tipo === 'parcelado' && valNum > 0 ? valNum / parcNum : 0;
  const startYM = date ? date.substring(0, 7) : '';
  const endYM = startYM ? addMonthsToYM(startYM, parcNum - 1) : '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim() || valNum <= 0 || !date) return;
    if (tipo === 'parcelado') {
      onSave('installment', { description: desc, payer, startDate: date, totalValue: valNum, installmentCount: parcNum, category: cat, splitType: effectiveSplit });
    } else {
      onSave('expense', { description: desc, payer, date, value: valNum, category: cat, splitType: effectiveSplit, source: 'manual' });
    }
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'inherit', fontSize: 14,
    border: '1.5px solid var(--orc-border)', borderRadius: 8, padding: '9px 12px',
    background: '#fff', color: 'var(--orc-text)', width: '100%',
    outline: 'none', boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A6A2' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  return (
    <Modal title={editMode ? 'Editar Lançamento' : 'Novo Lançamento'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormRow label="Tipo">
          <SegmentedControl
            options={[{ value: 'unico', label: 'Gasto único' }, { value: 'parcelado', label: 'Parcelado' }]}
            value={tipo} onChange={setTipo} />
        </FormRow>

        <FormRow label="Quem pagou">
          <SegmentedControl
            options={[{ value: 'barbara', label: 'Barbara' }, { value: 'felipe', label: 'Felipe' }]}
            value={payer} onChange={v => setPayer(v as Person)} />
        </FormRow>

        <FormRow label="Descrição">
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Ex: Supermercado, Netflix…" required
            style={inputStyle} />
        </FormRow>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label={tipo === 'parcelado' ? 'Data (1ª parcela)' : 'Data'}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
          </FormRow>
          <FormRow label={tipo === 'parcelado' ? 'Valor total' : 'Valor (R$)'}>
            <input type="number" step="0.01" min="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" required style={inputStyle} />
          </FormRow>
        </div>

        {tipo === 'parcelado' && (
          <FormRow
            label="Nº de parcelas"
            hint={perMonth > 0 ? `${fmt(perMonth)}/mês · ${fmtMonth(startYM)} → ${fmtMonth(endYM)}` : ''}>
            <input type="number" min="2" max="96" value={parcelas} onChange={e => setParcelas(e.target.value)} style={inputStyle} />
          </FormRow>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Categoria">
            <select value={cat} onChange={e => setCat(e.target.value)} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Como dividir">
            <select value={split} onChange={e => setSplit(e.target.value)} style={selectStyle}>
              <option value="50/50">50/50</option>
              <option value="barbara">Só Barbara (100%)</option>
              <option value="felipe">Só Felipe (100%)</option>
              <option value="custom">Personalizado…</option>
            </select>
            {isCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--orc-barbara)', fontWeight: 600, marginBottom: 3 }}>Barbara %</div>
                  <input type="number" min="0" max="100" value={customB}
                    onChange={e => {
                      const b = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setCustomB(String(b)); setCustomF(String(100 - b));
                    }} style={inputStyle} />
                </div>
                <div style={{ paddingTop: 16, color: 'var(--orc-text-3)', fontWeight: 700 }}>/</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--orc-felipe)', fontWeight: 600, marginBottom: 3 }}>Felipe %</div>
                  <input type="number" min="0" max="100" value={customF}
                    onChange={e => {
                      const f = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setCustomF(String(f)); setCustomB(String(100 - f));
                    }} style={inputStyle} />
                </div>
              </div>
            )}
          </FormRow>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit">Salvar</Btn>
        </div>
      </form>
    </Modal>
  );
}
