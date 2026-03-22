import { Locale } from './translations';

/**
 * Detects the preferred language based on priority:
 * 1. URL search parameter 'lang'
 * 2. Cookie 'lang'
 * 3. System/Browser language
 * 4. Default to 'en'
 * 
 * @param searchParams - Optional URLSearchParams object to check for 'lang' param
 * @returns Language - The detected language ('en' or 'zh')
 */
export const getPreferredLanguage = (searchParams?: URLSearchParams | null): Locale => {
  // 1. Check URL Search Param
  if (searchParams) {
    const langParam = searchParams.get('lang');
    if (langParam === 'en' || langParam === 'zh') {
      return langParam;
    }
  }

  // Check if we are in a browser environment
  if (typeof window !== 'undefined') {
    // 2. Check Cookie
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    if (match) {
      const langCookie = decodeURIComponent(match[1]);
      if (langCookie === 'en' || langCookie === 'zh') {
        return langCookie;
      }
    }

    // 3. Check System/Browser Language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
  }

  // 4. Default
  return 'en';
};

/**
 * Sets the preferred language in a cookie
 * @param lang - The language to set
 */
export const setLanguageCookie = (lang: Locale) => {
  if (typeof document !== 'undefined') {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }
};
