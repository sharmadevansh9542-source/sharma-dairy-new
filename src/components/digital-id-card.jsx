'use client';

import { Printer, QrCode, ShieldCheck } from 'lucide-react';

/**
 * Generates a deterministic 21x21 QR-like visual matrix from a member code.
 * Never embeds sensitive PII or exposes public endpoints.
 */
function generateMatrix(code) {
  const size = 21;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));

  // Position detection finder squares (top-left, top-right, bottom-left)
  const drawFinder = (r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Deterministic bit fill from code string
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (!inFinder) {
        hash = Math.imul(hash ^ (r * 31 + c), 16777619);
        grid[r][c] = (Math.abs(hash) % 10) > 4;
      }
    }
  }

  return grid;
}

export default function DigitalIdCard({
  fullName,
  code,
  roleLabel,
  dairyName = 'Sharma Dairy',
  subtitle,
}) {
  const matrix = generateMatrix(code || 'MEMBER');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
          <svg width="72" height="72" viewBox="0 0 21 21" aria-label={`Digital QR ID for ${code}`}>
            {matrix.map((row, rIdx) =>
              row.map((cell, cIdx) =>
                cell ? (
                  <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" fill="#052e16" />
                ) : null
              )
            )}
          </svg>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-900 uppercase">
              {roleLabel} Digital ID
            </span>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-green-700" /> Verified
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">{fullName}</h3>
          <p className="font-mono text-xs font-bold text-green-800">{code}</p>
          <p className="text-[11px] text-slate-500">
            {dairyName} {subtitle ? `· ${subtitle}` : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 print:hidden cursor-pointer"
      >
        <Printer size={14} /> Print ID Card
      </button>
    </div>
  );
}

