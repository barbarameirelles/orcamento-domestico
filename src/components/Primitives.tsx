import React from 'react';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'barbara' | 'felipe';

interface BtnProps {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  small?: boolean;
}

export function Btn({ children, variant = 'primary', onClick, disabled, type = 'button', style, small }: BtnProps) {
  const base: React.CSSProperties = {
    fontFamily: 'inherit', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s, background 0.15s',
    border: 'none', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: small ? 13 : 14, padding: small ? '6px 12px' : '9px 16px',
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: 'var(--orc-accent)', color: '#fff' },
    secondary: { background: 'transparent', color: 'var(--orc-text)', border: '1.5px solid var(--orc-border)' },
    ghost: { background: 'transparent', color: 'var(--orc-text-2)' },
    danger: { background: '#FEE2E2', color: '#DC2626' },
    barbara: { background: 'var(--orc-barbara-light)', color: 'var(--orc-barbara)' },
    felipe: { background: 'var(--orc-felipe-light)', color: 'var(--orc-felipe)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Card({ children, style, padding, onClick }: { children: React.ReactNode; style?: React.CSSProperties; padding?: number | string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--orc-border)', padding: padding ?? 20, ...style }}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orc-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function Modal({ children, onClose, title, width = 520 }: { children: React.ReactNode; onClose: () => void; title: string; width?: number }) {
  return (
    <div
      className="orc-modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @media (max-width: 600px) {
          .orc-modal-overlay { padding: 0 !important; align-items: flex-end !important; }
          .orc-modal-sheet {
            border-radius: 16px 16px 0 0 !important;
            max-width: 100% !important;
            max-height: 92vh !important;
            padding: 18px !important;
            padding-bottom: max(18px, env(safe-area-inset-bottom)) !important;
            animation: orc-slide-up 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .orc-modal-sheet::before {
            content: '';
            display: block;
            width: 36px; height: 4px;
            background: var(--orc-border);
            border-radius: 2px;
            margin: -4px auto 12px;
          }
        }
        @keyframes orc-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <div className="orc-modal-sheet" style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--orc-text)' }}>{title}</div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--orc-text-2)', lineHeight: 1, padding: 4, minWidth: 32, minHeight: 32 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--orc-text-2)', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--orc-text-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--orc-bg)', borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={{
            flex: 1, padding: '7px 10px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            background: value === o.value ? '#fff' : 'transparent',
            color: value === o.value ? 'var(--orc-text)' : 'var(--orc-text-2)',
            boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--orc-text-3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--orc-text-2)', marginBottom: 4 }}>{text}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

export function OrcInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        fontFamily: 'inherit', fontSize: 14,
        border: '1.5px solid var(--orc-border)', borderRadius: 8, padding: '9px 12px',
        background: '#fff', color: 'var(--orc-text)', width: '100%',
        transition: 'border-color 0.15s, box-shadow 0.15s', outline: 'none',
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--orc-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px oklch(50% 0.16 238 / 0.12)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--orc-border)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

export function OrcSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        fontFamily: 'inherit', fontSize: 14,
        border: '1.5px solid var(--orc-border)', borderRadius: 8, padding: '9px 12px',
        background: '#fff', color: 'var(--orc-text)', width: '100%',
        transition: 'border-color 0.15s, box-shadow 0.15s', outline: 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A8A6A2' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--orc-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px oklch(50% 0.16 238 / 0.12)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--orc-border)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}
