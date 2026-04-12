'use client';

import { useState } from 'react';
import { ColonSegment, Language } from '@/lib/types';
import { getTranslations } from '@/lib/translations';

interface ColonDiagramProps {
  highlightedSegments: ColonSegment[];
  language: Language;
  findingsBySegment: Record<ColonSegment, string[]>;
  onSegmentClick?: (segment: ColonSegment) => void;
}

const segmentPaths: Record<string, string> = {
  terminal_ileum: 'M 30 345 C 48 348 64 352 78 358',
  cecum: 'M 78 358 C 78 390 65 408 80 412 C 95 416 108 400 104 372',
  ascending_colon: 'M 92 365 L 92 128',
  hepatic_flexure: 'M 92 128 C 92 92 116 76 148 76',
  transverse_colon: 'M 148 76 L 212 76',
  splenic_flexure: 'M 212 76 C 244 76 268 92 268 128',
  descending_colon: 'M 268 128 L 268 304',
  sigmoid_colon: 'M 268 304 C 268 348 238 364 208 356 C 178 348 168 372 168 400',
  rectum: 'M 168 400 L 168 458',
  anal_canal: 'M 162 458 L 174 458',
};

const segmentLabelPositions: Record<string, { x: number; y: number; anchor: string }> = {
  terminal_ileum: { x: 30, y: 333, anchor: 'middle' },
  cecum: { x: 130, y: 420, anchor: 'middle' },
  ascending_colon: { x: 67, y: 246, anchor: 'end' },
  hepatic_flexure: { x: 112, y: 62, anchor: 'middle' },
  transverse_colon: { x: 180, y: 58, anchor: 'middle' },
  splenic_flexure: { x: 265, y: 62, anchor: 'middle' },
  descending_colon: { x: 310, y: 218, anchor: 'start' },
  sigmoid_colon: { x: 248, y: 400, anchor: 'middle' },
  rectum: { x: 146, y: 432, anchor: 'end' },
  anal_canal: { x: 142, y: 464, anchor: 'end' },
};

const segmentCenters: Record<string, { x: number; y: number }> = {
  terminal_ileum: { x: 54, y: 348 },
  cecum: { x: 92, y: 390 },
  ascending_colon: { x: 92, y: 246 },
  hepatic_flexure: { x: 120, y: 88 },
  transverse_colon: { x: 180, y: 76 },
  splenic_flexure: { x: 256, y: 88 },
  descending_colon: { x: 268, y: 216 },
  sigmoid_colon: { x: 218, y: 362 },
  rectum: { x: 168, y: 428 },
  anal_canal: { x: 168, y: 458 },
};

const allSegments: ColonSegment[] = [
  'terminal_ileum', 'cecum', 'ascending_colon', 'hepatic_flexure',
  'transverse_colon', 'splenic_flexure', 'descending_colon',
  'sigmoid_colon', 'rectum', 'anal_canal',
];

