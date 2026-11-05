import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AppState,
  ClientTicket,
  ProjectItem,
  ScheduleEvent,
  TaskItem,
  TestCase,
  TestScenario,
  TicketStatus
} from '@/types/ruang-waktu';

let cachedClient: SupabaseClient | null = null;

const sanitizeText = (val?: string) => (val || '').replace(/эк/g, 'ek');

const normalizeTicketStatus = (status?: string): TicketStatus => {
  if (status === 'Closed' || status === 'Ditutup') return 'Ditutup';
  if (status === 'Terverifikasi') return 'Terverifikasi';
  if (status === 'Diperbaiki') return 'Diperbaiki';
  if (status === 'Investigasi') return 'Investigasi';
  return 'Open';
};

/**
 * Konfigurasi Supabase HANYA berasal dari environment saat build.
 * Override dari localStorage sengaja dihapus: nilai yang bisa ditulis browser
 * memungkinkan data user dialihkan ke project Supabase milik pihak lain.
 */
export function getSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('https://'))
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  return cachedClient;
}

/** Pesan error yang aman ditampilkan ke pengguna (tanpa detail internal). */
export function friendlyAuthError(message?: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah.';
  if (m.includes('email not confirmed')) return 'Email belum diverifikasi. Cek kotak masuk Anda.';
  if (m.includes('password should be') || m.includes('weak password'))
    return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
  if (m.includes('already registered') || m.includes('already been registered'))
    // Pesan generik agar tidak membocorkan keberadaan akun (user enumeration)
    return 'Jika email dapat didaftarkan, tautan verifikasi telah dikirim.';
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

// ---------------------------------------------------------------------------
// Pemetaan entitas aplikasi <-> baris tabel
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const projectToRow = (p: ProjectItem): Row => ({
  id: p.id,
  name: p.name,
  client_name: p.clientName || '',
  lead: p.lead || '',
  deadline: p.deadline || '',
  status: p.status,
  notes: p.notes || ''
});

const taskToRow = (t: TaskItem): Row => ({
  id: t.id,
  title: t.title,
  due_date: t.dueDate || '',
  priority: t.priority,
  project: t.project || 'Umum',
  assignee: t.assignee || '',
  assignee_role: t.assigneeRole || '',
  status: t.status || 'Todo',
  notes: t.notes || '',
  completed: Boolean(t.completed),
  ticket_code: t.ticketCode || '',
  test_case_code: t.testCaseCode || '',
  updated_at: new Date().toISOString()
});

const ticketToRow = (tk: ClientTicket): Row => ({
  id: tk.id,
  code: tk.code,
  title: tk.title,
  client_name: tk.clientName,
  project: tk.project,
  category: tk.category,
  severity: tk.severity,
  status: tk.status,
  assignee: tk.assignee,
  created_at_date: tk.createdAt,
  sla_deadline: tk.slaDeadline || '',
  linked_task_id: tk.linkedTaskId || '',
  linked_test_case_code: tk.linkedTestCaseCode || '',
  description: tk.description || ''
});

const scenarioToRow = (s: TestScenario): Row => ({
  id: s.id,
  code: s.code,
  title: s.title,
  project: s.project,
  module_name: s.moduleName,
  description: s.description || ''
});

const testCaseToRow = (tc: TestCase): Row => ({
  id: tc.id,
  scenario_id: tc.scenarioId,
  code: tc.code,
  title: tc.title,
  precondition: tc.precondition,
  steps: tc.steps,
  expected_result: tc.expectedResult,
  actual_result: tc.actualResult || '',
  status: tc.status,
  tester: tc.tester,
  priority: tc.priority,
  linked_ticket_code: tc.linkedTicketCode || '',
  linked_task_id: tc.linkedTaskId || ''
});

const eventToRow = (e: ScheduleEvent): Row => ({
  id: e.id,
  title: e.title,
  date: e.date,
  start_time: e.startTime || '',
  end_time: e.endTime || '',
  category: e.category || 'Rapat',
  notes: e.notes || ''
});

type SyncedKey = Exclude<keyof AppState, 'notifications'>;

interface TableSpec {
  table: string;
  key: SyncedKey;
  toRow: (item: never) => Row;
}

// Urutan penting: entitas induk di-upsert lebih dulu.
const TABLES: TableSpec[] = [
  { table: 'projects', key: 'projects', toRow: projectToRow as (i: never) => Row },
  { table: 'test_scenarios', key: 'scenarios', toRow: scenarioToRow as (i: never) => Row },
  { table: 'tasks', key: 'tasks', toRow: taskToRow as (i: never) => Row },
  { table: 'tickets', key: 'tickets', toRow: ticketToRow as (i: never) => Row },
  { table: 'test_cases', key: 'testCases', toRow: testCaseToRow as (i: never) => Row },
  { table: 'events', key: 'events', toRow: eventToRow as (i: never) => Row }
];

/** Bandingkan isi tanpa kolom yang selalu berubah (updated_at). */
const fingerprint = (row: Row) => {
  const { updated_at: _ignored, ...rest } = row;
  return JSON.stringify(rest);
};

export class SyncError extends Error {
  table: string;
  constructor(table: string, message: string) {
    super(`[${table}] ${message}`);
    this.name = 'SyncError';
    this.table = table;
  }
}

/**
 * Kirim hanya perubahan (upsert baris yang berubah + delete baris yang hilang)
 * dari `prev` (kondisi yang diketahui ada di server) ke `next`.
 * Melempar SyncError pada kegagalan pertama, sehingga pemanggil dapat
 * mempertahankan `prev` dan mencoba lagi pada perubahan berikutnya.
 */
export async function syncStateToSupabase(
  client: SupabaseClient,
  prev: AppState,
  next: AppState
): Promise<void> {
  for (const spec of TABLES) {
    const prevItems = prev[spec.key] as Array<{ id: string }>;
    const nextItems = next[spec.key] as Array<{ id: string }>;

    const prevPrints = new Map(
      prevItems.map((item) => [item.id, fingerprint(spec.toRow(item as never))])
    );
    const changedRows = nextItems
      .map((item) => spec.toRow(item as never))
      .filter((row) => prevPrints.get(row.id as string) !== fingerprint(row));

    const nextIds = new Set(nextItems.map((item) => item.id));
    const removedIds = prevItems.map((item) => item.id).filter((id) => !nextIds.has(id));

    if (changedRows.length) {
      const { error } = await client.from(spec.table).upsert(changedRows);
      if (error) throw new SyncError(spec.table, error.message);
    }
    if (removedIds.length) {
      const { error } = await client.from(spec.table).delete().in('id', removedIds);
      if (error) throw new SyncError(spec.table, error.message);
    }
  }
}

export const EMPTY_STATE: AppState = {
  events: [],
  tasks: [],
  projects: [],
  tickets: [],
  scenarios: [],
  testCases: [],
  notifications: []
};

export async function pullStateFromSupabase(client: SupabaseClient): Promise<AppState> {
  const [eventsRes, tasksRes, projectsRes, ticketsRes, scenariosRes, testCasesRes] =
    await Promise.all([
      client.from('events').select('*').order('date', { ascending: true }),
      client.from('tasks').select('*').order('created_at', { ascending: true }),
      client.from('projects').select('*').order('created_at', { ascending: true }),
      client.from('tickets').select('*').order('created_at', { ascending: false }),
      client.from('test_scenarios').select('*').order('created_at', { ascending: true }),
      client.from('test_cases').select('*').order('created_at', { ascending: true })
    ]);

  // Gagal total bila SATU tabel pun gagal — data parsial lebih berbahaya
  // karena sinkronisasi berikutnya bisa menganggap baris yang tidak termuat sudah dihapus.
  const failed = [
    ['events', eventsRes],
    ['tasks', tasksRes],
    ['projects', projectsRes],
    ['tickets', ticketsRes],
    ['test_scenarios', scenariosRes],
    ['test_cases', testCasesRes]
  ].find(([, res]) => (res as { error: unknown }).error) as
    | [string, { error: { message: string } }]
    | undefined;
  if (failed) throw new SyncError(failed[0], failed[1].error.message);

  return {
    events: (eventsRes.data || []).map((r) => ({
      id: r.id,
      title: sanitizeText(r.title),
      date: r.date,
      startTime: r.start_time || '',
      endTime: r.end_time || '',
      category: r.category || 'Rapat',
      notes: sanitizeText(r.notes)
    })),
    tasks: (tasksRes.data || []).map((r) => ({
      id: r.id,
      title: sanitizeText(r.title),
      dueDate: r.due_date || '',
      priority: r.priority || 'Sedang',
      project: r.project || 'Umum',
      assignee: r.assignee || 'Belum ditugaskan',
      assigneeRole: r.assignee_role || 'Engineer',
      status: r.status || (r.completed ? 'Done' : 'Todo'),
      notes: sanitizeText(r.notes),
      completed: Boolean(r.completed),
      ticketCode: r.ticket_code || undefined,
      testCaseCode: r.test_case_code || undefined
    })),
    projects: (projectsRes.data || []).map((r) => ({
      id: r.id,
      name: sanitizeText(r.name),
      clientName: sanitizeText(r.client_name),
      lead: r.lead || '',
      deadline: r.deadline || '',
      status: r.status || 'Berjalan',
      notes: sanitizeText(r.notes)
    })),
    tickets: (ticketsRes.data || []).map((r) => ({
      id: r.id,
      code: r.code || 'TKT-101',
      title: sanitizeText(r.title),
      clientName: sanitizeText(r.client_name) || 'Klien',
      project: r.project || 'Umum',
      category: r.category || 'Komplain',
      severity: r.severity || 'Tinggi',
      status: normalizeTicketStatus(r.status),
      assignee: r.assignee || 'Belum ditugaskan',
      createdAt: r.created_at_date || '',
      slaDeadline: r.sla_deadline || undefined,
      linkedTaskId: r.linked_task_id || undefined,
      linkedTestCaseCode: r.linked_test_case_code || undefined,
      description: sanitizeText(r.description)
    })),
    scenarios: (scenariosRes.data || []).map((r) => ({
      id: r.id,
      code: r.code || 'TS-01',
      title: sanitizeText(r.title),
      project: r.project || 'Umum',
      moduleName: r.module_name || 'Umum',
      description: sanitizeText(r.description)
    })),
    testCases: (testCasesRes.data || []).map((r) => ({
      id: r.id,
      scenarioId: r.scenario_id,
      code: r.code || 'TC-001',
      title: sanitizeText(r.title),
      precondition: sanitizeText(r.precondition),
      steps: sanitizeText(r.steps),
      expectedResult: sanitizeText(r.expected_result),
      actualResult: sanitizeText(r.actual_result),
      status: r.status || 'Pending',
      tester: r.tester || 'QA Tester',
      priority: r.priority || 'Sedang',
      linkedTicketCode: r.linked_ticket_code || undefined,
      linkedTaskId: r.linked_task_id || undefined
    })),
    notifications: []
  };
}

/**
 * Data lokal (mode demo) memakai ID pendek seperti "p1"/"t1". Kolom `id` di
 * Supabase adalah primary key global, sehingga ID tersebut bisa bentrok dengan
 * milik user lain. Fungsi ini mengganti semua ID dengan UUID dan memperbarui
 * referensi antar entitas sebelum diunggah ke cloud.
 */
export function remapIdsForUpload(state: AppState): AppState {
  const ids = new Map<string, string>();
  const fresh = (old: string) => {
    if (!ids.has(old)) ids.set(old, crypto.randomUUID());
    return ids.get(old)!;
  };
  const ref = (old?: string) => (old ? ids.get(old) || old : old);

  const projects = state.projects.map((p) => ({ ...p, id: fresh(p.id) }));
  const scenarios = state.scenarios.map((s) => ({ ...s, id: fresh(s.id) }));
  const tasks = state.tasks.map((t) => ({ ...t, id: fresh(t.id) }));
  const events = state.events.map((e) => ({ ...e, id: fresh(e.id) }));
  const tickets = state.tickets.map((tk) => ({ ...tk, id: fresh(tk.id) }));
  const testCases = state.testCases.map((tc) => ({ ...tc, id: fresh(tc.id) }));

  return {
    ...state,
    projects,
    scenarios,
    tasks,
    events,
    tickets: tickets.map((tk) => ({ ...tk, linkedTaskId: ref(tk.linkedTaskId) })),
    testCases: testCases.map((tc) => ({
      ...tc,
      scenarioId: ref(tc.scenarioId) || tc.scenarioId,
      linkedTaskId: ref(tc.linkedTaskId)
    }))
  };
}
