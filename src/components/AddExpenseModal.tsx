import { useState, useEffect, useRef } from 'react';
import { Modal, FormRow, SegmentedControl, Btn } from './Primitives';
import { CATEGORIES, parseSplit, fmt, fmtMonth, addMonthsToYM } from '../data';
import type { CategoryRules, Person } from '../types';

interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (type: 'installment' | 'expense', data: Record<string, unknown>) => Promise<void> | void;
  rules: CategoryRules;
  prefill?: {
    installments?: boolean;
    payer?: Person;
    description?: string;
    date?: string;
    value?: number;
    category?: string;
    splitType?: string;
    installmentCount?: number;
  };
  editMode?: boolean;
}

export function AddExpenseModal({ onClose, onSave, rules, prefill, editMode }: AddExpenseModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState(prefill?.installments ? 'parcelado' : 'unico');
  const [payer, setPayer] = useState<Person>(prefill?.payer || 'barbara');
  const [desc, setDesc] = useState(prefill?.description || '');
  const [date, setDate] = useState(prefill?.date || today);
  const [value, setValue] = useState(prefill?.value ? String(prefill.value) : '');
  const [parcelas, setParcelas] = useState(prefill?.installmentCount ? String(prefill.installmentCount) : '2');
  const [cat, setCat] = useState(prefill?.category || 'Outros');
  const [split, setSplit] = useState(prefill?.splitType || rules['Outros'] || '50/50');
  const [customB, setCustomB] = useState('50');
  const [customF, setCustomF] = useState('50');

  // Controla se o primeiro render já passou para não sobrescrever o prefill de split
  const isMounted = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustom = split === 'custom';
  const effectiveSplit = isCustom ? `${customB}/${customF}` : split;

  useEffect(() => {
    // Inicializa customB/customF com base no splitType do prefill
    if (prefill?.splitType) {
      const [b, f] = parseSplit(prefill.splitType);
      setCustomB(String(b));
      setCustomF(String(f));
      if (prefill.splitType !== 'barbara' && prefill.splitType !== 'felipe' && prefill.splitType !== '50/50') {
        setSplit('custom');
      } else {
        setSplit(prefill.splitType);
      }
    }
    isMounted.current = false; // reset para que a próxima troca de categoria funcione
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Pula no primeiro render ao abrir o modal (preserva o prefill)
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim() || valNum <= 0 || !date || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (tipo === 'parcelado') {
        await onSave('installment', {
          description: desc,
          payer,
          startDate: date,
          totalValue: valNum,
          installmentCount: parcNum,
          category: cat,
          splitType: effectiveSplit,
        });
      } else {
        await onSave('expense', {
          description: desc,
          payer,
          date,
          value: valNum,
          category: cat,
          splitType: effectiveSplit,
          source: 'manual',
        });
      }
      onClose();
    } catch (err) {
      console.error('[AddExpenseModal] Erro ao salvar:', err);
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
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

  // Calcula valor por pessoa para exibição no parcelado
  const perPersonDisplay = (() => {
    if (tipo !== 'parcelado' || perMonth <= 0) return null;
    const [bPct, fPct] = parseSplit(effectiveSplit);
    return { bVal: perMonth * bPct / 100, fVal: perMonth * fPct / 100 };
  })();

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

        <div className="orc-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            {perPersonDisplay && (
              <div style={{ fontSize: 12, color: 'var(--orc-text-3)', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>Parcela: <strong style={{ color: 'var(--orc-text-2)' }}>{fmt(perMonth)}</strong></span>
                <span>Barbara: <strong style={{ color: 'var(--orc-barbara)' }}>{fmt(perPersonDisplay.bVal)}</strong></span>
                <span>Felipe: <strong style={{ color: 'var(--orc-felipe)' }}>{fmt(perPersonDisplay.fVal)}</strong></span>
              </div>
            )}
          </FormRow>
        )}

        <div className="orc-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <Btn variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Btn>
          <Btn type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar'}</Btn>
        </div>
      </form>
    </Modal>
  );
}
