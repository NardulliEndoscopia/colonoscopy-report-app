'use client';

import { useState, useEffect, useRef } from 'react';
import { DoctorConfig, DoctorDiagnosisConfig, FindingExplanation } from '@/lib/types';
import diagnosesData from '@/data/diagnoses.json';

const diagnosisKeys = Object.keys(diagnosesData) as (keyof typeof diagnosesData)[];

interface DiagnosisEntry {
  label_es: string;
  label_en: string;
  default_explanation_es: FindingExplanation;
}
const diagnoses = diagnosesData as Record<string, DiagnosisEntry>;

const PHOTO_SLOTS = ['photo_0', 'photo_1', 'photo_2', 'photo_3'] as const;
type PhotoSlot = typeof PHOTO_SLOTS[number];

interface DiagnosisFormState {
  photo_urls: (string | null)[];   // 4 slots
  video_url: string;
  youtube_url: string;
  customEnabled: boolean;
  custom_what_is: string;
  custom_implications: string;
  custom_follow_up: string;
}

function emptyForm(): DiagnosisFormState {
  return {
    photo_urls: [null, null, null, null],
    video_url: '', youtube_url: '',
    customEnabled: false,
    custom_what_is: '', custom_implications: '', custom_follow_up: '',
  };
}

function configToForms(config: DoctorConfig): Record<string, DiagnosisFormState> {
  const forms: Record<string, DiagnosisFormState> = {};
  for (const key of diagnosisKeys) {
    const e = config[key];
    if (!e) { forms[key] = emptyForm(); continue; }
    const slots: (string | null)[] = [null, null, null, null];
    if (e.photo_urls) {
      e.photo_urls.forEach((u, i) => { if (i < 4) slots[i] = u ?? null; });
    }
    forms[key] = {
      photo_urls: slots,
      video_url: e.video_url || '',
      youtube_url: e.youtube_url || '',
      customEnabled: !!e.custom_explanation_es,
      custom_what_is: e.custom_explanation_es?.what_is || '',
      custom_implications: e.custom_explanation_es?.implications || '',
      custom_follow_up: e.custom_explanation_es?.follow_up || '',
    };
  }
  return forms;
}

function buildConfig(forms: Record<string, DiagnosisFormState>): DoctorConfig {
  const config: DoctorConfig = {};
  for (const key of diagnosisKeys) {
    const f = forms[key];
    if (!f) continue;
    const hasMedia  = f.photo_urls.some(Boolean) || f.video_url;
    const hasLinks  = f.youtube_url;
    const hasCustom = f.customEnabled;
    if (!hasMedia && !hasLinks && !hasCustom) continue;
    const entry: DoctorDiagnosisConfig = {};
    if (f.photo_urls.some(Boolean)) entry.photo_urls = f.photo_urls;
    if (f.video_url)   entry.video_url   = f.video_url;
    if (f.youtube_url) entry.youtube_url = f.youtube_url;
    if (f.customEnabled && (f.custom_what_is || f.custom_implications || f.custom_follow_up)) {
      entry.custom_explanation_es = {
        what_is: f.custom_what_is,
        implications: f.custom_implications,
        follow_up: f.custom_follow_up,
      };
    }
    config[key] = entry;
  }
  return config;
}

