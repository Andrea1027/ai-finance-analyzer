import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthGate } from './components/AuthGate';
import { CsvUpload } from './components/CsvUpload';
import { Dashboard } from './components/Dashboard';
import { BenchmarkSetup } from './components/BenchmarkSetup';
import type { ImportSummary } from './lib/importTransactions';
import { supabase } from './lib/supabaseClient';
import { useI18n } from './lib/i18n';
import { SettingsProvider, useSettingsContext } from './lib/SettingsContext';
import { COMMON_CURRENCIES } from './lib/exchangeRates';

type Tab = 'dashboard' | 'upload' | 'budget';

export default function App() {
  return (
    <AuthGate>
      {session => (
        <SettingsProvider userId={session.user.id}>
          <AppContent session={session} />
        </SettingsProvider>
      )}
    </AuthGate>
  );
}

function AppContent({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t, language, setLanguage } = useI18n();
  const { baseCurrency, updateBaseCurrency } = useSettingsContext();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(16px, 5vw, 32px) clamp(12px, 4vw, 20px)', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5vw, 28px)', margin: 0 }}>{t('appTitle')}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            style={{ background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}
          >
            {language === 'en' ? '中文' : 'EN'}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}
          >
            {t('signOut')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--mist)' }}>
        <label>{t('baseCurrency')}:</label>
        <select
          value={baseCurrency}
          onChange={e => updateBaseCurrency(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid var(--paper-dim)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 13 }}
        >
          {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--paper-dim)', overflowX: 'auto' }}>
        {(['dashboard', 'upload', 'budget'] as Tab[]).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: tab === tb ? 'var(--ink)' : 'var(--mist)',
              borderBottom: tab === tb ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t(`tab_${tb}` as const)}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard key={refreshKey} userId={session.user.id} />}

      {tab === 'budget' && (
        <BenchmarkSetup userId={session.user.id} onSaved={() => setTab('dashboard')} />
      )}

      {tab === 'upload' && (
        <div>
          <CsvUpload
            userId={session.user.id}
            onImported={(summary) => {
              setLastSummary(summary);
              setRefreshKey(k => k + 1);
            }}
          />
          {lastSummary && (
            <div style={{ marginTop: 16, padding: 16, background: 'white', border: '1px solid var(--paper-dim)', borderRadius: 12 }}>
              <strong>{lastSummary.filename}</strong>
              <ul>
                <li>{t('imported')}: {lastSummary.rowsImported} {t('transactions')}</li>
                <li>{t('skippedDuplicate')}: {lastSummary.rowsSkippedAsDuplicate}</li>
                <li>{t('skippedInvalid')}: {lastSummary.rowsSkippedAsInvalid}</li>
                {lastSummary.newCategoriesCreated.length > 0 && (
                  <li>{t('newCategoriesCreated')}: {lastSummary.newCategoriesCreated.join(', ')}</li>
                )}
              </ul>
              {lastSummary.warnings.length > 0 && (
                <details>
                  <summary>{lastSummary.warnings.length} warning(s)</summary>
                  <ul>{lastSummary.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
              <button onClick={() => setTab('dashboard')} style={{ marginTop: 8 }}>
                {t('viewDashboard')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
