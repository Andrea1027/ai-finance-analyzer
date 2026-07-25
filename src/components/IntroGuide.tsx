import { useI18n } from '../lib/i18n';

export function IntroGuide() {
  const { t } = useI18n();

  const steps = [
    { title: t('introStep1Title'), desc: t('introStep1Desc'), icon: '📤' },
    { title: t('introStep2Title'), desc: t('introStep2Desc'), icon: '🗂️' },
    { title: t('introStep3Title'), desc: t('introStep3Desc'), icon: '📊' },
    { title: t('introStep4Title'), desc: t('introStep4Desc'), icon: '🤖' },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5vw, 26px)', marginBottom: 8 }}>
        {t('introTitle')}
      </h2>
      <p style={{ color: 'var(--mist)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        {t('introSubtitle')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ background: 'var(--paper)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#eef4fb', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--ink)' }}>
        🔒 {t('introPrivacyNote')}
      </div>
    </div>
  );
}
