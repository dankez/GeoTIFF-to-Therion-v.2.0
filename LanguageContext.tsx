import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations, Language, TranslationKey } from './translations';

// FIX: Re-export TranslationKey type to fix import error in other components.
export type { TranslationKey } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('sk');

    const t = useCallback((key: TranslationKey, ...args: any[]): string => {
        const stringTemplate = translations[language][key] || translations['en'][key];
        if (typeof stringTemplate === 'function') {
            // Fix for "A spread argument must either have a tuple type or be passed to a rest parameter."
            // This occurs because `stringTemplate` is a union of functions with different signatures.
            // We cast it to a generic function that accepts a rest parameter to satisfy TypeScript.
            return (stringTemplate as (...args: any[]) => string)(...args);
        }
        return stringTemplate || String(key);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
