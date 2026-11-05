'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  BarChart3,
  Bell,
  Bug,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Cloud,
  CloudOff,
  ExternalLink,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  X
} from 'lucide-react';
import {
  BrandLogoIcon,
  DashboardIcon,
  ProjectsIcon,
  ScenarioIcon,
  TasksIcon,
  TicketsIcon,
  QAIcon,
  CalendarIcon,
  AnalyticsIcon,
  NotificationsIcon,
  SettingsIcon,
  SearchIcon,
  PlusIcon,
  VolumeIcon,
  VolumeMuteIcon,
  CUSTOM_ICONS_CATALOG
} from './icons/CustomIcons';
import { sound } from '../lib/audio';
import type {
  AppNotification,
  AppState,
  ClientTicket,
  ModalEntity,
  PriorityLevel,
  ProjectItem,
  ProjectStatus,
  ScheduleEvent,
  ScreenMode,
  SubscriptionPlan,
  TaskItem,
  TaskStatus,
  TestCase,
  TestResultStatus,
  TestScenario,
  TicketCategory,
  TicketStatus,
  UserPrefs,
  ViewName
} from '@/types/ruang-waktu';
import type { User } from '@supabase/supabase-js';
import {
  EMPTY_STATE,
  friendlyAuthError,
  getSupabaseClient,
  getSupabaseConfig,
  pullStateFromSupabase,
  remapIdsForUpload,
  syncStateToSupabase
} from '@/lib/supabase';

const getJakartaDateParts = (d: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value || d.getFullYear());
  const m = Number(parts.find((p) => p.type === 'month')?.value || d.getMonth() + 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value || d.getDate());
  return { y, m, day };
};

const getJakartaToday = () => {
  const { y, m, day } = getJakartaDateParts(new Date());
  return new Date(y, m - 1, day, 0, 0, 0, 0);
};

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const moveDate = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const makeId = () => crypto.randomUUID();

const fmtDate = (
  d: Date,
  o: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...o }).format(d);

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  Todo: 'Belum Dikerjakan',
  'In Progress': 'Sedang Dikerjakan',
  'In Review': 'Dalam Tinjauan',
  Done: 'Selesai'
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  Open: 'Terbuka',
  Investigasi: 'Investigasi',
  Diperbaiki: 'Diperbaiki',
  Terverifikasi: 'Terverifikasi',
  Ditutup: 'Ditutup'
};

const QA_STATUS_LABEL: Record<TestResultStatus, string> = {
  Pass: '✓ Lulus',
  Fail: '✕ Gagal',
  Blocked: '⊘ Terhambat',
  Pending: '○ Menunggu'
};

const PRIORITY_ICON: Record<PriorityLevel, string> = {
  Kritis: '▲',
  Tinggi: '↑',
  Sedang: '●',
  Rendah: '↓'
};

const sanitizeCyrillic = (str?: string) => (str || '').replace(/эк/g, 'ek');

const normalizeTicketStatusVal = (st?: string): TicketStatus => {
  if (st === 'Closed' || st === 'Ditutup') return 'Ditutup';
  if (st === 'Terverifikasi') return 'Terverifikasi';
  if (st === 'Diperbaiki') return 'Diperbaiki';
  if (st === 'Investigasi') return 'Investigasi';
  return 'Open';
};

const getTicketSlaInfo = (tk: ClientTicket, todayStr: string) => {
  if (tk.status === 'Ditutup' || tk.status === 'Terverifikasi') {
    return { label: '✓ SLA Terpenuhi', tone: 'safe' as const, isApproaching: false };
  }
  const slaTargetHours =
    tk.severity === 'Kritis' ? '4 Jam' : tk.severity === 'Tinggi' ? '8 Jam' : tk.severity === 'Sedang' ? '24 Jam' : '48 Jam';
  if (tk.createdAt < todayStr && tk.status !== 'Diperbaiki') {
    return { label: `🚨 Lewat SLA (${slaTargetHours})`, tone: 'breach' as const, isApproaching: true };
  }
  if (tk.severity === 'Kritis' || tk.severity === 'Tinggi') {
    return { label: `⚠ Mendekati SLA (${slaTargetHours})`, tone: 'warn' as const, isApproaching: true };
  }
  return { label: `⏱ Target SLA ${slaTargetHours}`, tone: 'safe' as const, isApproaching: false };
};

const calcMins = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const [h, m] = a.split(':').map(Number);
  const [x, y] = b.split(':').map(Number);
  return Math.max(0, x * 60 + y - h * 60 - m);
};

const addMinsToTime = (timeStr: string, addMin: number) => {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + Number(addMin)) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
};

const defaultPrefs: UserPrefs = {
  theme: 'light',
  lightSoftness: 'soft',
  accent: 'emerald',
  calendarDensity: 'standard',
  startMonday: true,
  timeFormat: '24h',
  defaultDuration: 60,
  remindSchedule: true,
  remindDeadline: true,
  soundEffects: true,
  userName: 'Pengguna Demo',
  userRole: 'Product & QA Lead',
  userEmail: '',
  userAvatar: 'PD',
  userPhotoUrl: '',
  workspace: 'Tim Engineering & QA',
  plan: 'Starter'
};

const STATE_KEY = 'ruangWaktuState_v3';
const PREFS_KEY = 'ruangWaktuPrefs_v3';

/** Muat data mode demo dari localStorage TANPA mencampur data contoh per indeks. */
const loadLocalState = (todayDate: Date): { state: AppState; fromStorage: boolean } => {
  const base = createDefaultState(todayDate);
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (!saved || !Array.isArray(saved.tasks)) return { state: base, fromStorage: false };
    const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
    return {
      fromStorage: true,
      state: {
        events: arr<ScheduleEvent>(saved.events, []),
        tasks: arr<TaskItem>(saved.tasks, []).map((t) => ({
          ...t,
          title: sanitizeCyrillic(t.title),
          notes: sanitizeCyrillic(t.notes)
        })),
        projects: arr<ProjectItem>(saved.projects, []).map((p) => ({
          ...p,
          name: sanitizeCyrillic(p.name)
        })),
        tickets: arr<ClientTicket>(saved.tickets, []).map((tk) => ({
          ...tk,
          title: sanitizeCyrillic(tk.title),
          description: sanitizeCyrillic(tk.description),
          status: normalizeTicketStatusVal(tk.status)
        })),
        scenarios: arr<TestScenario>(saved.scenarios, []),
        testCases: arr<TestCase>(saved.testCases, []).map((tc) => ({
          ...tc,
          title: sanitizeCyrillic(tc.title)
        })),
        notifications: arr<AppNotification>(saved.notifications, base.notifications)
      }
    };
  } catch {
    return { state: base, fromStorage: false };
  }
};

const countItems = (st: AppState) =>
  st.projects.length + st.tasks.length + st.tickets.length + st.scenarios.length + st.testCases.length + st.events.length;

