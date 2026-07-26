/**
 * Data-access layer — thin, typed wrappers around Supabase queries used by
 * the screens. Centralizing them keeps screen components focused on UI and
 * makes the queries easy to reuse and test.
 */
import { supabase } from './supabase';
import type {
  Achievement,
  AchievementStatus,
  AppNotification,
  Circular,
  CircularKind,
  CircularRecipient,
  Attachment,
  AttachmentType,
  AttendanceException,
  AttendanceExceptionType,
  Department,
  Evaluation,
  Folder,
  FolderKind,
  Note,
  NoteType,
  Signature,
  Supervision,
  UserProfile,
} from '@/types/database';

/* --------------------------------- Profiles ------------------------------ */

export async function getProfile(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as UserProfile;
}

/** Look up a user by their human-friendly User ID (user_code). */
export async function getProfileByCode(
  code: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('user_code', code.trim())
    .maybeSingle();
  if (error) return null;
  return (data as UserProfile) ?? null;
}

/** Update mutable fields on a profile (avatar, job title, etc.). */
export async function updateProfile(
  id: string,
  patch: Partial<
    Pick<
      UserProfile,
      | 'full_name'
      | 'job_title'
      | 'avatar_url'
      | 'educational_region'
      | 'work_center'
      | 'administration'
      | 'employer'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('users_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Admin creates an employee profile (an "invited" record not yet linked to an
 * auth login). The employee can later self-register with the same email; the
 * manager relationship is captured up front via manager_id.
 */
export async function createEmployeeProfile(input: {
  full_name: string;
  email: string;
  job_title?: string | null;
  manager_id: string;
  user_code: string;
}): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users_profile')
    .insert({ role: 'employee', ...input })
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}

