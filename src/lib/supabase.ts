import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppState, TicketStatus, UserPrefs } from '@/types/ruang-waktu';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

const sanitizeText = (val?: string) => (val || '').replace(/эк/g, 'ek');

const normalizeTicketStatus = (status?: string): TicketStatus => {
  if (status === 'Closed' || status === 'Ditutup') return 'Ditutup';
  if (status === 'Terverifikasi') return 'Terverifikasi';
  if (status === 'Diperbaiki') return 'Diperbaiki';
  if (status === 'Investigasi') return 'Investigasi';
  return 'Open';
};

export function getSupabaseConfig(prefs?: Partial<UserPrefs>) {
  const url = (prefs?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (prefs?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http'))
  };
}

export function getSupabaseClient(prefs?: Partial<UserPrefs>): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig(prefs);
  if (!isConfigured) return null;

  const signature = `${url}::${anonKey}`;
  if (cachedClient && cachedKey === signature) {
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: true }
  });
  cachedKey = signature;
  return cachedClient;
}

export async function pullStateFromSupabase(
  client: SupabaseClient,
  fallbackNotifications: AppState['notifications'] = []
): Promise<AppState | null> {
  const [eventsRes, tasksRes, projectsRes, ticketsRes, scenariosRes, testCasesRes] =
    await Promise.all([
      client.from('events').select('*').order('date', { ascending: true }),
      client.from('tasks').select('*').order('created_at', { ascending: true }),
      client.from('projects').select('*').order('created_at', { ascending: true }),
      client.from('tickets').select('*').order('created_at', { ascending: false }),
      client.from('test_scenarios').select('*').order('created_at', { ascending: true }),
      client.from('test_cases').select('*').order('created_at', { ascending: true })
    ]);

  if (eventsRes.error && tasksRes.error) {
    throw new Error(eventsRes.error?.message || 'Gagal memuat data dari Supabase');
  }

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
    notifications: fallbackNotifications
  };
}

export async function pushStateToSupabase(client: SupabaseClient, state: AppState): Promise<void> {
  if (state.projects.length) {
    await client.from('projects').upsert(
      state.projects.map((p) => ({
        id: p.id,
        name: p.name,
        client_name: p.clientName || '',
        lead: p.lead || '',
        deadline: p.deadline || '',
        status: p.status,
        notes: p.notes || ''
      }))
    );
  }

  if (state.tasks.length) {
    await client.from('tasks').upsert(
      state.tasks.map((t) => ({
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
        test_case_code: t.testCaseCode || ''
      }))
    );
  }

  if (state.tickets.length) {
    await client.from('tickets').upsert(
      state.tickets.map((tk) => ({
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
      }))
    );
  }

  if (state.scenarios.length) {
    await client.from('test_scenarios').upsert(
      state.scenarios.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        project: s.project,
        module_name: s.moduleName,
        description: s.description || ''
      }))
    );
  }

  if (state.testCases.length) {
    await client.from('test_cases').upsert(
      state.testCases.map((tc) => ({
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
      }))
    );
  }

  if (state.events.length) {
    await client.from('events').upsert(
      state.events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        start_time: e.startTime || '',
        end_time: e.endTime || '',
        category: e.category || 'Rapat',
        notes: e.notes || ''
      }))
    );
  }
}