/** Nomor berikutnya = max(nomor yang ada) + 1, agar kode tidak duplikat setelah penghapusan. */
const nextCodeNumber = (codes: string[], fallbackStart: number) => {
  const nums = codes.map((c) => Number((c || '').replace(/\D/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? Math.max(...nums) + 1 : fallbackStart;
};

const WORKSPACE_LIST = [
  'Tim Engineering & QA',
  'Divisi Produk & Desain',
  'Layanan Klien & Support'
];

const createDefaultState = (todayDate: Date): AppState => {
  const rel = (n: number) => dateKey(moveDate(todayDate, n));
  return {
    projects: [
      {
        id: 'p1',
        name: 'ERP Logistik Nusantara',
        clientName: 'PT Nusantara Logistik (Demo)',
        lead: 'Abil Mahendra',
        deadline: rel(14),
        status: 'Berjalan',
        notes: 'Pengembangan modul pengiriman, pelacakan armada, dan integrasi invoice'
      },
      {
        id: 'p2',
        name: 'Portal Banking BPR',
        clientName: 'BPR Sejahtera Mandiri (Demo)',
        lead: 'Raka Pratama',
        deadline: rel(7),
        status: 'Review QA',
        notes: 'Pengujian regresi skenario otorisasi transaksi & mutasi rekening'
      },
      {
        id: 'p3',
        name: 'Aplikasi Klinik Medika',
        clientName: 'RS Medika Utama (Demo)',
        lead: 'Nadia Putri',
        deadline: rel(21),
        status: 'Berjalan',
        notes: 'Antrean pasien online dan rekam medis elektronik'
      }
    ],
    tasks: [
      {
        id: 't1',
        title: 'Perbaiki validasi nominal transfer & ekspor PDF mutasi di Safari',
        dueDate: rel(0),
        priority: 'Kritis',
        project: 'Portal Banking BPR',
        assignee: 'Raka Pratama',
        assigneeRole: 'Backend Engineer',
        status: 'In Progress',
        completed: false,
        ticketCode: 'TKT-101',
        testCaseCode: 'TC-002',
        notes: 'Terkait komplain tiket TKT-101 dari tim operasional BPR'
      },
      {
        id: 't2',
        title: 'Susun Test Case modul cetak resi pengiriman',
        dueDate: rel(0),
        priority: 'Tinggi',
        project: 'ERP Logistik Nusantara',
        assignee: 'Sinta Dewi',
        assigneeRole: 'QA Engineer',
        status: 'In Review',
        completed: false,
        testCaseCode: 'TC-001',
        notes: 'Mencakup uji barcode thermal printer 80mm'
      },
      {
        id: 't3',
        title: 'Perbaiki pembulatan PPN 11% & optimasi query faktur gabungan',
        dueDate: rel(1),
        priority: 'Sedang',
        project: 'ERP Logistik Nusantara',
        assignee: 'Bima Sakti',
        assigneeRole: 'Fullstack Developer',
        status: 'Todo',
        completed: false,
        ticketCode: 'TKT-102',
        testCaseCode: 'TC-003',
        notes: 'Target waktu respon API di bawah 300ms & sesuai standar e-Faktur'
      },
      {
        id: 't4',
        title: 'Tambah filter dokter spesialis & pendaftaran pasien baru',
        dueDate: rel(-1),
        priority: 'Rendah',
        project: 'Aplikasi Klinik Medika',
        assignee: 'Nadia Putri',
        assigneeRole: 'UI/UX Designer',
        status: 'Done',
        completed: true,
        ticketCode: 'TKT-103',
        notes: 'Sudah disetujui oleh pihak manajemen klinik'
      }
    ],
    tickets: [
      {
        id: 'tk1',
        code: 'TKT-101',
        title: 'Gagal ekspor PDF mutasi rekening pada browser Safari',
        clientName: 'BPR Sejahtera Mandiri (Demo)',
        project: 'Portal Banking BPR',
        category: 'Bug',
        severity: 'Kritis',
        status: 'Investigasi',
        assignee: 'Raka Pratama',
        createdAt: rel(0),
        slaDeadline: '4 Jam (Kritis)',
        linkedTaskId: 't1',
        linkedTestCaseCode: 'TC-002',
        description:
          'Klien melaporkan tombol Unduh PDF tidak merespon ketika rentang tanggal lebih dari 30 hari.'
      },
      {
        id: 'tk2',
        code: 'TKT-102',
        title: 'Selisih pembulatan pajak PPN 11% pada faktur gabungan',
        clientName: 'PT Nusantara Logistik (Demo)',
        project: 'ERP Logistik Nusantara',
        category: 'Komplain',
        severity: 'Tinggi',
        status: 'Open',
        assignee: 'Bima Sakti',
        createdAt: rel(0),
        slaDeadline: '8 Jam (Tinggi)',
        linkedTaskId: 't3',
        linkedTestCaseCode: 'TC-003',
        description:
          'Tim finance klien meminta pembulatan desimal mengikuti standar e-Faktur.'
      },
      {
        id: 'tk3',
        code: 'TKT-103',
        title: 'Penambahan kolom filter dokter spesialis di jadwal poli',
        clientName: 'RS Medika Utama (Demo)',
        project: 'Aplikasi Klinik Medika',
        category: 'Permintaan Fitur',
        severity: 'Sedang',
        status: 'Diperbaiki',
        assignee: 'Nadia Putri',
        createdAt: rel(-2),
        slaDeadline: '24 Jam (Sedang)',
        linkedTaskId: 't4',
        description: 'Sudah di-deploy ke staging, menunggu verifikasi UAT klien.'
      }
    ],
    scenarios: [
      {
        id: 'ts1',
        code: 'TS-01',
        title: 'Alur Autentikasi, OTP & Keamanan Sesi',
        project: 'Portal Banking BPR',
        moduleName: 'Modul Auth & Keamanan',
        description: 'Memastikan login, pembatasan percobaan gagal, dan sesi berjalan aman.'
      },
      {
        id: 'ts2',
        code: 'TS-02',
        title: 'Perhitungan Tarif, Pajak PPN & Cetak Invoice',
        project: 'ERP Logistik Nusantara',
        moduleName: 'Modul Billing & Faktur',
        description: 'Pengujian akurasi nominal tagihan, diskon kontrak, dan ekspor PDF.'
      },
      {
        id: 'ts3',
        code: 'TS-03',
        title: 'Pendaftaran Pasien & Nomor Antrean Otomatis',
        project: 'Aplikasi Klinik Medika',
        moduleName: 'Modul Registrasi',
        description: 'Validasi NIK, BPJS, dan sinkronisasi layar antrean poli.'
      }
    ],
    testCases: [
      {
        id: 'tc1',
        scenarioId: 'ts1',
        code: 'TC-001',
        title: 'Login menggunakan kredensial nasabah yang valid + OTP benar',
        precondition: 'Akun nasabah aktif dan terdaftar di database staging.',
        steps: '1. Buka halaman login\n2. Masukkan username & password valid\n3. Masukkan 6 digit OTP',
        expectedResult: 'Pengguna berhasil masuk ke Dashboard Utama dalam < 2 detik.',
        actualResult: 'Berhasil masuk sesuai ekspektasi (1.2 detik).',
        status: 'Pass',
        tester: 'Sinta Dewi',
        priority: 'Tinggi',
        linkedTaskId: 't2'
      },
      {
        id: 'tc2',
        scenarioId: 'ts1',
        code: 'TC-002',
        title: 'Blokir otomatis setelah 3x salah memasukkan kode OTP & ekspor log PDF',
        precondition: 'Pengguna berada di layar verifikasi OTP.',
        steps: '1. Masukkan kode OTP salah sebanyak 3 kali berturut-turut\n2. Perhatikan pesan status akun',
        expectedResult: 'Sesi diblokir sementara selama 15 menit & kirim email peringatan.',
        actualResult: 'Pesan blokir muncul, namun email peringatan terlambat 4 menit.',
        status: 'Fail',
        tester: 'Sinta Dewi',
        priority: 'Kritis',
        linkedTicketCode: 'TKT-101',
        linkedTaskId: 't1'
      },
      {
        id: 'tc3',
        scenarioId: 'ts2',
        code: 'TC-003',
        title: 'Perhitungan PPN 11% untuk invoice gabungan multi-koli',
        precondition: 'Terdapat 5 surat jalan selesai pada klien yang sama.',
        steps: '1. Pilih 5 surat jalan\n2. Klik Gabungkan Invoice\n3. Cek nilai DPP dan PPN 11%',
        expectedResult: 'Nilai PPN 11% konsisten tanpa selisih 1 rupiah.',
        actualResult: 'Menunggu perbaikan tiket TKT-102.',
        status: 'Blocked',
        tester: 'Abil Mahendra',
        priority: 'Tinggi',
        linkedTicketCode: 'TKT-102',
        linkedTaskId: 't3'
      }
    ],
    events: [
      {
        id: 'e1',
        title: 'Daily Standup Tim Engineering & QA',
        startTime: '09:00',
        endTime: '09:30',
        category: 'Sprint',
        date: rel(0),
        notes: 'Evaluasi blocker tiket kritis BPR & target rilis mingguan'
      },
      {
        id: 'e2',
        title: 'Sesi UAT & Bug Triage bersama PT Nusantara Logistik',
        startTime: '11:00',
        endTime: '12:00',
        category: 'Klien',
        date: rel(0),
        notes: 'Pembahasan skenario TS-02 dan verifikasi faktur'
      },
      {
        id: 'e3',
        title: 'Eksekusi Regression Testing Portal Banking v2.4',
        startTime: '14:00',
        endTime: '16:00',
        category: 'QA Testing',
        date: rel(0),
        notes: 'Fokus pada skenario TS-01 dan ekspor mutasi PDF'
      },
      {
        id: 'e4',
        title: 'Deployment Production & Release Notes',
        startTime: '19:00',
        endTime: '20:00',
        category: 'Rilis',
        date: rel(1),
        notes: 'Jadwal maintenance window malam'
      }
    ],
    notifications: [
      {
        id: 'n0',
        title: 'Peringatan SLA: 2 Tiket Mendekati Batas Waktu',
        description: 'TKT-101 (SLA 4 Jam) dan TKT-102 (SLA 8 Jam) membutuhkan tindakan segera.',
        time: 'Baru saja',
        category: 'sla',
        read: false,
        targetView: 'tickets'
      },
      {
        id: 'n1',
        title: 'Tiket Kritis Baru: TKT-101 (BPR Sejahtera Mandiri)',
        description: 'Gagal ekspor PDF mutasi rekening pada browser Safari — ditugaskan ke Raka Pratama.',
        time: '10 menit lalu',
        category: 'ticket',
        read: false,
        targetView: 'tickets'
      },
      {
        id: 'n2',
        title: 'Hasil QA Gagal: TC-002 pada Skenario TS-01',
        description: 'Sinta Dewi menandai TC-002 sebagai Gagal (email peringatan OTP terlambat).',
        time: '45 menit lalu',
        category: 'qa',
        read: false,
        targetView: 'qa'
      },
      {
        id: 'n3',
        title: 'Tugas Jatuh Tempo Hari Ini',
        description: '2 tugas tim memiliki tenggat waktu pada hari ini.',
        time: '2 jam lalu',
        category: 'task',
        read: false,
        targetView: 'tasks'
      }
    ]
  };
};

interface ToastItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
}

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" />
    <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#FBBC05" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" />
  </svg>
);

const GitHubLogo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export default function RuangWaktuApp() {
  const [today, setToday] = useState<Date>(() => getJakartaToday());
  const [mounted, setMounted] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('workspace');
  const [selectedDate, setSelectedDate] = useState<Date>(() => getJakartaToday());
  const [view, setView] = useState<ViewName>('dashboard');

  // Filters & Modes
  const [globalProjectFilter, setGlobalProjectFilter] = useState<string>('all');
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'table'>('kanban');
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  const [taskSearch, setTaskSearch] = useState<string>('');

  const [ticketFilter, setTicketFilter] = useState<'all' | TicketStatus>('all');
  const [ticketSearch, setTicketSearch] = useState<string>('');

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('ts1');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'ticket' | 'qa' | 'sla'>('all');

  // Interactive Popover States for Single-Button "+ Baru" & Single-Badge Status Picker
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

  // Landing Page interactive state
  const [heroPreviewTab, setHeroPreviewTab] = useState<'kanban' | 'tickets' | 'qa'>('kanban');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [state, setState] = useState<AppState>(() => createDefaultState(getJakartaToday()));
  const [quickNote, setQuickNote] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('Tersimpan');

  // Navigation & Popovers
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [isIconShowcaseOpen, setIsIconShowcaseOpen] = useState(false);

  // Modal CRUD state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<ModalEntity>('task');
  const [editingItem, setEditingItem] = useState<
    ScheduleEvent | TaskItem | ProjectItem | ClientTicket | TestScenario | TestCase | null
  >(null);

  // Custom Confirm Dialog (replaces window.confirm!)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Stacked Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Command palette
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdIndex, setCmdIndex] = useState(0);

  // Cloud status & Live time
  const [cloudStatus, setCloudStatus] = useState<'local' | 'syncing' | 'connected' | 'error'>(
    'local'
  );
  const [liveTime, setLiveTime] = useState<string>('09:00');

  // Refs for outside click detection
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const quickCreateRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectDropdownRef = useRef<HTMLDivElement | null>(null);

  const pushToast = (title: string, subtitle?: string) => {
    const newId = makeId();
    setToasts((prev) => [...prev.slice(-2), { id: newId, title, subtitle }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 3200);
  };

  const askConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Ya, Hapus',
    tone: 'danger' | 'primary' = 'danger'
  ) => {
    setConfirmDialog({ title, message, confirmLabel, tone, onConfirm });
  };

  // Outside Click Listener for User Menu, Notification Popover, Quick Create & Status Menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifPopoverOpen(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setWorkspaceMenuOpen(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(target)) {
        setQuickCreateOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(target)) {
        setProjectDropdownOpen(false);
      }
      const el = target as HTMLElement | null;
      if (el && !el.closest?.('.status-dropdown-wrap')) {
        setOpenStatusMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Global UI Click Sound Delegator (Plays on ANY interactive element click across the entire app)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!prefs.soundEffects) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isClickable = target.closest(
        'button, [role="button"], [role="tab"], [role="menuitem"], a, input[type="checkbox"], input[type="radio"], input[type="submit"], select, .clickable, .accent-swatch, .task-card, .ticket-row, .pill, .filter-chip, .project-card, .scenario-item, .testcase-card, .btn'
      );

      if (isClickable) {
        sound.playClick();
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [prefs.soundEffects]);

  // ---------------------------------------------------------------------------
  // Sesi autentikasi & mode cloud
  // - Tanpa sesi  : Mode Demo, data hanya di localStorage perangkat ini.
  // - Dengan sesi : Supabase adalah sumber kebenaran; data cloud TIDAK di-cache
  //                 ke localStorage agar tidak tertinggal di komputer bersama.
  // ---------------------------------------------------------------------------
  const [authUser, setAuthUser] = useState<User | null>(null);
  const isAuthenticated = Boolean(authUser);
  const authUserRef = useRef<User | null>(null);
  const lastSyncedRef = useRef<AppState | null>(null);
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const cloudAvailable = getSupabaseConfig().isConfigured;

  const initialsOf = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'RW';

  // Persist state
  const persistState = (nextState: AppState) => {
    setState(nextState);
    if (!authUserRef.current) {
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
      return;
    }
    const client = getSupabaseClient();
    if (!client || !lastSyncedRef.current) {
      setCloudStatus('error');
      pushToast('Belum terhubung ke cloud', 'Muat ulang halaman sebelum melanjutkan agar perubahan tidak hilang.');
      return;
    }
    setCloudStatus('syncing');
    syncChainRef.current = syncChainRef.current.then(async () => {
      const prev = lastSyncedRef.current;
      if (!prev) return;
      try {
        await syncStateToSupabase(client, prev, nextState);
        lastSyncedRef.current = nextState;
        setCloudStatus('connected');
      } catch (err) {
        console.error(err);
        setCloudStatus('error');
        pushToast('Perubahan belum tersimpan ke cloud', 'Akan dicoba lagi otomatis pada perubahan berikutnya.');
      }
    });
  };

  const enterCloudMode = async (user: User) => {
    const client = getSupabaseClient();
    if (!client) return;
    const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
    const name = meta.full_name || meta.name || (user.email || '').split('@')[0] || 'Pengguna';
    setPrefs((p) => ({
      ...p,
      userName: name,
      userEmail: user.email || '',
      userAvatar: initialsOf(name),
      userPhotoUrl: meta.avatar_url || ''
    }));
    setScreenMode('workspace');
    setCloudStatus('syncing');
    lastSyncedRef.current = null;
    setState(EMPTY_STATE);
    try {
      const remote = await pullStateFromSupabase(client);
      lastSyncedRef.current = remote;
      setState(remote);
      setSelectedScenarioId(remote.scenarios[0]?.id || '');
      setCloudStatus('connected');

      const local = loadLocalState(getJakartaToday());
      if (countItems(remote) === 0 && local.fromStorage && countItems(local.state) > 0) {
        askConfirm(
          'Unggah data dari perangkat ini?',
          `Workspace cloud Anda masih kosong. Ada ${countItems(local.state)} data tersimpan di browser ini (termasuk data contoh bila belum dihapus). Unggah ke akun Anda?`,
          () => {
            const uploaded = remapIdsForUpload({ ...local.state, notifications: [] });
            persistState(uploaded);
            setSelectedScenarioId(uploaded.scenarios[0]?.id || '');
            pushToast('Mengunggah data', 'Data dari perangkat ini sedang disalin ke cloud.');
          },
          'Ya, Unggah',
          'primary'
        );
      }
    } catch (err) {
      console.error(err);
      setCloudStatus('error');
      pushToast('Gagal memuat data cloud', 'Periksa koneksi Anda lalu muat ulang halaman.');
    }
  };

  const leaveCloudMode = () => {
    lastSyncedRef.current = null;
    setCloudStatus('local');
    const local = loadLocalState(getJakartaToday());
    setState(local.state);
    setSelectedScenarioId(local.state.scenarios[0]?.id || '');
    setPrefs((p) => ({
      ...p,
      userName: defaultPrefs.userName,
      userEmail: '',
      userAvatar: defaultPrefs.userAvatar,
      userPhotoUrl: ''
    }));
  };

  // Muat preferensi & data mode demo + hitung tanggal Asia/Jakarta di sisi klien
  useEffect(() => {
    const jakartaNow = getJakartaToday();
    setToday(jakartaNow);
    setSelectedDate(jakartaNow);
    setMounted(true);
    setLiveTime(
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date())
    );

    try {
      const savedPrefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      // Buang field lama yang tidak lagi boleh dikendalikan dari browser
      delete savedPrefs.isAuthenticated;
      delete savedPrefs.supabaseUrl;
      delete savedPrefs.supabaseAnonKey;
      setPrefs({ ...defaultPrefs, ...savedPrefs });
    } catch {
      setPrefs(defaultPrefs);
    }

    const local = loadLocalState(jakartaNow);
    setState(local.state);
    if (local.state.scenarios[0]?.id) setSelectedScenarioId(local.state.scenarios[0].id);

    setQuickNote(localStorage.getItem('ruangWaktuNote') || '');
    setSidebarCollapsed(localStorage.getItem('ruangWaktuSidebar') === 'collapsed');
  }, []);

  // Dengarkan perubahan sesi Supabase (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (event === 'PASSWORD_RECOVERY') {
        setScreenMode('workspace');
        setView('profile');
        pushToast('Atur kata sandi baru', 'Isi kata sandi baru pada kartu "Kredensial Login".');
      }
      if (user?.id === authUserRef.current?.id) {
        if (user) {
          authUserRef.current = user;
          setAuthUser(user);
        }
        return;
      }
      authUserRef.current = user;
      setAuthUser(user);
      // Supabase menyarankan tidak memanggil API lain langsung di dalam callback ini.
      setTimeout(() => {
        if (user) void enterCloudMode(user);
        else leaveCloudMode();
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync visual attributes to <body>
  useEffect(() => {
    if (!mounted) return;
    document.body.dataset.theme = prefs.theme;
    document.body.dataset.softness = prefs.lightSoftness || 'soft';
    document.body.dataset.accent = prefs.accent || 'emerald';
    document.body.dataset.calendarDensity = prefs.calendarDensity || 'standard';
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs, mounted]);

  const handleEmailAuth = async (mode: 'login' | 'register', email: string, password: string, name: string) => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Login belum tersedia karena backend belum dikonfigurasi. Gunakan Mode Demo.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage('');
    try {
      if (mode === 'register') {
        if (password.length < 8) {
          setAuthMessage('Kata sandi minimal 8 karakter.');
          return;
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin }
        });
        if (error) {
          setAuthMessage(friendlyAuthError(error.message));
          return;
        }
        if (!data.session) {
          setAuthMessage('Cek email Anda dan klik tautan verifikasi, lalu masuk.');
          return;
        }
        pushToast('Pendaftaran berhasil', `Selamat datang, ${name}.`);
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthMessage(friendlyAuthError(error.message));
          return;
        }
        pushToast('Berhasil masuk', 'Memuat data workspace Anda…');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthMessage('Fitur ini membutuhkan backend Supabase.');
      return;
    }
    if (!email) {
      setAuthMessage('Isi alamat email terlebih dahulu, lalu klik "Lupa kata sandi?".');
      return;
    }
    setAuthBusy(true);
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setAuthBusy(false);
    setAuthMessage(
      error && /rate|too many/i.test(error.message)
        ? friendlyAuthError(error.message)
        : 'Jika email terdaftar, tautan atur ulang kata sandi telah dikirim. Buka tautan di browser yang sama.'
    );
  };

  const handleUpdateCredentials = async (email: string, password: string, confirm: string) => {
    const client = getSupabaseClient();
    const current = authUserRef.current;
    if (!client || !current) {
      pushToast('Masuk terlebih dahulu', 'Kredensial hanya dapat diubah untuk akun cloud.');
      return false;
    }
    const updates: { email?: string; password?: string } = {};
    if (email && email !== current.email) updates.email = email;
    if (password || confirm) {
      if (password.length < 8) {
        pushToast('Kata sandi terlalu pendek', 'Gunakan minimal 8 karakter.');
        return false;
      }
      if (password !== confirm) {
        pushToast('Konfirmasi tidak cocok', 'Ketik ulang kata sandi yang sama.');
        return false;
      }
      updates.password = password;
    }
    if (!Object.keys(updates).length) {
      pushToast('Tidak ada perubahan', 'Isi email baru atau kata sandi baru.');
      return false;
    }
    const { error } = await client.auth.updateUser(updates);
    if (error) {
      pushToast('Gagal memperbarui kredensial', friendlyAuthError(error.message));
      return false;
    }
    pushToast(
      'Kredensial diperbarui',
      updates.email ? 'Cek email baru Anda untuk mengonfirmasi perubahan.' : 'Kata sandi baru sudah aktif.'
    );
    return true;
  };

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    const client = getSupabaseClient();
    if (client && authUserRef.current) {
      const { error } = await client.auth.signOut();
      if (error) console.error(error);
      // Event SIGNED_OUT juga memanggil leaveCloudMode(); dipanggil langsung sebagai jaring pengaman.
      authUserRef.current = null;
      setAuthUser(null);
      leaveCloudMode();
    }
    setScreenMode('login');
    pushToast('Anda telah keluar', 'Sesi di perangkat ini sudah diakhiri.');
  };

  // Keyboard shortcuts (Ctrl+K, N for quick create, Escape)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setLiveTime(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date())
      );
    }, 20000);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement | null)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdQuery('');
        setCmdIndex(0);
        setCmdOpen((o) => !o);
      } else if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickCreateOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setCmdOpen(false);
        setModalOpen(false);
        setConfirmDialog(null);
        setAccountMenuOpen(false);
        setNotifPopoverOpen(false);
        setWorkspaceMenuOpen(false);
        setMobileSidebarOpen(false);
        setQuickCreateOpen(false);
        setOpenStatusMenuId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Theme Toggle with Circular View Transition
  const toggleThemeWithAnimation = (
    nextTheme?: 'light' | 'dark',
    sourceEl?: HTMLElement | null
  ) => {
    const targetTheme = nextTheme || (prefs.theme === 'dark' ? 'light' : 'dark');
    if (targetTheme === prefs.theme) return;

    document.body.classList.add('theme-transitioning');
    setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (docWithVT.startViewTransition && sourceEl) {
      const rect = sourceEl.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = docWithVT.startViewTransition(() => {
        setPrefs((p) => ({ ...p, theme: targetTheme }));
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
            },
            {
              duration: 420,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)'
            }
          );
        })
        .catch(() => { });
    } else {
      setPrefs((p) => ({ ...p, theme: targetTheme }));
    }

    pushToast(
      targetTheme === 'dark' ? 'Tema Gelap Aktif' : 'Tema Terang (Hijau Sage) Aktif',
      'Preferensi tampilan berhasil diperbarui.'
    );
  };

  const formatTimeDisplay = (timeStr?: string) => {
    if (!timeStr) return 'Tanpa jam';
    if (prefs.timeFormat !== '12h') return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const getProjectStats = (projectName: string) => {
    const linked = state.tasks.filter(
      (t) => (t.project || '').toLowerCase() === projectName.toLowerCase()
    );
    if (!linked.length) {
      return { done: 0, total: 0, pct: 0, detail: 'Belum ada tugas' };
    }
    const done = linked.filter((t) => t.completed || t.status === 'Done').length;
    const pct = Math.round((done / linked.length) * 100);
    return {
      done,
      total: linked.length,
      pct,
      detail: `${done} dari ${linked.length} tugas selesai (${pct}%)`
    };
  };

  // Find linked task for a ticket (two-way trace)
  const getLinkedTaskForTicket = (tk: ClientTicket): TaskItem | undefined => {
    return state.tasks.find(
      (t) =>
        (tk.linkedTaskId && t.id === tk.linkedTaskId) ||
        t.ticketCode === tk.code ||
        t.title.includes(`[${tk.code}]`)
    );
  };

  // Find linked ticket by code
  const getTicketByCode = (code?: string): ClientTicket | undefined => {
    if (!code) return undefined;
    return state.tickets.find((tk) => tk.code.toLowerCase() === code.toLowerCase());
  };

  // Find linked test case by code
  const getTestCaseByCode = (code?: string): TestCase | undefined => {
    if (!code) return undefined;
    return state.testCases.find((tc) => tc.code.toLowerCase() === code.toLowerCase());
  };

  // Task, Ticket, QA Actions
  const toggleTask = (taskId: string) => {
    const nextTasks = state.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const nextCompleted = !t.completed;
      return {
        ...t,
        completed: nextCompleted,
        status: (nextCompleted ? 'Done' : 'In Progress') as TaskStatus
      };
    });
    const target = nextTasks.find((t) => t.id === taskId);
    persistState({ ...state, tasks: nextTasks });
    pushToast(
      target?.completed ? 'Tugas Selesai' : 'Tugas Dibuka Kembali',
      target?.title
    );
  };

  const setTaskStatus = (taskId: string, nextStatus: TaskStatus) => {
    const nextTasks = state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: nextStatus, completed: nextStatus === 'Done' }
        : t
    );
    const target = nextTasks.find((t) => t.id === taskId);
    persistState({ ...state, tasks: nextTasks });
    setOpenStatusMenuId(null);
    pushToast(`Status Tugas: ${TASK_STATUS_LABEL[nextStatus]}`, target?.title);
  };

  const setTicketStatus = (ticketId: string, nextStatus: TicketStatus) => {
    const nextTickets = state.tickets.map((tk) =>
      tk.id === ticketId ? { ...tk, status: nextStatus } : tk
    );
    const target = nextTickets.find((tk) => tk.id === ticketId);
    persistState({ ...state, tickets: nextTickets });
    setOpenStatusMenuId(null);
    pushToast(`Status Tiket ${target?.code}: ${TICKET_STATUS_LABEL[nextStatus]}`, target?.title);
  };

  const deleteTask = (taskId: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;
    askConfirm(
      'Hapus Tugas?',
      `Tugas "${target.title}" yang ditugaskan kepada ${target.assignee} akan dihapus permanen.`,
      () => {
        persistState({ ...state, tasks: state.tasks.filter((t) => t.id !== taskId) });
        pushToast('Tugas Dihapus', target.title);
      }
    );
  };

  const updateTestCaseStatus = (tcId: string, newStatus: TestResultStatus) => {
    const nextCases = state.testCases.map((tc) =>
      tc.id === tcId ? { ...tc, status: newStatus } : tc
    );
    const target = nextCases.find((tc) => tc.id === tcId);
    persistState({ ...state, testCases: nextCases });
    setOpenStatusMenuId(null);
    if (newStatus === 'Fail' && target) {
      pushToast(
        `${target.code} Ditandai Gagal`,
        'Klik "+ Buat Tiket Bug" pada kartu test case untuk mencatat bug otomatis.'
      );
    } else {
      pushToast(`Status ${target?.code}: ${QA_STATUS_LABEL[newStatus]}`, target?.title);
    }
  };

  const createTicketFromFailedTest = (tc: TestCase) => {
    const existingTicket = getTicketByCode(tc.linkedTicketCode);
    if (existingTicket) {
      openModal('ticket', existingTicket);
      return;
    }
    const sc = state.scenarios.find((s) => s.id === tc.scenarioId);
    const nextCode = `TKT-${nextCodeNumber(state.tickets.map((x) => x.code), 101)}`;
    const newTicket: ClientTicket = {
      id: makeId(),
      code: nextCode,
      title: `[Bug ${tc.code}] ${tc.title}`,
      clientName: 'Temuan Internal QA',
      project: sc?.project || state.projects[0]?.name || 'Umum',
      category: 'Bug',
      severity: tc.priority,
      status: 'Open',
      assignee: tc.tester || prefs.userName,
      createdAt: dateKey(today),
      linkedTestCaseCode: tc.code,
      linkedTaskId: tc.linkedTaskId,
      description: `Gagal pada Test Case ${tc.code}.\nEkspektasi: ${tc.expectedResult}\nAktual: ${tc.actualResult || 'Tidak sesuai ekspektasi'}`
    };
    const nextCases = state.testCases.map((item) =>
      item.id === tc.id ? { ...item, linkedTicketCode: nextCode } : item
    );
    persistState({
      ...state,
      tickets: [newTicket, ...state.tickets],
      testCases: nextCases
    });
    pushToast(
      `Tiket Bug ${nextCode} Dibuat dari ${tc.code}`,
      `${newTicket.title} telah ditautkan otomatis.`
    );
  };

  const convertTicketToTask = (tk: ClientTicket) => {
    const existingTask = getLinkedTaskForTicket(tk);
    if (existingTask) {
      openModal('task', existingTask);
      return;
    }
    const newTaskId = makeId();
    const newTask: TaskItem = {
      id: newTaskId,
      title: `[${tk.code}] ${tk.title}`,
      dueDate: dateKey(today),
      priority: tk.severity,
      project: tk.project,
      assignee: tk.assignee || prefs.userName,
      assigneeRole: 'Engineer',
      status: 'Todo',
      completed: false,
      ticketCode: tk.code,
      testCaseCode: tk.linkedTestCaseCode,
      notes: `Tindak lanjut tiket klien ${tk.clientName}: ${tk.description || ''}`
    };
    const nextTickets = state.tickets.map((item) =>
      item.id === tk.id ? { ...item, linkedTaskId: newTaskId, status: item.status === 'Open' ? ('Investigasi' as TicketStatus) : item.status } : item
    );
    persistState({ ...state, tasks: [newTask, ...state.tasks], tickets: nextTickets });
    pushToast('Tugas Dibuat dari Tiket', `${newTask.title} telah ditautkan ke ${tk.code}.`);
  };

  const openModal = (
    kind: ModalEntity,
    item:
      | ScheduleEvent
      | TaskItem
      | ProjectItem
      | ClientTicket
      | TestScenario
      | TestCase
      | null = null
  ) => {
    setModalKind(kind);
    setEditingItem(item);
    setQuickCreateOpen(false);
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;

    if (modalKind === 'event') {
      if (data.startTime && data.endTime && data.startTime >= data.endTime) {
        pushToast('Validasi Waktu', 'Waktu selesai harus setelah waktu mulai.');
        return;
      }
      const existing = editingItem as ScheduleEvent | null;
      const item: ScheduleEvent = {
        id: existing?.id || makeId(),
        title: sanitizeCyrillic(data.title),
        date: data.date,
        category: data.category || 'Sprint',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        notes: sanitizeCyrillic(data.notes)
      };
      const nextEvents = existing
        ? state.events.map((ev) => (ev.id === existing.id ? item : ev))
        : [...state.events, item];
      persistState({ ...state, events: nextEvents });
      setSelectedDate(new Date(data.date + 'T00:00:00'));
    } else if (modalKind === 'task') {
      const existing = editingItem as TaskItem | null;
      const statusVal = (data.status as TaskStatus) || 'Todo';
      const item: TaskItem = {
        id: existing?.id || makeId(),
        title: sanitizeCyrillic(data.title),
        dueDate: data.dueDate || dateKey(selectedDate),
        priority: (data.priority as PriorityLevel) || 'Sedang',
        project: data.project || state.projects[0]?.name || 'Umum',
        assignee: data.assignee || prefs.userName,
        assigneeRole: data.assigneeRole || 'Engineer',
        status: statusVal,
        notes: sanitizeCyrillic(data.notes),
        completed: statusVal === 'Done',
        ticketCode: data.ticketCode || undefined,
        testCaseCode: data.testCaseCode || undefined
      };
      const nextTasks = existing
        ? state.tasks.map((tk) => (tk.id === existing.id ? item : tk))
        : [item, ...state.tasks];
      persistState({ ...state, tasks: nextTasks });
    } else if (modalKind === 'project') {
      const existing = editingItem as ProjectItem | null;
      const item: ProjectItem = {
        id: existing?.id || makeId(),
        name: sanitizeCyrillic(data.name),
        clientName: sanitizeCyrillic(data.clientName),
        lead: data.lead || prefs.userName,
        deadline: data.deadline || dateKey(moveDate(today, 14)),
        status: (data.status as ProjectStatus) || 'Berjalan',
        notes: sanitizeCyrillic(data.notes)
      };
      const nextProjects = existing
        ? state.projects.map((p) => (p.id === existing.id ? item : p))
        : [...state.projects, item];
      persistState({ ...state, projects: nextProjects });
    } else if (modalKind === 'ticket') {
      const existing = editingItem as ClientTicket | null;
      const nextNum = nextCodeNumber(state.tickets.map((x) => x.code), 101);
      const item: ClientTicket = {
        id: existing?.id || makeId(),
        code: data.code || existing?.code || `TKT-${nextNum}`,
        title: sanitizeCyrillic(data.title),
        clientName: sanitizeCyrillic(data.clientName) || 'Klien',
        project: data.project || state.projects[0]?.name || 'Umum',
        category: (data.category as TicketCategory) || 'Komplain',
        severity: (data.severity as PriorityLevel) || 'Tinggi',
        status: (data.status as TicketStatus) || 'Open',
        assignee: data.assignee || prefs.userName,
        createdAt: existing?.createdAt || dateKey(today),
        linkedTaskId: data.linkedTaskId || existing?.linkedTaskId || undefined,
        linkedTestCaseCode: data.linkedTestCaseCode || existing?.linkedTestCaseCode || undefined,
        description: sanitizeCyrillic(data.description)
      };
      const nextTickets = existing
        ? state.tickets.map((t) => (t.id === existing.id ? item : t))
        : [item, ...state.tickets];
      persistState({ ...state, tickets: nextTickets });
    } else if (modalKind === 'scenario') {
      const existing = editingItem as TestScenario | null;
      const nextNum = String(nextCodeNumber(state.scenarios.map((x) => x.code), 1)).padStart(2, '0');
      const newId = existing?.id || makeId();
      const item: TestScenario = {
        id: newId,
        code: data.code || existing?.code || `TS-${nextNum}`,
        title: sanitizeCyrillic(data.title),
        project: data.project || state.projects[0]?.name || 'Umum',
        moduleName: data.moduleName || 'Modul Utama',
        description: sanitizeCyrillic(data.description)
      };
      const nextScenarios = existing
        ? state.scenarios.map((s) => (s.id === existing.id ? item : s))
        : [...state.scenarios, item];
      persistState({ ...state, scenarios: nextScenarios });
      setSelectedScenarioId(newId);
    } else if (modalKind === 'testcase') {
      const existing = editingItem as TestCase | null;
      const nextNum = String(nextCodeNumber(state.testCases.map((x) => x.code), 1)).padStart(3, '0');
      const item: TestCase = {
        id: existing?.id || makeId(),
        scenarioId: data.scenarioId || selectedScenarioId || state.scenarios[0]?.id || 'ts1',
        code: data.code || existing?.code || `TC-${nextNum}`,
        title: sanitizeCyrillic(data.title),
        precondition: sanitizeCyrillic(data.precondition),
        steps: sanitizeCyrillic(data.steps),
        expectedResult: sanitizeCyrillic(data.expectedResult),
        actualResult: sanitizeCyrillic(data.actualResult),
        status: (data.status as TestResultStatus) || 'Pending',
        tester: data.tester || prefs.userName,
        priority: (data.priority as PriorityLevel) || 'Sedang',
        linkedTicketCode: data.linkedTicketCode || existing?.linkedTicketCode || undefined,
        linkedTaskId: data.linkedTaskId || existing?.linkedTaskId || undefined
      };
      const nextCases = existing
        ? state.testCases.map((tc) => (tc.id === existing.id ? item : tc))
        : [...state.testCases, item];
      persistState({ ...state, testCases: nextCases });
    }

    if (prefs.soundEffects) sound.playSuccess();
    setModalOpen(false);
    pushToast(
      editingItem ? 'Perubahan Disimpan' : 'Data Baru Ditambahkan',
      data.title || data.name
    );
  };

  const handleDeleteFromModal = () => {
    if (!editingItem) return;
    const label =
      'title' in editingItem ? editingItem.title : 'name' in editingItem ? editingItem.name : 'item';
    askConfirm(
      `Hapus "${label}"?`,
      'Data yang dihapus tidak dapat dikembalikan kecuali melalui cadangan JSON.',
      () => {
        if (modalKind === 'event') {
          persistState({ ...state, events: state.events.filter((x) => x.id !== editingItem.id) });
        } else if (modalKind === 'task') {
          persistState({ ...state, tasks: state.tasks.filter((x) => x.id !== editingItem.id) });
        } else if (modalKind === 'project') {
          persistState({
            ...state,
            projects: state.projects.filter((x) => x.id !== editingItem.id)
          });
        } else if (modalKind === 'ticket') {
          persistState({ ...state, tickets: state.tickets.filter((x) => x.id !== editingItem.id) });
        } else if (modalKind === 'scenario') {
          persistState({
            ...state,
            scenarios: state.scenarios.filter((x) => x.id !== editingItem.id),
            testCases: state.testCases.filter((tc) => tc.scenarioId !== editingItem.id)
          });
        } else if (modalKind === 'testcase') {
          persistState({
            ...state,
            testCases: state.testCases.filter((x) => x.id !== editingItem.id)
          });
        }
        setModalOpen(false);
        pushToast('Berhasil Dihapus', label);
      }
    );
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const client = getSupabaseClient();
    if (!client) {
      pushToast('Login belum tersedia', 'Backend Supabase belum dikonfigurasi pada lingkungan ini.');
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) pushToast('Login gagal', friendlyAuthError(error.message));
  };

  // Single Source of Truth Metrics Calculation (Scoped by globalProjectFilter)
  const selKey = dateKey(selectedDate);
  const todayStr = dateKey(today);

  const scopedTasks =
    globalProjectFilter === 'all'
      ? state.tasks
      : state.tasks.filter((t) => t.project === globalProjectFilter);
  const scopedTickets =
    globalProjectFilter === 'all'
      ? state.tickets
      : state.tickets.filter((tk) => tk.project === globalProjectFilter);
  const scopedScenarios =
    globalProjectFilter === 'all'
      ? state.scenarios
      : state.scenarios.filter((sc) => sc.project === globalProjectFilter);
  const scopedScenarioIds = new Set(scopedScenarios.map((s) => s.id));
  const scopedTestCases =
    globalProjectFilter === 'all'
      ? state.testCases
      : state.testCases.filter((tc) => scopedScenarioIds.has(tc.scenarioId));

  // Consistent counts across Sidebar, Summary Cards, and Lists
  const openTasksCount = scopedTasks.filter((t) => !t.completed && t.status !== 'Done').length;
  const openTicketsCount = scopedTickets.filter((tk) => tk.status !== 'Ditutup').length;
  const passedCasesCount = scopedTestCases.filter((tc) => tc.status === 'Pass').length;
  const qaPassRate = scopedTestCases.length
    ? Math.round((passedCasesCount / scopedTestCases.length) * 100)
    : 0;
  const unreadNotifCount = state.notifications.filter((n) => !n.read).length;

  // Release Readiness Gate Criteria (Explicit thresholds)
  const openCriticalTickets = scopedTickets.filter(
    (tk) => tk.severity === 'Kritis' && tk.status !== 'Ditutup' && tk.status !== 'Terverifikasi'
  );
  const failedTestCases = scopedTestCases.filter((tc) => tc.status === 'Fail');
  const unpassedCriticalTests = scopedTestCases.filter(
    (tc) => tc.priority === 'Kritis' && tc.status !== 'Pass'
  );
  const isReleaseReady =
    openCriticalTickets.length === 0 &&
    failedTestCases.length === 0 &&
    unpassedCriticalTests.length === 0 &&
    scopedTestCases.length > 0;

  const ticketsApproachingSla = scopedTickets.filter(
    (tk) => getTicketSlaInfo(tk, todayStr).isApproaching
  );

  const markAllNotificationsRead = () => {
    persistState({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    });
    pushToast('Notifikasi Diperbarui', 'Semua notifikasi telah ditandai dibaca.');
  };

  // Filtered lists
  const filteredTasks = scopedTasks
    .filter((t) => taskFilter === 'all' || t.status === taskFilter)
    .filter((t) => taskProjectFilter === 'all' || t.project === taskProjectFilter)
    .filter(
      (t) =>
        !taskSearch.trim() ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.assignee || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.project || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.ticketCode || '').toLowerCase().includes(taskSearch.toLowerCase())
    );

  const filteredTickets = scopedTickets
    .filter((tk) => ticketFilter === 'all' || tk.status === ticketFilter)
    .filter(
      (tk) =>
        !ticketSearch.trim() ||
        tk.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        tk.code.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        tk.clientName.toLowerCase().includes(ticketSearch.toLowerCase())
    );

  const activeScenario =
    state.scenarios.find((s) => s.id === selectedScenarioId) || state.scenarios[0] || null;
  const activeScenarioCases = state.testCases.filter(
    (tc) => tc.scenarioId === activeScenario?.id
  );

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const startMonday = prefs.startMonday !== false;
    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const offset = startMonday ? (first.getDay() + 6) % 7 : first.getDay();
    const start = moveDate(first, -offset);
    return Array.from({ length: 42 }, (_, i) => moveDate(start, i));
  }, [selectedDate, prefs.startMonday]);

  // Command palette items
  const commandItems = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const base = [
      { label: '+ Tambah Tugas Tim', meta: 'Tugas', run: () => openModal('task') },
      { label: '+ Catat Tiket Klien', meta: 'Tiket', run: () => openModal('ticket') },
      { label: '+ Buat Skenario Uji QA', meta: 'QA', run: () => openModal('scenario') },
      { label: '+ Tambah Test Case QA', meta: 'QA', run: () => openModal('testcase') },
      { label: '+ Buat Proyek Baru', meta: 'Proyek', run: () => openModal('project') },
      { label: 'Buka Dashboard', meta: 'Navigasi', run: () => setView('dashboard') },
      { label: 'Buka Tugas', meta: 'Navigasi', run: () => setView('tasks') },
      { label: 'Buka Tiket', meta: 'Navigasi', run: () => setView('tickets') },
      { label: 'Buka Test Case & QA', meta: 'Navigasi', run: () => setView('qa') },
      { label: 'Buka Notifikasi', meta: 'Navigasi', run: () => setView('notifications') },
      { label: 'Buka Pengaturan', meta: 'Sistem', run: () => setView('settings') }
    ];
    const tkCmd = state.tickets.map((tk) => ({
      label: `${tk.code}: ${tk.title}`,
      meta: `${tk.clientName} · ${TICKET_STATUS_LABEL[tk.status]}`,
      run: () => openModal('ticket', tk)
    }));
    const taskCmd = state.tasks.map((t) => ({
      label: `Tugas: ${t.title}`,
      meta: `${t.assignee} · ${t.project}`,
      run: () => openModal('task', t)
    }));
    const tcCmd = state.testCases.map((tc) => ({
      label: `${tc.code}: ${tc.title}`,
      meta: `QA · ${QA_STATUS_LABEL[tc.status]}`,
      run: () => openModal('testcase', tc)
    }));
    const all = [...base, ...tkCmd, ...taskCmd, ...tcCmd];
    if (!q) return base;
    return all.filter(
      (x) => x.label.toLowerCase().includes(q) || x.meta.toLowerCase().includes(q)
    );
  }, [cmdQuery, state.tickets, state.tasks, state.testCases]);


  // ==========================================================================
  // SCREEN: COMPREHENSIVE 10-SECTION SAAS LANDING PAGE & PRICING PLANS
  // ==========================================================================
  if (screenMode === 'landing') {
    const proPrice = billingCycle === 'annual' ? 'Rp 119rb' : 'Rp 149rb';
    const entPrice = billingCycle === 'annual' ? 'Rp 399rb' : 'Rp 499rb';
    const faqItems = [
      {
        q: 'Bagaimana cara mengonversi komplain tiket klien langsung menjadi tugas karyawan?',
        a: 'Pada menu Tiket Klien maupun panel Triage di Studio Utama, setiap tiket memiliki tombol "+ Jadi Tugas". Saat diklik, sistem otomatis membuat tugas baru lengkap dengan kode referensi tiket (misal [TKT-101]), tingkat prioritas yang disamakan, proyek terkait, serta menugaskannya langsung ke PIC engineer.'
      },
      {
        q: 'Apakah modul QA mendukung hierarki Test Scenario (TS) dan Test Case (TC)?',
        a: 'Ya! Anda dapat membuat banyak Test Scenario per Proyek & Modul (contoh: TS-01 Autentikasi, TS-02 Billing), lalu di dalam setiap skenario Anda bisa melakukan CRUD Test Case (TC-001, TC-002) lengkap dengan Pre-condition, Langkah Uji (Test Steps), Expected Result, Actual Result, serta toggle status 1-klik (Pass / Fail / Blocked / Pending).'
      },
      {
        q: 'Apakah bisa login menggunakan Google atau GitHub (OAuth 2.0)?',
        a: 'Ya. Login dan pendaftaran memakai Supabase Auth, baik dengan email + kata sandi maupun OAuth Google dan GitHub. Tanpa login, Anda tetap dapat mencoba aplikasi dalam Mode Demo; datanya hanya tersimpan di browser Anda.'
      },
      {
        q: 'Bagaimana sistem penyimpanan datanya? Apakah aman jika internet terputus?',
        a: 'Setelah login, data tersimpan di database PostgreSQL (Supabase) dan hanya dapat diakses oleh akun Anda melalui Row Level Security. Data cloud tidak disimpan permanen di browser, sehingga aplikasi membutuhkan koneksi internet. Di Mode Demo, data hanya tersimpan di browser perangkat tersebut. Anda dapat mengekspor cadangan JSON kapan saja.'
      },
      {
        q: 'Apakah Ruang Waktu berbayar?',
        a: 'Selama masa beta, seluruh fitur yang tersedia dapat digunakan gratis. Paket Pro dan Enterprise sedang disiapkan (termasuk workspace tim bersama) dan belum dapat dibeli. Kami akan mengumumkan harga final sebelum ada penagihan apa pun.'
      }
    ];

    return (
      <div className="landing-wrap">
        {/* 1. Sticky Glass Navbar */}
        <div className="landing-nav-sticky">
          <header className="landing-nav">
            <a
              className="brand"
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                setScreenMode('workspace');
              }}
            >
              <i aria-hidden="true"><img src="/icon.png" alt="Ruang Waktu" width={34} height={34} /></i>
              <span className="brand-text">
                <span>
                  ruang<b>waktu</b>
                </span>
              </span>
            </a>

            <nav className="landing-nav-links" aria-label="Navigasi Landing Page">
              <a href="#alur-kerja">Alur Kerja</a>
              <a href="#fitur-utama">Fitur Unggulan</a>
              <a href="#perbandingan">Perbandingan</a>
              <a href="#paket-harga">Harga &amp; Paket</a>
              <a href="#faq">FAQ</a>
            </nav>

            <div className="landing-nav-actions">
              <button
                className="icon-btn theme-toggle-btn"
                type="button"
                data-tooltip={prefs.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                data-tooltip-pos="bottom"
                onClick={(e) => toggleThemeWithAnimation(undefined, e.currentTarget)}
                aria-label="Ubah tema"
              >
                {prefs.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="button ghost landing-btn-login"
                type="button"
                onClick={() => setScreenMode('login')}
              >
                Masuk
              </button>
              <button
                className="button ghost landing-btn-register"
                type="button"
                onClick={() => setScreenMode('register')}
              >
                Daftar Akun
              </button>
              <button
                className="button primary landing-btn-cta"
                type="button"
                onClick={() => setScreenMode('workspace')}
              >
                Buka Aplikasi →
              </button>
            </div>
          </header>
        </div>

        {/* 2. Split Editorial Hero + Interactive Live Preview */}
        <section className="landing-hero">
          <div style={{ minWidth: 0 }}>
            <span className="badge landing-hero-badge">
              MANAJEMEN PROYEK, HELPDESK TIKET KLIEN &amp; QA TERPADU
            </span>
            <h1>
              Satukan Tugas Tim, Komplain Klien &amp; Pengujian QA dalam Satu Ruang Kerja.
            </h1>
            <p>
              Dirancang khusus untuk Software House, Digital Agency, dan Tim Engineering. Tidak perlu
              lagi berpindah-pindah antara grup chat untuk komplain klien, papan tugas terpisah, dan
              spreadsheet pengujian QA yang berantakan.
            </p>
            <div className="landing-hero-ctas">
              <button
                className="button primary"
                type="button"
                onClick={() => setScreenMode('register')}
              >
                Mulai Gratis — Tanpa Kartu Kredit
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => setScreenMode('workspace')}
              >
                Eksplorasi Ruang Kerja →
              </button>
            </div>
            <div className="landing-hero-highlights">
              <span>✓ Konversi Tiket Klien → Tugas 1-Klik</span>
              <span>✓ CRUD Skenario &amp; Test Case QA</span>
              <span>✓ OAuth Google &amp; GitHub + Supabase</span>
            </div>
          </div>

          {/* Interactive Product Preview Window */}
          <div className="hero-Preview-window">
            <div className="hero-window-bar">
              <div className="window-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="window-tabs">
                <button
                  type="button"
                  className={heroPreviewTab === 'kanban' ? 'active' : ''}
                  onClick={() => setHeroPreviewTab('kanban')}
                >
                  1. Tugas Tim
                </button>
                <button
                  type="button"
                  className={heroPreviewTab === 'tickets' ? 'active' : ''}
                  onClick={() => setHeroPreviewTab('tickets')}
                >
                  2. Tiket Klien
                </button>
                <button
                  type="button"
                  className={heroPreviewTab === 'qa' ? 'active' : ''}
                  onClick={() => setHeroPreviewTab('qa')}
                >
                  3. Test Case QA
                </button>
              </div>
            </div>

            <div className="hero-window-body">
              {heroPreviewTab === 'kanban' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13 }}>Distribusi Tugas Karyawan Aktif</b>
                    <span className="badge">{state.tasks.length} Tugas Terdaftar</span>
                  </div>
                  {state.tasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '11px 13px',
                        borderRadius: 11,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div>
                        <b style={{ display: 'block', fontSize: 13 }}>{t.title}</b>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          PIC: {t.assignee} ({t.assigneeRole}) · {t.project}
                        </small>
                      </div>
                      <span className={`status-pill status-${t.status.replace(/\s+/g, '-')}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {heroPreviewTab === 'tickets' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13 }}>Antrean Komplain &amp; Bug Klien</b>
                    <span className="badge">{openTicketsCount} Tiket Open</span>
                  </div>
                  {state.tickets.slice(0, 3).map((tk) => (
                    <div
                      key={tk.id}
                      style={{
                        padding: '11px 13px',
                        borderRadius: 11,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div>
                        <b style={{ display: 'block', fontSize: 13 }}>
                          [{tk.code}] {tk.title}
                        </b>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          Klien: {tk.clientName} · Kategori: {tk.category}
                        </small>
                      </div>
                      <span className={`severity-pill severity-${tk.severity}`}>
                        {tk.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {heroPreviewTab === 'qa' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13 }}>Eksekusi Skenario &amp; Test Case QA</b>
                    <span className="badge">Pass Rate {qaPassRate}%</span>
                  </div>
                  {state.testCases.slice(0, 3).map((tc) => (
                    <div
                      key={tc.id}
                      style={{
                        padding: '11px 13px',
                        borderRadius: 11,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div>
                        <b style={{ display: 'block', fontSize: 13 }}>
                          {tc.code}: {tc.title}
                        </b>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          Ekspektasi: {tc.expectedResult}
                        </small>
                      </div>
                      <span className={`qa-status-btn active ${tc.status}`}>{tc.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Metrics & Industry Social Proof Strip */}
        <section className="landing-metrics-strip">
          <div className="landing-metrics-box">
            <div className="landing-metric-item">
              <b>1 klik</b>
              <span>Test Case Gagal → Tiket Bug</span>
              <small>Kode TC, proyek, dan prioritas terbawa otomatis ke tiket baru</small>
            </div>
            <div className="landing-metric-item">
              <b>5 tahap</b>
              <span>Status Tiket Klien</span>
              <small>Open → Investigasi → Diperbaiki → Terverifikasi → Ditutup</small>
            </div>
            <div className="landing-metric-item">
              <b>4 status</b>
              <span>Hasil Uji QA</span>
              <small>Pass, Fail, Blocked, dan Pending per Test Case</small>
            </div>
            <div className="landing-metric-item">
              <b>JSON</b>
              <span>Ekspor Data Kapan Saja</span>
              <small>Data Anda tidak terkunci di dalam aplikasi</small>
            </div>
          </div>
        </section>

        {/* 4. 4-Stage End-to-End Workflow Pipeline */}
        <section id="alur-kerja" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">ALUR KERJA TERINTEGRASI HULU KE HILIR</p>
            <h2>Bagaimana RuangWaktu Menyatukan Tim Anda</h2>
            <p>
              Empat tahapan sistematis yang menghubungkan keluhan klien, eksekusi developer, hingga
              validasi QA sebelum fitur dirilis ke produksi.
            </p>
          </div>

          <div className="workflow-pipeline-grid">
            <article className="workflow-step-card">
              <span className="workflow-step-num">TAHAP 01 · HELPDESK</span>
              <h3>Pencatatan Tiket &amp; Komplain Klien</h3>
              <p>
                Setiap laporan bug, komplain, atau permintaan revisi dari klien dicatat dengan kode
                unik (<code>TKT-101</code>), tingkat keparahan (Kritis s/d Rendah), dan proyek terkait.
              </p>
            </article>

            <article className="workflow-step-card">
              <span className="workflow-step-num">TAHAP 02 · DELEGASI</span>
              <h3>Konversi ke Tugas Karyawan per Proyek</h3>
              <p>
                Dengan 1 klik, tiket klien dikonversi menjadi tugas karyawan lengkap dengan nama
                PIC, role jabatan (Backend, Frontend, UI/UX), tenggat waktu, dan papan Kanban.
              </p>
            </article>

            <article className="workflow-step-card">
              <span className="workflow-step-num">TAHAP 03 · SKENARIO UJI</span>
              <h3>Penyusunan Test Scenario &amp; Test Case</h3>
              <p>
                Tim QA menyusun Test Scenario (<code>TS-01</code>) per modul dan menjabarkan Test
                Case (<code>TC-001</code>) berisi prasyarat, langkah uji, dan ekspektasi hasil.
              </p>
            </article>

            <article className="workflow-step-card">
              <span className="workflow-step-num">TAHAP 04 · VERIFIKASI RILIS</span>
              <h3>Eksekusi Pass / Fail &amp; Laporan Klien</h3>
              <p>
                QA menandai hasil pengujian secara langsung (Pass, Fail, Blocked). Persentase
                kesiapan rilis otomatis terhitung di radar utama proyek.
              </p>
            </article>
          </div>
        </section>

        {/* 5. 6-Card Bento Feature Deep-Dive */}
        <section id="fitur-utama" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">KAPABILITAS ENTERPRISE</p>
            <h2>Enam Modul Inti dalam Satu Ruang Kerja</h2>
            <p>
              Dirancang bebas distraksi dengan tipografi presisi dan mode tampilan teduh yang nyaman
              dipandang sepanjang hari.
            </p>
          </div>

          <div className="landing-features">
            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <FolderKanban size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Portofolio Multi-Proyek &amp; Klien</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Filter seluruh ruang kerja berdasarkan proyek klien hanya dengan satu klik pada
                pita konteks di bagian atas studio.
              </p>
            </article>

            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <Users size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Kanban &amp; Tabel Tugas Karyawan</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Beralih bebas antara papan Kanban 4 kolom (Todo, In Progress, In Review, Done) dan
                tabel daftar tugas karyawan lengkap dengan role tim.
              </p>
            </article>

            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <Ticket size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Triage Tiket Komplain &amp; SLA</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Pisahkan tiket berstatus Open, Investigasi, Diperbaiki, dan Closed agar tidak ada
                keluhan klien yang terlewat oleh tim developer.
              </p>
            </article>

            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <ClipboardCheck size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Studio QA: Test Scenario &amp; Case</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Dokumentasi pengujian lengkap dengan Pre-condition, Test Steps, Expected vs Actual
                Result, dan kalkulasi rasio kelulusan (Pass Rate) otomatis.
              </p>
            </article>

            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <Cloud size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Sinkronisasi Hybrid Supabase Cloud</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Mendukung database PostgreSQL Supabase dengan kebijakan RLS serta fitur ekspor dan
                impor cadangan JSON satu klik.
              </p>
            </article>

            <article className="feature-bento-card">
              <div className="feature-icon-box">
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17 }}>OAuth 2.0 &amp; Manajemen Kredensial</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Autentikasi cepat via Google dan GitHub, dilengkapi halaman pengaturan profil,
                avatar/foto URL, jabatan, dan kredensial keamanan.
              </p>
            </article>
          </div>
        </section>

        {/* 6. Comparison Matrix */}
        <section id="perbandingan" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">EFISIENSI EKOSISTEM</p>
            <h2>Mengapa Beralih ke RuangWaktu Studio?</h2>
            <p>
              Bandingkan alur kerja terpisah menggunakan banyak aplikasi dengan ekosistem terpadu
              RuangWaktu.
            </p>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Aspek Operasional Tim</th>
                  <th>Cara Lama (Chat + Trello + Spreadsheet QA)</th>
                  <th style={{ color: 'var(--emerald)' }}>RuangWaktu Studio Terpadu</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>Komplain &amp; Bug dari Klien</b>
                  </td>
                  <td>Tenggelam di grup chat WhatsApp / email tanpa status jelas</td>
                  <td>
                    <b>Tercatat resmi sebagai Tiket (`TKT`) &amp; dikonversi 1-klik jadi Task</b>
                  </td>
                </tr>
                <tr>
                  <td>
                    <b>Penugasan Tugas Karyawan</b>
                  </td>
                  <td>Sulit melacak beban kerja engineer lintas proyek yang berbeda</td>
                  <td>
                    <b>Terstruktur per Proyek, Nama Karyawan, Jabatan, &amp; Status Kanban</b>
                  </td>
                </tr>
                <tr>
                  <td>
                    <b>Dokumentasi QA (Test Case)</b>
                  </td>
                  <td>File Excel/Spreadsheet terpisah yang sering tidak sinkron</td>
                  <td>
                    <b>CRUD Test Scenario &amp; Test Case terintegrasi langsung di proyek</b>
                  </td>
                </tr>
                <tr>
                  <td>
                    <b>Kesiapan Rilis (Release Readiness)</b>
                  </td>
                  <td>Menghitung manual berapa fitur yang sudah lulus uji QA</td>
                  <td>
                    <b>Radar telemetri otomatis menghitung % Pass Rate &amp; Tiket Kritis</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Pricing Plans with Monthly / Annual Toggle */}
        <section id="paket-harga" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">MASA BETA</p>
            <h2>Gratis Selama Beta</h2>
            <p>
              Semua fitur yang sudah tersedia bisa dipakai tanpa biaya. Paket berbayar masih
              disiapkan; harga di bawah adalah rencana dan belum dapat dibeli.
            </p>
            <div className="billing-toggle-wrap">
              <button
                type="button"
                className={billingCycle === 'monthly' ? 'active' : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                Tagihan Bulanan
              </button>
              <button
                type="button"
                className={billingCycle === 'annual' ? 'active' : ''}
                onClick={() => setBillingCycle('annual')}
              >
                Tahunan (Hemat 20%)
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <b>Beta</b>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk satu akun: freelancer, QA, atau lead proyek
              </small>
              <div className="pricing-price">Gratis</div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Tanpa kartu kredit
              </small>
              <ul className="pricing-list">
                <li><Check size={14} aria-hidden="true" /> Proyek, tugas, dan tiket klien</li>
                <li><Check size={14} aria-hidden="true" /> Test Scenario &amp; Test Case QA</li>
                <li><Check size={14} aria-hidden="true" /> Konversi Test Case gagal menjadi tiket</li>
                <li><Check size={14} aria-hidden="true" /> Penyimpanan cloud per akun + ekspor JSON</li>
                <li><Check size={14} aria-hidden="true" /> Login email, Google, atau GitHub</li>
              </ul>
              <button className="button primary" type="button" onClick={() => setScreenMode('register')}>
                Daftar Gratis
              </button>
            </article>

            <article className="pricing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Pro Tim</b>
                <span className="badge">SEGERA HADIR</span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk software house, agensi digital &amp; tim produk
              </small>
              <div className="pricing-price">
                {proPrice} <span style={{ fontSize: 13, fontWeight: 500 }}>/ bulan</span>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Rencana harga {billingCycle === 'annual' ? '(ditagih tahunan)' : '(bulanan)'} · belum dapat dibeli
              </small>
              <ul className="pricing-list">
                <li><Check size={14} aria-hidden="true" /> Semua fitur Beta</li>
                <li><Check size={14} aria-hidden="true" /> Workspace tim bersama &amp; undangan anggota</li>
                <li><Check size={14} aria-hidden="true" /> Peran anggota (admin, anggota, klien)</li>
                <li><Check size={14} aria-hidden="true" /> Riwayat perubahan status tiket</li>
              </ul>
              <button className="button ghost" type="button" disabled>
                Segera Hadir
              </button>
            </article>

            <article className="pricing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Enterprise</b>
                <span className="badge">SEGERA HADIR</span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk organisasi multi-divisi
              </small>
              <div className="pricing-price">
                {entPrice} <span style={{ fontSize: 13, fontWeight: 500 }}>/ bulan</span>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Rencana harga · belum dapat dibeli
              </small>
              <ul className="pricing-list">
                <li><Check size={14} aria-hidden="true" /> Semua fitur Pro Tim</li>
                <li><Check size={14} aria-hidden="true" /> Banyak workspace per divisi</li>
                <li><Check size={14} aria-hidden="true" /> Pendampingan onboarding</li>
              </ul>
              <button className="button ghost" type="button" disabled>
                Segera Hadir
              </button>
            </article>
          </div>
        </section>

        {/* 9. Interactive FAQ Accordion */}
        <section id="faq" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">PUSAT BANTUAN &amp; INFORMASI</p>
            <h2>Pertanyaan yang Sering Diajukan (FAQ)</h2>
            <p>Jawaban lengkap seputar alur kerja proyek, tiket, QA, serta teknis penyimpanan.</p>
          </div>

          <div className="faq-list">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="faq-item">
                  <button
                    type="button"
                    className="faq-trigger"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 160ms ease',
                        flexShrink: 0
                      }}
                    />
                  </button>
                  {isOpen && <div className="faq-body">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 10. Bottom CTA & Full Multi-Column Footer */}
        <section className="landing-section" style={{ paddingBottom: 16 }}>
          <div
            className="card"
            style={{
              padding: '38px 32px',
              textAlign: 'center',
              background: 'var(--bg-card-solid)',
              borderColor: 'var(--border-strong)'
            }}
          >
            <p className="eyebrow">SIAP MERAPIKAN EKSEKUSI TIM ANDA?</p>
            <h2 style={{ fontSize: 28, margin: '8px 0 12px' }}>
              Mulai Kelola Proyek, Tugas Karyawan, Tiket Klien &amp; QA Hari Ini
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 22px' }}>
              Langsung gunakan ruang kerja interaktif tanpa instalasi rumit atau buat akun tim Anda
              melalui OAuth Google &amp; GitHub.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="button primary"
                type="button"
                onClick={() => setScreenMode('register')}
              >
                Daftar Akun Gratis
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => setScreenMode('workspace')}
              >
                Masuk ke Live Studio →
              </button>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <div className="brand" style={{ marginBottom: 10 }}>
                <i aria-hidden="true"><img src="/icon.png" alt="Ruang Waktu" width={34} height={34} /></i>
                <span className="brand-text">
                  <span>
                    ruang<b>waktu</b>
                  </span>
                  <small>ARCHITECTURAL PROJECT &amp; QA STUDIO</small>
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Platform manajemen tugas karyawan per proyek, helpdesk komplain klien, serta
                dokumentasi skenario pengujian QA terpadu.
              </p>
              <span className="badge">● Semua Sistem Operasional (Next.js + Supabase)</span>
            </div>

            <div className="landing-footer-col">
              <h4>MODUL PRODUK</h4>
              <ul>
                <li>Portofolio Proyek &amp; Klien</li>
                <li>Kanban &amp; Tabel Tugas Karyawan</li>
                <li>Triage Tiket Komplain Klien</li>
                <li>Studio QA Test Scenario &amp; Case</li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>ARSITEKTUR &amp; KEAMANAN</h4>
              <ul>
                <li>PostgreSQL Supabase Cloud Sync</li>
                <li>Row Level Security (RLS)</li>
                <li>Single Sign-On (Google &amp; GitHub)</li>
                <li>Portabilitas Cadangan JSON</li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>AKSES CEPAT</h4>
              <ul>
                <li>
                  <button
                    type="button"
                    className="text-btn"
                    style={{ padding: 0 }}
                    onClick={() => setScreenMode('workspace')}
                  >
                    Buka Studio Utama →
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-btn"
                    style={{ padding: 0 }}
                    onClick={() => setScreenMode('login')}
                  >
                    Halaman Login OAuth →
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-btn"
                    style={{ padding: 0 }}
                    onClick={() => setScreenMode('register')}
                  >
                    Registrasi Tim Baru →
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================================================
  // SCREEN: LOGIN & REGISTER + OAUTH (GOOGLE & GITHUB)
  // ==========================================================================
  if (screenMode === 'login' || screenMode === 'register') {
    const isRegister = screenMode === 'register';
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <a
              className="brand"
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                setScreenMode('workspace');
              }}
              style={{ padding: 0 }}
            >
              <i aria-hidden="true"><img src="/icon.png" alt="Ruang Waktu" width={34} height={34} /></i>
              <span className="brand-text">
                ruang<b>waktu</b>
              </span>
            </a>
            <button
              className="button ghost"
              type="button"
              onClick={() => setScreenMode('landing')}
              style={{ height: 32, padding: '0 10px', fontSize: 12 }}
            >
              ← Landing Page
            </button>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>
            {isRegister ? 'Buat Akun Ruang Waktu' : 'Masuk ke Ruang Kerja'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            {isRegister
              ? 'Daftarkan tim Anda untuk mengelola proyek, tiket klien, dan QA.'
              : 'Gunakan akun OAuth atau kredensial email kerja Anda.'}
          </p>

          {!cloudAvailable && (
            <p className="auth-notice" role="note">
              Backend belum dikonfigurasi pada lingkungan ini, sehingga login tidak tersedia.
              Anda tetap bisa mencoba aplikasi dalam <b>Mode Demo</b> (data tersimpan di browser ini saja).
            </p>
          )}

          <div className="oauth-grid">
            <button
              type="button"
              className="button ghost"
              disabled={!cloudAvailable || authBusy}
              onClick={() => handleOAuthLogin('google')}
            >
              <GoogleLogo /> Google
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={!cloudAvailable || authBusy}
              onClick={() => handleOAuthLogin('github')}
            >
              <GitHubLogo /> GitHub
            </button>
          </div>

          <div className="auth-divider">atau dengan email</div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get('email') || '').trim();
              const password = String(fd.get('password') || '');
              const name = String(fd.get('name') || '').trim();
              void handleEmailAuth(isRegister ? 'register' : 'login', email, password, name);
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            {isRegister && (
              <label className="field full">
                <span>Nama lengkap</span>
                <input name="name" required maxLength={80} autoComplete="name" placeholder="Nama Anda" />
              </label>
            )}
            <label className="field full">
              <span>Alamat email kerja</span>
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="nama@perusahaan.com"
              />
            </label>
            <label className="field full">
              <span>Kata sandi</span>
              <input
                name="password"
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'Minimal 8 karakter' : '••••••••'}
              />
            </label>
            {!isRegister && (
              <button
                type="button"
                className="auth-link"
                disabled={!cloudAvailable || authBusy}
                onClick={() => {
                  const el = document.getElementById('auth-email') as HTMLInputElement | null;
                  void handleForgotPassword((el?.value || '').trim());
                }}
              >
                Lupa kata sandi?
              </button>
            )}
            {authMessage && (
              <p className="auth-message" role="status" aria-live="polite">
                {authMessage}
              </p>
            )}
            <button
              type="submit"
              className="button primary"
              disabled={!cloudAvailable || authBusy}
              style={{ width: '100%', marginTop: 6 }}
            >
              {authBusy ? 'Memproses…' : isRegister ? 'Daftar & Buka Workspace' : 'Masuk ke Workspace'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 18, marginBottom: 0 }}>
            {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
            <button
              type="button"
              onClick={() => {
                setAuthMessage('');
                setScreenMode(isRegister ? 'login' : 'register');
              }}
              style={{ border: 0, background: 'transparent', color: 'var(--emerald)', fontWeight: 600, padding: 0 }}
            >
              {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // SCREEN: MAIN WORKSPACE
  // ==========================================================================
  const doneTasksCount = scopedTasks.filter((t) => t.status === 'Done' || t.completed).length;
  const totalScopedTasks = scopedTasks.length || 1;
  const donePct = scopedTasks.length ? Math.round((doneTasksCount / totalScopedTasks) * 100) : 0;
  const reviewPct = scopedTasks.length
    ? Math.round((scopedTasks.filter((t) => t.status === 'In Review').length / totalScopedTasks) * 100)
    : 0;
  const progressPct = scopedTasks.length
    ? Math.round((scopedTasks.filter((t) => t.status === 'In Progress').length / totalScopedTasks) * 100)
    : 0;
  const todoPct = scopedTasks.length ? Math.max(0, 100 - donePct - reviewPct - progressPct) : 0;

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} aria-label="Navigasi Utama">
        <div className="sidebar-top">
          <a
            className="brand"
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setView('dashboard');
            }}
          >
            <i aria-hidden="true"><img src="/icon.png" alt="Ruang Waktu" width={34} height={34} /></i>
            <span className="brand-text">
              <span>
                ruang<b>waktu</b>
              </span>
            </span>
          </a>

          <button
            className="dock-collapse-btn"
            type="button"
            data-tooltip={sidebarCollapsed ? 'Bentangkan Sidebar' : 'Lipat Sidebar'}
            data-tooltip-pos="right"
            onClick={() => {
              setSidebarCollapsed((c) => {
                const next = !c;
                localStorage.setItem('ruangWaktuSidebar', next ? 'collapsed' : 'open');
                return next;
              });
            }}
            aria-label="Lipat atau bentangkan navigasi"
          >
            <Menu size={16} />
          </button>

          <button
            className="sidebar-close"
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup navigasi"
          >
            <X size={16} />
          </button>
        </div>

        {/* Single "+ Baru" Button with Dropdown Menu (Shortcut: N) */}
        <div className="quick-create-wrap" ref={quickCreateRef} style={{ width: '100%' }}>
          <button
            type="button"
            className="dock-quick-create"
            data-tooltip="Tambah Baru (Pintasan: N)"
            data-tooltip-pos="right"
            onClick={() => setQuickCreateOpen((o) => !o)}
            aria-expanded={quickCreateOpen}
            aria-haspopup="menu"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <PlusIcon size={16} />
              <span>Baru</span>
            </span>
            <kbd>N</kbd>
          </button>

          {quickCreateOpen && (
            <div className="quick-create-menu left-align" role="menu" aria-label="Pilih item baru">
              <button type="button" role="menuitem" onClick={() => openModal('ticket')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <TicketsIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Tiket Klien Baru</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>TKT</small>
              </button>
              <button type="button" role="menuitem" onClick={() => openModal('task')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <TasksIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Tugas Tim Baru</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>Task</small>
              </button>
              <button type="button" role="menuitem" onClick={() => openModal('testcase')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <QAIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Test Case QA Baru</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>TC</small>
              </button>
              <button type="button" role="menuitem" onClick={() => openModal('scenario')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <ScenarioIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Skenario Uji Baru</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>TS</small>
              </button>
              <button type="button" role="menuitem" onClick={() => openModal('project')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <ProjectsIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Proyek Baru</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>Proyek</small>
              </button>
              <button type="button" role="menuitem" onClick={() => openModal('event')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <CalendarIcon size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>Jadwal / Agenda</span>
                </span>
                <small style={{ color: 'var(--text-muted)' }}>Kalender</small>
              </button>
            </div>
          )}
        </div>

        <div className="nav-group">
          <p className="nav-label">MENU UTAMA</p>
          <button
            type="button"
            data-tooltip="Dashboard"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('dashboard');
              setMobileSidebarOpen(false);
            }}
          >
            <DashboardIcon size={17} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            data-tooltip="Tiket Klien"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'tickets' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('tickets');
              setMobileSidebarOpen(false);
            }}
          >
            <TicketsIcon size={17} />
            <span>Tiket</span>
            <b>{openTicketsCount}</b>
          </button>

          <button
            type="button"
            data-tooltip="Tugas Tim"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('tasks');
              setMobileSidebarOpen(false);
            }}
          >
            <TasksIcon size={17} />
            <span>Tugas</span>
            <b>{openTasksCount}</b>
          </button>

          <button
            type="button"
            data-tooltip="Test Case & QA"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'qa' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('qa');
              setMobileSidebarOpen(false);
            }}
          >
            <QAIcon size={17} />
            <span>Test Case</span>
            <b>{scopedTestCases.length}</b>
          </button>

          <button
            type="button"
            data-tooltip="Daftar Proyek"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'projects' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('projects');
              setMobileSidebarOpen(false);
            }}
          >
            <ProjectsIcon size={17} />
            <span>Proyek</span>
            <b>{state.projects.length}</b>
          </button>
        </div>

        <div className="nav-group">
          <p className="nav-label">JADWAL &amp; LAPORAN</p>
          <button
            type="button"
            data-tooltip="Kalender"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('calendar');
              setMobileSidebarOpen(false);
            }}
          >
            <CalendarIcon size={17} />
            <span>Kalender</span>
          </button>

          <button
            type="button"
            data-tooltip="Laporan & SLA"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'insights' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('insights');
              setMobileSidebarOpen(false);
            }}
          >
            <AnalyticsIcon size={17} />
            <span>Laporan</span>
          </button>
        </div>

        {/* Clean QA Summary Widget (No Tech/Plan Clutter) */}
        <div className="dock-radar" title="Persentase dihitung dari Test Case berstatus Lulus dibagi total Test Case">
          <div className="dock-radar-head">
            <span>Kelulusan Test Case</span>
            <span className="badge">{qaPassRate}% Lulus</span>
          </div>
          <div className="dock-radar-bar">
            <span style={{ width: `${qaPassRate}%` }} />
          </div>
          <small>
            {passedCasesCount} dari {scopedTestCases.length} test case lulus ({qaPassRate}%)
          </small>
        </div>

        <div className="sidebar-foot">
          <button
            type="button"
            data-tooltip="Pengaturan"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => {
              if (prefs.soundEffects) sound.playClick();
              setView('settings');
              setMobileSidebarOpen(false);
            }}
          >
            <SettingsIcon size={17} />
            <span>Pengaturan</span>
          </button>
        </div>
      </aside>

      {/* WORKSPACE STAGE */}
      <div className="workspace-stage">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => {
                if (prefs.soundEffects) sound.playClick();
                setMobileSidebarOpen(true);
              }}
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
            <span className="mobile-topbar-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <img src="/icon.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
              <span>ruang<b>waktu</b></span>
            </span>
          </div>

          {/* Interactive Project Context Ribbon: Max 2 displayed directly + Semua Proyek dropdown */}
          <div
            className="project-ribbon topbar-project-ribbon"
            role="tablist"
            aria-label="Filter Proyek"
          >
            <div className="project-dropdown-container" ref={projectDropdownRef}>
              <button
                type="button"
                role="tab"
                aria-selected={globalProjectFilter === 'all'}
                className={`project-pill ${globalProjectFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  if (prefs.soundEffects) sound.playClick();
                  setProjectDropdownOpen((prev) => !prev);
                }}
                title="Pilih dari daftar lengkap proyek"
              >
                <span className="project-pill-dot" />
                <span>Semua Proyek ({state.projects.length})</span>
                <ChevronDown size={13} style={{ opacity: 0.7, marginLeft: 2 }} />
              </button>

              {projectDropdownOpen && (
                <div className="project-dropdown-popover" role="menu">
                  <div className="project-dropdown-header">
                    <span>Semua Proyek</span>
                    <span>{state.projects.length} Total</span>
                  </div>
                  <button
                    type="button"
                    className={`project-dropdown-item ${globalProjectFilter === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      if (prefs.soundEffects) sound.playClick();
                      setGlobalProjectFilter('all');
                      setProjectDropdownOpen(false);
                    }}
                  >
                    <div className="project-dropdown-item-left">
                      <span className="project-pill-dot" />
                      <span>Semua Proyek ({state.projects.length})</span>
                    </div>
                    {globalProjectFilter === 'all' && <CheckCircle2 size={14} color="var(--emerald)" />}
                  </button>
                  {state.projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`project-dropdown-item ${globalProjectFilter === p.name ? 'active' : ''}`}
                      onClick={() => {
                        if (prefs.soundEffects) sound.playClick();
                        setGlobalProjectFilter(p.name);
                        setProjectDropdownOpen(false);
                      }}
                    >
                      <div className="project-dropdown-item-left">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
                        <span title={p.name}>{p.name}</span>
                      </div>
                      {globalProjectFilter === p.name && <CheckCircle2 size={14} color="var(--emerald)" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Display at most 2 projects directly as requested */}
            {state.projects.slice(0, 2).map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={globalProjectFilter === p.name}
                className={`project-pill ${globalProjectFilter === p.name ? 'active' : ''}`}
                onClick={() => {
                  if (prefs.soundEffects) sound.playClick();
                  setGlobalProjectFilter(p.name);
                }}
              >
                <span>{p.name}</span>
              </button>
            ))}

            {/* If a project beyond the first 2 is currently selected, display it as active pill */}
            {globalProjectFilter !== 'all' &&
              !state.projects.slice(0, 2).some((p) => p.name === globalProjectFilter) && (
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  className="project-pill active"
                  onClick={() => {
                    if (prefs.soundEffects) sound.playClick();
                    setGlobalProjectFilter('all');
                  }}
                  title="Klik untuk kembali ke Semua Proyek"
                >
                  <span className="project-pill-dot" />
                  <span>{globalProjectFilter}</span>
                  <X size={12} style={{ marginLeft: 4 }} />
                </button>
              )}
          </div>

          <div className="topbar-right">
            {/* Demo Data Privacy Label when not logged in */}
            {!isAuthenticated && (
              <button
                type="button"
                className="demo-pill"
                onClick={() => {
                  if (prefs.soundEffects) sound.playClick();
                  setScreenMode('login');
                }}
                title="Data yang tampil adalah data simulasi/demo. Klik untuk masuk dengan akun kerja."
              >
                <span>Mode Demo · Masuk</span>
              </button>
            )}

            {/* Single-Line Spotlight Search Button */}
            <button
              className="search"
              type="button"
              onClick={() => {
                if (prefs.soundEffects) sound.playClick();
                setCmdQuery('');
                setCmdIndex(0);
                setCmdOpen(true);
              }}
              aria-label="Pencarian cepat (Ctrl+K)"
            >
              <Search size={15} />
              <span>Cari tiket, tugas, atau test case…</span>
              <kbd>Ctrl K</kbd>
            </button>

            {/* Click SFX Toggle */}
            <button
              className={`icon-btn audio-btn ${prefs.soundEffects ? 'active' : ''}`}
              type="button"
              data-tooltip={prefs.soundEffects ? 'Matikan Efek Suara' : 'Nyalakan Efek Suara Klik'}
              data-tooltip-pos="bottom"
              onClick={() => {
                const next = !prefs.soundEffects;
                setPrefs((p) => ({ ...p, soundEffects: next }));
                if (next) sound.playClick();
                pushToast(
                  next ? 'Efek Suara Aktif' : 'Efek Suara Nonaktif',
                  next ? 'Suara klik interaksi dinyalakan.' : 'Suara klik interaksi dimatikan.'
                );
              }}
              aria-label="Toggle efek suara"
            >
              {prefs.soundEffects ? <VolumeIcon size={17} /> : <VolumeMuteIcon size={17} />}
            </button>

            <button
              className="icon-btn theme-toggle-btn"
              type="button"
              data-tooltip={prefs.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              data-tooltip-pos="bottom"
              onClick={(e) => {
                if (prefs.soundEffects) sound.playClick();
                toggleThemeWithAnimation(undefined, e.currentTarget);
              }}
              aria-label="Ubah tema tampilan"
            >
              {prefs.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Button + Popover List */}
            <div className="notif-wrap" ref={notifRef}>
              <button
                className="icon-btn"
                type="button"
                data-tooltip="Notifikasi"
                data-tooltip-pos="bottom"
                onClick={() => {
                  setNotifPopoverOpen((o) => !o);
                  setAccountMenuOpen(false);
                }}
                aria-label="Buka daftar notifikasi"
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="notif-badge">{unreadNotifCount}</span>
                )}
              </button>

              {notifPopoverOpen && (
                <div className="notif-popover" role="dialog" aria-label="Daftar notifikasi">
                  <div className="notif-popover-head">
                    <b>Notifikasi ({unreadNotifCount} belum dibaca)</b>
                    <button type="button" onClick={markAllNotificationsRead}>
                      Tandai dibaca
                    </button>
                  </div>
                  <div className="notif-popover-list">
                    {state.notifications.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`notif-item ${n.read ? 'read' : 'unread'}`}
                        onClick={() => {
                          persistState({
                            ...state,
                            notifications: state.notifications.map((x) =>
                              x.id === n.id ? { ...x, read: true } : x
                            )
                          });
                          setNotifPopoverOpen(false);
                          if (n.targetView) setView(n.targetView);
                        }}
                      >
                        <span className="notif-dot" />
                        <div>
                          <b>{n.title}</b>
                          <p>{n.description}</p>
                          <small>{n.time}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="notif-popover-foot">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifPopoverOpen(false);
                        setView('notifications');
                      }}
                    >
                      Lihat semua notifikasi →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Capsule User Trigger */}
            <div className="account" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((o) => !o);
                  setNotifPopoverOpen(false);
                }}
                aria-expanded={accountMenuOpen}
                aria-label="Menu akun pengguna"
              >
                <span className="avatar">
                  {prefs.userPhotoUrl ? (
                    <img src={prefs.userPhotoUrl} alt={prefs.userName} />
                  ) : (
                    prefs.userAvatar || 'AM'
                  )}
                </span>
                <span className="account-meta">
                  <b>{prefs.userName.split(' ')[0]}</b>
                  <small>{prefs.userRole}</small>
                </span>
                <ChevronDown size={14} />
              </button>

              {accountMenuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-head">
                    <span className="avatar">
                      {prefs.userPhotoUrl ? (
                        <img src={prefs.userPhotoUrl} alt={prefs.userName} />
                      ) : (
                        prefs.userAvatar || 'AM'
                      )}
                    </span>
                    <div>
                      <b>{prefs.userName}</b>
                      <small>{prefs.userEmail}</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView('profile');
                    }}
                  >
                    <UserCog size={16} />
                    <span>Profil &amp; Akun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView('settings');
                    }}
                  >
                    <Settings size={16} />
                    <span>Pengaturan</span>
                  </button>
                  <hr />
                  <button
                    type="button"
                    onClick={() => {
                      if (isAuthenticated) {
                        void handleSignOut();
                      } else {
                        setAccountMenuOpen(false);
                        setScreenMode('login');
                      }
                    }}
                  >
                    <LogOut size={16} />
                    <span>{isAuthenticated ? 'Keluar' : 'Masuk Akun Kerja'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="content">
          {/* ====================================================================
              VIEW 1: DASHBOARD
             ==================================================================== */}
          {view === 'dashboard' && (
            <section className="view-enter">
              {/* ZONE 1: Header & Telemetry Summary */}
              <div className="studio-hero-banner">
                <div className="studio-hero-left">
                  <div>
                    <div className="studio-eyebrow-row">
                      <p className="eyebrow">
                        {fmtDate(today, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }).toUpperCase()}{' '}
                        · WIB
                      </p>
                      <span className="badge">
                        {globalProjectFilter === 'all' ? 'Semua Proyek' : globalProjectFilter}
                      </span>
                      {!isAuthenticated && (
                        <span className="demo-pill">Data Demo</span>
                      )}
                    </div>
                    <h1>Dashboard</h1>
                    <p>
                      Kelola tiket klien, tugas tim, dan pengujian QA dalam satu ruang kerja.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => setQuickCreateOpen((o) => !o)}
                    >
                      <PlusIcon size={16} />
                      <span>Baru (Pintasan: N)</span>
                    </button>
                    {ticketsApproachingSla.length > 0 ? (
                      <button
                        type="button"
                        className="sla-badge warn"
                        style={{ cursor: 'pointer', padding: '7px 12px', fontSize: 12 }}
                        onClick={() => setView('tickets')}
                      >
                        ⚠ {ticketsApproachingSla.length} Tiket mendekati/lewat batas SLA →
                      </button>
                    ) : (
                      <span className="sla-badge safe" style={{ padding: '7px 12px', fontSize: 12 }}>
                        ✓ Semua SLA Tiket Terkendali
                      </span>
                    )}
                  </div>
                </div>

                {/* Telemetry Distribution Matrix with Explicit Calculation Explanations */}
                <div className="telemetry-box">
                  <div className="telemetry-head">
                    <b>Progres Penyelesaian Tugas &amp; QA</b>
                    <span title="Dihitung dari jumlah tugas berstatus Selesai dibagi total tugas aktif pada filter proyek ini">
                      {doneTasksCount} dari {scopedTasks.length} tugas selesai ({donePct}%)
                    </span>
                  </div>

                  <div
                    className="pipeline-segmented-bar"
                    title={`Selesai: ${donePct}% | Dalam Tinjauan: ${reviewPct}% | Sedang Dikerjakan: ${progressPct}% | Belum Dikerjakan: ${todoPct}%`}
                  >
                    <span className="pipeline-seg done" style={{ width: `${donePct}%` }} />
                    <span className="pipeline-seg review" style={{ width: `${reviewPct}%` }} />
                    <span className="pipeline-seg progress" style={{ width: `${progressPct}%` }} />
                    <span className="pipeline-seg todo" style={{ width: `${todoPct}%` }} />
                  </div>

                  <div className="telemetry-legend">
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('tickets')}
                      style={{ cursor: 'pointer' }}
                      title="Jumlah tiket yang belum ditutup (Terbuka, Investigasi, Diperbaiki, Terverifikasi)"
                    >
                      <small>Tiket Aktif</small>
                      <b>{openTicketsCount}</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('tasks')}
                      style={{ cursor: 'pointer' }}
                      title="Jumlah tugas yang belum selesai"
                    >
                      <small>Tugas Aktif</small>
                      <b>{openTasksCount}</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('qa')}
                      style={{ cursor: 'pointer' }}
                      title="Total Test Case pada cakupan proyek ini"
                    >
                      <small>Test Case</small>
                      <b>{scopedTestCases.length} TC</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('qa')}
                      style={{ cursor: 'pointer' }}
                      title={`${passedCasesCount} dari ${scopedTestCases.length} Test Case berstatus Lulus`}
                    >
                      <small>Lulus QA ({passedCasesCount}/{scopedTestCases.length})</small>
                      <b style={{ color: 'var(--emerald)' }}>{qaPassRate}%</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explicit Release Readiness Criteria Banner */}
              <div className={`release-gate-banner ${isReleaseReady ? 'ready' : 'blocked'}`}>
                <div>
                  <b style={{ fontSize: 14, display: 'block' }}>
                    {isReleaseReady
                      ? '✓ Status Kesiapan Rilis: SIAP RILIS'
                      : '⚠ Status Kesiapan Rilis: BELUM SIAP RILIS (Tertahan)'}
                  </b>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    Aturan rilis: Semua Test Case Kritis wajib Lulus, 0 Test Case Gagal, dan 0 Tiket Kritis terbuka.{' '}
                    {!isReleaseReady && (
                      <strong>
                        Blocker saat ini: {openCriticalTickets.length} Tiket Kritis aktif, {failedTestCases.length} Test Case Gagal.
                      </strong>
                    )}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {openCriticalTickets.length > 0 && (
                    <button type="button" className="button ghost small" onClick={() => setView('tickets')}>
                      Cek Tiket Kritis ({openCriticalTickets.length})
                    </button>
                  )}
                  {failedTestCases.length > 0 && (
                    <button type="button" className="button ghost small" onClick={() => setView('qa')}>
                      Cek Test Gagal ({failedTestCases.length})
                    </button>
                  )}
                </div>
              </div>

              {/* ZONE 2: 3-Column Workflow (Tiket -> Tugas -> Test Case) */}
              <div className="bento-triage-grid">
                {/* Column 1: Tiket */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">HELPDESK KLIEN</p>
                      <h2>Tiket ({openTicketsCount} Aktif)</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('tickets')}>
                      Semua Tiket →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {scopedTickets.slice(0, 3).map((tk) => {
                      const linkedTask = getLinkedTaskForTicket(tk);
                      const linkedTc = getTestCaseByCode(tk.linkedTestCaseCode);
                      const sla = getTicketSlaInfo(tk, todayStr);
                      return (
                        <div
                          key={tk.id}
                          style={{
                            padding: 13,
                            borderRadius: 12,
                            background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            gap: 8
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="ticket-code">{tk.code}</span>
                              <span className={`sla-badge ${sla.tone}`}>{sla.label}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span className={`severity-pill severity-${tk.severity}`}>
                                {PRIORITY_ICON[tk.severity]} {tk.severity}
                              </span>
                              <span className="badge">{TICKET_STATUS_LABEL[tk.status]}</span>
                            </div>
                          </div>
                          <b
                            style={{ fontSize: 14, cursor: 'pointer' }}
                            onClick={() => openModal('ticket', tk)}
                          >
                            {tk.title}
                          </b>
                          <div className="trace-links">
                            {linkedTask && (
                              <button
                                type="button"
                                className="trace-chip"
                                onClick={() => openModal('task', linkedTask)}
                                title="Lihat tugas terkait"
                              >
                                📋 Tugas: {TASK_STATUS_LABEL[linkedTask.status]}
                              </button>
                            )}
                            {linkedTc && (
                              <button
                                type="button"
                                className="trace-chip"
                                onClick={() => openModal('testcase', linkedTc)}
                                title="Lihat test case QA terkait"
                              >
                                🧪 {linkedTc.code} ({QA_STATUS_LABEL[linkedTc.status]})
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>
                              {tk.clientName} · PIC: {tk.assignee}
                            </span>
                            <button
                              type="button"
                              className="button ghost small"
                              onClick={() => convertTicketToTask(tk)}
                            >
                              {linkedTask ? 'Lihat Tugas →' : '+ Jadi Tugas'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Column 2: Tugas */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">EKSEKUSI TIM</p>
                      <h2>Tugas ({openTasksCount} Aktif)</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('tasks')}>
                      Semua Tugas →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {scopedTasks.slice(0, 3).map((t) => {
                      const originTicket = getTicketByCode(t.ticketCode);
                      const relatedTc = getTestCaseByCode(t.testCaseCode);
                      const menuKey = `dash-task-${t.id}`;
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: 13,
                            borderRadius: 12,
                            background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            gap: 8
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="assignee-chip">
                              <UserCheck size={13} />
                              {t.assignee} · {t.assigneeRole}
                            </span>
                            <span className={`priority ${t.priority}`}>
                              {PRIORITY_ICON[t.priority]} {t.priority}
                            </span>
                          </div>
                          <b
                            style={{
                              fontSize: 14,
                              cursor: 'pointer',
                              textDecoration: t.completed ? 'line-through' : 'none'
                            }}
                            onClick={() => openModal('task', t)}
                          >
                            {t.title}
                          </b>
                          <div className="trace-links">
                            <span className="sla-badge safe">📅 Tenggat: {t.dueDate}</span>
                            {originTicket && (
                              <button
                                type="button"
                                className="trace-chip"
                                onClick={() => openModal('ticket', originTicket)}
                                title="Buka tiket asal"
                              >
                                🎫 Asal: {originTicket.code}
                              </button>
                            )}
                            {relatedTc && (
                              <button
                                type="button"
                                className="trace-chip"
                                onClick={() => openModal('testcase', relatedTc)}
                                title="Buka test case terkait"
                              >
                                🧪 Uji: {relatedTc.code}
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>{t.project}</span>
                            {/* Single Status Badge that opens dropdown on click */}
                            <div className="status-dropdown-wrap">
                              <button
                                type="button"
                                className={`status-pill status-${t.status.replace(/\s+/g, '-')} status-trigger-btn`}
                                onClick={() =>
                                  setOpenStatusMenuId(openStatusMenuId === menuKey ? null : menuKey)
                                }
                                title="Klik untuk mengubah status tugas"
                              >
                                <span>{TASK_STATUS_LABEL[t.status]}</span>
                                <ChevronDown size={12} />
                              </button>
                              {openStatusMenuId === menuKey && (
                                <div className="status-popover-menu" role="menu">
                                  {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      className={t.status === st ? 'active' : ''}
                                      onClick={() => setTaskStatus(t.id, st)}
                                    >
                                      <span>{TASK_STATUS_LABEL[st]}</span>
                                      {t.status === st && <span>✓</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Column 3: Test Case QA */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">PENGUJIAN KUALITAS</p>
                      <h2>Test Case ({scopedTestCases.length} Kasus)</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('qa')}>
                      Semua Test Case →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {scopedTestCases.slice(0, 3).map((tc) => {
                      const linkedTk = getTicketByCode(tc.linkedTicketCode);
                      const menuKey = `dash-tc-${tc.id}`;
                      return (
                        <div
                          key={tc.id}
                          style={{
                            padding: 13,
                            borderRadius: 12,
                            background: 'var(--bg-card-solid)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            gap: 8
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span className="ticket-code">{tc.code}</span>
                              <span className={`priority ${tc.priority}`}>
                                {PRIORITY_ICON[tc.priority]} {tc.priority}
                              </span>
                            </div>
                            {/* Single QA Status Badge that opens dropdown on click */}
                            <div className="status-dropdown-wrap">
                              <button
                                type="button"
                                className={`qa-badge ${tc.status} status-trigger-btn`}
                                onClick={() =>
                                  setOpenStatusMenuId(openStatusMenuId === menuKey ? null : menuKey)
                                }
                                title="Klik untuk mengubah hasil pengujian"
                              >
                                <span>{QA_STATUS_LABEL[tc.status]}</span>
                                <ChevronDown size={12} />
                              </button>
                              {openStatusMenuId === menuKey && (
                                <div className="status-popover-menu" role="menu">
                                  {(['Pass', 'Fail', 'Blocked', 'Pending'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      className={tc.status === st ? 'active' : ''}
                                      onClick={() => updateTestCaseStatus(tc.id, st)}
                                    >
                                      <span>{QA_STATUS_LABEL[st]}</span>
                                      {tc.status === st && <span>✓</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <b
                            style={{ fontSize: 14, cursor: 'pointer' }}
                            onClick={() => openModal('testcase', tc)}
                          >
                            {tc.title}
                          </b>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                              Penguji: {tc.tester}
                            </small>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {linkedTk && (
                                <button
                                  type="button"
                                  className="trace-chip"
                                  onClick={() => openModal('ticket', linkedTk)}
                                >
                                  🎫 {linkedTk.code}
                                </button>
                              )}
                              {tc.status === 'Fail' && (
                                <button
                                  type="button"
                                  className="button danger-ghost small"
                                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                                  onClick={() => createTicketFromFailedTest(tc)}
                                >
                                  {linkedTk ? 'Lihat Tiket Bug' : '+ Buat Tiket Bug'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>

              {/* ZONE 3: Portfolio Deliverable Strip */}
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">PORTOFOLIO PROYEK</p>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>
                    Ringkasan Proyek, Tiket &amp; Cakupan QA
                  </h2>
                </div>
                <button type="button" className="text-btn" onClick={() => setView('projects')}>
                  Kelola Semua Proyek →
                </button>
              </div>

              <div className="portfolio-strip">
                {state.projects.map((p) => {
                  const stats = getProjectStats(p.name);
                  const openTk = state.tickets.filter(
                    (tk) => tk.project === p.name && tk.status !== 'Ditutup'
                  ).length;
                  const projScenarios = state.scenarios.filter((sc) => sc.project === p.name).length;
                  return (
                    <article
                      key={p.id}
                      className="portfolio-card"
                      onClick={() => openModal('project', p)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="portfolio-card-top">
                        <div>
                          <b>{p.name}</b>
                          <small>
                            Klien: {p.clientName || 'Internal'} · Lead: {p.lead || '-'}
                          </small>
                        </div>
                        <span className="badge">{p.status}</span>
                      </div>

                      <div className="progress">
                        <span style={{ width: `${stats.pct}%` }} />
                      </div>

                      <div className="portfolio-metrics">
                        <div>
                          <small>Tugas Selesai</small>
                          <b>
                            {stats.done}/{stats.total} ({stats.pct}%)
                          </b>
                        </div>
                        <div>
                          <small>Tiket Aktif</small>
                          <b>{openTk} tiket</b>
                        </div>
                        <div>
                          <small>Skenario QA</small>
                          <b>{projScenarios} TS</b>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* ====================================================================
              VIEW 2: PROJECTS & CLIENTS
             ==================================================================== */}
          {view === 'projects' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">MANAJEMEN PROYEK</p>
                  <h1>Proyek &amp; Klien</h1>
                  <p>
                    Kelola daftar proyek klien, Project Lead, serta pantau progres penyelesaian
                    tugas dan tiket.
                  </p>
                </div>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => openModal('project')}
                >
                  + Proyek Baru
                </button>
              </div>

              <div className="board">
                {(['Berjalan', 'Review QA', 'Selesai'] as const).map((status) => {
                  const cols = state.projects.filter((p) => p.status === status);
                  return (
                    <div key={status} className="column">
                      <h3>
                        {status} <span className="badge">{cols.length}</span>
                      </h3>
                      {cols.length ? (
                        cols.map((p) => {
                          const stats = getProjectStats(p.name);
                          const ticketCount = state.tickets.filter(
                            (tk) => tk.project === p.name && tk.status !== 'Ditutup'
                          ).length;
                          return (
                            <div
                              key={p.id}
                              className="board-item"
                              onClick={() => openModal('project', p)}
                            >
                              <b>{p.name}</b>
                              <small>
                                Klien: {p.clientName || '-'} · Lead: {p.lead || '-'}
                              </small>
                              {p.notes && <small>{p.notes}</small>}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  marginBottom: 6,
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                <span>{stats.detail}</span>
                                <span>{ticketCount} tiket aktif</span>
                              </div>
                              <div className="progress">
                                <span style={{ width: `${stats.pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="empty">Belum ada proyek pada tahap ini.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ====================================================================
              VIEW 3: TEAM TASKS PER PROJECT (KANBAN BOARD + TABLE TOGGLE)
             ==================================================================== */}
          {view === 'tasks' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">DISTRIBUSI BEBAN KERJA TIM</p>
                  <h1>Tugas Tim per Proyek</h1>
                  <p>
                    Kelola penugasan anggota tim dalam tampilan Papan Kanban 4 Kolom atau Tabel
                    Terstruktur.
                  </p>
                </div>
                <div className="heading-actions">
                  <div className="project-ribbon">
                    <button
                      type="button"
                      className={`project-pill ${taskViewMode === 'kanban' ? 'active' : ''}`}
                      onClick={() => setTaskViewMode('kanban')}
                    >
                      Papan Kanban
                    </button>
                    <button
                      type="button"
                      className={`project-pill ${taskViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setTaskViewMode('table')}
                    >
                      Tabel Daftar
                    </button>
                  </div>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => openModal('task')}
                  >
                    + Tambah Tugas
                  </button>
                </div>
              </div>

              <article className="card" style={{ marginBottom: 18 }}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <div className="filters">
                    {(
                      [
                        ['all', 'Semua Status'],
                        ['Todo', TASK_STATUS_LABEL['Todo']],
                        ['In Progress', TASK_STATUS_LABEL['In Progress']],
                        ['In Review', TASK_STATUS_LABEL['In Review']],
                        ['Done', TASK_STATUS_LABEL['Done']]
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={taskFilter === val ? 'active' : ''}
                        onClick={() => setTaskFilter(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="toolbar-inputs">
                    <input
                      type="search"
                      className="input"
                      placeholder="Cari tugas, kode tiket, atau nama anggota…"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                    />
                    <select
                      className="select"
                      value={taskProjectFilter}
                      onChange={(e) => setTaskProjectFilter(e.target.value)}
                    >
                      <option value="all">Semua Proyek</option>
                      {state.projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>

              {taskViewMode === 'kanban' ? (
                <div className="kanban-grid">
                  {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map((colStatus) => {
                    const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                    return (
                      <div key={colStatus} className="kanban-col">
                        <div className="kanban-col-head">
                          <b>{TASK_STATUS_LABEL[colStatus]}</b>
                          <span className="badge">{colTasks.length}</span>
                        </div>
                        {colTasks.length ? (
                          colTasks.map((t) => {
                            const linkedTicket = t.ticketCode
                              ? state.tickets.find((tk) => tk.code === t.ticketCode)
                              : undefined;
                            const linkedTest = t.testCaseCode
                              ? state.testCases.find((tc) => tc.code === t.testCaseCode)
                              : undefined;
                            const menuKey = `kanban-task-${t.id}`;
                            return (
                              <div key={t.id} className="kanban-card">
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <span className={`priority ${t.priority}`}>
                                    {PRIORITY_ICON[t.priority]} {t.priority}
                                  </span>
                                  <button
                                    type="button"
                                    className="icon-delete"
                                    onClick={() => deleteTask(t.id)}
                                    aria-label="Hapus tugas"
                                  >
                                    ×
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className="kanban-card-title"
                                  onClick={() => openModal('task', t)}
                                >
                                  {t.title}
                                </button>
                                <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                  {t.project} · 📅 Tenggat: <strong>{t.dueDate}</strong>
                                </small>

                                {(t.ticketCode || t.testCaseCode) && (
                                  <div className="trace-links" style={{ marginTop: 2 }}>
                                    {t.ticketCode && (
                                      <button
                                        type="button"
                                        className="trace-chip"
                                        onClick={() => {
                                          if (linkedTicket) openModal('ticket', linkedTicket);
                                          else setView('tickets');
                                        }}
                                      >
                                        🎫 {t.ticketCode}
                                      </button>
                                    )}
                                    {t.testCaseCode && (
                                      <button
                                        type="button"
                                        className="trace-chip"
                                        onClick={() => {
                                          if (linkedTest) {
                                            setSelectedScenarioId(linkedTest.scenarioId);
                                            openModal('testcase', linkedTest);
                                          } else {
                                            setView('qa');
                                          }
                                        }}
                                      >
                                        🧪 {t.testCaseCode}
                                      </button>
                                    )}
                                  </div>
                                )}

                                <div className="kanban-card-meta">
                                  <span className="assignee-chip">
                                    <UserCheck size={12} />
                                    {t.assignee}
                                  </span>
                                  <div
                                    className="status-dropdown-wrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className={`status-trigger-btn status-${t.status.replace(/\s+/g, '-')}`}
                                      onClick={() =>
                                        setOpenStatusMenuId((prev) =>
                                          prev === menuKey ? null : menuKey
                                        )
                                      }
                                    >
                                      <span>{TASK_STATUS_LABEL[t.status]}</span>
                                      <ChevronDown size={12} />
                                    </button>
                                    {openStatusMenuId === menuKey && (
                                      <div className="status-popover">
                                        {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map(
                                          (st) => (
                                            <button
                                              key={st}
                                              type="button"
                                              className={t.status === st ? 'active' : ''}
                                              onClick={() => {
                                                setTaskStatus(t.id, st);
                                                setOpenStatusMenuId(null);
                                              }}
                                            >
                                              <span>{TASK_STATUS_LABEL[st]}</span>
                                              {t.status === st && <span>✓</span>}
                                            </button>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="empty">Kosong</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <article className="card">
                  <div className="task-list">
                    {filteredTasks.length ? (
                      filteredTasks.map((t) => {
                        const linkedTicket = t.ticketCode
                          ? state.tickets.find((tk) => tk.code === t.ticketCode)
                          : undefined;
                        const linkedTest = t.testCaseCode
                          ? state.testCases.find((tc) => tc.code === t.testCaseCode)
                          : undefined;
                        const menuKey = `table-task-${t.id}`;
                        return (
                          <div key={t.id} className={`task-row ${t.completed ? 'done' : ''}`}>
                            <button
                              type="button"
                              className="check"
                              onClick={() => toggleTask(t.id)}
                              aria-label="Tandai selesai"
                            >
                              ✓
                            </button>
                            <div className="task-main">
                              <button
                                type="button"
                                className="task-title-btn"
                                onClick={() => openModal('task', t)}
                              >
                                <b>{t.title}</b>
                              </button>
                              <small>
                                {t.project} · Role: {t.assigneeRole} · 📅 Tenggat:{' '}
                                <strong>{t.dueDate}</strong>
                              </small>
                              {(t.ticketCode || t.testCaseCode) && (
                                <div className="trace-links">
                                  {t.ticketCode && (
                                    <button
                                      type="button"
                                      className="trace-chip"
                                      onClick={() => {
                                        if (linkedTicket) openModal('ticket', linkedTicket);
                                        else setView('tickets');
                                      }}
                                    >
                                      🎫 Asal: {t.ticketCode}
                                    </button>
                                  )}
                                  {t.testCaseCode && (
                                    <button
                                      type="button"
                                      className="trace-chip"
                                      onClick={() => {
                                        if (linkedTest) {
                                          setSelectedScenarioId(linkedTest.scenarioId);
                                          openModal('testcase', linkedTest);
                                        } else {
                                          setView('qa');
                                        }
                                      }}
                                    >
                                      🧪 Uji: {t.testCaseCode}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="assignee-chip">
                              <UserCheck size={13} />
                              {t.assignee}
                            </span>
                            <div
                              className="status-dropdown-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className={`status-trigger-btn status-${t.status.replace(/\s+/g, '-')}`}
                                onClick={() =>
                                  setOpenStatusMenuId((prev) =>
                                    prev === menuKey ? null : menuKey
                                  )
                                }
                              >
                                <span>{TASK_STATUS_LABEL[t.status]}</span>
                                <ChevronDown size={13} />
                              </button>
                              {openStatusMenuId === menuKey && (
                                <div className="status-popover">
                                  {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map(
                                    (st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        className={t.status === st ? 'active' : ''}
                                        onClick={() => {
                                          setTaskStatus(t.id, st);
                                          setOpenStatusMenuId(null);
                                        }}
                                      >
                                        <span>{TASK_STATUS_LABEL[st]}</span>
                                        {t.status === st && <span>✓</span>}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                            <span className={`priority ${t.priority}`}>
                              {PRIORITY_ICON[t.priority]} {t.priority}
                            </span>
                            <button
                              type="button"
                              className="icon-delete"
                              onClick={() => deleteTask(t.id)}
                              aria-label="Hapus tugas"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty">Tidak ditemukan tugas dengan filter ini.</p>
                    )}
                  </div>
                </article>
              )}
            </section>
          )}

          {/* ====================================================================
            VIEW 4: CLIENT TICKETS / COMPLAINTS
           ==================================================================== */}
          {view === 'tickets' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">HELPDESK &amp; PENANGANAN KELUHAN</p>
                  <h1>Tiket Komplain &amp; Bug Klien</h1>
                  <p>
                    Kelola laporan komplain, bug, atau revisi klien melalui 5 tahap: Terbuka →
                    Investigasi → Diperbaiki → Terverifikasi → Ditutup.
                  </p>
                </div>
                <button className="button primary" type="button" onClick={() => openModal('ticket')}>
                  + Catat Tiket Klien
                </button>
              </div>

              {/* SLA Monitoring Banner */}
              {(() => {
                const todayStr = dateKey(today);
                const warningTickets = state.tickets.filter((tk) => {
                  const sla = getTicketSlaInfo(tk, todayStr);
                  return sla.tone === 'warn' || sla.tone === 'breach';
                });
                return (
                  <article
                    className="card"
                    style={{
                      marginBottom: 18,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderLeft: warningTickets.length
                        ? '4px solid var(--amber)'
                        : '4px solid var(--status-pass)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {warningTickets.length ? (
                        <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                      ) : (
                        <CheckCircle2
                          size={18}
                          style={{ color: 'var(--status-pass)', flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <b style={{ fontSize: 13.5, display: 'block' }}>
                          {warningTickets.length
                            ? `${warningTickets.length} Tiket Mendekati / Melewati Batas SLA`
                            : 'Semua Tiket Berada dalam Batas Waktu SLA'}
                        </b>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                          {warningTickets.length
                            ? warningTickets
                              .map((tk) => `${tk.code} (${getTicketSlaInfo(tk, todayStr).label})`)
                              .join(' · ')
                            : 'Tidak ada tiket komplain klien yang melewati tenggat respons SLA saat ini.'}
                        </small>
                      </div>
                    </div>
                  </article>
                );
              })()}

              <article className="card">
                <div className="toolbar">
                  <div className="filters">
                    {(
                      [
                        ['all', 'Semua Tiket'],
                        ['Open', TICKET_STATUS_LABEL['Open']],
                        ['Investigasi', TICKET_STATUS_LABEL['Investigasi']],
                        ['Diperbaiki', TICKET_STATUS_LABEL['Diperbaiki']],
                        ['Terverifikasi', TICKET_STATUS_LABEL['Terverifikasi']],
                        ['Ditutup', TICKET_STATUS_LABEL['Ditutup']]
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={ticketFilter === val ? 'active' : ''}
                        onClick={() => setTicketFilter(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="toolbar-inputs">
                    <input
                      type="search"
                      className="input"
                      placeholder="Cari kode TKT, klien, atau kata kunci…"
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ticket-list">
                  {filteredTickets.length ? (
                    filteredTickets.map((tk) => {
                      const sla = getTicketSlaInfo(tk, dateKey(today));
                      const linkedTask = state.tasks.find(
                        (t) => t.id === tk.linkedTaskId || t.ticketCode === tk.code
                      );
                      const linkedTest = tk.linkedTestCaseCode
                        ? state.testCases.find((tc) => tc.code === tk.linkedTestCaseCode)
                        : undefined;
                      const menuKey = `ticket-row-${tk.id}`;
                      return (
                        <div key={tk.id} className="ticket-row">
                          <span className="ticket-code">{tk.code}</span>
                          <div className="task-main">
                            <button
                              type="button"
                              className="task-title-btn"
                              onClick={() => openModal('ticket', tk)}
                            >
                              <b>{tk.title}</b>
                            </button>
                            <small>
                              Klien: <strong>{tk.clientName}</strong> · Proyek: {tk.project} ·{' '}
                              {tk.description}
                            </small>
                            <div className="trace-links">
                              <span className={`sla-badge sla-${sla.tone}`}>{sla.label}</span>
                              {linkedTask && (
                                <button
                                  type="button"
                                  className="trace-chip"
                                  onClick={() => openModal('task', linkedTask)}
                                >
                                  📋 Tugas: {linkedTask.title.slice(0, 26)}…
                                </button>
                              )}
                              {tk.linkedTestCaseCode && (
                                <button
                                  type="button"
                                  className="trace-chip"
                                  onClick={() => {
                                    if (linkedTest) {
                                      setSelectedScenarioId(linkedTest.scenarioId);
                                      openModal('testcase', linkedTest);
                                    } else {
                                      setView('qa');
                                    }
                                  }}
                                >
                                  🧪 Uji: {tk.linkedTestCaseCode}
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="assignee-chip">
                            <UserCheck size={13} />
                            {tk.assignee}
                          </span>
                          <span className="badge">{tk.category}</span>
                          <span className={`severity-pill severity-${tk.severity}`}>
                            {PRIORITY_ICON[tk.severity]} {tk.severity}
                          </span>
                          <div
                            className="status-dropdown-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`status-trigger-btn status-${tk.status.replace(/\s+/g, '-')}`}
                              onClick={() =>
                                setOpenStatusMenuId((prev) =>
                                  prev === menuKey ? null : menuKey
                                )
                              }
                            >
                              <span>{TICKET_STATUS_LABEL[tk.status]}</span>
                              <ChevronDown size={13} />
                            </button>
                            {openStatusMenuId === menuKey && (
                              <div className="status-popover">
                                {(
                                  [
                                    'Open',
                                    'Investigasi',
                                    'Diperbaiki',
                                    'Terverifikasi',
                                    'Ditutup'
                                  ] as const
                                ).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    className={tk.status === st ? 'active' : ''}
                                    onClick={() => {
                                      setTicketStatus(tk.id, st);
                                      setOpenStatusMenuId(null);
                                    }}
                                  >
                                    <span>{TICKET_STATUS_LABEL[st]}</span>
                                    {tk.status === st && <span>✓</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => convertTicketToTask(tk)}
                          >
                            {linkedTask ? 'Lihat Tugas →' : '+ Jadi Tugas'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="empty">Belum ada tiket komplain klien pada filter ini.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {/* ====================================================================
            VIEW 5: QA TEST SCENARIOS & TEST CASES (FULL CRUD)
           ==================================================================== */}
          {view === 'qa' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">MANAJEMEN KUALITAS PERANGKAT LUNAK</p>
                  <h1>Test Case &amp; Skenario QA</h1>
                  <p>
                    Pilih skenario pengujian di sebelah kiri untuk mengelola daftar Test Case,
                    langkah pengujian, serta keterkaitan tiket bug dan tugas tim.
                  </p>
                </div>
                <div className="heading-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => openModal('scenario')}
                  >
                    + Skenario QA
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => openModal('testcase')}
                  >
                    + Test Case Baru
                  </button>
                </div>
              </div>

              <div className="qa-layout">
                {/* Left Column: Test Scenarios */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">DAFTAR SKENARIO</p>
                      <h2>{state.scenarios.length} Skenario QA</h2>
                    </div>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => openModal('scenario')}
                    >
                      + Baru
                    </button>
                  </div>
                  <div className="scenario-list">
                    {state.scenarios.map((sc) => {
                      const scCases = state.testCases.filter((tc) => tc.scenarioId === sc.id);
                      const passCount = scCases.filter((tc) => tc.status === 'Pass').length;
                      return (
                        <div
                          key={sc.id}
                          className={`scenario-item ${activeScenario?.id === sc.id ? 'active' : ''}`}
                          onClick={() => setSelectedScenarioId(sc.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="scenario-item-top">
                            <span className="ticket-code">{sc.code}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                {passCount} dari {scCases.length} Lulus
                              </small>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openModal('scenario', sc);
                                }}
                                style={{ border: 0, background: 'transparent', color: 'var(--text-muted)' }}
                                title="Edit Skenario"
                              >
                                ⋯
                              </button>
                            </div>
                          </div>
                          <b>{sc.title}</b>
                          <small>
                            {sc.project} · {sc.moduleName}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Right Column: Test Cases for Active Scenario */}
                <article className="card">
                  {activeScenario ? (
                    <>
                      <div className="card-head">
                        <div>
                          <p className="eyebrow">
                            {activeScenario.project} · {activeScenario.moduleName}
                          </p>
                          <h2>
                            {activeScenario.code}: {activeScenario.title}
                          </h2>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => openModal('scenario', activeScenario)}
                          >
                            Ubah Skenario
                          </button>
                          <button
                            className="button primary small"
                            type="button"
                            onClick={() => openModal('testcase')}
                          >
                            + Tambah Test Case
                          </button>
                        </div>
                      </div>

                      <div className="testcase-list">
                        {activeScenarioCases.length ? (
                          activeScenarioCases.map((tc) => {
                            const linkedTicket = tc.linkedTicketCode
                              ? state.tickets.find((tk) => tk.code === tc.linkedTicketCode)
                              : undefined;
                            const linkedTask = tc.linkedTaskId
                              ? state.tasks.find((t) => t.id === tc.linkedTaskId)
                              : state.tasks.find((t) => t.testCaseCode === tc.code);
                            const menuKey = `qa-case-${tc.id}`;
                            return (
                              <div key={tc.id} className="testcase-card">
                                <div className="testcase-head">
                                  <div
                                    style={{ cursor: 'pointer', flex: 1 }}
                                    onClick={() => openModal('testcase', tc)}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 4,
                                        flexWrap: 'wrap'
                                      }}
                                    >
                                      <span className="ticket-code">{tc.code}</span>
                                      <b style={{ fontSize: 15 }}>{tc.title}</b>
                                      <span className={`priority ${tc.priority}`}>
                                        {PRIORITY_ICON[tc.priority]} {tc.priority}
                                      </span>
                                    </div>
                                    <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                      Prasyarat: {tc.precondition || '-'} · Penguji:{' '}
                                      <strong>{tc.tester}</strong>
                                    </small>
                                    {(tc.linkedTicketCode || linkedTask) && (
                                      <div
                                        className="trace-links"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {tc.linkedTicketCode && (
                                          <button
                                            type="button"
                                            className="trace-chip"
                                            onClick={() => {
                                              if (linkedTicket) openModal('ticket', linkedTicket);
                                              else setView('tickets');
                                            }}
                                          >
                                            🎫 Tiket: {tc.linkedTicketCode}
                                          </button>
                                        )}
                                        {linkedTask && (
                                          <button
                                            type="button"
                                            className="trace-chip"
                                            onClick={() => openModal('task', linkedTask)}
                                          >
                                            📋 Tugas: {linkedTask.title.slice(0, 28)}…
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: 8,
                                      alignItems: 'center',
                                      flexWrap: 'wrap'
                                    }}
                                  >
                                    {tc.status === 'Fail' && (
                                      <button
                                        type="button"
                                        className="button ghost small"
                                        style={{
                                          borderColor: 'rgba(185, 28, 28, 0.35)',
                                          color: 'var(--rose)'
                                        }}
                                        onClick={() => createTicketFromFailedTest(tc)}
                                      >
                                        {linkedTicket
                                          ? `Lihat ${linkedTicket.code} →`
                                          : '+ Buat Tiket Bug'}
                                      </button>
                                    )}

                                    <div
                                      className="status-dropdown-wrap"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className={`status-trigger-btn qa-${tc.status}`}
                                        onClick={() =>
                                          setOpenStatusMenuId((prev) =>
                                            prev === menuKey ? null : menuKey
                                          )
                                        }
                                      >
                                        <span>{QA_STATUS_LABEL[tc.status]}</span>
                                        <ChevronDown size={13} />
                                      </button>
                                      {openStatusMenuId === menuKey && (
                                        <div className="status-popover">
                                          {(['Pass', 'Fail', 'Blocked', 'Pending'] as const).map(
                                            (st) => (
                                              <button
                                                key={st}
                                                type="button"
                                                className={tc.status === st ? 'active' : ''}
                                                onClick={() => {
                                                  updateTestCaseStatus(tc.id, st);
                                                  setOpenStatusMenuId(null);
                                                }}
                                              >
                                                <span>{QA_STATUS_LABEL[st]}</span>
                                                {tc.status === st && <span>✓</span>}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      className="button ghost small"
                                      onClick={() => openModal('testcase', tc)}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                <div className="testcase-steps">
                                  <div>
                                    <b>LANGKAH PENGUJIAN</b>
                                    <p>{tc.steps || '-'}</p>
                                  </div>
                                  <div>
                                    <b>HASIL DIHARAPKAN vs AKTUAL</b>
                                    <p>
                                      <strong>Ekspektasi:</strong> {tc.expectedResult || '-'}
                                    </p>
                                    {tc.actualResult && (
                                      <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                                        <strong>Aktual:</strong> {tc.actualResult}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="empty">
                            Belum ada Test Case pada skenario ini. Klik &quot;+ Tambah Test Case&quot;
                            untuk mulai mendokumentasikan pengujian.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="empty">Pilih atau buat Skenario QA terlebih dahulu.</p>
                  )}
                </article>
              </div>
            </section>
          )}

          {/* ====================================================================
            VIEW 6: CALENDAR SPRINT & RELEASE
           ==================================================================== */}
          {view === 'calendar' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">JADWAL TIM &amp; RILIS</p>
                  <h1>Kalender Sprint &amp; Deployment</h1>
                  <p>Pantau jadwal rapat klien, sesi UAT, dan tenggat rilis proyek.</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setSelectedDate(new Date(today))}
                  >
                    Bulan ini
                  </button>
                  <button className="button primary" type="button" onClick={() => openModal('event')}>
                    + Jadwal baru
                  </button>
                </div>
              </div>

              <article className="card">
                <div className="card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setSelectedDate(
                          new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
                        )
                      }
                    >
                      ←
                    </button>
                    <h2>{fmtDate(selectedDate, { month: 'long', year: 'numeric' })}</h2>
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setSelectedDate(
                          new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
                        )
                      }
                    >
                      →
                    </button>
                  </div>
                  <span className="badge">Klik tanggal untuk detail</span>
                </div>

                <div className="calendar-grid">
                  {(prefs.startMonday !== false
                    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
                    : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
                  ).map((w) => (
                    <span key={w} className="calendar-dow">
                      {w}
                    </span>
                  ))}

                  {calendarGrid.map((d) => {
                    const k = dateKey(d);
                    const evs = state.events.filter((e) => e.date === k);
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`calendar-day ${d.getMonth() !== selectedDate.getMonth() ? 'other' : ''
                          } ${k === dateKey(today) ? 'current' : ''}`}
                        onClick={() => {
                          setSelectedDate(new Date(k + 'T00:00:00'));
                          setView('dashboard');
                        }}
                      >
                        <span className="calendar-day-num">{d.getDate()}</span>
                        {evs.slice(0, 2).map((e) => (
                          <div key={e.id} className="calendar-event">
                            {formatTimeDisplay(e.startTime)} {e.title}
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              </article>
            </section>
          )}

          {/* ====================================================================
            VIEW 7: INSIGHTS & QA / TEAM REPORTS
           ==================================================================== */}
          {view === 'insights' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">ANALITIK TIM &amp; KUALITAS</p>
                  <h1>Laporan &amp; SLA Tim</h1>
                  <p>Ringkasan performa penyelesaian tugas tim, tiket klien, dan metrik QA.</p>
                </div>
              </div>

              <article className="card insight">
                <div>
                  <span>PENYELESAIAN TUGAS</span>
                  <b>
                    {state.tasks.filter((t) => t.completed).length} dari {state.tasks.length}
                  </b>
                </div>
                <div>
                  <span>TIKET TERATASI</span>
                  <b>
                    {
                      state.tickets.filter(
                        (tk) =>
                          tk.status === 'Diperbaiki' ||
                          tk.status === 'Terverifikasi' ||
                          tk.status === 'Ditutup'
                      ).length
                    }{' '}
                    dari {state.tickets.length}
                  </b>
                </div>
                <div>
                  <span>KELULUSAN QA</span>
                  <b>
                    {state.testCases.filter((tc) => tc.status === 'Pass').length} dari{' '}
                    {state.testCases.length} ({qaPassRate}%)
                  </b>
                </div>
                <div>
                  <span>TEST CASE GAGAL</span>
                  <b>{state.testCases.filter((tc) => tc.status === 'Fail').length} kasus</b>
                </div>
              </article>

              <div className="insights-grid">
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">METRIK PENGUJIAN</p>
                      <h2>Status Eksekusi Test Case QA</h2>
                    </div>
                  </div>
                  <div className="breakdown-list">
                    {(['Pass', 'Fail', 'Blocked', 'Pending'] as const).map((st) => {
                      const count = state.testCases.filter((tc) => tc.status === st).length;
                      const pct = state.testCases.length
                        ? Math.round((count / state.testCases.length) * 100)
                        : 0;
                      return (
                        <div key={st} className="breakdown-item">
                          <div className="breakdown-head">
                            <b>{QA_STATUS_LABEL[st]}</b>
                            <span>
                              {count} dari {state.testCases.length} Test Case ({pct}%)
                            </span>
                          </div>
                          <div className="progress">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">PRODUKTIVITAS TIM</p>
                      <h2>Distribusi Beban Tugas per Anggota</h2>
                    </div>
                  </div>
                  <div className="breakdown-list">
                    {Array.from(new Set(state.tasks.map((t) => t.assignee))).map((person) => {
                      const personTasks = state.tasks.filter((t) => t.assignee === person);
                      const done = personTasks.filter((t) => t.completed).length;
                      const pct = personTasks.length
                        ? Math.round((done / personTasks.length) * 100)
                        : 0;
                      return (
                        <div key={person} className="breakdown-item">
                          <div className="breakdown-head">
                            <b>{person}</b>
                            <span>
                              {done} dari {personTasks.length} tugas selesai ({pct}%)
                            </span>
                          </div>
                          <div className="progress">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>
            </section>
          )}

          {/* ====================================================================
            VIEW 8: DEDICATED NOTIFICATION LIST PAGE
           ==================================================================== */}
          {view === 'notifications' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">AKTIVITAS &amp; PERINGATAN</p>
                  <h1>Pusat Notifikasi</h1>
                  <p>
                    Seluruh riwayat tiket komplain klien, peringatan SLA, pembaruan hasil uji QA, dan
                    pengingat tugas tim.
                  </p>
                </div>
                <button
                  className="button ghost"
                  type="button"
                  onClick={markAllNotificationsRead}
                >
                  ✓ Tandai semua sudah dibaca
                </button>
              </div>

              <article className="card">
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <div className="filters">
                    {(
                      [
                        ['all', 'Semua'],
                        ['unread', 'Belum Dibaca'],
                        ['sla', 'Peringatan SLA'],
                        ['ticket', 'Tiket Klien'],
                        ['qa', 'Hasil QA']
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={notifFilter === val ? 'active' : ''}
                        onClick={() => setNotifFilter(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  {state.notifications
                    .filter(
                      (n) =>
                        notifFilter === 'all' ||
                        (notifFilter === 'unread' && !n.read) ||
                        n.category === notifFilter
                    )
                    .map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? 'read' : 'unread'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          persistState({
                            ...state,
                            notifications: state.notifications.map((x) =>
                              x.id === n.id ? { ...x, read: true } : x
                            )
                          });
                          if (n.targetView) setView(n.targetView);
                        }}
                      >
                        <span className="notif-dot" />
                        <div style={{ flex: 1 }}>
                          <b>{n.title}</b>
                          <p>{n.description}</p>
                          <small>{n.time}</small>
                        </div>
                        {n.targetView && (
                          <span className="button ghost small">Buka →</span>
                        )}
                      </div>
                    ))}
                </div>
              </article>
            </section>
          )}

          {/* ====================================================================
            VIEW 9: USER PROFILE & CREDENTIALS PAGE
           ==================================================================== */}
          {view === 'profile' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">IDENTITAS &amp; KEAMANAN AKUN</p>
                  <h1>Profil &amp; Kredensial Saya</h1>
                  <p>Atur foto profil, nama, jabatan, kredensial kata sandi, serta koneksi OAuth.</p>
                </div>
              </div>

              <div className="settings-grid">
                <article className="card settings-card">
                  <div className="settings-card-head">
                    <h2>Foto Profil &amp; Identitas</h2>
                    <p>Informasi ini ditampilkan pada penugasan proyek, tiket, dan laporan QA.</p>
                  </div>
                  <form
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      pushToast('Profil Diperbarui', 'Perubahan identitas profil berhasil disimpan.');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                      <span className="avatar" style={{ width: 64, height: 64, fontSize: 20 }}>
                        {prefs.userPhotoUrl ? (
                          <img src={prefs.userPhotoUrl} alt={prefs.userName} />
                        ) : (
                          prefs.userAvatar
                        )}
                      </span>
                      <div style={{ flex: 1 }}>
                        <label className="field">
                          <span>URL Foto Profil (atau kosongkan untuk memakai inisial)</span>
                          <input
                            type="url"
                            placeholder="https://images.unsplash.com/..."
                            value={prefs.userPhotoUrl || ''}
                            onChange={(e) =>
                              setPrefs((p) => ({ ...p, userPhotoUrl: e.target.value }))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>Nama lengkap</span>
                        <input
                          type="text"
                          required
                          value={prefs.userName}
                          onChange={(e) => setPrefs((p) => ({ ...p, userName: e.target.value }))}
                        />
                      </label>
                      <label className="field">
                        <span>Jabatan / Role Tim</span>
                        <input
                          type="text"
                          value={prefs.userRole}
                          onChange={(e) => setPrefs((p) => ({ ...p, userRole: e.target.value }))}
                        />
                      </label>
                      <label className="field">
                        <span>Inisial Avatar</span>
                        <input
                          type="text"
                          maxLength={3}
                          value={prefs.userAvatar}
                          onChange={(e) =>
                            setPrefs((p) => ({ ...p, userAvatar: e.target.value.toUpperCase() }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Status Sesi</span>
                        <input
                          type="text"
                          disabled
                          value={
                            isAuthenticated ? 'Akun cloud terautentikasi' : 'Mode Demo (data lokal)'
                          }
                        />
                      </label>
                    </div>

                    <div className="settings-form-actions">
                      <button type="submit" className="button primary">
                        Simpan Identitas
                      </button>
                    </div>
                  </form>
                </article>

                <article className="card settings-card">
                  <div className="settings-card-head">
                    <h2>Kredensial Login</h2>
                    <p>
                      {isAuthenticated
                        ? `Masuk via: ${((authUser?.app_metadata?.providers as string[] | undefined) || [authUser?.app_metadata?.provider || 'email']).join(', ')}. Kosongkan kata sandi bila hanya mengganti email.`
                        : 'Masuk dengan akun cloud untuk mengelola email dan kata sandi.'}
                    </p>
                  </div>
                  {isAuthenticated ? (
                    <form
                      className="settings-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const fd = new FormData(form);
                        const ok = await handleUpdateCredentials(
                          String(fd.get('email') || '').trim(),
                          String(fd.get('password') || ''),
                          String(fd.get('confirm') || '')
                        );
                        if (ok) {
                          (form.elements.namedItem('password') as HTMLInputElement).value = '';
                          (form.elements.namedItem('confirm') as HTMLInputElement).value = '';
                        }
                      }}
                    >
                      <div className="form-grid">
                        <label className="field full">
                          <span>Email akun</span>
                          <input
                            name="email"
                            type="email"
                            required
                            maxLength={254}
                            autoComplete="email"
                            defaultValue={authUser?.email || ''}
                          />
                        </label>
                        <label className="field">
                          <span>Kata sandi baru</span>
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                          />
                        </label>
                        <label className="field">
                          <span>Konfirmasi kata sandi</span>
                          <input
                            name="confirm"
                            type="password"
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="Ulangi kata sandi baru"
                          />
                        </label>
                      </div>

                      <div className="settings-form-actions">
                        <button type="submit" className="button primary">
                          Perbarui Kredensial
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="settings-form-actions">
                      <button type="button" className="button primary" onClick={() => setScreenMode('login')}>
                        Masuk Akun
                      </button>
                    </div>
                  )}
                </article>
              </div>
            </section>
          )}

          {/* ====================================================================
            VIEW 10: WORKSPACE SETTINGS & SUPABASE HYBRID CONFIG
           ==================================================================== */}
          {view === 'settings' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">KONFIGURASI SISTEM</p>
                  <h1>Pengaturan Workspace</h1>
                  <p>Sesuaikan preferensi tampilan, warna aksen, serta sinkronisasi Supabase.</p>
                </div>
              </div>

              <div className="settings-grid">
                <article className="card settings-card">
                  <div className="settings-card-head">
                    <h2>1. Preferensi Tampilan</h2>
                    <p>Atur mode terang/gelap, kenyamanan mata, dan warna aksen.</p>
                  </div>
                  <div className="settings-rows">
                    <label className="setting-row">
                      <div className="setting-info">
                        <b>Tampilan gelap</b>
                        <small>Gunakan tema gelap emerald Ruang Waktu</small>
                      </div>
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={prefs.theme === 'dark'}
                          onChange={(e) =>
                            toggleThemeWithAnimation(
                              e.target.checked ? 'dark' : 'light',
                              e.currentTarget.parentElement
                            )
                          }
                        />
                        <span className="switch-slider" />
                      </span>
                    </label>

                    <div className="setting-row">
                      <div className="setting-info">
                        <b>Kenyamanan mata (Mode terang)</b>
                        <small>Kelembutan permukaan warna sage green agar nyaman dipandang</small>
                      </div>
                      <select
                        value={prefs.lightSoftness}
                        onChange={(e) =>
                          setPrefs((p) => ({
                            ...p,
                            lightSoftness: e.target.value as UserPrefs['lightSoftness']
                          }))
                        }
                      >
                        <option value="soft">Sage Lembut #E6EEE9 (Default)</option>
                        <option value="warm">Hangat Redup</option>
                        <option value="crisp">Standar Bersih</option>
                      </select>
                    </div>

                    <div className="setting-row">
                      <div className="setting-info">
                        <b>Warna aksen utama</b>
                        <small>Dipisahkan dari warna semantik Lulus (Pass) agar tidak rancu</small>
                      </div>
                      <div className="accent-picker">
                        {(['emerald', 'teal', 'forest', 'lime'] as const).map((acc) => (
                          <button
                            key={acc}
                            type="button"
                            className={`accent-swatch ${prefs.accent === acc ? 'active' : ''}`}
                            data-accent={acc}
                            onClick={() => setPrefs((p) => ({ ...p, accent: acc }))}
                            aria-label={acc}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="card settings-card">
                  <div className="settings-card-head">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap'
                      }}
                    >
                      <h2>2. Efek Suara &amp; Custom Icons</h2>
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <VolumeIcon size={13} color="var(--emerald)" />
                        Web Audio SFX
                      </span>
                    </div>
                    <p>Atur umpan balik audio klik interaksi di seluruh workspace dan tinjau desain katalog custom icons.</p>
                  </div>
                  <div className="settings-rows">
                    <label className="setting-row">
                      <div className="setting-info">
                        <b>Efek Suara Klik (SFX)</b>
                        <small>Umpan balik audio sintetis halus di seluruh tombol, tab, kartu, dan aksi aplikasi</small>
                      </div>
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={prefs.soundEffects}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setPrefs((p) => ({ ...p, soundEffects: val }));
                            if (val) sound.playClick();
                          }}
                        />
                        <span className="switch-slider" />
                      </span>
                    </label>

                    <div className="setting-row" style={{ alignItems: 'center' }}>
                      <div className="setting-info">
                        <b>Tinjau Katalog Custom Icons</b>
                        <small>Review desain {CUSTOM_ICONS_CATALOG.length} icon SVG custom Ruang Waktu beserta referensi platformnya</small>
                      </div>
                      <button
                        type="button"
                        className="button outline"
                        style={{ height: 34, fontSize: 13, gap: 6 }}
                        onClick={() => {
                          if (prefs.soundEffects) sound.playClick();
                          setIsIconShowcaseOpen(true);
                        }}
                      >
                        <Sparkles size={14} color="var(--emerald)" />
                        <span>Review Icon Custom ({CUSTOM_ICONS_CATALOG.length})</span>
                      </button>
                    </div>

                    <div className="setting-row" style={{ alignItems: 'center' }}>
                      <div className="setting-info">
                        <b>Cadangan Data Lokal (JSON)</b>
                        <small>Unduh seluruh data proyek, tiket, tugas, dan test case dalam format JSON</small>
                      </div>
                      <button
                        type="button"
                        className="button ghost"
                        style={{ height: 34, fontSize: 13 }}
                        onClick={() => {
                          const payload = JSON.stringify({ state, prefs }, null, 2);
                          const blob = new Blob([payload], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `ruang-waktu-backup-${dateKey(today)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          pushToast('Ekspor Berhasil', 'File JSON cadangan berhasil diunduh.');
                        }}
                      >
                        Ekspor JSON
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ======================================================================
           MODAL CRUD (TASK, TICKET, SCENARIO, TESTCASE, PROJECT, EVENT)
          ====================================================================== */}
      {modalOpen && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <section className="modal">
            <header>
              <div>
                <p className="eyebrow">{editingItem ? 'PERBARUI DATA' : 'TAMBAH DATA BARU'}</p>
                <h2>
                  {editingItem ? 'Ubah ' : 'Tambah '}
                  {modalKind === 'task'
                    ? 'Tugas Tim'
                    : modalKind === 'ticket'
                      ? 'Tiket Komplain Klien'
                      : modalKind === 'scenario'
                        ? 'Skenario QA'
                        : modalKind === 'testcase'
                          ? 'Test Case QA'
                          : modalKind === 'project'
                            ? 'Proyek'
                            : 'Jadwal'}
                </h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup dialog">
                ×
              </button>
            </header>

            <div className="modal-tabs">
              {(
                [
                  ['task', 'Tugas'],
                  ['ticket', 'Tiket'],
                  ['scenario', 'Skenario QA'],
                  ['testcase', 'Test Case'],
                  ['project', 'Proyek'],
                  ['event', 'Jadwal']
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className={modalKind === type ? 'active' : ''}
                  onClick={() => {
                    setModalKind(type);
                    setEditingItem(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="form-grid">
                {modalKind === 'task' && (
                  <>
                    <label className="field full">
                      <span>Judul tugas *</span>
                      <input
                        name="title"
                        required
                        defaultValue={(editingItem as TaskItem | null)?.title || ''}
                        placeholder="Contoh: Perbaiki validasi API pembayaran"
                      />
                    </label>
                    <label className="field">
                      <span>Proyek terkait</span>
                      <select
                        name="project"
                        defaultValue={
                          (editingItem as TaskItem | null)?.project ||
                          state.projects[0]?.name ||
                          'Umum'
                        }
                      >
                        {state.projects.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Status pengerjaan</span>
                      <select
                        name="status"
                        defaultValue={(editingItem as TaskItem | null)?.status || 'Todo'}
                      >
                        {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map((st) => (
                          <option key={st} value={st}>
                            {TASK_STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Nama anggota (Assignee) *</span>
                      <input
                        name="assignee"
                        required
                        defaultValue={(editingItem as TaskItem | null)?.assignee || prefs.userName}
                        placeholder="Nama anggota tim"
                      />
                    </label>
                    <label className="field">
                      <span>Jabatan / Role</span>
                      <input
                        name="assigneeRole"
                        defaultValue={(editingItem as TaskItem | null)?.assigneeRole || 'Engineer'}
                        placeholder="Backend / Frontend / QA"
                      />
                    </label>
                    <label className="field">
                      <span>Prioritas</span>
                      <select
                        name="priority"
                        defaultValue={(editingItem as TaskItem | null)?.priority || 'Sedang'}
                      >
                        {(['Kritis', 'Tinggi', 'Sedang', 'Rendah'] as const).map((pr) => (
                          <option key={pr} value={pr}>
                            {PRIORITY_ICON[pr]} {pr}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Tenggat waktu</span>
                      <input
                        name="dueDate"
                        type="date"
                        defaultValue={
                          (editingItem as TaskItem | null)?.dueDate || dateKey(selectedDate)
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Tiket Asal</span>
                      <select
                        name="ticketCode"
                        defaultValue={(editingItem as TaskItem | null)?.ticketCode || ''}
                      >
                        <option value="">— Tanpa Tiket —</option>
                        {state.tickets.map((tk) => (
                          <option key={tk.id} value={tk.code}>
                            {tk.code}: {tk.title.length > 24 ? tk.title.slice(0, 24) + '…' : tk.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Test Case QA</span>
                      <select
                        name="testCaseCode"
                        defaultValue={(editingItem as TaskItem | null)?.testCaseCode || ''}
                      >
                        <option value="">— Tanpa Test Case —</option>
                        {state.testCases.map((tc) => (
                          <option key={tc.id} value={tc.code}>
                            {tc.code}: {tc.title.length > 24 ? tc.title.slice(0, 24) + '…' : tc.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Catatan teknis</span>
                      <textarea
                        name="notes"
                        defaultValue={(editingItem as TaskItem | null)?.notes || ''}
                        placeholder="Detail spesifikasi atau referensi tiket…"
                      />
                    </label>
                  </>
                )}

                {modalKind === 'ticket' && (
                  <>
                    <label className="field">
                      <span>Kode tiket</span>
                      <input
                        name="code"
                        defaultValue={
                          (editingItem as ClientTicket | null)?.code ||
                          `TKT-${nextCodeNumber(state.tickets.map((x) => x.code), 101)}`
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Nama klien / perusahaan *</span>
                      <input
                        name="clientName"
                        required
                        defaultValue={(editingItem as ClientTicket | null)?.clientName || ''}
                        placeholder="Contoh: PT Nusantara Logistik"
                      />
                    </label>
                    <label className="field full">
                      <span>Judul komplain / kendala klien *</span>
                      <input
                        name="title"
                        required
                        defaultValue={(editingItem as ClientTicket | null)?.title || ''}
                        placeholder="Contoh: Gagal unduh laporan pada akhir bulan"
                      />
                    </label>
                    <label className="field">
                      <span>Proyek terkait</span>
                      <select
                        name="project"
                        defaultValue={
                          (editingItem as ClientTicket | null)?.project ||
                          state.projects[0]?.name ||
                          'Umum'
                        }
                      >
                        {state.projects.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Kategori laporan</span>
                      <select
                        name="category"
                        defaultValue={(editingItem as ClientTicket | null)?.category || 'Komplain'}
                      >
                        {['Komplain', 'Bug', 'Revisi', 'Permintaan Fitur'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Tingkat keparahan (Severity)</span>
                      <select
                        name="severity"
                        defaultValue={(editingItem as ClientTicket | null)?.severity || 'Tinggi'}
                      >
                        {(['Kritis', 'Tinggi', 'Sedang', 'Rendah'] as const).map((s) => (
                          <option key={s} value={s}>
                            {PRIORITY_ICON[s]} {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Status tiket (5 Tahap)</span>
                      <select
                        name="status"
                        defaultValue={(editingItem as ClientTicket | null)?.status || 'Open'}
                      >
                        {(
                          [
                            'Open',
                            'Investigasi',
                            'Diperbaiki',
                            'Terverifikasi',
                            'Ditutup'
                          ] as const
                        ).map((st) => (
                          <option key={st} value={st}>
                            {TICKET_STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>PIC Penanggung Jawab</span>
                      <input
                        name="assignee"
                        defaultValue={
                          (editingItem as ClientTicket | null)?.assignee || prefs.userName
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Test Case QA</span>
                      <select
                        name="linkedTestCaseCode"
                        defaultValue={
                          (editingItem as ClientTicket | null)?.linkedTestCaseCode || ''
                        }
                      >
                        <option value="">— Tanpa Test Case —</option>
                        {state.testCases.map((tc) => (
                          <option key={tc.id} value={tc.code}>
                            {tc.code}: {tc.title.length > 24 ? tc.title.slice(0, 24) + '…' : tc.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Kronologi / Detail komplain</span>
                      <textarea
                        name="description"
                        defaultValue={(editingItem as ClientTicket | null)?.description || ''}
                        placeholder="Jelaskan detail keluhan klien dan langkah reproduksi masalah…"
                      />
                    </label>
                  </>
                )}

                {modalKind === 'scenario' && (
                  <>
                    <label className="field">
                      <span>Kode Skenario</span>
                      <input
                        name="code"
                        defaultValue={
                          (editingItem as TestScenario | null)?.code ||
                          `TS-${String(nextCodeNumber(state.scenarios.map((x) => x.code), 1)).padStart(2, '0')}`
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Proyek</span>
                      <select
                        name="project"
                        defaultValue={
                          (editingItem as TestScenario | null)?.project ||
                          state.projects[0]?.name ||
                          'Umum'
                        }
                      >
                        {state.projects.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Judul Skenario QA *</span>
                      <input
                        name="title"
                        required
                        defaultValue={(editingItem as TestScenario | null)?.title || ''}
                        placeholder="Contoh: Alur Checkout & Pembayaran Virtual Account"
                      />
                    </label>
                    <label className="field full">
                      <span>Nama Modul / Fitur</span>
                      <input
                        name="moduleName"
                        defaultValue={(editingItem as TestScenario | null)?.moduleName || ''}
                        placeholder="Contoh: Modul Pembayaran"
                      />
                    </label>
                    <label className="field full">
                      <span>Deskripsi cakupan uji</span>
                      <textarea
                        name="description"
                        defaultValue={(editingItem as TestScenario | null)?.description || ''}
                        placeholder="Tujuan pengujian pada skenario ini…"
                      />
                    </label>
                  </>
                )}

                {modalKind === 'testcase' && (
                  <>
                    <label className="field">
                      <span>Kode Test Case</span>
                      <input
                        name="code"
                        defaultValue={
                          (editingItem as TestCase | null)?.code ||
                          `TC-${String(nextCodeNumber(state.testCases.map((x) => x.code), 1)).padStart(3, '0')}`
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Skenario QA Terkait</span>
                      <select
                        name="scenarioId"
                        defaultValue={
                          (editingItem as TestCase | null)?.scenarioId || selectedScenarioId
                        }
                      >
                        {state.scenarios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code}: {s.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Judul Test Case *</span>
                      <input
                        name="title"
                        required
                        defaultValue={(editingItem as TestCase | null)?.title || ''}
                        placeholder="Contoh: Verifikasi penolakan transaksi jika saldo kurang"
                      />
                    </label>
                    <label className="field full">
                      <span>Prasyarat (Pre-condition)</span>
                      <input
                        name="precondition"
                        defaultValue={(editingItem as TestCase | null)?.precondition || ''}
                        placeholder="Contoh: Pengguna sudah login dan memiliki saldo Rp 10.000"
                      />
                    </label>
                    <label className="field full">
                      <span>Langkah Pengujian *</span>
                      <textarea
                        name="steps"
                        required
                        defaultValue={(editingItem as TestCase | null)?.steps || ''}
                        placeholder="1. Buka menu transfer&#10;2. Masukkan nominal Rp 50.000&#10;3. Klik Kirim"
                      />
                    </label>
                    <label className="field full">
                      <span>Hasil yang Diharapkan (Ekspektasi) *</span>
                      <input
                        name="expectedResult"
                        required
                        defaultValue={(editingItem as TestCase | null)?.expectedResult || ''}
                        placeholder="Sistem menolak transaksi dan menampilkan pesan Saldo Tidak Cukup"
                      />
                    </label>
                    <label className="field full">
                      <span>Hasil Aktual</span>
                      <input
                        name="actualResult"
                        defaultValue={(editingItem as TestCase | null)?.actualResult || ''}
                        placeholder="Isi setelah pengujian dijalankan…"
                      />
                    </label>
                    <label className="field">
                      <span>Status Hasil Uji</span>
                      <select
                        name="status"
                        defaultValue={(editingItem as TestCase | null)?.status || 'Pending'}
                      >
                        {(['Pass', 'Fail', 'Blocked', 'Pending'] as const).map((st) => (
                          <option key={st} value={st}>
                            {QA_STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Prioritas</span>
                      <select
                        name="priority"
                        defaultValue={(editingItem as TestCase | null)?.priority || 'Tinggi'}
                      >
                        {(['Kritis', 'Tinggi', 'Sedang', 'Rendah'] as const).map((pr) => (
                          <option key={pr} value={pr}>
                            {PRIORITY_ICON[pr]} {pr}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Nama Penguji (QA Tester)</span>
                      <input
                        name="tester"
                        defaultValue={(editingItem as TestCase | null)?.tester || prefs.userName}
                      />
                    </label>
                    <label className="field">
                      <span>Tiket Bug Terkait (Opsional)</span>
                      <select
                        name="linkedTicketCode"
                        defaultValue={(editingItem as TestCase | null)?.linkedTicketCode || ''}
                      >
                        <option value="">— Tanpa Tiket —</option>
                        {state.tickets.map((tk) => (
                          <option key={tk.id} value={tk.code}>
                            {tk.code}: {tk.title.slice(0, 32)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {modalKind === 'project' && (
                  <>
                    <label className="field full">
                      <span>Nama proyek *</span>
                      <input
                        name="name"
                        required
                        defaultValue={(editingItem as ProjectItem | null)?.name || ''}
                      />
                    </label>
                    <label className="field">
                      <span>Nama Klien / Perusahaan</span>
                      <input
                        name="clientName"
                        defaultValue={(editingItem as ProjectItem | null)?.clientName || ''}
                      />
                    </label>
                    <label className="field">
                      <span>Project Lead</span>
                      <input
                        name="lead"
                        defaultValue={(editingItem as ProjectItem | null)?.lead || prefs.userName}
                      />
                    </label>
                    <label className="field">
                      <span>Status proyek</span>
                      <select
                        name="status"
                        defaultValue={(editingItem as ProjectItem | null)?.status || 'Berjalan'}
                      >
                        {['Berjalan', 'Review QA', 'Selesai'].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Target Selesai</span>
                      <input
                        name="deadline"
                        type="date"
                        defaultValue={
                          (editingItem as ProjectItem | null)?.deadline || dateKey(selectedDate)
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Ruang lingkup proyek</span>
                      <textarea
                        name="notes"
                        defaultValue={(editingItem as ProjectItem | null)?.notes || ''}
                      />
                    </label>
                  </>
                )}

                {modalKind === 'event' && (
                  <>
                    <label className="field full">
                      <span>Nama agenda / rapat *</span>
                      <input
                        name="title"
                        required
                        defaultValue={(editingItem as ScheduleEvent | null)?.title || ''}
                      />
                    </label>
                    <label className="field">
                      <span>Tanggal *</span>
                      <input
                        name="date"
                        type="date"
                        required
                        defaultValue={
                          (editingItem as ScheduleEvent | null)?.date || dateKey(selectedDate)
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Kategori</span>
                      <select
                        name="category"
                        defaultValue={(editingItem as ScheduleEvent | null)?.category || 'Sprint'}
                      >
                        {['Sprint', 'Klien', 'QA Testing', 'Rilis', 'Rapat'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Waktu mulai</span>
                      <input
                        name="startTime"
                        type="time"
                        defaultValue={(editingItem as ScheduleEvent | null)?.startTime || '09:00'}
                      />
                    </label>
                    <label className="field">
                      <span>Waktu selesai</span>
                      <input
                        name="endTime"
                        type="time"
                        defaultValue={(editingItem as ScheduleEvent | null)?.endTime || '10:00'}
                      />
                    </label>
                    <label className="field full">
                      <span>Catatan</span>
                      <textarea
                        name="notes"
                        defaultValue={(editingItem as ScheduleEvent | null)?.notes || ''}
                      />
                    </label>
                  </>
                )}
              </div>

              <footer className="modal-footer">
                {editingItem ? (
                  <button
                    type="button"
                    className="button danger-ghost"
                    onClick={handleDeleteFromModal}
                  >
                    <Trash2 size={15} />
                    Hapus
                  </button>
                ) : (
                  <span />
                )}
                <div className="modal-footer-right">
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="button primary">
                    Simpan
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* ======================================================================
          CUSTOM CONFIRMATION MODAL (REPLACES NATIVE BROWSER CONFIRM)
         ====================================================================== */}
      {confirmDialog && (
        <div
          className="overlay"
          role="alertdialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div className="confirm-modal">
            <div className="confirm-icon" data-tone={confirmDialog.tone || 'danger'}>
              {confirmDialog.tone === 'primary' ? <Cloud size={22} /> : <AlertTriangle size={22} />}
            </div>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setConfirmDialog(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className={confirmDialog.tone === 'primary' ? 'button primary' : 'button danger-solid'}
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
              >
                {confirmDialog.confirmLabel || 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          CUSTOM ICON SHOWCASE MODAL (DESIGN SYSTEM & USER REVIEW)
         ====================================================================== */}
      {isIconShowcaseOpen && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsIconShowcaseOpen(false);
          }}
        >
          <div
            className="modal"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Katalog Custom Icons Ruang Waktu"
          >
            <header>
              <div>
                <p className="eyebrow">DESIGN SYSTEM &amp; REVIEW</p>
                <h2>Katalog Custom Icons</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (prefs.soundEffects) sound.playClick();
                  setIsIconShowcaseOpen(false);
                }}
                aria-label="Tutup dialog"
              >
                <X size={16} />
              </button>
            </header>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
              Seluruh icon di bawah dirancang secara custom khusus untuk Ruang Waktu dengan referensi estetika platform modern (Linear, Raycast, Vercel, Supabase, Cron) dengan grid presisi 24x24 dan stroke-width 1.8.
            </p>

            <div className="icon-showcase-grid">
              {CUSTOM_ICONS_CATALOG.map((item) => {
                const IconComponent = item.component;
                return (
                  <div key={item.name} className="icon-showcase-card">
                    <div className="icon-showcase-preview">
                      <IconComponent size={24} />
                    </div>
                    <span className="icon-showcase-name">{item.label}</span>
                    <span className="icon-showcase-ref">{item.reference}</span>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <span className="badge">Total {CUSTOM_ICONS_CATALOG.length} Custom Icons Aktif</span>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  if (prefs.soundEffects) sound.playClick();
                  setIsIconShowcaseOpen(false);
                }}
              >
                Selesai Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE (CTRL+K) */}
      {cmdOpen && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCmdOpen(false);
          }}
        >
          <div className="command-box">
            <div className="command-input-wrap">
              <Search size={18} />
              <input
                type="text"
                autoFocus
                placeholder="Cari tugas karyawan, kode tiket TKT, test case QA, atau aksi…"
                value={cmdQuery}
                onChange={(e) => {
                  setCmdQuery(e.target.value);
                  setCmdIndex(0);
                }}
                onKeyDown={(e) => {
                  if (!commandItems.length) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCmdIndex((i) => (i + 1) % commandItems.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCmdIndex((i) => (i - 1 + commandItems.length) % commandItems.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setCmdOpen(false);
                    commandItems[cmdIndex]?.run();
                  }
                }}
              />
              <kbd>Esc</kbd>
            </div>
            <section className="command-results">
              {commandItems.length ? (
                commandItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={idx === cmdIndex ? 'active' : ''}
                    onClick={() => {
                      setCmdOpen(false);
                      item.run();
                    }}
                  >
                    <span>{item.label}</span>
                    <small>{item.meta}</small>
                  </button>
                ))
              ) : (
                <p className="empty">Tidak ditemukan hasil yang cocok.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* STACKED SONNER-STYLE TOASTS */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-card">
            <CheckCircle2 size={18} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
            <div>
              <b>{t.title}</b>
              {t.subtitle && <small>{t.subtitle}</small>}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Tutup"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