/** Employees managed by an admin (or all employees if none assigned yet). */
export async function listEmployees(managerId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('role', 'employee')
    .or(`manager_id.eq.${managerId},manager_id.is.null`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

/* ------------------------------- Departments ----------------------------- */

export async function listDepartments(ownerId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function createDepartment(input: {
  name: string;
  description?: string | null;
  owner_id: string;
}): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

/* --------------------------------- Folders ------------------------------- */

export async function listFolders(
  ownerId: string,
  kind?: FolderKind
): Promise<Folder[]> {
  let query = supabase.from('folders').select('*').eq('owner_id', ownerId);
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

/**
 * Top-level folders only (no parent). Used on home / employee profile.
 * Pass `kind` to get just the achievement folders or just the employee ones.
 */
export async function listRootFolders(
  ownerId: string,
  kind?: FolderKind
): Promise<Folder[]> {
  let query = supabase
    .from('folders')
    .select('*')
    .eq('owner_id', ownerId)
    .is('parent_id', null);
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

/** Sub-folders nested directly inside the given parent folder. */
export async function listChildFolders(parentId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function getFolder(id: string): Promise<Folder | null> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data as Folder) ?? null;
}

export async function createFolder(input: {
  name: string;
  description?: string | null;
  owner_id: string;
  parent_id?: string | null;
  department_id?: string | null;
  color?: string | null;
  kind?: FolderKind;
}): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

/** Move a folder under another folder (parentId) or to the root (null). */
export async function updateFolderParent(
  id: string,
  parentId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .update({ parent_id: parentId })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Move a folder to the other side of the app — from the My achievements tab to
 * the workspace (team) tab or back. Sub-folders always follow their parent, and
 * the folder is lifted to the root so it never stays nested under a folder of
 * the other kind.
 */
export async function updateFolderKind(
  id: string,
  ownerId: string,
  kind: FolderKind
): Promise<void> {
  const all = await listFolders(ownerId);

  // The folder plus everything nested under it, at any depth.
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of all) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }

  const { error } = await supabase
    .from('folders')
    .update({ kind })
    .in('id', Array.from(ids));
  if (error) throw error;

  const { error: rootError } = await supabase
    .from('folders')
    .update({ parent_id: null })
    .eq('id', id);
  if (rootError) throw rootError;
}

/** Rename a folder. */
export async function updateFolderName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
}

/* ------------------------------ Achievements ----------------------------- */

export async function listAchievements(ownerId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

/**
 * Achievements shown on the "My achievements" home screen: only files not
 * filed into a folder (foldered ones already live under their folder, so
 * repeating them here would just duplicate old content and slow the page
 * down), server-paginated so opening the screen never fetches the whole
 * history at once.
 */
export async function listRootAchievements(
  ownerId: string,
  options: { status?: 'approved' | 'pending'; limit: number; offset?: number }
): Promise<{ items: Achievement[]; total: number }> {
  const { status, limit, offset = 0 } = options;
  let query = supabase
    .from('achievements')
    .select('*', { count: 'exact' })
    .eq('owner_id', ownerId)
    .is('folder_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === 'approved') query = query.eq('status', 'approved');
  if (status === 'pending') query = query.neq('status', 'approved');

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as Achievement[], total: count ?? 0 };
}

/** Achievements inside a specific folder (RLS controls visibility). */
export async function listAchievementsByFolder(
  folderId: string
): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

/** Move an achievement into a folder (or out, with null). */
export async function updateAchievementFolder(
  id: string,
  folderId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('achievements')
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Rename an achievement (change its title). */
export async function updateAchievementTitle(
  id: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('achievements')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getAchievement(id: string): Promise<Achievement | null> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Achievement;
}

export async function createAchievement(input: {
  title: string;
  description?: string | null;
  owner_id: string;
  folder_id?: string | null;
  department_id?: string | null;
  date?: string | null;
  status?: AchievementStatus;
}): Promise<Achievement> {
  const { data, error } = await supabase
    .from('achievements')
    .insert({ status: 'draft', ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Achievement;
}

export async function updateAchievementStatus(
  id: string,
  status: AchievementStatus
): Promise<void> {
  const { error } = await supabase
    .from('achievements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAchievement(id: string): Promise<void> {
  const { error } = await supabase.from('achievements').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------- Attachments ----------------------------- */

/**
 * Attachment types for every achievement of one owner, keyed by achievement id.
 * Used by the report to show what each achievement is made of (image / video /
 * document) without fetching the attachments of each one separately.
 */
export async function listAttachmentTypesByOwner(
  ownerId: string
): Promise<Record<string, AttachmentType[]>> {
  const { data, error } = await supabase
    .from('attachments')
    .select('achievement_id, type')
    .eq('owner_id', ownerId);
  if (error) throw error;
  const map: Record<string, AttachmentType[]> = {};
  for (const row of (data ?? []) as { achievement_id: string; type: AttachmentType }[]) {
    const list = map[row.achievement_id] ?? (map[row.achievement_id] = []);
    if (!list.includes(row.type)) list.push(row.type);
  }
  return map;
}

export async function listAttachments(
  achievementId: string
): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('achievement_id', achievementId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function createAttachment(input: {
  achievement_id: string;
  type: AttachmentType;
  url: string;
  name?: string | null;
  size?: number | null;
  mime_type?: string | null;
  owner_id: string;
}): Promise<Attachment> {
  const { data, error } = await supabase
    .from('attachments')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Attachment;
}

export async function updateAttachment(
  id: string,
  patch: Partial<Pick<Attachment, 'url' | 'size' | 'mime_type'>>
): Promise<void> {
  const { error } = await supabase.from('attachments').update(patch).eq('id', id);
  if (error) throw error;
}

/** Owner toggles "I made the requested fix" on a specific attachment. */
export async function setAttachmentFixed(id: string, fixed: boolean): Promise<void> {
  const { error } = await supabase.from('attachments').update({ fixed }).eq('id', id);
  if (error) throw error;
}

/** Clears the 'fixed' flag on every attachment of an achievement — called
 * whenever a new round of evaluation feedback is sent, so a checkmark from
 * a previous round never carries over. */
async function resetAttachmentsFixed(achievementId: string): Promise<void> {
  await supabase
    .from('attachments')
    .update({ fixed: false })
    .eq('achievement_id', achievementId);
}

/* ---------------------------------- Notes -------------------------------- */

export async function listNotes(params: {
  achievementId?: string;
  targetUserId?: string;
}): Promise<Note[]> {
  let query = supabase.from('notes').select('*');
  if (params.achievementId) query = query.eq('achievement_id', params.achievementId);
  if (params.targetUserId) query = query.eq('target_user_id', params.targetUserId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

/** Follow-up notes ABOUT the given user, with the writing supervisor's name
 * attached — used on the employee's own Activity tab so they can see who
 * left each note. */
export async function listNotesAboutMe(
  userId: string
): Promise<(Note & { author: { full_name: string } | null })[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*, author:author_id (full_name)')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function createNote(input: {
  content?: string | null;
  type: NoteType;
  media_url?: string | null;
  achievement_id?: string | null;
  target_user_id?: string | null;
  author_id: string;
  kind?: 'praise' | 'concern' | null;
}): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

/* ------------------------------- Evaluations ----------------------------- */

export async function listEvaluations(
  employeeId: string
): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Evaluation[];
}

/** The single evaluation for an achievement (null if not yet evaluated). */
export async function getEvaluationByAchievement(
  achievementId: string
): Promise<Evaluation | null> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('achievement_id', achievementId)
    .maybeSingle();
  if (error) return null;
  return (data as Evaluation) ?? null;
}

export async function createEvaluation(input: {
  achievement_id: string;
  employee_id: string;
  evaluator_id: string;
  rating: number;
  comment?: string | null;
  signature?: string | null;
  status: 'sent' | 'approved';
}): Promise<Evaluation> {
  const { data, error } = await supabase
    .from('evaluations')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from('achievements')
    .update({
      status: input.status === 'approved' ? 'approved' : 'needs_revision',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.achievement_id);
  if (input.status === 'sent') await resetAttachmentsFixed(input.achievement_id);
  return data as Evaluation;
}

/** Updates an existing evaluation while it's still 'sent' (not yet approved). */
export async function updateEvaluation(
  id: string,
  achievementId: string,
  patch: {
    rating: number;
    comment?: string | null;
    signature?: string | null;
    status: 'sent' | 'approved';
  }
): Promise<Evaluation> {
  const { data, error } = await supabase
    .from('evaluations')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from('achievements')
    .update({
      status: patch.status === 'approved' ? 'approved' : 'needs_revision',
      updated_at: new Date().toISOString(),
    })
    .eq('id', achievementId);
  if (patch.status === 'sent') await resetAttachmentsFixed(achievementId);
  return data as Evaluation;
}

/* ------------------------------ Signatures ------------------------------- */

export async function listSignatures(userId: string): Promise<Signature[]> {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Signature[];
}

export async function createSignature(input: {
  user_id: string;
  name?: string | null;
  data: string;
}): Promise<Signature> {
  const { data, error } = await supabase
    .from('signatures')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Signature;
}

export async function renameSignature(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('signatures').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteSignature(id: string): Promise<void> {
  const { error } = await supabase.from('signatures').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------ Contact us ------------------------------- */

export async function createContactMessage(input: {
  user_id: string;
  email: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('contact_messages').insert(input);
  if (error) throw error;

  // Best-effort: also email the message so it's actually seen (the row alone
  // is silent unless someone opens the Supabase dashboard). A failure here
  // must not block the user — the message is already saved above.
  try {
    await supabase.functions.invoke('send-contact-email', {
      body: { email: input.email, message: input.message },
    });
  } catch {
    // ignore — message is safely stored regardless
  }
}

/* ------------------------------ Supervisions ----------------------------- */

/** Supervisors (members) who can view the given user's page. */
export async function listMembers(subordinateId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('supervisions')
    .select('supervisor:supervisor_id (*)')
    .eq('subordinate_id', subordinateId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.supervisor as UserProfile);
}

/** Subordinates that the given supervisor manages (with placement info). */
export async function listSupervisions(
  supervisorId: string
): Promise<(Supervision & { subordinate: UserProfile })[]> {
  const { data, error } = await supabase
    .from('supervisions')
    .select('*, subordinate:subordinate_id (*)')
    .eq('supervisor_id', supervisorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

/** The people reporting DIRECTLY to this supervisor (one level only). */
export async function listDirectSubordinates(
  supervisorId: string
): Promise<UserProfile[]> {
  const rows = await listSupervisions(supervisorId);
  return rows.map((r) => r.subordinate).filter(Boolean);
}

/**
 * Every user below `supervisorId` in the supervision chain — direct
 * subordinates plus everyone under the sub-admins below him (any depth).
 * Used by the search screen so a supervisor can find his people by name.
 */
export async function listSupervisedUsers(supervisorId: string): Promise<UserProfile[]> {
  const found = new Map<string, UserProfile>();
  const visited = new Set<string>([supervisorId]);
  let frontier = [supervisorId];

  // Depth guard: the chain is shallow in practice, this just avoids a loop.
  for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from('supervisions')
      .select('subordinate:subordinate_id (*)')
      .in('supervisor_id', frontier);
    if (error) throw error;
    const next: string[] = [];
    for (const row of (data ?? []) as any[]) {
      const sub = row.subordinate as UserProfile | null;
      if (!sub || visited.has(sub.id)) continue;
      visited.add(sub.id);
      found.set(sub.id, sub);
      next.push(sub.id);
    }
    frontier = next;
  }
  return Array.from(found.values());
}

export async function addSupervision(input: {
  supervisor_id: string;
  subordinate_id: string;
  placement: 'workspace' | 'folder';
  folder_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('supervisions').insert({
    supervisor_id: input.supervisor_id,
    subordinate_id: input.subordinate_id,
    placement: input.placement,
    folder_id: input.folder_id ?? null,
  });
  if (error) throw error;
}

export async function removeSupervision(id: string): Promise<void> {
  const { error } = await supabase.from('supervisions').delete().eq('id', id);
  if (error) throw error;
}

/** Change where a supervised employee is classified (workspace or a folder). */
export async function updateSupervisionPlacement(
  id: string,
  placement: 'workspace' | 'folder',
  folderId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('supervisions')
    .update({ placement, folder_id: placement === 'folder' ? folderId : null })
    .eq('id', id);
  if (error) throw error;
}

/** Employees the supervisor has classified into a specific folder. */
export async function listSupervisionsByFolder(
  supervisorId: string,
  folderId: string
): Promise<(Supervision & { subordinate: UserProfile })[]> {
  const { data, error } = await supabase
    .from('supervisions')
    .select('*, subordinate:subordinate_id (*)')
    .eq('supervisor_id', supervisorId)
    .eq('folder_id', folderId);
  if (error) throw error;
  return (data ?? []) as any;
}

/**
 * True when `supervisorId` supervises `subordinateId` — at ANY level of the
 * administrative chain (direct, or through sub-admins below him).
 */
export async function supervises(
  supervisorId: string,
  subordinateId: string
): Promise<boolean> {
  // Transitive check via the DB chain function (migration_v7).
  const { data, error } = await supabase.rpc('in_supervision_chain', {
    sup: supervisorId,
    target: subordinateId,
  });
  if (!error && typeof data === 'boolean') return data;

  // Fallback (function not deployed yet): direct link only.
  const direct = await supabase
    .from('supervisions')
    .select('id')
    .eq('supervisor_id', supervisorId)
    .eq('subordinate_id', subordinateId)
    .limit(1);
  if (direct.error) return false;
  return !!direct.data && direct.data.length > 0;
}

/* ------------------------------ Notifications ---------------------------- */

export async function listNotifications(
  userId: string
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

/* -------------------------------- Circulars ------------------------------- */

/**
 * Send a circular: stored once, then linked to every recipient, each of whom
 * also gets a notification. Recipients only read it — nothing to submit back.
 */
export async function sendCircular(input: {
  sender_id: string;
  kind: CircularKind;
  title: string;
  number?: string | null;
  body?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  source_id?: string | null;
  recipient_ids: string[];
  /** Notification body shown in the bell. */
  notification_title: string;
}): Promise<Circular> {
  const { recipient_ids, notification_title, ...circular } = input;

  const { data, error } = await supabase
    .from('circulars')
    .insert(circular)
    .select()
    .single();
  if (error) throw error;
  const created = data as Circular;

  if (recipient_ids.length > 0) {
    const { error: recipientsError } = await supabase.from('circular_recipients').insert(
      recipient_ids.map((recipient_id) => ({
        circular_id: created.id,
        recipient_id,
        sender_id: created.sender_id,
      }))
    );
    if (recipientsError) throw recipientsError;

    const { error: notifyError } = await supabase.from('notifications').insert(
      recipient_ids.map((user_id) => ({
        user_id,
        title: notification_title,
        body: created.title,
        type: 'circular' as const,
        related_id: created.id,
      }))
    );
    if (notifyError) throw notifyError;
  }

  return created;
}

/** Circulars addressed to this user, pinned ones first, then newest. */
export async function listReceivedCirculars(
  recipientId: string
): Promise<(CircularRecipient & { circular: Circular })[]> {
  const { data, error } = await supabase
    .from('circular_recipients')
    .select('*, circular:circular_id (*)')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as (CircularRecipient & { circular: Circular })[];
  return rows
    .filter((r) => !!r.circular)
    .sort((a, b) => {
      if (a.circular.pinned !== b.circular.pinned) return a.circular.pinned ? -1 : 1;
      return b.circular.created_at.localeCompare(a.circular.created_at);
    });
}

/** Circulars this user sent, newest first. */
export async function listSentCirculars(senderId: string): Promise<Circular[]> {
  const { data, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('sender_id', senderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Circular[];
}

export async function getCircular(id: string): Promise<Circular | null> {
  const { data, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data as Circular) ?? null;
}

/** How many circulars this user has not opened yet. */
export async function countUnreadCirculars(recipientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('circular_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

/** Recorded automatically the first time the recipient opens the circular. */
export async function markCircularRead(
  circularId: string,
  recipientId: string
): Promise<void> {
  const { error } = await supabase
    .from('circular_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('circular_id', circularId)
    .eq('recipient_id', recipientId)
    .is('read_at', null);
  if (error) throw error;
}

/** Who a circular went to and who has opened it — for the sender's view. */
export async function listCircularRecipients(
  circularId: string
): Promise<(CircularRecipient & { recipient: UserProfile })[]> {
  const { data, error } = await supabase
    .from('circular_recipients')
    .select('*, recipient:recipient_id (*)')
    .eq('circular_id', circularId);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function setCircularPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('circulars').update({ pinned }).eq('id', id);
  if (error) throw error;
}

export async function deleteCircular(id: string): Promise<void> {
  const { error } = await supabase.from('circulars').delete().eq('id', id);
  if (error) throw error;
}

export async function createNotification(input: {
  user_id: string;
  title: string;
  body?: string | null;
  type: AppNotification['type'];
  related_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert(input);
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

/* ------------------------------- Attendance ------------------------------- */

/** Exceptions recorded for a set of employees on one specific day. */
export async function listAttendanceExceptions(
  employeeIds: string[],
  date: string
): Promise<AttendanceException[]> {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .select('*')
    .in('employee_id', employeeIds)
    .eq('date', date);
  if (error) throw error;
  return (data ?? []) as AttendanceException[];
}

/** Exceptions recorded for a set of employees across a date range (report). */
export async function listAttendanceExceptionsForRange(
  employeeIds: string[],
  startDate: string,
  endDate: string
): Promise<AttendanceException[]> {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .select('*')
    .in('employee_id', employeeIds)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return (data ?? []) as AttendanceException[];
}

/** Record (or overwrite) the attendance exception for one employee/day. */
export async function upsertAttendanceException(input: {
  employee_id: string;
  date: string;
  type: AttendanceExceptionType;
  note?: string | null;
  recorded_by: string;
}): Promise<void> {
  const { error } = await supabase.from('attendance_exceptions').upsert(
    {
      employee_id: input.employee_id,
      date: input.date,
      type: input.type,
      note: input.note ?? null,
      recorded_by: input.recorded_by,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id,date' }
  );
  if (error) throw error;
}

/** Clear a recorded exception — the day goes back to "present". */
export async function clearAttendanceException(
  employeeId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('attendance_exceptions')
    .delete()
    .eq('employee_id', employeeId)
    .eq('date', date);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}
