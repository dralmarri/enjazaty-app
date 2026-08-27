/**
 * تقني — shared TypeScript types mirroring the Supabase schema
 * (see supabase/schema.sql). Keep in sync with the SQL definitions.
 */

/** Role hierarchy, smallest to largest. Only the first three are open for
 * self-registration at launch — dept_manager / general_manager are
 * read-only reporting roles the spec explicitly says NOT to activate yet. */
export type UserRole =
  | 'designer' // مصمم تقنيات تربوية
  | 'coordinator' // موجه تقنيات تربوية (هنادي)
  | 'supervisor' // مراقب تقنيات تربوية
  | 'dept_manager' // مدير إدارة التقنيات التربوية — NOT active at launch
  | 'general_manager'; // مدير الإدارة العامة للتوجيه والمناهج والبحوث — NOT active at launch

/** Roles that can actually register + sign in at launch. */
export const ACTIVE_ROLES: UserRole[] = ['designer', 'coordinator', 'supervisor'];

/** The 6 sub-titles for "مصمم تقنيات تربوية", from most senior to most junior. */
export type DesignerJobTitle =
  | 'كبير اختصاصي تقنيات تربوية'
  | 'اختصاصي أول تقنيات تربوية'
  | 'اختصاصي تقنيات تربوية'
  | 'مصمم أول تقنيات تربوية'
  | 'مصمم تقنيات تربوية'
  | 'مصمم مبتدئ تقنيات تربوية';

export const DESIGNER_JOB_TITLES: DesignerJobTitle[] = [
  'كبير اختصاصي تقنيات تربوية',
  'اختصاصي أول تقنيات تربوية',
  'اختصاصي تقنيات تربوية',
  'مصمم أول تقنيات تربوية',
  'مصمم تقنيات تربوية',
  'مصمم مبتدئ تقنيات تربوية',
];

export type SchoolStage = 'kindergarten' | 'primary' | 'intermediate' | 'secondary';

/** Internal classification for a newly-registered designer. NOT an access
 * gate — a "pending" designer uses the app normally. */
export type DesignerStatus = 'pending' | 'active';

export type VisitType = 'survey' | 'guidance' | 'evaluation' | 'activity';

export interface UserProfile {
  id: string;
  user_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  /** Only meaningful for role='designer'. */
  job_title: DesignerJobTitle | null;
  /** Free-text educational region label (coordinator/supervisor/managers),
   * e.g. "مراقبة توجيه التقنيات التربوية بمنطقة مبارك الكبير التعليمية". */
  educational_region: string | null;
  /** Designer's primary school. */
  school_id: string | null;
  /** Designer's educational stage. */
  education_stage: SchoolStage | null;
  status: DesignerStatus;
  /** Date the designer/coordinator/supervisor was appointed to this post —
   * drives the new-hire 4-period evaluation window (see spec §"تقييم
   * المعيّن حديثاً"). Optional; left null until captured. */
  appointment_date: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  stage: SchoolStage;
  region: string;
  google_maps_url: string | null;
  created_at: string;
}

export interface SchoolAssignment {
  id: string;
  school_id: string;
  designer_id: string;
  created_at: string;
}

export interface SchoolFolder {
  id: string;
  school_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

/** Fixed reference info edited at the school/designer level, not asked on
 * every visit (غرفة العروض / العهدة / المختبر اللغوي). */
export interface SchoolReferenceInfo {
  id: string;
  school_id: string;
  projector_room_notes: string | null;
  custody_notes: string | null;
  language_lab_notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Visit {
  id: string;
  school_id: string;
  /** Set for استطلاعية (one sheet per designer) and زيارة تقييمية contexts. */
  designer_id: string | null;
  visit_type: VisitType;
  visit_date: string;
  visit_time: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

/** Flexible checklist/report payload for a visit. `content` is a JSON blob
 * so the detailed item forms (see README "Stubbed") can evolve without a
 * migration each time. */
export interface VisitReport {
  id: string;
  visit_id: string;
  content: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  school_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  /** null = a coordinator's own activity, not tied to a specific school. */
  school_id: string | null;
  title: string;
  description: string | null;
  activity_date: string;
  created_by: string;
  created_at: string;
}

/** Free-form designer record — final unified form not delivered yet, so this
 * stays intentionally generic (see spec §"سجل المصمم"). */
export interface DesignerRecord {
  id: string;
  school_id: string;
  designer_id: string | null;
  record_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}
