'use client';

/**
 * Fase 5 — belønner XP første gang en bruger læser en guide. Rendres på
 * artikelsiden; kalder progress-trackeren én gang pr. slug (idempotent i
 * backend/demo). Fejler blødt hvis brugeren ikke er logget ind.
 */
import { useEffect } from 'react';
import { api } from '@/lib/api';

export function GuideReadTracker({ slug }: { slug: string }) {
  useEffect(() => {
    api.trackAction('guide_read', slug).catch(() => {});
  }, [slug]);
  return null;
}
