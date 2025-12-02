import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import translations from './translations';

const TranslationContext = createContext();

export const useTranslation = (namespace = 'common') => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  
  const t = (key, options = {}) => {
    // Support "namespace:key" syntax for absolute lookups
    let fullKey = key;
    if (key.includes(':')) {
        fullKey = key.replace(':', '.');
    } else {
        fullKey = `${namespace}.${key}`;
    }

    // Check if the full key exists in the current language
    const result = context.t(fullKey, options);
    
    // Fallback: If result is the key itself, try global lookup if it wasn't already namespaced
    if (result === fullKey && !key.includes(':')) {
        const globalResult = context.t(key, options);
        if (globalResult !== key) return globalResult;
    }
    return result;
  };
  
  return { t, i18n: { language: context.language, changeLanguage: context.changeLanguage } };
};

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.language) {
          setLanguage(user.language);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
      setLoading(false);
    };
    loadLanguage();
  }, []);

  const t = (key, options = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    // Fallback to English if language not found
    if (!value) {
      value = translations['en'];
    }
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Try English fallback
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object') {
            fallback = fallback[fk];
          } else {
            return key;
          }
        }
        return fallback || key;
      }
    }
    
    if (typeof value === 'string') {
      // Handle pluralization logic first if count is present
      // (Note: simplified for this context, normally requires specific keys)
      
      // Handle general interpolation
      Object.keys(options).forEach(param => {
        value = value.replace(new RegExp(`{{${param}}}`, 'g'), options[param]);
      });
      
      return value;
    }
    
    return value || key;
  };

  const changeLanguage = async (newLanguage) => {
    setLanguage(newLanguage);
    try {
      await base44.auth.updateMe({ language: newLanguage });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <TranslationContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};