'use client';

import { useState, useEffect, useCallback } from 'react';
import { Language, AnalysisResult, DoctorConfig, ColonSegment } from '@/lib/types';
import { getTranslations } from '@/lib/translations';
import LanguageSelector from '@/components/LanguageSelector';
import ImageCapture from '@/components/ImageCapture';
import ColonDiagram from '@/components/ColonDiagram';
import FindingCard from '@/components/FindingCard';
import TTSButton from '@/components/TTSButton';

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('es');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doctorConfig, setDoctorConfig] = useState<DoctorConfig>({});
  const [highlightedFinding, setHighlightedFinding] = useState<string | null>(null);

  const t = getTranslations(language);
  const isRtl = language === 'ar';

  // Load doctor config on mount
  useEffect(() => {
    const envConfig = process.env.NEXT_PUBLIC_DOCTOR_CONFIG;
    if (envConfig) {
      try {
        const parsed = JSON.parse(envConfig);
        setDoctorConfig(parsed);
        return;
      } catch {
        // ignore
      }
    }
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setDoctorConfig(data);
        }
      })
      .catch(() => {
        // config is optional
      });
  }, []);

  const handleImageSelected = useCallback((base64: string) => {
    setSelectedImage(base64);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage, language }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || t.errorAnalysis);
      } else {
        setResult(data as AnalysisResult);
        // Scroll to results
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      }
    } catch {
      setError(t.errorAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, language, t.errorAnalysis]);

  const handleNewAnalysis = () => {
    setResult(null);
    setSelectedImage(null);
    setError(null);
    setHighlightedFinding(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build findingsBySegment for ColonDiagram
  const findingsBySegment: Record<ColonSegment, string[]> = {
    terminal_ileum: [], cecum: [], ascending_colon: [], hepatic_flexure: [],
    transverse_colon: [], splenic_flexure: [], descending_colon: [],
    sigmoid_colon: [], rectum: [], anal_canal: [], multiple: [], unspecified: [],
  };

  if (result) {
    for (const finding of result.findings) {
      const seg = finding.location;
      if (seg && findingsBySegment[seg] !== undefined) {
        findingsBySegment[seg].push(finding.medical_name);
      }
    }
  }

  const highlightedSegments: ColonSegment[] = result
    ? [...new Set(result.findings.map((f) => f.location).filter((loc) => loc !== 'multiple' && loc !== 'unspecified'))]
    : [];

  // Build full text for "listen all"
  const allFindingsText = result
    ? result.findings
        .map(
          (f) =>
            `${f.medical_name}. ${f.explanation.what_is} ${f.explanation.implications} ${f.explanation.follow_up}`
        )
        .join('. ')
    : '';

  return (
    <div className="min-h-screen flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200 flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1
                className="text-xl font-bold text-blue-900 leading-tight"
                style={{ fontFamily: 'var(--font-playfair, serif)' }}
              >
                ColonReport
              </h1>
              <a
                href="https://endoscopianardulli.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 transition-colors leading-tight block"
              >
                endoscopianardulli.es
              </a>
            </div>
          </div>

          {/* Doctor name — hidden on very small screens */}
          <div className="hidden md:block text-center">
            <p className="text-xs text-slate-500 font-medium">Dr. Gianfranco Nardulli Fernández</p>
            <p className="text-xs text-slate-400">Gastroenterólogo / Gastroenterologist</p>
          </div>

          {/* Admin access button */}
          <a
            href="/admin"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg px-3 py-1.5 transition-all duration-200"
            title="Panel médico"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Panel médico
          </a>

          {/* Language selector */}
          <div className="flex-shrink-0">
            <LanguageSelector current={language} onChange={setLanguage} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Hero Section — shown when no result */}
        {!result && (
          <section className="text-center py-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 mb-4">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Dr. Nardulli · endoscopianardulli.es
            </div>

            <h2
              className="section-title text-4xl md:text-5xl mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              {t.heroTitle}
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto mb-6 leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { icon: '🔬', label: t.featureAI },
                { icon: '🌍', label: t.featureLanguages },
                { icon: '🔊', label: t.featureVoice },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 bg-white/80 text-slate-700 text-sm font-medium px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Image capture + Analyze */}
        {!result && (
          <section className="max-w-xl mx-auto w-full flex flex-col gap-4">
            <div className="glass-card p-1 overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <h3
                  className="section-title text-xl mb-1"
                  style={{ fontFamily: 'var(--font-playfair, serif)' }}
                >
                  {t.uploadTitle}
                </h3>
                <p className="text-slate-500 text-sm">{t.uploadSubtitle}</p>
              </div>
              <div className="px-4 pb-4">
                <ImageCapture
                  onImageSelected={(base64, file) => {
                    void file;
                    handleImageSelected(base64);
                  }}
                  language={language}
                />
              </div>
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!selectedImage || isAnalyzing}
              className="btn-primary w-full justify-center text-lg py-4 pulse-blue disabled:pulse-none"
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  {t.analyzeBtn}
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="glass-card p-4 border border-red-200 bg-red-50/80">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-500 text-xs mt-1 underline">
                      {t.tryAgain}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Results section */}
        {result && (
          <section id="results-section" className="flex flex-col gap-6">
            {/* New analysis button */}
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2
                className="section-title text-2xl"
                style={{ fontFamily: 'var(--font-playfair, serif)' }}
              >
                {t.findingsTitle}
              </h2>
              <button onClick={handleNewAnalysis} className="btn-secondary py-2 px-4 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t.newAnalysis}
              </button>
            </div>

            {/* Overall summary card */}
            <div className="glass-card p-5 border-l-4 border-blue-500">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-semibold text-blue-900">{t.overallSummary}</h3>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{result.overall_summary}</p>
                  {result.report_date && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t.reportDate}: {result.report_date}
                    </p>
                  )}
                </div>
                <TTSButton
                  text={result.overall_summary}
                  language={language}
                  label={t.listenThis}
                />
              </div>
            </div>

            {/* Two-column layout on larger screens: diagram + findings */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
              {/* Colon diagram */}
              <div className="lg:sticky lg:top-24">
                <ColonDiagram
                  highlightedSegments={highlightedSegments}
                  language={language}
                  findingsBySegment={findingsBySegment}
                  onSegmentClick={(seg) => {
                    const finding = result.findings.find((f) => f.location === seg);
                    if (finding) {
                      setHighlightedFinding(finding.id);
                      document.getElementById(`finding-${finding.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                />
              </div>

              {/* Findings list */}
              <div className="flex flex-col gap-4">
                {result.findings.length === 0 ? (
                  <div className="glass-card p-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">{t.noFindings}</p>
                  </div>
                ) : (
                  <>
                    {result.findings.map((finding, index) => (
                      <div key={finding.id} id={`finding-${finding.id}`}>
                        <FindingCard
                          finding={finding}
                          doctorConfig={
                            finding.overall_finding_type
                              ? (doctorConfig[finding.overall_finding_type] ?? null)
                              : null
                          }
                          language={language}
                          index={index}
                          isHighlighted={highlightedFinding === finding.id}
                        />
                      </div>
                    ))}

                    {/* Listen all button */}
                    <div className="glass-card p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{t.listenAll}</p>
                        <p className="text-xs text-slate-400">
                          {result.findings.length}{' '}
                          {language === 'es'
                            ? result.findings.length === 1 ? 'hallazgo' : 'hallazgos'
                            : result.findings.length === 1 ? 'finding' : 'findings'}
                        </p>
                      </div>
                      <TTSButton
                        text={allFindingsText}
                        language={language}
                        label={t.listenAll}
                        className="flex-shrink-0"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom new analysis */}
            <div className="text-center pt-4">
              <button onClick={handleNewAnalysis} className="btn-primary px-8">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t.newAnalysis}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-1.5">
          <p className="text-sm font-medium text-slate-700">
            Dr. Gianfranco Nardulli Fernández · Gastroenterólogo
          </p>
          <a
            href="https://endoscopianardulli.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            endoscopianardulli.es
          </a>
          <p className="text-xs text-slate-400">© 2025 · {t.poweredBy}</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{t.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
