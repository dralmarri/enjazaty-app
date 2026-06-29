/**
 * App-wide constant lists.
 */

/** Kuwait educational regions (المناطق التعليمية في الكويت). */
export const EDUCATIONAL_REGIONS = [
  'منطقة مبارك الكبير التعليمية',
  'منطقة الأحمدي التعليمية',
  'منطقة الجهراء التعليمية',
  'منطقة حولي التعليمية',
  'منطقة الفروانية التعليمية',
  'منطقة العاصمة التعليمية',
] as const;

export type EducationalRegion = (typeof EDUCATIONAL_REGIONS)[number];
