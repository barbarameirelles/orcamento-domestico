import { useState, useRef, useEffect } from 'react';
import { Card, SectionLabel, FormRow, SegmentedControl, Btn } from '../components/Primitives';
import { parseCSV, addExpenses, CATEGORIES, fmt, fmtDate } from '../data';
import type { ParsedCSVRow } from '../data';
import type { Person, SplitType } from '../types';

interface ImportViewProps {
  onDataChange: () => void;
  tick: number;
}

interface EditableRow extends ParsedCSVRow {
  selected: boolean;
  payer: Person;
}

export function ImportView({ onDataChange, tick: _tick }: ImportViewProps) {
  const [cardholder, setCardholder] = useState<Person>('barbara');
  const [editedRows, setEditedRows] = useState<EditableRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Barbara pays both invoices in this household. Split follows the cardholder
  // (whose card it is, i.e. who is responsible for paying her back).
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string);
      const withDefaults = parsed.map(r => ({
        ...r,
        payer: 'barbara' as Person,
        splitType: cardholder as SplitType,
        selected: true,
      }));
      setEditedRows(withDefaults);
      setDone(false);
    };
    reader.readAsText(file, 'UTF-8');
  }

  useEffect(() => {
    setEditedRows(rows => rows.map(r => ({ ...r, splitType: cardholder as SplitType })));
  }, [cardholder]);

  function updateRow(i: number, patch: Partial<EditableRow>) {
    setEditedRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function handleImport() {
    setImporting(true);
    const toImport = editedRows.filter(r => r.selected).map(({ selected, _raw, ...r }) => r);
    await addExpenses(toImport);
    setImporting(false);
    setDone(true);
    setEditedRows([]);
    if (fileRef.current) fileRef.current.value = '';
    onDataChange();
  }

  const selectedCount = editedRows.filter(r => r.selected).length;
  const totalAll = editedRows.reduce((s, r) => s + r.value, 0);
  const totalSelected = editedRows.filter(r => r.selected).reduce((s, r) => s + r.value, 0);

  const selectStyle: React.CSSProperties = {
    fontSize: 12, padding: '4px 8px', borderRadius: 6,
    border: '1px solid var(--orc-border)', background: '#fff', color: 'var(--orc-text)',
    width: 'auto', minWidth: 100, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A6A2' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: 24,
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Importar fatura CSV</SectionLabel>
        <div style={{ fontSize: 13, color: 'var(--orc-text-2)', marginBottom: 16 }}>
          Compatível com fatura de cartão e extrato bancário. Aceita formato BR (1.234,56) e US (1,234.56).
          O parser detecta automaticamente qual sinal representa gasto — estornos e pagamentos são ignorados.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="orc-grid-2">
          <FormRow label="Cartão de quem">
            <SegmentedControl
              options={[{ value: 'barbara', label: 'Barbara' }, { value: 'felipe', label: 'Felipe' }]}
              value={cardholder} onChange={v => setCardholder(v as Person)} />
          </FormRow>
          <FormRow label="Arquivo CSV">
            <input
              ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile}
              style={{
                fontFamily: 'inherit', fontSize: 14, padding: '7px 10px', cursor: 'pointer',
                border: '1.5px solid var(--orc-border)', borderRadius: 8, background: '#fff',
                color: 'var(--orc-text)', width: '100%',
              }} />
          </FormRow>
        </div>

        {done && (
          <div style={{ background: 'var(--orc-green-light)', color: 'var(--orc-green)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
            ✓ Lançamentos importados com sucesso!
          </div>
        )}
      </Card>

      {editedRows.length > 0 && (
        <Card padding={0}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--orc-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <SectionLabel>Pré-visualização</SectionLabel>
              <div style={{ fontSize: 13, color: 'var(--orc-text-2)' }}>
                {editedRows.length} itens encontrados · {selectedCount} selecionados
              </div>
              <div style={{ fontSize: 13, color: 'var(--orc-text-2)', marginTop: 2 }}>
                Total da fatura: <strong style={{ color: 'var(--orc-text)' }}>{fmt(totalAll)}</strong>
                {selectedCount !== editedRows.length && (
                  <> · Selecionado: <strong style={{ color: 'var(--orc-text)' }}>{fmt(totalSelected)}</strong></>
                )}
              </div>
            </div>
            <Btn onClick={handleImport} disabled={selectedCount === 0 || importing}>
              {importing ? 'Importando…' : `Importar ${selectedCount} lançamentos`}
            </Btn>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--orc-bg)' }}>
                  <th style={{ padding: '9px 12px', width: 32 }}>
                    <input
                      type="checkbox"
                      checked={selectedCount === editedRows.length}
                      onChange={e => setEditedRows(rows => rows.map(r => ({ ...r, selected: e.target.checked })))}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--orc-accent)' }} />
                  </th>
                  {['Data', 'Descrição', 'Valor', 'Categoria', 'Divisão'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--orc-text-3)', textAlign: 'left', padding: '9px 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editedRows.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--orc-border)', opacity: row.selected ? 1 : 0.4 }}>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="checkbox" checked={row.selected} onChange={e => updateRow(i, { selected: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--orc-accent)' }} />
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--orc-text-2)', whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</div>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(row.value)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <select value={row.category}
                        onChange={e => updateRow(i, { category: e.target.value })}
                        style={selectStyle}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <select value={row.splitType} onChange={e => updateRow(i, { splitType: e.target.value as SplitType })}
                        style={{ ...selectStyle, minWidth: 90 }}>
                        <option value="50/50">50/50</option>
                        <option value="barbara">Só Barbara</option>
                        <option value="felipe">Só Felipe</option>
                        <option value="60/40">60/40</option>
                        <option value="40/60">40/60</option>
                        <option value="70/30">70/30</option>
                        <option value="30/70">30/70</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
