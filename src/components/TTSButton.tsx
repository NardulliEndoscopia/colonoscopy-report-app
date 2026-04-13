'use client';

import { useState, useCallback, useRef } from 'react';
import { Language } from '@/lib/types';

interface TTSButtonProps {
  text: string;
  language: Language;
  className?: string;
  label?: string;
}

export default function TTSButton({ text, language, className = '', label }: TTSButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const handleClick = useCallback(async () => {
    if (isSpeaking || isLoading) { stop(); return; }

    setIsLoading(true);

    // Create/resume AudioContext synchronously on the user gesture — this unlocks audio
    // in all browsers regardless of how long the subsequent async operations take.
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = stop;
      sourceRef.current = source;

      setIsLoading(false);
      setIsSpeaking(true);
      source.start(0);
    } catch {
      stop();
    }
  }, [isSpeaking, isLoading, text, language, stop]);

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
