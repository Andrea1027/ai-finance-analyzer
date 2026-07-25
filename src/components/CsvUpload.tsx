import { useState } from 'react';
import { importSpendeeCSV, importGenericCSV, type ImportSummary } from '../lib/importTransactions';
import { headerSignature, previewCSV, SPENDEE_HEADER_SIGNATURE } from '../lib/genericParser';
import { findSavedMapping, saveMapping } from '../lib/importMappings';
import { ColumnMapper } from './ColumnMapper';
import type { ColumnMapping, AmountSign, DateFormatHint } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface MapConfirmConfig {
  mapping: ColumnMapping;
  amountSign: AmountSign;
  dateFormat: DateFormatHint;
  currency: string;
  sourceName: string;
}

interface CsvUploadProps {
  userId: string;
  onImported: (summary: ImportSummary) => void;
}

interface PendingMap {
  filename: string;
  csvText: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  signature: string;
}

export function CsvUpload({ userId, onImported }: CsvUploadProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingMap, setPendingMap] = useState<PendingMap | null>(null);

  async function handleFile(file: File) {
    setStatus('uploading');
    setErrorMsg(null);
    try {
      const text = await file.text();
      const { headers, sampleRows } = previewCSV(text);
      const signature = headerSignature(headers);

      if (signature === SPENDEE_HEADER_SIGNATURE) {
        const summary = await importSpendeeCSV(userId, file.name, text);
        onImported(summary);
        setStatus('idle');
        return;
      }

      const saved = await findSavedMapping(userId, signature);
      if (saved) {
        const summary = await importGenericCSV(
          userId, file.name, text,
          saved.column_map, saved.amount_sign, saved.date_format, saved.currency
        );
        onImported(summary);
        setStatus('idle');
        return;
      }

      // Unrecognized format — ask the user to map it once.
      setPendingMap({ filename: file.name, csvText: text, headers, sampleRows, signature });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error during import');
    }
  }

  async function handleMapConfirm(config: MapConfirmConfig) {
    if (!pendingMap) return;
    setStatus('uploading');
    try {
      const summary = await importGenericCSV(
        userId, pendingMap.filename, pendingMap.csvText,
        config.mapping, config.amountSign, config.dateFormat, config.currency
      );
      await saveMapping(userId, pendingMap.signature, config.sourceName, config.mapping, config.amountSign, config.dateFormat, config.currency);
      onImported(summary);
      setPendingMap(null);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error during import');
    }
  }

  if (pendingMap) {
    return (
      <ColumnMapper
        filename={pendingMap.filename}
        headers={pendingMap.headers}
        sampleRows={pendingMap.sampleRows}
        onConfirm={handleMapConfirm}
        onCancel={() => setPendingMap(null)}
      />
    );
  }

  return (
    <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <input
        type="file"
        accept=".csv"
        disabled={status === 'uploading'}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {status === 'uploading' && <p>{t('importing')}</p>}
      {status === 'error' && <p style={{ color: '#dc2626' }}>{errorMsg}</p>}
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
        {t('uploadHint')}
      </p>
    </div>
  );
}
