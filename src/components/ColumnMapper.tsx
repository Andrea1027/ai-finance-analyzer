import { useState } from 'react';
import type { ColumnMapping, AmountSign, DateFormatHint } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface ColumnMapperProps {
  filename: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  onConfirm: (config: {
    mapping: ColumnMapping;
    amountSign: AmountSign;
    dateFormat: DateFormatHint;
    currency: string;
    sourceName: string;
  }) => void;
  onCancel: () => void;
}

const NONE = '__none__';

export function ColumnMapper({ filename, headers, sampleRows, onConfirm, onCancel }: ColumnMapperProps) {
  const { t } = useI18n();
  const [dateCol, setDateCol] = useState(guess(headers, ['date', 'transaction date', 'posted']));
  const [amountCol, setAmountCol] = useState(guess(headers, ['amount', 'value', 'debit']));
  const [categoryCol, setCategoryCol] = useState(guess(headers, ['category', 'category name']));
  const [noteCol, setNoteCol] = useState(guess(headers, ['note', 'notes', 'memo', 'description']) || NONE);
  const [walletCol, setWalletCol] = useState(guess(headers, ['wallet', 'account']) || NONE);
  const [currencyCol, setCurrencyCol] = useState(guess(headers, ['currency']) || NONE);
  const [amountSign, setAmountSign] = useState<AmountSign>('as_negative');
  const [dateFormat, setDateFormat] = useState<DateFormatHint>('auto');
  const [fallbackCurrency, setFallbackCurrency] = useState('USD');
  const [sourceName, setSourceName] = useState('');

  const ready = dateCol && amountCol && categoryCol && (currencyCol !== NONE || fallbackCurrency.trim());

  return (
    <div style={{ background: 'white', border: '1px solid var(--paper-dim)', borderRadius: 16, padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        {t('unrecognizedFormat')}
      </div>
      <p style={{ color: 'var(--mist)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>
        <strong>{filename}</strong> {t('mapHint')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <Field label={t('dateColumn')}>
          <Select value={dateCol} onChange={setDateCol} options={headers} />
        </Field>
        <Field label={t('amountColumn')}>
          <Select value={amountCol} onChange={setAmountCol} options={headers} />
        </Field>
        <Field label={t('categoryColumn')}>
          <Select value={categoryCol} onChange={setCategoryCol} options={headers} />
        </Field>
        <Field label={t('noteColumn')}>
          <Select value={noteCol} onChange={setNoteCol} options={headers} allowNone />
        </Field>
        <Field label={t('walletColumn')}>
          <Select value={walletCol} onChange={setWalletCol} options={headers} allowNone />
        </Field>
        <Field label={t('currencyColumn')}>
          <Select value={currencyCol} onChange={setCurrencyCol} options={headers} allowNone />
        </Field>
      </div>

      {currencyCol === NONE && (
        <Field label={t('currencyOfFile')}>
          <input value={fallbackCurrency} onChange={e => setFallbackCurrency(e.target.value.toUpperCase())} style={inputStyle} />
        </Field>
      )}

      <Field label={t('amountSignQuestion')}>
        <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <label>
            <input type="radio" checked={amountSign === 'as_negative'} onChange={() => setAmountSign('as_negative')} />
            {' '}{t('negativeOption')}
          </label>
          <label>
            <input type="radio" checked={amountSign === 'as_positive'} onChange={() => setAmountSign('as_positive')} />
            {' '}{t('positiveOption')}
          </label>
        </div>
      </Field>

      <Field label={t('dateFormatLabel')}>
        <select value={dateFormat} onChange={e => setDateFormat(e.target.value as DateFormatHint)} style={inputStyle}>
          <option value="auto">{t('autoDetect')}</option>
          <option value="YMD">YYYY-MM-DD</option>
          <option value="DMY">DD/MM/YYYY</option>
          <option value="MDY">MM/DD/YYYY</option>
        </select>
      </Field>

      <Field label={t('sourceNameLabel')}>
        <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder={t('sourceNamePlaceholder')} style={inputStyle} />
      </Field>

      {sampleRows.length > 0 && (
        <div style={{ marginTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--mist)', marginBottom: 6 }}>{t('preview')} {sampleRows.length} {t('rows')}</div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--paper-dim)', borderRadius: 8 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead>
                <tr>{headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--paper-dim)' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr key={i}>
                    {headers.map(h => <td key={h} className="num" style={{ padding: '6px 10px' }}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          disabled={!ready}
          onClick={() => onConfirm({
            mapping: {
              date: dateCol,
              amount: amountCol,
              category: categoryCol,
              note: noteCol !== NONE ? noteCol : undefined,
              wallet: walletCol !== NONE ? walletCol : undefined,
              currency: currencyCol !== NONE ? currencyCol : undefined,
            },
            amountSign,
            dateFormat,
            currency: fallbackCurrency,
            sourceName: sourceName || filename,
          })}
          style={{ padding: '10px 20px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, opacity: ready ? 1 : 0.5 }}
        >
          {t('importWithMapping')}
        </button>
        <button onClick={onCancel} style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8 }}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}

function guess(headers: string[], candidates: string[]): string {
  for (const c of candidates) {
    const found = headers.find(h => h.toLowerCase().trim() === c);
    if (found) return found;
  }
  return '';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--ink)' }}>{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, allowNone }: { value: string; onChange: (v: string) => void; options: string[]; allowNone?: boolean }) {
  const { t } = useI18n();
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      <option value="">{t('selectColumn')}</option>
      {allowNone && <option value={NONE}>{t('none')}</option>}
      {options.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--paper-dim)',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'var(--font-body)',
};
