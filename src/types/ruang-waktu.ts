export type PriorityLevel = 'Kritis' | 'Tinggi' | 'Sedang' | 'Rendah';
export type ProjectStatus = 'Berjalan' | 'Review QA' | 'Selesai';
export type TaskStatus = 'Todo' | 'In Progress' | 'In Review' | 'Done';
export type TicketStatus = 'Open' | 'Investigasi' | 'Diperbaiki' | 'Closed';
export type TicketCategory = 'Komplain' | 'Bug' | 'Revisi' | 'Permintaan Fitur';
export type TestResultStatus = 'Pass' | 'Fail' | 'Blocked' | 'Pending';
export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise';

export type ViewName =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'tickets'
  | 'qa'
  | 'calendar'
  | 'insights'
  | 'notifications'
  | 'profile'
  | 'settings';

export type ScreenMode = 'workspace' | 'landing' | 'login' | 'register';

export type ModalEntity = 'event' | 'task' | 'project' | 'ticket' | 'scenario' | 'testcase';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: string;
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  priority: PriorityLevel;
  project: string;
  assignee: string;
  assigneeRole?: string;
  status: TaskStatus;
  notes?: string;
  completed: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  clientName?: string;
  lead?: string;
  deadline?: string;
  status: ProjectStatus;
  notes?: string;
}

export interface ClientTicket {
  id: string;
  code: string; // e.g. TKT-101
  title: string;
  clientName: string;
  project: string;
  category: TicketCategory;
  severity: PriorityLevel;
  status: TicketStatus;
  assignee: string;
  createdAt: string; // YYYY-MM-DD
  description?: string;
}

export interface TestScenario {
  id: string;
  code: string; // e.g. TS-01
  title: string;
  project: string;
  moduleName: string;
  description?: string;
}

export interface TestCase {
  id: string;
  scenarioId: string;
  code: string; // e.g. TC-001
  title: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status: TestResultStatus;
  tester: string;
  priority: PriorityLevel;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'ticket' | 'task' | 'qa' | 'system';
  read: boolean;
  targetView?: ViewName;
}

export interface AppState {
  events: ScheduleEvent[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  tickets: ClientTicket[];
  scenarios: TestScenario[];
  testCases: TestCase[];
  notifications: AppNotification[];
}

export interface UserPrefs {
  theme: 'light' | 'dark';
  lightSoftness: 'soft' | 'warm' | 'crisp';
  accent: 'emerald' | 'teal' | 'forest' | 'lime';
  calendarDensity: 'standard' | 'compact';
  startMonday: boolean;
  timeFormat: '24h' | '12h';
  defaultDuration: number;
  remindSchedule: boolean;
  remindDeadline: boolean;
  soundEffects: boolean;
  userName: string;
  userRole: string;
  userEmail: string;
  userAvatar: string;
  userPhotoUrl?: string;
  workspace: string;
  plan: SubscriptionPlan;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}
