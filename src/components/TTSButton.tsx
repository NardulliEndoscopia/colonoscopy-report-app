'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

const langVoicePriority: Record<Language, string[]> = {
  es: ['es-ES', 'es-MX', 'es'],
  en: ['en-GB', 'en-US', 'en-AU', 'en'],
  fr: ['fr-FR', 'fr-CA', 'fr'],
  it: ['it-IT', 'it'],
  pt: ['pt-PT', 'pt-BR', 'pt'],
  de: ['de-DE', 'de-AT', 'de'],
  nl: ['nl-NL', 'nl'],
  pl: ['pl-PL', 'pl'],
  ro: ['ro-RO', 'ro'],
  ar: ['ar-SA', 'ar-EG', 'ar'],
  ru: ['ru-RU', 'ru'],
  zh: ['zh-CN', 'zh-TW', 'zh'],
};

function getBestVoice(language: Language): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const locale of langVoicePriority[language]) {
    // Prefer neural/natural voices (Microsoft Edge, Apple, Google)
    const neural = voices.find(v => v.lang === locale &&
      /neural|natural|online/i.test(v.name));
    if (neural) return neural;
  }
  for (const locale of langVoicePriority[language]) {
    const match = voices.find(v => v.lang === locale);
    if (match) return match;
  }
  const prefix = langToBCP47[language].split('-')[0].toLowerCase();
  return voices.find(v => v.lang.toLowerCase().startsWith(prefix)) ?? null;
}

function speakWithBrowser(text: string, language: Language,
  onStart: () => void, onEnd: () => void) {
  if (!window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langToBCP47[language];
  utterance.rate = 0.88;
  const voice = getBestVoice(language);
  if (voice) utterance.voice = voice;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function TTSButton({ text, language, className = '', label }: TTSButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep voices ready
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', () =>
      window.speechSynthesis.getVoices());
  }, []);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const handleClick = useCallback(async () => {
    if (isSpeaking || isLoading) { stopAll(); return; }

    setIsLoading(true);
    abortRef.current = new AbortController();

    try {
      // Try server-side neural TTS first (10s timeout)
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 10000);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
        signal: abortRef.current.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('server-tts-failed');

      const blob = await res.blob();
      if (blob.size === 0) throw new Error('empty-audio');

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopAll;
      audio.onerror = () => {
        stopAll();
        speakWithBrowser(text, language, () => setIsSpeaking(true), stopAll);
      };
      setIsLoading(false);
      setIsSpeaking(true);
      await audio.play();

    } catch {
      // Server TTS failed or timed out → fall back to browser speech synthesis
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        speakWithBrowser(
          text, language,
          () => setIsSpeaking(true),
          stopAll,
        );
      } else {
        stopAll();
      }
    }
  }, [isSpeaking, isLoading, text, language, stopAll]);

  const isActive = isSpeaking || isLoading;

  return (
    <button
      onClick={handleClick}
      title={isActive ? 'Detener narración' : (label || 'Escuchar')}
      aria-label={isActive ? 'Detener narración' : (label || 'Escuchar')}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {label && <span>...</span>}
        </>
      ) : isSpeaking ? (
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
