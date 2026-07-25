import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useI18n } from '../lib/i18n';
import { IntroGuide } from './IntroGuide';

interface AuthGateProps {
  children: (session: Session) => React.ReactNode;
}

/**
 * Wraps the app. Shows a magic-link login form until the user is
 * authenticated, then renders children with the active session.
 * This is how multiple friends can each have their own private
 * accumulated data on the same deployed app (RLS keeps it separated).
 */
export function AuthGate({ children }: AuthGateProps) {
  const { t, language, setLanguage } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) setSent(true);
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  if (loading) return <p>Loading…</p>;

  if (!session) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            style={{ background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}
          >
            {language === 'en' ? '中文' : 'EN'}
          </button>
        </div>

        <div style={{ marginBottom: 40 }}>
          <IntroGuide />
        </div>

        <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'center', background: 'white', border: '1px solid var(--paper-dim)', borderRadius: 16, padding: 28 }}>
        <h2 style={{ marginTop: 0 }}>{t('signIn')}</h2>
        <button
          onClick={handleGoogleSignIn}
          style={{
            padding: '10px 16px',
            width: '100%',
            marginBottom: 16,
            background: 'white',
            border: '1px solid var(--paper-dim)',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          {t('continueWithGoogle')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', color: 'var(--mist)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--paper-dim)' }} />
          {t('orContinueWithEmail')}
          <div style={{ flex: 1, height: 1, background: 'var(--paper-dim)' }} />
        </div>

        {sent ? (
          <p>{t('checkEmail')}</p>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              required
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: 8, width: '100%', marginBottom: 8 }}
            />
            <button type="submit" style={{ padding: '8px 16px', width: '100%' }}>
              {t('sendMagicLink')}
            </button>
          </form>
        )}
        </div>
      </div>
    );
  }

  return <>{children(session)}</>;
}
