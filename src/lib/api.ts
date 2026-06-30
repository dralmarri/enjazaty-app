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
  Attachment,
  AttachmentType,
  Department,
  Evaluation,
  Folder,
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

export async function listFolders(ownerId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

/** Top-level folders only (no parent). Used on home / employee profile. */
export async function listRootFolders(ownerId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('owner_id', ownerId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });
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

export async function createNote(input: {
  content?: string | null;
  type: NoteType;
  media_url?: string | null;
  achievement_id?: string | null;
  target_user_id?: string | null;
  author_id: string;
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
}): Promise<Evaluation> {
  const { data, error } = await supabase
    .from('evaluations')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  // Mark the achievement as approved once it has been evaluated/signed.
  await supabase
    .from('achievements')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', input.achievement_id);
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

/** True when `supervisorId` supervises `subordinateId`. */
export async function supervises(
  supervisorId: string,
  subordinateId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('supervisions')
    .select('id')
    .eq('supervisor_id', supervisorId)
    .eq('subordinate_id', subordinateId)
    .maybeSingle();
  if (error) return false;
  return !!data;
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