// ── Photo / Video slot component ──────────────────────────────────────────
function MediaSlot({
  url, label, accept, isVideo, isUploading,
  onUpload, onDelete,
}: {
  url: string | null;
  label: string;
  accept: string;
  isVideo?: boolean;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex flex-col">
      <span className="text-xs font-medium text-slate-500 mb-1">{label}</span>

      {url ? (
        /* ── Filled slot ── */
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
             style={{ aspectRatio: isVideo ? '16/9' : '4/3' }}>
          {isVideo ? (
            <video src={url} className="w-full h-full object-cover" preload="metadata" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="bg-white/90 hover:bg-white text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Cambiar
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isUploading}
              className="bg-red-500/90 hover:bg-red-600 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="spinner" />
            </div>
          )}
        </div>
      ) : (
        /* ── Empty slot ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ aspectRatio: isVideo ? '16/9' : '4/3' }}
        >
          {isUploading ? (
            <span className="spinner" />
          ) : isVideo ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <span className="text-xs font-medium">{isUploading ? 'Subiendo…' : 'Subir'}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword]       = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError]     = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [forms, setForms] = useState<Record<string, DiagnosisFormState>>(() => {
    const init: Record<string, DiagnosisFormState> = {};
    for (const k of diagnosisKeys) init[k] = emptyForm();
    return init;
  });

  // { key_slot: true } — e.g. "diverticulos_photo_0": true
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey,  setSavedKey]  = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSaved,  setGlobalSaved]  = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load config from API after login
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: DoctorConfig) => {
        if (cfg && typeof cfg === 'object' && !('error' in cfg)) {
          setForms(configToForms(cfg));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // ── Auth ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res  = await fetch('/api/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setAuthPassword(password);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Contraseña incorrecta');
      }
    } catch { setAuthError('Error de conexión'); }
    finally   { setIsLoggingIn(false); }
  };

  // ── Save config ──────────────────────────────────────────────────────────
  const saveConfig = async (config: DoctorConfig, key?: string) => {
    const res = await fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: authPassword, config }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Error al guardar');
    }
    if (key) {
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
    }
  };

  const handleSaveDiagnosis = async (key: string) => {
    setSavingKey(key); setSaveError(null);
    try { await saveConfig(buildConfig(forms), key); }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Error'); }
    finally     { setSavingKey(null); }
  };

  const handleSaveAll = async () => {
    setGlobalSaving(true); setSaveError(null);
    try { await saveConfig(buildConfig(forms)); setGlobalSaved(true); setTimeout(() => setGlobalSaved(false), 3000); }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Error'); }
    finally     { setGlobalSaving(false); }
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const handleUpload = async (key: string, slot: string, file: File) => {
    const uploadKey = `${key}_${slot}`;
    setUploading(p => ({ ...p, [uploadKey]: true }));
    setSaveError(null);

    try {
      const oldUrl =
        slot === 'video'
          ? forms[key]?.video_url || null
          : forms[key]?.photo_urls[PHOTO_SLOTS.indexOf(slot as PhotoSlot)] || null;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('diagnosisKey', key);
      fd.append('slot', slot);
      fd.append('password', authPassword);
      if (oldUrl) fd.append('oldUrl', oldUrl);

      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al subir');

      // Update local state
      const newForms = { ...forms };
      if (slot === 'video') {
        newForms[key] = { ...newForms[key], video_url: data.url };
      } else {
        const idx = PHOTO_SLOTS.indexOf(slot as PhotoSlot);
        const newUrls = [...newForms[key].photo_urls] as (string | null)[];
        newUrls[idx] = data.url;
        newForms[key] = { ...newForms[key], photo_urls: newUrls };
      }
      setForms(newForms);

      // Auto-save to KV/filesystem
      await saveConfig(buildConfig(newForms), key);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(p => ({ ...p, [uploadKey]: false }));
    }
  };

  // ── File delete ──────────────────────────────────────────────────────────
  const handleDelete = async (key: string, slot: string) => {
    const url =
      slot === 'video'
        ? forms[key]?.video_url
        : forms[key]?.photo_urls[PHOTO_SLOTS.indexOf(slot as PhotoSlot)];
    if (!url) return;

    const uploadKey = `${key}_${slot}`;
    setUploading(p => ({ ...p, [uploadKey]: true }));
    setSaveError(null);

    try {
      await fetch('/api/upload', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, password: authPassword }),
      });

      const newForms = { ...forms };
      if (slot === 'video') {
        newForms[key] = { ...newForms[key], video_url: '' };
      } else {
        const idx = PHOTO_SLOTS.indexOf(slot as PhotoSlot);
        const newUrls = [...newForms[key].photo_urls] as (string | null)[];
        newUrls[idx] = null;
        newForms[key] = { ...newForms[key], photo_urls: newUrls };
      }
      setForms(newForms);
      await saveConfig(buildConfig(newForms), key);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setUploading(p => ({ ...p, [uploadKey]: false }));
    }
  };

  const updateForm = (key: string, field: keyof DiagnosisFormState, value: string | boolean) => {
    setForms(p => ({ ...p, [key]: { ...p[key], [field]: value } }));
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="section-title text-2xl mb-1" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
              Panel del Médico
            </h1>
            <p className="text-slate-500 text-sm">Dr. Nardulli · endoscopianardulli.es</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Contraseña de acceso</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            {authError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">{authError}</p>}
            <button type="submit" disabled={isLoggingIn} className="btn-primary justify-center">
              {isLoggingIn
                ? <><span className="spinner" />Verificando...</>
                : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Acceder
                  </>
              }
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main admin UI ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="section-title text-xl" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
              Panel del Médico — Dr. Nardulli
            </h1>
            <p className="text-xs text-slate-500">Fotos y videos se guardan en la nube automáticamente al subirlos</p>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">{saveError}</span>
            )}
            {globalSaved && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                ¡Todo guardado!
              </span>
            )}
            <button onClick={handleSaveAll} disabled={globalSaving} className="btn-primary py-2 px-4 text-sm">
              {globalSaving
                ? <><span className="spinner" />Guardando...</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>Guardar todo</>
              }
            </button>
            <a href="/" className="btn-secondary py-2 px-4 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-4">
        <h2 className="section-title text-xl" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
          Diagnósticos ({diagnosisKeys.length})
        </h2>

        {diagnosisKeys.map((key) => {
          const diag = diagnoses[key];
          const form = forms[key];
          if (!diag || !form) return null;
          const isSaving = savingKey === key;
          const isSaved  = savedKey  === key;

          return (
            <div key={key} className="glass-card p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-10 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-800">{diag.label_es}</h3>
                  <p className="text-xs text-slate-500">{diag.label_en} · <code className="text-blue-600">{key}</code></p>
                </div>
              </div>

              {/* ── 4 photo slots (2×2) ── */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Fotos ilustrativas (hasta 4)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PHOTO_SLOTS.map((slot, idx) => (
                    <MediaSlot
                      key={slot}
                      url={form.photo_urls[idx] ?? null}
                      label={`Foto ${idx + 1}`}
                      accept="image/jpeg,image/png,image/webp"
                      isUploading={!!uploading[`${key}_${slot}`]}
                      onUpload={(file) => handleUpload(key, slot, file)}
                      onDelete={() => handleDelete(key, slot)}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Formatos: JPG, PNG, WebP · Máx. 8 MB por foto</p>
              </div>

              {/* ── Video clip ── */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Video clip local (opcional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <MediaSlot
                    url={form.video_url || null}
                    label="Video clip"
                    accept="video/mp4,video/webm"
                    isVideo
                    isUploading={!!uploading[`${key}_video`]}
                    onUpload={(file) => handleUpload(key, 'video', file)}
                    onDelete={() => handleDelete(key, 'video')}
                  />
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">
                      O enlace a YouTube (para videos largos)
                    </label>
                    <input
                      type="url" value={form.youtube_url}
                      onChange={e => updateForm(key, 'youtube_url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">El clip local tiene prioridad sobre YouTube</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Formatos: MP4, WebM · Máx. 50 MB · Recomendado: ≤ 30 segundos</p>
              </div>

              {/* ── Custom explanation toggle ── */}
              <div className="mb-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => updateForm(key, 'customEnabled', !form.customEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.customEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.customEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Explicación personalizada en español</span>
                </label>
              </div>

              {form.customEnabled && (
                <div className="grid grid-cols-1 gap-3 bg-slate-50/60 rounded-xl p-4 border border-slate-100 mb-4">
                  {([
                    { field: 'custom_what_is'      as const, label: '¿Qué es?' },
                    { field: 'custom_implications'  as const, label: '¿Qué significa?' },
                    { field: 'custom_follow_up'     as const, label: '¿Qué hacer?' },
                  ] as const).map(({ field, label }) => (
                    <div key={field}>
                      <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                      <textarea
                        value={form[field] as string}
                        onChange={e => updateForm(key, field, e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-y"
                      />
                    </div>
                  ))}
                  <details className="text-xs">
                    <summary className="text-slate-400 cursor-pointer hover:text-slate-600">Ver explicación predeterminada</summary>
                    <div className="mt-2 space-y-1.5 text-slate-500 bg-white rounded-lg p-3 border border-slate-100">
                      <p><strong>¿Qué es?</strong> {diag.default_explanation_es.what_is}</p>
                      <p><strong>¿Qué significa?</strong> {diag.default_explanation_es.implications}</p>
                      <p><strong>¿Qué hacer?</strong> {diag.default_explanation_es.follow_up}</p>
                    </div>
                  </details>
                </div>
              )}

              {/* Save button */}
              <div className="flex justify-end items-center gap-2">
                {isSaved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardado
                  </span>
                )}
                <button
                  onClick={() => handleSaveDiagnosis(key)}
                  disabled={isSaving}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  {isSaving
                    ? <><span className="spinner" style={{ width: 12, height: 12 }} />Guardando...</>
                    : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>Guardar cambios</>
                  }
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
