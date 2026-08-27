/**
 * تقني — all Supabase queries in one place (mirrors Enjazaty's src/lib/api.ts
 * convention). Every read/write goes through here so RLS is the single
 * source of truth for what a given signed-in user is allowed to see/do.
 */
import { supabase } from './supabase';
import type {
  Activity,
  AppNotification,
  CalendarEvent,
  DesignerRecord,
  School,
  SchoolAssignment,
  SchoolFolder,
  SchoolReferenceInfo,
  UserProfile,
  Visit,
  VisitReport,
  VisitType,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

export async function listSchools(): Promise<School[]> {
  const { data, error } = await supabase.from('schools').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as School[];
}

export async function getSchool(id: string): Promise<School | null> {
  const { data, error } = await supabase.from('schools').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as School) ?? null;
}

export async function createSchool(input: {
  name: string;
  stage: School['stage'];
  region: string;
  google_maps_url?: string | null;
}): Promise<School> {
  const { data, error } = await supabase.from('schools').insert(input).select().single();
  if (error) throw error;
  return data as School;
}

// ---------------------------------------------------------------------------
// Designers at a school
// ---------------------------------------------------------------------------

export async function listSchoolDesigners(schoolId: string): Promise<UserProfile[]> {
  const { data: direct, error: directError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('role', 'designer')
    .eq('school_id', schoolId);
  if (directError) throw directError;

  const { data: assignments, error: assignError } = await supabase
    .from('school_assignments')
    .select('designer_id')
    .eq('school_id', schoolId);
  if (assignError) throw assignError;

  const assignedIds = (assignments ?? []).map((a) => a.designer_id);
  let assigned: UserProfile[] = [];
  if (assignedIds.length > 0) {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .in('id', assignedIds);
    if (error) throw error;
    assigned = (data ?? []) as UserProfile[];
  }

  const all = [...((direct ?? []) as UserProfile[]), ...assigned];
  const seen = new Set<string>();
  return all.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
}

export async function assignDesignerToSchool(
  schoolId: string,
  designerId: string
): Promise<SchoolAssignment> {
  const { data, error } = await supabase
    .from('school_assignments')
    .insert({ school_id: schoolId, designer_id: designerId })
    .select()
    .single();
  if (error) throw error;
  return data as SchoolAssignment;
}

export async function searchDesignersByName(query: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('role', 'designer')
    .ilike('full_name', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export async function listSchoolFolders(schoolId: string): Promise<SchoolFolder[]> {
  const { data, error } = await supabase
    .from('school_folders')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SchoolFolder[];
}

export async function createSchoolFolder(schoolId: string, name: string): Promise<SchoolFolder> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('school_folders')
    .insert({ school_id: schoolId, name, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as SchoolFolder;
}

// ---------------------------------------------------------------------------
// School reference info (غرفة العروض / العهدة / المختبر اللغوي)
// ---------------------------------------------------------------------------

export async function getSchoolReferenceInfo(
  schoolId: string
): Promise<SchoolReferenceInfo | null> {
  const { data, error } = await supabase
    .from('school_reference_info')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle();
  if (error) throw error;
  return (data as SchoolReferenceInfo) ?? null;
}

export async function upsertSchoolReferenceInfo(
  schoolId: string,
  fields: Partial<
    Pick<SchoolReferenceInfo, 'projector_room_notes' | 'custody_notes' | 'language_lab_notes'>
  >
): Promise<SchoolReferenceInfo> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('school_reference_info')
    .upsert(
      { school_id: schoolId, ...fields, updated_by: userData.user?.id },
      { onConflict: 'school_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as SchoolReferenceInfo;
}

// ---------------------------------------------------------------------------
// Visits (خطة الزيارات + تقارير الزيارة)
// ---------------------------------------------------------------------------

export async function listVisits(schoolId?: string): Promise<Visit[]> {
  let query = supabase.from('visits').select('*').order('visit_date', { ascending: false });
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Visit[];
}

export async function createVisit(input: {
  school_id: string;
  designer_id?: string | null;
  visit_type: VisitType;
  visit_date: string;
  visit_time?: string | null;
  notes?: string | null;
}): Promise<Visit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('visits')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Visit;
}

export async function listVisitReports(): Promise<VisitReport[]> {
  const { data, error } = await supabase
    .from('visit_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VisitReport[];
}

export async function createVisitReport(
  visitId: string,
  content: Record<string, unknown>
): Promise<VisitReport> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('visit_reports')
    .insert({ visit_id: visitId, content, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as VisitReport;
}

// ---------------------------------------------------------------------------
// Calendar (كالندر — shared by coordinator + designer)
// ---------------------------------------------------------------------------

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createCalendarEvent(input: {
  school_id?: string | null;
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
}): Promise<CalendarEvent> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...input, owner_id: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEvent;
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export async function listActivities(schoolId?: string | null): Promise<Activity[]> {
  let query = supabase.from('activities').select('*').order('activity_date', { ascending: false });
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function createActivity(input: {
  school_id?: string | null;
  title: string;
  description?: string | null;
  activity_date: string;
}): Promise<Activity> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('activities')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Activity;
}

// ---------------------------------------------------------------------------
// Designer records (سجل المصمم — generic, see spec: final form TBD)
// ---------------------------------------------------------------------------

export async function listDesignerRecords(schoolId?: string): Promise<DesignerRecord[]> {
  let query = supabase
    .from('designer_records')
    .select('*')
    .order('record_date', { ascending: false });
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DesignerRecord[];
}

export async function createDesignerRecord(input: {
  school_id: string;
  designer_id?: string | null;
  record_date: string;
  notes?: string | null;
}): Promise<DesignerRecord> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('designer_records')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as DesignerRecord;
}

// ---------------------------------------------------------------------------
// Search (schools + designers, simple client-side ilike search)
// ---------------------------------------------------------------------------

export async function searchAll(query: string): Promise<{
  schools: School[];
  designers: UserProfile[];
}> {
  const [schoolsRes, designersRes] = await Promise.all([
    supabase.from('schools').select('*').ilike('name', `%${query}%`).limit(20),
    supabase
      .from('users_profile')
      .select('*')
      .eq('role', 'designer')
      .ilike('full_name', `%${query}%`)
      .limit(20),
  ]);
  if (schoolsRes.error) throw schoolsRes.error;
  if (designersRes.error) throw designersRes.error;
  return {
    schools: (schoolsRes.data ?? []) as School[],
    designers: (designersRes.data ?? []) as UserProfile[],
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listMyNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}
