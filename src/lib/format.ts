/**
 * Small formatting helpers (dates, status labels) used across screens.
 */
import type { Language } from '@/i18n/translations';
import type { AchievementStatus } from '@/types/database';

/** Formats an ISO date string into a localized short date. */
export function formatDate(iso: string | null, language: Language): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Maps an achievement status to a Badge tone. */
export function statusTone(
  status: AchievementStatus
): 'primary' | 'success' | 'danger' | 'muted' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'submitted':
      return 'primary';
    default:
      return 'muted';
  }
}
