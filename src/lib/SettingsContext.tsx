import { createContext, useContext, type ReactNode } from 'react';
import { useSettings } from './useSettings';

interface SettingsContextValue {
  baseCurrency: string;
  updateBaseCurrency: (currency: string) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const settings = useSettings(userId);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
