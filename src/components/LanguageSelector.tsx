'use client';

import { Language } from '@/lib/types';

interface LanguageSelectorProps {
  current: Language;
  onChange: (lang: Language) => void;
}

const languages: { code: Language; flag: string; name: string }[] = [
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
];

export default function LanguageSelector({ current, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center sm:justify-end">
      {languages.map(({ code, flag, name }) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          title={name}
          aria-label={`Switch to ${name}`}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
            transition-all duration-200 border
            ${current === code
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-200'
              : 'bg-white/70 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
            }
          `}
        >
          <span className="text-base leading-none">{flag}</span>
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  );
}
