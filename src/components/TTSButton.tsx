'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '@/lib/types';

interface TTSButtonProps {
  text: string;
  language: Language;
  className?: string;
  label?: string;
}

const langToBCP47: Record<Language, string> = {
  es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT',
  pt: 'pt-PT', de: 'de-DE', nl: 'nl-NL', pl: 'pl-PL',
  ro: 'ro-RO', ar: 'ar-SA', ru: 'ru-RU', zh: 'zh-CN',
};

const voicePriority: Record<Language, string[]> = {
  es: ['es-ES', 'es-MX', 'es'], en: ['en-GB', 'en-US', 'en'],
  fr: ['fr-FR', 'fr'], it: ['it-IT', 'it'], pt: ['pt-PT', 'pt-BR', 'pt'],
  de: ['de-DE', 'de'], nl: ['nl-NL', 'nl'], pl: ['pl-PL', 'pl'],
  ro: ['ro-RO', 'ro'], ar: ['ar-SA', 'ar'], ru: ['ru-RU', 'ru'], zh: ['zh-CN', 'zh'],
};

function pickVoice(lang: Language): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const locale of voicePriority[lang]) {
    const v = voices.find(v => v.lang === locale);
    if (v) return v;
  }
  const prefix = langToBCP47[lang].split('-')[0];
  return voices.find(v => v.lang.startsWith(prefix)) ?? null;
}

export default function TTSButton({ text, language, className = '', label }: TTSButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    // Load voices
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (pollRef.current) clearInterval(pollRef.current);
    setIsSpeaking(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!supported) return;
    if (isSpeaking) { stop(); return; }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langToBCP47[language];
    utterance.rate = 0.88;

    const voice = pickVoice(language);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Poll because onend is unreliable on some browsers
      pollRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsSpeaking(false);
        }
      }, 500);
    };
    utterance.onend = stop;
    utterance.onerror = stop;

    window.speechSynthesis.speak(utterance);
  }, [supported, isSpeaking, text, language, stop]);

  if (!supported) return null;

  return (
    <button
      onClick={handleClick}
      title={isSpeaking ? 'Detener' : (label || 'Escuchar')}
      aria-label={isSpeaking ? 'Detener narración' : (label || 'Escuchar')}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isSpeaking
          ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
      } ${className}`}
    >
      {isSpeaking ? (
        <>
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <rect x="3" y="4" width="3" height="12" rx="1.5" />
            <rect x="8.5" y="2" width="3" height="16" rx="1.5" />
            <rect x="14" y="5" width="3" height="10" rx="1.5" />
          </svg>
          <span>{label ? 'Detener' : '●'}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .893.165 1.747.466 2.52.111.29.39.48.701.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
            <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
          </svg>
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
