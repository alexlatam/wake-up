import { createContext, useContext, useState, type ReactNode } from 'react';
import { getSettingSync, saveSetting } from '@/infrastructure/persistence/settingsStorage';
import { en, type Translations } from './en';
import { es } from './es';

export type Language = 'en' | 'es';

const translations: Record<Language, Translations> = { en, es };

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = getSettingSync('language');
    return stored === 'en' || stored === 'es' ? stored : 'en';
  });

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    saveSetting('language', lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
