'use client';

/**
 * Fase 1 — sundheds-ring. En kompakt SVG-donut der viser maskinens
 * sundhedsscore (0–100) med farve efter status.
 */
import type { HealthStatus } from '@/lib/types';
import { HEALTH_UI } from '@/lib/gamify';

interface HealthRingProps {
  score: number | null;
  status: HealthStatus;
  size?: number;
}

export function HealthRing({ score, status, size = 64 }: HealthRingProps) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const dash = (pct / 100) * c;
  const ui = HEALTH_UI[status];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ui.ring}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold leading-none text-gray-900">
          {score ?? '–'}
        </span>
      </div>
    </div>
  );
}