export default function ColonDiagram({
  highlightedSegments,
  language,
  findingsBySegment,
  onSegmentClick,
}: ColonDiagramProps) {
  const t = getTranslations(language);
  const [hoveredSegment, setHoveredSegment] = useState<ColonSegment | null>(null);

  // Count findings per segment for marker numbering
  const segmentsWithFindings = allSegments.filter(
    (seg) => findingsBySegment[seg] && findingsBySegment[seg].length > 0
  );
  const findingIndexMap: Record<string, number> = {};
  segmentsWithFindings.forEach((seg, i) => {
    findingIndexMap[seg] = i + 1;
  });

  return (
    <div className="glass-card p-4 flex flex-col items-center gap-3">
      <h3 className="section-title text-lg text-center">{t.colonDiagramTitle}</h3>

      <div className="relative w-full max-w-xs mx-auto">
        <svg
          viewBox="0 0 360 490"
          className="w-full h-auto"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(37,99,235,0.08))' }}
          aria-label="Colon diagram"
        >
          {/* Background gradient */}
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </radialGradient>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="360" height="490" rx="16" fill="url(#bgGrad)" />

          {/* Title */}
          <text
            x="180"
            y="26"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#1e3a5f"
            fontFamily="serif"
          >
            {language === 'es' ? 'Tu Colon' : t.colonDiagramTitle}
          </text>

          {/* Shadow/background tubes */}
          {allSegments.map((seg) => (
            <path
              key={`shadow-${seg}`}
              d={segmentPaths[seg]}
              fill="none"
              stroke="#f87171"
              strokeWidth={34}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.25}
            />
          ))}

          {/* Main colon segments */}
          {allSegments.map((seg) => {
            const isHighlighted = highlightedSegments.includes(seg);
            const isHovered = hoveredSegment === seg;
            const hasFindings = findingsBySegment[seg]?.length > 0;

            let stroke = '#fecaca';
            let strokeWidth = 28;
            let filterAttr: string | undefined = undefined;

            if (isHighlighted) {
              stroke = '#3b82f6';
              strokeWidth = 32;
              filterAttr = 'url(#glowFilter)';
            } else if (isHovered) {
              stroke = '#fca5a5';
              strokeWidth = 30;
            } else if (hasFindings) {
              stroke = '#93c5fd';
              strokeWidth = 30;
            }

            return (
              <path
                key={seg}
                d={segmentPaths[seg]}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={filterAttr}
                style={{
                  cursor: onSegmentClick ? 'pointer' : 'default',
                  transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => onSegmentClick?.(seg)}
              />
            );
          })}

          {/* Anatomical labels */}
          {allSegments.map((seg) => {
            const pos = segmentLabelPositions[seg];
            if (!pos) return null;
            const isHighlighted = highlightedSegments.includes(seg);
            return (
              <text
                key={`label-${seg}`}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor as 'middle' | 'start' | 'end'}
                fontSize="8.5"
                fill={isHighlighted ? '#1d4ed8' : '#64748b'}
                fontWeight={isHighlighted ? '600' : '400'}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                style={{ pointerEvents: 'none', transition: 'fill 0.2s' }}
              >
                {t.colonSegments[seg as keyof typeof t.colonSegments]}
              </text>
            );
          })}

          {/* Finding markers (numbered blue circles) */}
          {segmentsWithFindings.map((seg) => {
            const center = segmentCenters[seg];
            if (!center) return null;
            const num = findingIndexMap[seg];
            return (
              <g key={`marker-${seg}`} style={{ pointerEvents: 'none' }}>
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={9}
                  fill="#2563eb"
                  stroke="white"
                  strokeWidth={2}
                  opacity={0.95}
                />
                <text
                  x={center.x}
                  y={center.y + 4}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {num}
                </text>
              </g>
            );
          })}

          {/* Small intestine label */}
          <text x="20" y="360" textAnchor="start" fontSize="7.5" fill="#94a3b8" fontFamily="ui-sans-serif, system-ui, sans-serif">
            {language === 'es' ? 'Intestino' : 'Small'}
          </text>
          <text x="20" y="370" textAnchor="start" fontSize="7.5" fill="#94a3b8" fontFamily="ui-sans-serif, system-ui, sans-serif">
            {language === 'es' ? 'delgado' : 'intestine'}
          </text>

          {/* Arrow indicating terminal ileum connection */}
          <path
            d="M 78 358 L 30 348"
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.6}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3 w-full justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#fecaca] border border-[#f87171]/40"></div>
          <span>{language === 'es' ? 'Normal' : 'Normal'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>{language === 'es' ? 'Con hallazgo' : 'With finding'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: '8px' }}>1</span>
          </div>
          <span>{language === 'es' ? 'Nº hallazgo' : 'Finding #'}</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredSegment && findingsBySegment[hoveredSegment]?.length > 0 && (
        <div className="text-xs text-slate-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 w-full">
          <span className="font-semibold text-blue-700">
            {t.colonSegments[hoveredSegment as keyof typeof t.colonSegments]}:
          </span>{' '}
          {findingsBySegment[hoveredSegment].join(', ')}
        </div>
      )}
    </div>
  );
}
