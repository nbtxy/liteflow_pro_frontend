/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Locale } from './translations'
import { getPreferredLanguage, setLanguageCookie } from './languageUtils'

interface LanguageContextType {
  locale: Locale
  t: typeof translations.en
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const initialLocale = getPreferredLanguage()
    setLocale(initialLocale)
  }, [])

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    setLanguageCookie(newLocale)
  }

  // Prevent hydration mismatch by rendering default/loading state before mount
  if (!mounted) {
    return null
  }

  return (
    <LanguageContext.Provider
      value={{
        locale,
        t: translations[locale],
        setLocale: handleSetLocale
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
