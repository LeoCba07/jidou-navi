// i18n configuration with device locale detection and language persistence
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import es from '../locales/es.json';

const LANGUAGE_KEY = '@jidounavi_language';

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
] as const;

export type LanguageCode = (typeof supportedLanguages)[number]['code'];

const resources = {
  en: { translation: en },
  es: { translation: es },
};

// Get the best matching language from device locale
function getDeviceLanguage(): LanguageCode {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
  const supported = supportedLanguages.find((lang) => lang.code === deviceLocale);
  return supported ? supported.code : 'en';
}

// Load persisted language or use device locale
async function getInitialLanguage(): Promise<LanguageCode> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && supportedLanguages.some((lang) => lang.code === savedLanguage)) {
      return savedLanguage as LanguageCode;
    }
  } catch (error) {
    console.warn('Failed to load saved language:', error);
  }
  return getDeviceLanguage();
}

// Save language preference
export async function setLanguage(languageCode: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.error('Failed to save language:', error);
  }
}

// Get current language
export function getCurrentLanguage(): LanguageCode {
  return i18n.language as LanguageCode;
}

// Initialize i18n
export async function initI18n(): Promise<void> {
  const initialLanguage = await getInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });
}

export default i18n;
