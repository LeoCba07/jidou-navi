// Language state - manages current language and language selector visibility
import { create } from 'zustand';
import { LanguageCode, setLanguage as setI18nLanguage, getCurrentLanguage } from '../lib/i18n';

interface LanguageState {
  currentLanguage: LanguageCode;
  isLanguageSelectorVisible: boolean;
  setCurrentLanguage: (language: LanguageCode) => Promise<void>;
  showLanguageSelector: () => void;
  hideLanguageSelector: () => void;
  initializeLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: 'en',
  isLanguageSelectorVisible: false,

  setCurrentLanguage: async (language: LanguageCode) => {
    await setI18nLanguage(language);
    set({ currentLanguage: language });
  },

  showLanguageSelector: () => set({ isLanguageSelectorVisible: true }),

  hideLanguageSelector: () => set({ isLanguageSelectorVisible: false }),

  initializeLanguage: () => {
    set({ currentLanguage: getCurrentLanguage() });
  },
}));
