/**
 * TypeScript types mirroring the Supabase database schema.
 * Keep these in sync with supabase/schema.sql.
 */

export type UserRole = 'admin' | 'employee';

/** users_profile — extends Supabase auth.users with app profile data. */
export interface UserProfile {
  id: string; // = auth.users.id
  user_code: string; // human-friendly unique User ID, e.g. "EMP-0001"
  full_name: string;
  email: string;
  role: UserRole;
  job_title: string | null;
  department_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  /** Kuwait educational region (المنطقة التعليمية). */
  educational_region: string | null;
  /** Employee work center (مركز العمل). */
  work_center: string | null;
  /** Admin's administration unit (الإدارة التابع لها). */
  administration: string | null;
  /** Employer / organization the user belongs to (جهة العمل). */
  employer: string | null;
  /** For employees: the admin (manager) who owns/created them. */
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * supervisions — a supervisor adds a subordinate (by User ID) and places them
 * either in their workspace home or in one of their folders.
 */
export interface Supervision {
  id: string;
  supervisor_id: string;
  subordinate_id: string;
  placement: 'workspace' | 'folder';
  folder_id: string | null;
  created_at: string;
}

/** departments — organizational units created by admins. */
export interface Department {
  id: string;
  name: string;
  description: string | null;
  owner_id: string; // admin who created it
  created_at: string;
}

/** folders — nested containers for organizing files/achievements. */
export interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parent_id: string | null; // for nesting
  department_id: string | null;
  owner_id: string;
  created_at: string;
}

export type AchievementStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_revision';

/** achievements — the core productivity records. */
export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  status: AchievementStatus;
  folder_id: string | null;
  owner_id: string; // employee who created it
  department_id: string | null;
  date: string | null; // achievement date
  created_at: string;
  updated_at: string;
}

export type AttachmentType = 'image' | 'video' | 'file' | 'link' | 'audio';

/** attachments — files/images/videos/links tied to an achievement. */
export interface Attachment {
  id: string;
  achievement_id: string;
  type: AttachmentType;
  url: string;
  name: string | null;
  size: number | null;
  mime_type: string | null;
  owner_id: string;
  /** Owner-confirmed "I made the requested fix" flag (see evaluations flow). */
  fixed: boolean;
  created_at: string;
}

export type NoteType = 'text' | 'audio' | 'image' | 'sticker';

/** notes — text/voice/image/sticker notes (own or on an achievement). */
export interface Note {
  id: string;
  content: string | null; // text body
  type: NoteType;
  media_url: string | null; // for audio/image/sticker
  achievement_id: string | null;
  target_user_id: string | null; // a note about a specific employee
  author_id: string;
  /** Only set on target_user_id notes: a private supervisor follow-up tag. */
  kind: 'praise' | 'concern' | null;
  created_at: string;
}

/** evaluations — a supervisor's review/rating of a subordinate's achievement. */
export interface Evaluation {
  id: string;
  achievement_id: string;
  employee_id: string;
  evaluator_id: string; // supervisor
  rating: number; // 1..5
  comment: string | null;
  /** Electronic signature (typed full name of the evaluating supervisor). */
  signature: string | null;
  /** 'sent' = feedback given, not final yet; 'approved' = locked/final. */
  status: 'sent' | 'approved';
  created_at: string;
}

export type NotificationType =
  | 'achievement'
  | 'evaluation'
  | 'note'
  | 'system'
  | 'assignment';

/** notifications — per-user notifications feed. */
export interface AppNotification {
  id: string;
  user_id: string; // recipient
  title: string;
  body: string | null;
  type: NotificationType;
  read: boolean;
  related_id: string | null; // related entity (achievement, etc.)
  created_at: string;
}

/** signatures — a user's reusable saved signatures (serialized SVG paths). */
export interface Signature {
  id: string;
  user_id: string;
  name: string | null;
  data: string; // JSON array of SVG path strings
  created_at: string;
}

export type AttendanceExceptionType =
  | 'absent'
  | 'sick_leave'
  | 'emergency_leave'
  | 'permission'
  | 'leave';

/**
 * attendance_exceptions — exception-based attendance. A day with no row
 * means the employee was present; a row is recorded only for an absence,
 * sick leave, emergency leave, or permission.
 */
export interface AttendanceException {
  id: string;
  employee_id: string;
  date: string; // 'YYYY-MM-DD'
  type: AttendanceExceptionType;
  note: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

/** Convenience type describing the whole DB for the Supabase client. */
export interface Database {
  public: {
    Tables: {
      users_profile: { Row: UserProfile };
      departments: { Row: Department };
      folders: { Row: Folder };
      achievements: { Row: Achievement };
      attachments: { Row: Attachment };
      notes: { Row: Note };
      evaluations: { Row: Evaluation };
      notifications: { Row: AppNotification };
      attendance_exceptions: { Row: AttendanceException };
    };
  };
}
