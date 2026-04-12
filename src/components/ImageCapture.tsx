'use client';

import { useState, useRef, useCallback } from 'react';
import { Language } from '@/lib/types';
import { getTranslations } from '@/lib/translations';
import Image from 'next/image';

interface ImageCaptureProps {
  onImageSelected: (base64: string, file: File) => void;
  language: Language;
}

export default function ImageCapture({ onImageSelected, language }: ImageCaptureProps) {
  const t = getTranslations(language);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      onImageSelected(base64, file);
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const isRtl = language === 'ar';

  if (preview) {
    return (
      <div className="glass-card p-4 flex flex-col items-center gap-3">
        <div className="relative w-full max-w-sm rounded-xl overflow-hidden shadow-lg border border-slate-100">
          <Image
            src={preview}
            alt={t.imageSelected}
            width={400}
            height={300}
            className="w-full object-contain max-h-64"
            unoptimized
          />
          <div className="absolute top-2 right-2">
            <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t.imageSelected}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="btn-secondary text-sm py-2 px-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t.changeImage}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Drag and drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3
          cursor-pointer transition-all duration-200 min-h-[180px]
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/50'
          }
        `}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${isDragging ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
          <svg className={`w-7 h-7 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className={`text-sm font-medium ${isDragging ? 'text-blue-700' : 'text-slate-600'}`}>
            {t.dragDrop}
          </p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC — máx. 20MB</p>
        </div>
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 border-2 border-blue-500 pointer-events-none" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action buttons */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex-1 justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t.uploadBtn}
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="btn-secondary flex-1 justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t.cameraBtn}
        </button>
      </div>
    </div>
  );
}
