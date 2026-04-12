'use client';

import { useEffect, useRef, useState } from 'react';
import { Finding, DoctorDiagnosisConfig, Language } from '@/lib/types';
import { getTranslations } from '@/lib/translations';
import TTSButton from './TTSButton';

interface FindingCardProps {
  finding: Finding;
  doctorConfig: DoctorDiagnosisConfig | null;
  language: Language;
  index: number;
  isHighlighted?: boolean;
}

function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Photo gallery — up to 4 images
function PhotoGallery({ urls, altBase }: { urls: string[]; altBase: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const valid = urls.filter(Boolean);
  if (!valid.length) return null;

  const gridClass =
    valid.length === 1
      ? 'grid-cols-1'
      : valid.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-2';

  return (
    <>
      <div className={`grid ${gridClass} gap-1.5 mb-4`}>
        {valid.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(url)}
            className="relative rounded-xl overflow-hidden border border-slate-100 group focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ aspectRatio: '4/3' }}
            aria-label={`${altBase} — foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${altBase} ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <svg className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center -mt-2 mb-4">
        {valid.length === 1 ? 'Imagen ilustrativa' : `${valid.length} imágenes ilustrativas`} · Toque para ampliar
      </p>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Vista ampliada"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default function FindingCard({
  finding,
  doctorConfig,
  language,
  index,
  isHighlighted = false,
}: FindingCardProps) {
  const t = getTranslations(language);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const isRtl = language === 'ar';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  const explanation = finding.explanation;

  const ttsName = finding.medical_name_translated || finding.medical_name;
  const fullText = [
    ttsName,
    t.whatIs + ': ' + explanation.what_is,
    t.implications + ': ' + explanation.implications,
    t.followUp + ': ' + explanation.follow_up,
  ].join('. ');

  const locationLabel =
    t.colonSegments[finding.location as keyof typeof t.colonSegments] || finding.location;

  const photoUrls = (doctorConfig?.photo_urls ?? []).filter((u): u is string => !!u);
  const videoUrl = doctorConfig?.video_url || '';
  const youtubeUrl = doctorConfig?.youtube_url || '';
  const youtubeId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;
  const hasCustomExplanation = doctorConfig?.custom_explanation_es && language !== 'es';

  return (
    <div
      ref={cardRef}
      className={`glass-card p-5 transition-all duration-300 ${
        isHighlighted ? 'ring-2 ring-blue-400 shadow-blue-100' : ''
      } ${visible ? 'finding-card-enter' : 'opacity-0 translate-y-6'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="section-title text-xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair, serif)' }}
          >
            {finding.medical_name}
            {finding.medical_name_translated && finding.medical_name_translated !== finding.medical_name && (
              <span className="text-slate-400 font-normal"> / {finding.medical_name_translated}</span>
            )}
          </h3>
          <span className="inline-flex items-center gap-1 mt-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {t.location}: {locationLabel}
          </span>
        </div>
        {hasCustomExplanation && (
          <span className="flex-shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-medium">
            {t.doctorNote}
          </span>
        )}
      </div>

      {/* Photo gallery */}
      {photoUrls.length > 0 && (
        <PhotoGallery urls={photoUrls} altBase={finding.medical_name} />
      )}

      {/* Explanation sections */}
      <div className="space-y-3">
        <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100/60">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">🔬</span>
            <h4 className="text-sm font-semibold text-blue-800">{t.whatIs}</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation.what_is}</p>
        </div>
        <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-100/60">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">💡</span>
            <h4 className="text-sm font-semibold text-amber-800">{t.implications}</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation.implications}</p>
        </div>
        <div className="bg-green-50/60 rounded-xl p-3.5 border border-green-100/60">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">📋</span>
            <h4 className="text-sm font-semibold text-green-800">{t.followUp}</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation.follow_up}</p>
        </div>
      </div>

      {/* Local video clip */}
      {videoUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full max-h-56"
            preload="metadata"
          >
            <p className="text-white text-sm p-4">
              Tu navegador no soporta reproducción de video.
            </p>
          </video>
          <p className="text-xs text-slate-400 text-center py-1.5 bg-slate-50">
            {language === 'es' ? 'Video ilustrativo' : 'Illustrative video'}
          </p>
        </div>
      )}

      {/* YouTube embed */}
      {youtubeId && (
        <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={`Video: ${finding.medical_name}`}
            className="w-full h-48"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* YouTube external link fallback */}
      {youtubeUrl && !youtubeId && (
        <div className="mt-4">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-2 px-4 inline-flex"
          >
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            {t.watchVideo}
          </a>
        </div>
      )}

      {/* TTS */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
        <TTSButton text={fullText} language={language} label={t.listenThis} />
      </div>
    </div>
  );
}
