/**
 * LanguageContext — manages the active language (Arabic / English), RTL
 * direction, persistence, and a translation helper `t()`.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations, TranslationKey } from '@/i18n/translations';

const STORAGE_KEY = '@taqni/language';

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => Promise<void>;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function applyDirection(isRTL: boolean) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ar' : 'en';
  } else {
    try {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    } catch {
      // no-op on platforms that disallow it
    }
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as Language | null;
        const initial = saved ?? 'ar';
        setLanguageState(initial);
        applyDirection(initial === 'ar');
      } catch {
        applyDirection(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    applyDirection(lang === 'ar');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore persistence errors
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? key,
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, isRTL: language === 'ar', t, setLanguage, loading }),
    [language, t, setLanguage, loading]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
