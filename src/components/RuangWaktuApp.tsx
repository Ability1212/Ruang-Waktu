'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
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
import {
  getSupabaseClient,
  getSupabaseConfig,
  pullStateFromSupabase,
  pushStateToSupabase
} from '@/lib/supabase';

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const moveDate = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const makeId = () => Math.random().toString(36).slice(2, 9);

const fmtDate = (
  d: Date,
  o: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
) => new Intl.DateTimeFormat('id-ID', o).format(d);

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
  userName: 'Abil Mahendra',
  userRole: 'Product & QA Lead',
  userEmail: 'abil@ruangwaktu.id',
  userAvatar: 'AM',
  userPhotoUrl: '',
  workspace: 'Tim Engineering & QA',
  plan: 'Pro',
  supabaseUrl: '',
  supabaseAnonKey: ''
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
        clientName: 'PT Nusantara Logistik',
        lead: 'Abil Mahendra',
        deadline: rel(14),
        status: 'Berjalan',
        notes: 'Pengembangan modul pengiriman, pelacakan armada, dan integrasi invoice'
      },
      {
        id: 'p2',
        name: 'Portal Banking BPR',
        clientName: 'BPR Sejahtera Mandiri',
        lead: 'Raka Pratama',
        deadline: rel(7),
        status: 'Review QA',
        notes: 'Pengujian regresi skenario otorisasi transaksi & mutasi rekening'
      },
      {
        id: 'p3',
        name: 'Aplikasi Klinik Medika',
        clientName: 'RS Medika Utama',
        lead: 'Nadia Putri',
        deadline: rel(21),
        status: 'Berjalan',
        notes: 'Antrean pasien online dan rekam medis elektronik'
      }
    ],
    tasks: [
      {
        id: 't1',
        title: 'Perbaiki validasi nominal transfer di atas Rp 100 juta',
        dueDate: rel(0),
        priority: 'Kritis',
        project: 'Portal Banking BPR',
        assignee: 'Raka Pratama',
        assigneeRole: 'Backend Engineer',
        status: 'In Progress',
        completed: false,
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
        notes: 'Mencakup uji barcode thermal printer 80mm'
      },
      {
        id: 't3',
        title: 'Optimasi query laporan bulanan gudang',
        dueDate: rel(1),
        priority: 'Sedang',
        project: 'ERP Logistik Nusantara',
        assignee: 'Bima Sakti',
        assigneeRole: 'Fullstack Developer',
        status: 'Todo',
        completed: false,
        notes: 'Target waktu respon API di bawah 300ms'
      },
      {
        id: 't4',
        title: 'Desain ulang halaman pendaftaran pasien baru',
        dueDate: rel(-1),
        priority: 'Rendah',
        project: 'Aplikasi Klinik Medika',
        assignee: 'Nadia Putri',
        assigneeRole: 'UI/UX Designer',
        status: 'Done',
        completed: true,
        notes: 'Sudah disetujui oleh pihak manajemen klinik'
      }
    ],
    tickets: [
      {
        id: 'tk1',
        code: 'TKT-101',
        title: 'Gagal экspor PDF mutasi rekening pada browser Safari',
        clientName: 'BPR Sejahtera Mandiri',
        project: 'Portal Banking BPR',
        category: 'Bug',
        severity: 'Kritis',
        status: 'Investigasi',
        assignee: 'Raka Pratama',
        createdAt: rel(0),
        description:
          'Klien melaporkan tombol Unduh PDF tidak merespon ketika rentang tanggal lebih dari 30 hari.'
      },
      {
        id: 'tk2',
        code: 'TKT-102',
        title: 'Selisih pembulatan pajak PPN 11% pada faktur gabungan',
        clientName: 'PT Nusantara Logistik',
        project: 'ERP Logistik Nusantara',
        category: 'Komplain',
        severity: 'Tinggi',
        status: 'Open',
        assignee: 'Bima Sakti',
        createdAt: rel(0),
        description:
          'Tim finance klien meminta pembulatan desimal mengikuti standar e-Faktur.'
      },
      {
        id: 'tk3',
        code: 'TKT-103',
        title: 'Penambahan kolom filter dokter spesialis di jadwal poli',
        clientName: 'RS Medika Utama',
        project: 'Aplikasi Klinik Medika',
        category: 'Permintaan Fitur',
        severity: 'Sedang',
        status: 'Diperbaiki',
        assignee: 'Nadia Putri',
        createdAt: rel(-2),
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
        priority: 'Tinggi'
      },
      {
        id: 'tc2',
        scenarioId: 'ts1',
        code: 'TC-002',
        title: 'Blokir otomatis setelah 3x salah memasukkan kode OTP',
        precondition: 'Pengguna berada di layar verifikasi OTP.',
        steps: '1. Masukkan kode OTP salah sebanyak 3 kali berturut-turut\n2. Perhatikan pesan status akun',
        expectedResult: 'Sesi diblokir sementara selama 15 menit & kirim email peringatan.',
        actualResult: 'Pesan blokir muncul, namun email peringatan terlambat 4 menit.',
        status: 'Fail',
        tester: 'Sinta Dewi',
        priority: 'Kritis'
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
        priority: 'Tinggi'
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
        title: 'Hasil QA Gagal (Fail): TC-002 pada Skenario TS-01',
        description: 'Sinta Dewi menandai TC-002 sebagai Fail (email peringatan OTP terlambat).',
        time: '45 menit lalu',
        category: 'qa',
        read: false,
        targetView: 'qa'
      },
      {
        id: 'n3',
        title: 'Tugas Jatuh Tempo Hari Ini',
        description: '2 tugas karyawan memiliki tenggat waktu pada hari ini.',
        time: '2 jam lalu',
        category: 'task',
        read: false,
        targetView: 'tasks'
      },
      {
        id: 'n4',
        title: 'Sinkronisasi Ruang Kerja Siap',
        description: 'Skema database proyek, tiket klien, dan QA test case telah aktif.',
        time: 'Hari ini',
        category: 'system',
        read: true,
        targetView: 'settings'
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
  onConfirm: () => void;
}

export default function RuangWaktuApp() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [mounted, setMounted] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('workspace');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today));
  const [view, setView] = useState<ViewName>('dashboard');

  // Filters & Studio Modes
  const [globalProjectFilter, setGlobalProjectFilter] = useState<string>('all');
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'table'>('kanban');
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  const [taskSearch, setTaskSearch] = useState<string>('');

  const [ticketFilter, setTicketFilter] = useState<'all' | TicketStatus>('all');
  const [ticketSearch, setTicketSearch] = useState<string>('');

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('ts1');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'ticket' | 'qa'>('all');

  // Landing Page interactive state
  const [heroPreviewTab, setHeroPreviewTab] = useState<'kanban' | 'tickets' | 'qa'>('kanban');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [state, setState] = useState<AppState>(() => createDefaultState(today));
  const [quickNote, setQuickNote] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('Tersimpan');

  // Navigation & Popovers
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = (title: string, subtitle?: string) => {
    const newId = makeId();
    setToasts((prev) => [...prev.slice(-2), { id: newId, title, subtitle }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 3200);
  };

  const askConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Ya, Hapus') => {
    setConfirmDialog({ title, message, confirmLabel, onConfirm });
  };

  // Outside Click Listener for User Menu, Notification Popover & Workspace Switcher
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
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load state from localStorage & Supabase
  useEffect(() => {
    setMounted(true);
    setLiveTime(new Date().toTimeString().slice(0, 5));

    try {
      const savedPrefs = JSON.parse(localStorage.getItem('ruangWaktuPrefs_v3') || '{}');
      const mergedPrefs: UserPrefs = { ...defaultPrefs, ...savedPrefs };
      setPrefs(mergedPrefs);

      const savedState = JSON.parse(localStorage.getItem('ruangWaktuState_v3') || 'null');
      const base = createDefaultState(today);
      if (savedState && Array.isArray(savedState.tasks)) {
        const merged: AppState = {
          events: savedState.events || base.events,
          tasks: savedState.tasks || base.tasks,
          projects: savedState.projects || base.projects,
          tickets: savedState.tickets || base.tickets,
          scenarios: savedState.scenarios || base.scenarios,
          testCases: savedState.testCases || base.testCases,
          notifications: savedState.notifications || base.notifications
        };
        setState(merged);
        if (merged.scenarios[0]?.id) {
          setSelectedScenarioId(merged.scenarios[0].id);
        }
      }

      setQuickNote(localStorage.getItem('ruangWaktuNote') || '');
      setSidebarCollapsed(localStorage.getItem('ruangWaktuSidebar') === 'collapsed');

      const client = getSupabaseClient(mergedPrefs);
      if (client) {
        setCloudStatus('syncing');
        pullStateFromSupabase(client, base.notifications)
          .then((remote) => {
            if (remote && (remote.projects.length || remote.tasks.length || remote.tickets.length)) {
              setState(remote);
              localStorage.setItem('ruangWaktuState_v3', JSON.stringify(remote));
            }
            setCloudStatus('connected');
          })
          .catch(() => setCloudStatus('error'));
      }
    } catch {
      // use defaults
    }
  }, [today]);

  // Sync visual attributes to <body>
  useEffect(() => {
    if (!mounted) return;
    document.body.dataset.theme = prefs.theme;
    document.body.dataset.softness = prefs.lightSoftness || 'soft';
    document.body.dataset.accent = prefs.accent || 'emerald';
    document.body.dataset.calendarDensity = prefs.calendarDensity || 'standard';
    localStorage.setItem('ruangWaktuPrefs_v3', JSON.stringify(prefs));
  }, [prefs, mounted]);

  // Persist state
  const persistState = (nextState: AppState) => {
    setState(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ruangWaktuState_v3', JSON.stringify(nextState));
    }
    const client = getSupabaseClient(prefs);
    if (client) {
      setCloudStatus('syncing');
      pushStateToSupabase(client, nextState)
        .then(() => setCloudStatus('connected'))
        .catch(() => setCloudStatus('error'));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setLiveTime(new Date().toTimeString().slice(0, 5));
    }, 20000);

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdQuery('');
        setCmdIndex(0);
        setCmdOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setCmdOpen(false);
        setModalOpen(false);
        setConfirmDialog(null);
        setAccountMenuOpen(false);
        setNotifPopoverOpen(false);
        setWorkspaceMenuOpen(false);
        setMobileSidebarOpen(false);
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
        .catch(() => {});
    } else {
      setPrefs((p) => ({ ...p, theme: targetTheme }));
    }

    pushToast(
      targetTheme === 'dark' ? 'Tema Gelap Aktif' : 'Tema Terang (Teduh) Aktif',
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
      return { done: 0, total: 0, pct: 0, detail: 'Belum ada tugas karyawan' };
    }
    const done = linked.filter((t) => t.completed || t.status === 'Done').length;
    const pct = Math.round((done / linked.length) * 100);
    return {
      done,
      total: linked.length,
      pct,
      detail: `${done} dari ${linked.length} tugas selesai`
    };
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
    pushToast(`Status Tugas: ${nextStatus}`, target?.title);
  };

  const deleteTask = (taskId: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;
    askConfirm(
      'Hapus Tugas Karyawan?',
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
    pushToast(`Status ${target?.code}: ${newStatus}`, target?.title);
  };

  const convertTicketToTask = (tk: ClientTicket) => {
    const newTask: TaskItem = {
      id: makeId(),
      title: `[${tk.code}] ${tk.title}`,
      dueDate: dateKey(today),
      priority: tk.severity,
      project: tk.project,
      assignee: tk.assignee || prefs.userName,
      assigneeRole: 'Engineer',
      status: 'Todo',
      completed: false,
      notes: `indak lanjut komplain klien ${tk.clientName}: ${tk.description || ''}`
    };
    persistState({ ...state, tasks: [newTask, ...state.tasks] });
    pushToast('Tugas Karyawan Dibuat dari Tiket', `${newTask.title} ditambahkan ke daftar tugas.`);
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
        title: data.title,
        date: data.date,
        category: data.category || 'Sprint',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        notes: data.notes || ''
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
        title: data.title,
        dueDate: data.dueDate || dateKey(selectedDate),
        priority: (data.priority as PriorityLevel) || 'Sedang',
        project: data.project || state.projects[0]?.name || 'Umum',
        assignee: data.assignee || prefs.userName,
        assigneeRole: data.assigneeRole || 'Engineer',
        status: statusVal,
        notes: data.notes || '',
        completed: statusVal === 'Done'
      };
      const nextTasks = existing
        ? state.tasks.map((tk) => (tk.id === existing.id ? item : tk))
        : [item, ...state.tasks];
      persistState({ ...state, tasks: nextTasks });
    } else if (modalKind === 'project') {
      const existing = editingItem as ProjectItem | null;
      const item: ProjectItem = {
        id: existing?.id || makeId(),
        name: data.name,
        clientName: data.clientName || '',
        lead: data.lead || prefs.userName,
        deadline: data.deadline || dateKey(moveDate(today, 14)),
        status: (data.status as ProjectStatus) || 'Berjalan',
        notes: data.notes || ''
      };
      const nextProjects = existing
        ? state.projects.map((p) => (p.id === existing.id ? item : p))
        : [...state.projects, item];
      persistState({ ...state, projects: nextProjects });
    } else if (modalKind === 'ticket') {
      const existing = editingItem as ClientTicket | null;
      const nextNum = state.tickets.length + 101;
      const item: ClientTicket = {
        id: existing?.id || makeId(),
        code: data.code || existing?.code || `TKT-${nextNum}`,
        title: data.title,
        clientName: data.clientName || 'Klien',
        project: data.project || state.projects[0]?.name || 'Umum',
        category: (data.category as TicketCategory) || 'Komplain',
        severity: (data.severity as PriorityLevel) || 'Tinggi',
        status: (data.status as TicketStatus) || 'Open',
        assignee: data.assignee || prefs.userName,
        createdAt: existing?.createdAt || dateKey(today),
        description: data.description || ''
      };
      const nextTickets = existing
        ? state.tickets.map((t) => (t.id === existing.id ? item : t))
        : [item, ...state.tickets];
      persistState({ ...state, tickets: nextTickets });
    } else if (modalKind === 'scenario') {
      const existing = editingItem as TestScenario | null;
      const nextNum = String(state.scenarios.length + 1).padStart(2, '0');
      const newId = existing?.id || makeId();
      const item: TestScenario = {
        id: newId,
        code: data.code || existing?.code || `TS-${nextNum}`,
        title: data.title,
        project: data.project || state.projects[0]?.name || 'Umum',
        moduleName: data.moduleName || 'Modul Utama',
        description: data.description || ''
      };
      const nextScenarios = existing
        ? state.scenarios.map((s) => (s.id === existing.id ? item : s))
        : [...state.scenarios, item];
      persistState({ ...state, scenarios: nextScenarios });
      setSelectedScenarioId(newId);
    } else if (modalKind === 'testcase') {
      const existing = editingItem as TestCase | null;
      const nextNum = String(state.testCases.length + 1).padStart(3, '0');
      const item: TestCase = {
        id: existing?.id || makeId(),
        scenarioId: data.scenarioId || selectedScenarioId || state.scenarios[0]?.id || 'ts1',
        code: data.code || existing?.code || `TC-${nextNum}`,
        title: data.title,
        precondition: data.precondition || '',
        steps: data.steps || '',
        expectedResult: data.expectedResult || '',
        actualResult: data.actualResult || '',
        status: (data.status as TestResultStatus) || 'Pending',
        tester: data.tester || prefs.userName,
        priority: (data.priority as PriorityLevel) || 'Sedang'
      };
      const nextCases = existing
        ? state.testCases.map((tc) => (tc.id === existing.id ? item : tc))
        : [...state.testCases, item];
      persistState({ ...state, testCases: nextCases });
    }

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
    const client = getSupabaseClient(prefs);
    if (client) {
      await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
    } else {
      setScreenMode('workspace');
      pushToast(
        `Login OAuth (${provider === 'google' ? 'Google' : 'GitHub'}) Berhasil`,
        'Masuk ke ruang kerja dalam mode Hybrid.'
      );
    }
  };

  // Metrics Calculation
  const selKey = dateKey(selectedDate);
  const isSelectedToday = selKey === dateKey(today);
  const dayEvents = state.events
    .filter((e) => e.date === selKey)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  const openTasksCount = state.tasks.filter((t) => !t.completed && t.status !== 'Done').length;
  const openTicketsCount = state.tickets.filter(
    (tk) => tk.status === 'Open' || tk.status === 'Investigasi'
  ).length;
  const passedCasesCount = state.testCases.filter((tc) => tc.status === 'Pass').length;
  const qaPassRate = state.testCases.length
    ? Math.round((passedCasesCount / state.testCases.length) * 100)
    : 0;
  const unreadNotifCount = state.notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    persistState({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    });
    pushToast('Notifikasi Diperbarui', 'Semua notifikasi telah ditandai dibaca.');
  };

  // Filtered lists
  const filteredTasks = state.tasks
    .filter((t) => taskFilter === 'all' || t.status === taskFilter)
    .filter((t) => taskProjectFilter === 'all' || t.project === taskProjectFilter)
    .filter(
      (t) =>
        !taskSearch.trim() ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.assignee || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.project || '').toLowerCase().includes(taskSearch.toLowerCase())
    );

  const filteredTickets = state.tickets
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
      { label: '+ Tambah Tugas Karyawan', meta: 'Tugas', run: () => openModal('task') },
      { label: '+ Catat Tiket Komplain Klien', meta: 'Tiket', run: () => openModal('ticket') },
      { label: '+ Buat Test Scenario QA', meta: 'QA', run: () => openModal('scenario') },
      { label: '+ Tambah Test Case QA', meta: 'QA', run: () => openModal('testcase') },
      { label: '+ Buat Proyek Baru', meta: 'Proyek', run: () => openModal('project') },
      { label: 'Buka Tugas Karyawan', meta: 'Navigasi', run: () => setView('tasks') },
      { label: 'Buka Tiket Komplain Klien', meta: 'Navigasi', run: () => setView('tickets') },
      { label: 'Buka Skenario & Test Case QA', meta: 'Navigasi', run: () => setView('qa') },
      { label: 'Buka Daftar Notifikasi', meta: 'Navigasi', run: () => setView('notifications') },
      { label: 'Buka Profil & Kredensial', meta: 'Akun', run: () => setView('profile') },
      { label: 'Lihat Landing Page & Harga', meta: 'Halaman', run: () => setScreenMode('landing') }
    ];
    const tkCmd = state.tickets.map((tk) => ({
      label: `${tk.code}: ${tk.title}`,
      meta: `${tk.clientName} · ${tk.status}`,
      run: () => openModal('ticket', tk)
    }));
    const taskCmd = state.tasks.map((t) => ({
      label: `Tugas: ${t.title}`,
      meta: `${t.assignee} · ${t.project}`,
      run: () => openModal('task', t)
    }));
    const all = [...base, ...tkCmd, ...taskCmd];
    if (!q) return base;
    return all.filter(
      (x) => x.label.toLowerCase().includes(q) || x.meta.toLowerCase().includes(q)
    );
  }, [cmdQuery, state.tickets, state.tasks]);

  const supabaseInfo = getSupabaseConfig(prefs);

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
        a: 'Tentu. Halaman Login dan Register sudah terintegrasi dengan provider OAuth Google & GitHub melalui Supabase Auth. Saat berjalan dalam Mode Hybrid tanpa server eksternal, sistem juga menyediakan simulasi masuk OAuth instan.'
      },
      {
        q: 'Bagaimana sistem penyimpanan datanya? Apakah aman jika internet terputus?',
        a: 'RuangWaktu menggunakan arsitektur Hybrid Local-First + Supabase PostgreSQL Cloud. Seluruh perubahan tersimpan seketika di penyimpanan lokal browser (< 10ms) dan otomatis melakukan sinkronisasi ke tabel PostgreSQL Supabase ketika koneksi tersedia. Anda juga dapat mengekspor/mengimpor cadangan JSON kapan saja.'
      },
      {
        q: 'Apa perbedaan utama paket Starter, Pro Team, dan Enterprise?',
        a: 'Paket Starter gratis selamanya untuk tim kecil hingga 3 proyek. Paket Pro Team membuka proyek, tugas karyawan, tiket komplain klien, serta Test Scenario & Test Case QA tanpa batas dengan sinkronisasi cloud real-time. Paket Enterprise menambahkan dukungan multi-divisi, custom SLA, dan dedicated instance.'
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
              <i aria-hidden="true">RW</i>
              <span className="brand-text">
                <span>
                  ruang<b>waktu</b>
                </span>
                <small>STUDIO ARCH v3</small>
              </span>
            </a>

            <nav className="landing-nav-links" aria-label="Navigasi Landing Page">
              <a href="#alur-kerja">Alur Kerja</a>
              <a href="#fitur-utama">Fitur Unggulan</a>
              <a href="#perbandingan">Perbandingan</a>
              <a href="#paket-harga">Harga &amp; Paket</a>
              <a href="#testimoni">Testimoni</a>
              <a href="#faq">FAQ</a>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                className="button ghost"
                type="button"
                onClick={() => setScreenMode('login')}
              >
                Masuk
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => setScreenMode('register')}
              >
                Daftar Akun
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => setScreenMode('workspace')}
              >
                Buka Studio Kerja →
              </button>
            </div>
          </header>
        </div>

        {/* 2. Split Editorial Hero + Interactive Live Preview */}
        <section className="landing-hero">
          <div>
            <span className="badge">ARSITEKTUR MANAJEMEN PROYEK, TIKET KLIEN &amp; QA TERPADU</span>
            <h1>
              Satukan Tugas Karyawan, Komplain Klien &amp; QA Testing dalam Satu Studio Presisi.
            </h1>
            <p>
              Dirancang khusus untuk Software House, Digital Agency, dan Tim Engineering. Tidak perlu
              lagi berpindah-pindah antara grup chat untuk komplain klien, papan tugas terpisah, dan
              spreadsheet pengujian QA yang berantakan.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
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
                Eksplorasi Live Studio →
              </button>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>✓ Konversi Tiket Klien → Task 1-Klik</span>
              <span>✓ CRUD Test Scenario &amp; Test Case</span>
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
                  1. Tugas Karyawan
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
                  3. Studio QA
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
              <b>3.4x</b>
              <span>Lebih Cepat Menangani Komplain</span>
              <small>Dari laporan tiket klien ke penugasan developer tanpa miskomunikasi</small>
            </div>
            <div className="landing-metric-item">
              <b>99.2%</b>
              <span>Cakupan Regresi QA Terlacak</span>
              <small>Setiap rilis diverifikasi melalui Test Scenario &amp; Test Case terstruktur</small>
            </div>
            <div className="landing-metric-item">
              <b>100%</b>
              <span>Transparansi Beban Karyawan</span>
              <small>Pantau siapa mengerjakan apa, di proyek mana, dan status review-nya</small>
            </div>
            <div className="landing-metric-item">
              <b>&lt; 20ms</b>
              <span>Arsitektur Hybrid Local + Cloud</span>
              <small>Tetap instan saat offline dan tersinkronisasi ke PostgreSQL Supabase</small>
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
            <p className="eyebrow">INVESTASI TRANSPARAN</p>
            <h2>Pilih Paket Langganan Sesuai Skala Tim</h2>
            <p>
              Mulai gratis tanpa batas waktu, dan tingkatkan ke paket Pro Team saat volume proyek,
              tiket klien, dan skenario QA Anda berkembang.
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
              <b>Starter Studio</b>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk freelancer, mahasiswa &amp; tim rintisan kecil
              </small>
              <div className="pricing-price">Gratis</div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Selamanya · Tanpa kartu kredit
              </small>
              <ul className="pricing-list">
                <li>✓ Hingga 3 Proyek Klien Aktif</li>
                <li>✓ Papan Kanban &amp; Tabel Tugas Karyawan</li>
                <li>✓ Maksimal 25 Tiket Komplain Klien / bln</li>
                <li>✓ 5 Test Scenario &amp; 30 Test Case QA</li>
                <li>✓ Penyimpanan Lokal Cepat + Ekspor JSON</li>
              </ul>
              <button
                className="button ghost"
                type="button"
                onClick={() => {
                  setPrefs((p) => ({ ...p, plan: 'Starter' }));
                  setScreenMode('workspace');
                  pushToast('Paket Starter Aktif', 'Anda menggunakan paket Starter Studio.');
                }}
              >
                Mulai dengan Starter
              </button>
            </article>

            <article className="pricing-card featured">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Pro Engineering &amp; QA</b>
                <span className="badge">PALING DIREKOMENDASIKAN</span>
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk software house, agensi digital &amp; tim produk
              </small>
              <div className="pricing-price">
                {proPrice} <span style={{ fontSize: 13, fontWeight: 500 }}>/ bulan</span>
              </div>
              <small style={{ color: 'var(--emerald)', fontSize: 12, fontWeight: 600 }}>
                {billingCycle === 'annual'
                  ? 'Ditagih tahunan (Hemat Rp 360.000/thn)'
                  : 'Beralih ke tahunan untuk hemat 20%'}
              </small>
              <ul className="pricing-list">
                <li>✓ Proyek &amp; Penugasan Karyawan Tanpa Batas</li>
                <li>✓ Helpdesk Tiket Komplain Klien + Konversi Task 1-Klik</li>
                <li>✓ CRUD Test Scenario (`TS`) &amp; Test Case (`TC`) Tak Terbatas</li>
                <li>✓ Radar Telemetri QA Pass Rate &amp; Beban Tim</li>
                <li>✓ Sinkronisasi Cloud PostgreSQL Supabase Real-time</li>
                <li>✓ Login OAuth 2.0 (Google &amp; GitHub)</li>
              </ul>
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  setPrefs((p) => ({ ...p, plan: 'Pro' }));
                  setScreenMode('workspace');
                  pushToast('Paket Pro Team Aktif', 'Seluruh fitur proyek, tiket & QA telah terbuka.');
                }}
              >
                Aktifkan Paket Pro Team →
              </button>
            </article>

            <article className="pricing-card">
              <b>Enterprise Suite</b>
              <small style={{ color: 'var(--text-secondary)' }}>
                Untuk korporasi multi-divisi &amp; regulasi ketat
              </small>
              <div className="pricing-price">
                {entPrice} <span style={{ fontSize: 13, fontWeight: 500 }}>/ bulan</span>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Untuk seluruh organisasi tanpa batas kursi
              </small>
              <ul className="pricing-list">
                <li>✓ Seluruh Kapabilitas Paket Pro Engineering &amp; QA</li>
                <li>✓ Multi-Workspace Divisi Terisolasi</li>
                <li>✓ Dedicated Supabase PostgreSQL Instance &amp; Custom RLS</li>
                <li>✓ Audit Trail Eksekusi QA &amp; SLA Prioritas 99.9%</li>
                <li>✓ Pendampingan Onboarding &amp; Integrasi Custom</li>
              </ul>
              <button
                className="button ghost"
                type="button"
                onClick={() => {
                  setPrefs((p) => ({ ...p, plan: 'Enterprise' }));
                  setScreenMode('workspace');
                  pushToast('Paket Enterprise Aktif', 'Kapabilitas Enterprise telah diaktifkan.');
                }}
              >
                Pilih Paket Enterprise
              </button>
            </article>
          </div>
        </section>

        {/* 8. Testimonials / Studi Kasus Tim */}
        <section id="testimoni" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">DIPERCAYA TIM ENGINEERING &amp; QA</p>
            <h2>Dampak Nyata di Lapangan</h2>
            <p>
              Bagaimana tim pengembang perangkat lunak merapikan alur komplain klien dan pengujian
              kualitas mereka bersama RuangWaktu.
            </p>
          </div>

          <div className="testimonial-grid">
            <article className="testimonial-card">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>
                &ldquo;Sebelumnya komplain klien dari grup chat sering terlewat oleh programmer.
                Sekarang setiap keluhan masuk ke Tiket Klien dan langsung dikonversi jadi task
                karyawan dalam satu klik.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="avatar">DK</span>
                <div>
                  <b style={{ display: 'block', fontSize: 13 }}>Dimas Kurniawan</b>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    VP of Engineering · NusaTech Software House
                  </small>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>
                &ldquo;Modul Test Scenario dan Test Case-nya sangat bersih. Tim QA kami tidak lagi
                memakai ribuan baris spreadsheet terpisah karena status Pass, Fail, dan Blocked
                langsung terlihat di dashboard proyek.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="avatar">SL</span>
                <div>
                  <b style={{ display: 'block', fontSize: 13 }}>Saraswati Lestari</b>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    Lead QA Engineer · FinCore Digital
                  </small>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>
                &ldquo;Tampilan warna terang limestone-nya benar-benar teduh di mata meskipun dipakai
                mantengin ratusan tiket dan test case seharian. Transisi ke mode gelapnya juga sangat
                halus.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="avatar">RP</span>
                <div>
                  <b style={{ display: 'block', fontSize: 13 }}>Reza Pramudya</b>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    Product Delivery Manager · Kreativa Studio
                  </small>
                </div>
              </div>
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
                <i aria-hidden="true">RW</i>
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
              <i aria-hidden="true">R</i>
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

          <div className="oauth-grid">
            <button
              type="button"
              className="button ghost"
              onClick={() => handleOAuthLogin('google')}
            >
              <span>G</span> Lanjutkan Google
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => handleOAuthLogin('github')}
            >
              <span>⌘</span> Lanjutkan GitHub
            </button>
          </div>

          <div className="auth-divider">atau dengan email</div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get('email') || prefs.userEmail);
              const name = String(fd.get('name') || prefs.userName);
              if (isRegister && name) {
                setPrefs((p) => ({
                  ...p,
                  userName: name,
                  userEmail: email,
                  userAvatar: name.slice(0, 2).toUpperCase()
                }));
              } else {
                setPrefs((p) => ({ ...p, userEmail: email }));
              }
              setScreenMode('workspace');
              pushToast(
                isRegister ? 'Pendaftaran Berhasil' : 'Berhasil Masuk',
                `Selamat datang kembali, ${isRegister ? name : prefs.userName}.`
              );
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            {isRegister && (
              <label className="field full">
                <span>Nama lengkap</span>
                <input name="name" required placeholder="Abil Mahendra" defaultValue={prefs.userName} />
              </label>
            )}
            <label className="field full">
              <span>Alamat email kerja</span>
              <input
                name="email"
                type="email"
                required
                placeholder="nama@perusahaan.com"
                defaultValue={prefs.userEmail}
              />
            </label>
            <label className="field full">
              <span>Kata sandi</span>
              <input name="password" type="password" required placeholder="••••••••" defaultValue="password123" />
            </label>
            <button type="submit" className="button primary" style={{ width: '100%', marginTop: 6 }}>
              {isRegister ? 'Daftar & Buka Workspace' : 'Masuk ke Workspace'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 18, marginBottom: 0 }}>
            {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
            <button
              type="button"
              onClick={() => setScreenMode(isRegister ? 'login' : 'register')}
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
  const viewTitles: Record<ViewName, string> = {
    dashboard: 'Ringkasan Eksekutif',
    projects: 'Proyek & Klien',
    tasks: 'Tugas Karyawan',
    tickets: 'Tiket Komplain Klien',
    qa: 'QA & Pengujian (Test Scenario / Case)',
    calendar: 'Kalender Sprint & Rilis',
    insights: 'Laporan & Wawasan Tim',
    notifications: 'Pusat Notifikasi',
    profile: 'Profil & Kredensial Pengguna',
    settings: 'Pengaturan Workspace'
  };

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

  const totalScopedTasks = scopedTasks.length || 1;
  const donePct = Math.round(
    (scopedTasks.filter((t) => t.status === 'Done' || t.completed).length / totalScopedTasks) * 100
  );
  const reviewPct = Math.round(
    (scopedTasks.filter((t) => t.status === 'In Review').length / totalScopedTasks) * 100
  );
  const progressPct = Math.round(
    (scopedTasks.filter((t) => t.status === 'In Progress').length / totalScopedTasks) * 100
  );
  const todoPct = Math.max(0, 100 - donePct - reviewPct - progressPct);

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* FLOATING ARCHITECTURAL STUDIO DOCK */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} aria-label="Navigasi Studio">
        <div className="sidebar-top">
          <a
            className="brand"
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setView('dashboard');
            }}
          >
            <i aria-hidden="true">RW</i>
            <span className="brand-text">
              <span>
                ruang<b>waktu</b>
              </span>
              <small>STUDIO ARCH v3</small>
            </span>
          </a>

          <button
            className="dock-collapse-btn"
            type="button"
            data-tooltip={sidebarCollapsed ? 'Bentangkan Dock' : 'Lipat Dock'}
            data-tooltip-pos="right"
            onClick={() => {
              if (window.matchMedia('(max-width: 780px)').matches) {
                setMobileSidebarOpen((o) => !o);
              } else {
                setSidebarCollapsed((c) => {
                  const next = !c;
                  localStorage.setItem('ruangWaktuSidebar', next ? 'collapsed' : 'open');
                  return next;
                });
              }
            }}
            aria-label="Lipat atau bentangkan dock navigasi"
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

        {/* Quick Launch Action Button inside Dock */}
        <button
          type="button"
          className="dock-quick-create"
          data-tooltip="Buat Entri Baru (Tugas / Tiket / QA)"
          data-tooltip-pos="right"
          onClick={() => openModal('task')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} />
            <span>Entri Studio Baru</span>
          </span>
          <kbd>N</kbd>
        </button>

        <div className="nav-group">
          <p className="nav-label">EKSEKUSI &amp; PRODUK</p>
          <button
            type="button"
            data-tooltip="01 · Papan Komando Studio"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setView('dashboard');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">01</em>
            <LayoutGrid size={17} />
            <span>Komando Studio</span>
          </button>

          <button
            type="button"
            data-tooltip="02 · Portofolio Proyek & Klien"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'projects' ? 'active' : ''}`}
            onClick={() => {
              setView('projects');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">02</em>
            <FolderKanban size={17} />
            <span>Portofolio Proyek</span>
            <b>{state.projects.length}</b>
          </button>

          <button
            type="button"
            data-tooltip="03 · Tugas Karyawan (Kanban & Tabel)"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              setView('tasks');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">03</em>
            <CheckSquare size={17} />
            <span>Tugas Karyawan</span>
            <b>{openTasksCount}</b>
          </button>

          <button
            type="button"
            data-tooltip="04 · Helpdesk Tiket & Komplain Klien"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'tickets' ? 'active' : ''}`}
            onClick={() => {
              setView('tickets');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">04</em>
            <Ticket size={17} />
            <span>Tiket Komplain</span>
            <b>{openTicketsCount}</b>
          </button>
        </div>

        <div className="nav-group">
          <p className="nav-label">KUALITAS &amp; RILIS</p>
          <button
            type="button"
            data-tooltip="05 · Studio QA: Test Scenario & Test Case"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'qa' ? 'active' : ''}`}
            onClick={() => {
              setView('qa');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">05</em>
            <ClipboardCheck size={17} />
            <span>Studio QA &amp; Test</span>
            <b>{state.testCases.length}</b>
          </button>

          <button
            type="button"
            data-tooltip="06 · Jadwal Rilis & Agenda Sprint"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => {
              setView('calendar');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">06</em>
            <Calendar size={17} />
            <span>Agenda &amp; Rilis</span>
          </button>

          <button
            type="button"
            data-tooltip="07 · Telemetri & Analitik Tim"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'insights' ? 'active' : ''}`}
            onClick={() => {
              setView('insights');
              setMobileSidebarOpen(false);
            }}
          >
            <em className="nav-idx">07</em>
            <BarChart3 size={17} />
            <span>Analitik &amp; SLA</span>
          </button>
        </div>

        {/* Dock Release Readiness Radar Widget */}
        <div className="dock-radar">
          <div className="dock-radar-head">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {supabaseInfo.isConfigured ? (
                <Cloud size={14} style={{ color: 'var(--emerald)' }} />
              ) : (
                <CloudOff size={14} />
              )}
              {supabaseInfo.isConfigured ? 'Supabase Aktif' : 'Hybrid Local'}
            </span>
            <span className="badge">{qaPassRate}% QA</span>
          </div>
          <div className="dock-radar-bar">
            <span style={{ width: `${qaPassRate}%` }} />
          </div>
          <small>
            {passedCasesCount}/{state.testCases.length} Test Case Lulus · Paket {prefs.plan}
          </small>
        </div>

        <div className="sidebar-foot">
          <button
            type="button"
            data-tooltip="Konfigurasi Studio & Supabase"
            data-tooltip-pos="right"
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setView('settings');
              setMobileSidebarOpen(false);
            }}
          >
            <Settings size={17} />
            <span>Konfigurasi Studio</span>
          </button>
        </div>
      </aside>

      {/* WORKSPACE STAGE */}
      <div className="workspace-stage">
        <header className="topbar">
          <div className="topbar-left">
            {/* Interactive Project Context Ribbon (Filters entire workspace!) */}
            <div className="project-ribbon" role="tablist" aria-label="Filter Konteks Proyek">
              <button
                type="button"
                className={`project-pill ${globalProjectFilter === 'all' ? 'active' : ''}`}
                onClick={() => setGlobalProjectFilter('all')}
              >
                <span className="project-pill-dot" />
                <span>Semua Proyek ({state.projects.length})</span>
              </button>
              {state.projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`project-pill ${globalProjectFilter === p.name ? 'active' : ''}`}
                  onClick={() => setGlobalProjectFilter(p.name)}
                >
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="topbar-right">
            {/* Single-Line Spotlight Search Button */}
            <button
              className="search"
              type="button"
              onClick={() => {
                setCmdQuery('');
                setCmdIndex(0);
                setCmdOpen(true);
              }}
            >
              <Search size={15} />
              <span>Cari tugas, tiket TKT, atau test case…</span>
              <kbd>Ctrl K</kbd>
            </button>

            <button
              type="button"
              className="button ghost small"
              data-tooltip="Buka Halaman Landing Page & Paket SaaS"
              data-tooltip-pos="bottom"
              onClick={() => setScreenMode('landing')}
            >
              <Sparkles size={14} style={{ color: 'var(--emerald)' }} />
              <span>Landing &amp; Paket</span>
            </button>

            <button
              className="icon-btn theme-toggle-btn"
              type="button"
              data-tooltip={prefs.theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              data-tooltip-pos="bottom"
              onClick={(e) => toggleThemeWithAnimation(undefined, e.currentTarget)}
              aria-label="Ubah tema tampilan"
            >
              {prefs.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Button + Popover List */}
            <div className="notif-wrap" ref={notifRef}>
              <button
                className="icon-btn"
                type="button"
                data-tooltip="Pusat Notifikasi & Pembaruan"
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
                    <b>Notifikasi ({unreadNotifCount} baru)</b>
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
                      Lihat semua halaman notifikasi →
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
                    <span>Profil &amp; Kredensial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setView('settings');
                    }}
                  >
                    <Settings size={16} />
                    <span>Konfigurasi Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setScreenMode('landing');
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Landing Page &amp; Paket ({prefs.plan})</span>
                  </button>
                  <hr />
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setScreenMode('login');
                    }}
                  >
                    <LogOut size={16} />
                    <span>Keluar / Ganti Akun</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="content">
          {/* ====================================================================
              VIEW 1: EXECUTIVE BENTO COMMAND STUDIO (ORIGINAL 3-ZONE ARCHITECTURE)
             ==================================================================== */}
          {view === 'dashboard' && (
            <section className="view-enter">
              {/* ZONE 1: Command Pulse & Pipeline Telemetry Ribbon */}
              <div className="studio-hero-banner">
                <div className="studio-hero-left">
                  <div>
                    <div className="studio-eyebrow-row">
                      <p className="eyebrow">
                        STUDIO KOMANDO ·{' '}
                        {fmtDate(selectedDate, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }).toUpperCase()}
                      </p>
                      <span className="badge">
                        Konteks: {globalProjectFilter === 'all' ? 'Seluruh Portofolio' : globalProjectFilter}
                      </span>
                    </div>
                    <h1>
                      Pusat Kendali Proyek, Tugas &amp; QA — {prefs.userName.split(' ')[0]}
                    </h1>
                    <p>
                      Pantau kesiapan rilis lintas proyek, konversi komplain tiket klien menjadi
                      tugas engineer, serta validasi eksekusi skenario QA dalam satu kanvas.
                    </p>
                  </div>

                  <div className="launchpad-pills">
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => openModal('task')}
                    >
                      + Tugas Karyawan
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => openModal('ticket')}
                    >
                      + Catat Tiket Klien
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => openModal('testcase')}
                    >
                      + Test Case QA
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => openModal('project')}
                    >
                      + Proyek Baru
                    </button>
                  </div>
                </div>

                {/* Telemetry Distribution Matrix */}
                <div className="telemetry-box">
                  <div className="telemetry-head">
                    <b>Distribusi Alur Pengerjaan &amp; Kesiapan QA</b>
                    <span>{donePct}% Tugas Selesai</span>
                  </div>

                  <div className="pipeline-segmented-bar" title="Distribusi Status Tugas Karyawan">
                    <span className="pipeline-seg done" style={{ width: `${donePct}%` }} />
                    <span className="pipeline-seg review" style={{ width: `${reviewPct}%` }} />
                    <span className="pipeline-seg progress" style={{ width: `${progressPct}%` }} />
                    <span className="pipeline-seg todo" style={{ width: `${todoPct}%` }} />
                  </div>

                  <div className="telemetry-legend">
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('tasks')}
                      style={{ cursor: 'pointer' }}
                    >
                      <small>Tugas Aktif</small>
                      <b>{scopedTasks.filter((t) => !t.completed).length}</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('tickets')}
                      style={{ cursor: 'pointer' }}
                    >
                      <small>Tiket Klien</small>
                      <b>{scopedTickets.filter((tk) => tk.status !== 'Closed').length}</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('qa')}
                      style={{ cursor: 'pointer' }}
                    >
                      <small>Skenario QA</small>
                      <b>{scopedScenarios.length} TS</b>
                    </div>
                    <div
                      className="telemetry-stat"
                      onClick={() => setView('qa')}
                      style={{ cursor: 'pointer' }}
                    >
                      <small>Lulus Uji</small>
                      <b style={{ color: 'var(--emerald)' }}>{qaPassRate}%</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* ZONE 2: 3-Column Triage & Execution Matrix */}
              <div className="bento-triage-grid">
                {/* Column 1: Client Tickets & Complaints Triage */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">01 · HELPDESK KLIEN</p>
                      <h2>Triage Tiket &amp; Komplain</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('tickets')}>
                      Buka Semua →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {scopedTickets.slice(0, 3).map((tk) => (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="ticket-code">{tk.code}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span className={`severity-pill severity-${tk.severity}`}>
                              {tk.severity}
                            </span>
                            <span className="badge">{tk.status}</span>
                          </div>
                        </div>
                        <b
                          style={{ fontSize: 14, cursor: 'pointer' }}
                          onClick={() => openModal('ticket', tk)}
                        >
                          {tk.title}
                        </b>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span>
                            {tk.clientName} · PIC: {tk.assignee}
                          </span>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => convertTicketToTask(tk)}
                          >
                            + Jadi Tugas
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Column 2: Active Employee Tasks Stream */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">02 · EKSEKUSI TIM</p>
                      <h2>Matriks Tugas Karyawan</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('tasks')}>
                      Papan Kanban →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {scopedTasks.slice(0, 3).map((t) => (
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
                          <span className={`priority ${t.priority}`}>{t.priority}</span>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span>{t.project}</span>
                          <select
                            className="select"
                            style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                            value={t.status}
                            onChange={(e) => setTaskStatus(t.id, e.target.value as TaskStatus)}
                          >
                            {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Column 3: QA Test Suite & Release Radar */}
                <article className="card">
                  <div className="card-head">
                    <div>
                      <p className="eyebrow">03 · KUALITAS &amp; PENGUJIAN</p>
                      <h2>Radar Skenario &amp; Test Case QA</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setView('qa')}>
                      Studio QA →
                    </button>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {state.testCases.slice(0, 3).map((tc) => (
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
                          <span className="ticket-code">{tc.code}</span>
                          <div className="qa-status-group">
                            {(['Pass', 'Fail', 'Blocked'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                className={`qa-status-btn ${tc.status === st ? `active ${st}` : ''}`}
                                onClick={() => updateTestCaseStatus(tc.id, st)}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                        <b
                          style={{ fontSize: 14, cursor: 'pointer' }}
                          onClick={() => openModal('testcase', tc)}
                        >
                          {tc.title}
                        </b>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          Penguji: {tc.tester} · Prioritas: {tc.priority}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {/* ZONE 3: Portfolio Deliverable Strip */}
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">04 · PORTOFOLIO DELIVERABLE KLIEN</p>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>
                    Status Penyelesaian Proyek, Tiket &amp; Cakupan QA
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
                    (tk) => tk.project === p.name && tk.status !== 'Closed'
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
                          <small>Progres Task</small>
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
                  <p className="eyebrow">MANAJEMEN PORTOFOLIO</p>
                  <h1>Portofolio Proyek &amp; Klien</h1>
                  <p>
                    Kelola daftar proyek klien, Project Lead, serta pantau progres penyelesaian
                    tugas karyawan dan tiket komplain.
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
                            (tk) => tk.project === p.name && tk.status !== 'Closed'
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
              VIEW 3: EMPLOYEE TASKS PER PROJECT (KANBAN BOARD + TABLE TOGGLE)
             ==================================================================== */}
          {view === 'tasks' && (
            <section className="view-enter">
              <div className="heading">
                <div>
                  <p className="eyebrow">DISTRIBUSI BEBAN KERJA TIM</p>
                  <h1>Tugas Karyawan per Proyek</h1>
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
                    + Tambah Tugas Karyawan
                  </button>
                </div>
              </div>

              <article className="card" style={{ marginBottom: 18 }}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <div className="filters">
                    {(
                      [
                        ['all', 'Semua Status'],
                        ['Todo', 'Todo'],
                        ['In Progress', 'In Progress'],
                        ['In Review', 'In Review'],
                        ['Done', 'Done']
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
                      placeholder="Cari tugas atau nama karyawan…"
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
                          <b>{colStatus}</b>
                          <span className="badge">{colTasks.length}</span>
                        </div>
                        {colTasks.length ? (
                          colTasks.map((t) => (
                            <div key={t.id} className="kanban-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={`priority ${t.priority}`}>{t.priority}</span>
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
                                Proyek: <strong>{t.project}</strong>
                              </small>
                              <div className="kanban-card-meta">
                                <span className="assignee-chip">
                                  <UserCheck size={12} />
                                  {t.assignee}
                                </span>
                                <select
                                  className="select"
                                  style={{ height: 26, fontSize: 12, padding: '0 6px' }}
                                  value={t.status}
                                  onChange={(e) =>
                                    setTaskStatus(t.id, e.target.value as TaskStatus)
                                  }
                                >
                                  {(['Todo', 'In Progress', 'In Review', 'Done'] as const).map(
                                    (st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>
                          ))
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
                      filteredTasks.map((t) => (
                        <div key={t.id} className={`task-row ${t.completed ? 'done' : ''}`}>
                          <button
                            type="button"
                            className="check"
                            onClick={() => toggleTask(t.id)}
                            aria-label="Tandai selesai"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="task-main"
                            onClick={() => openModal('task', t)}
                          >
                            <b>{t.title}</b>
                            <small>
                              {t.project} · Role: {t.assigneeRole} · Tenggat: {t.dueDate}
                            </small>
                          </button>
                          <span className="assignee-chip">
                            <UserCheck size={13} />
                            {t.assignee}
                          </span>
                          <span className={`status-pill status-${t.status.replace(/\s+/g, '-')}`}>
                            {t.status}
                          </span>
                          <span className={`priority ${t.priority}`}>{t.priority}</span>
                          <button
                            type="button"
                            className="icon-delete"
                            onClick={() => deleteTask(t.id)}
                            aria-label="Hapus tugas"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty">Tidak ditemukan tugas karyawan dengan filter ini.</p>
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
                  Kelola laporan komplain, bug, atau permintaan revisi dari klien dan konversikan
                  menjadi tugas karyawan.
                </p>
              </div>
              <button className="button primary" type="button" onClick={() => openModal('ticket')}>
                + Catat tiket klien
              </button>
            </div>

            <article className="card">
              <div className="toolbar">
                <div className="filters">
                  {(
                    [
                      ['all', 'Semua Tiket'],
                      ['Open', 'Open'],
                      ['Investigasi', 'Investigasi'],
                      ['Diperbaiki', 'Diperbaiki'],
                      ['Closed', 'Closed']
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
                    placeholder="Cari kode TKT, klien, atau isu…"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="ticket-list">
                {filteredTickets.length ? (
                  filteredTickets.map((tk) => (
                    <div key={tk.id} className="ticket-row">
                      <span className="ticket-code">{tk.code}</span>
                      <button
                        type="button"
                        className="task-main"
                        onClick={() => openModal('ticket', tk)}
                      >
                        <b>{tk.title}</b>
                        <small>
                          Klien: <strong>{tk.clientName}</strong> · Proyek: {tk.project} ·{' '}
                          {tk.description}
                        </small>
                      </button>
                      <span className="assignee-chip">
                        <UserCheck size={13} />
                        {tk.assignee}
                      </span>
                      <span className="badge">{tk.category}</span>
                      <span className={`severity-pill severity-${tk.severity}`}>{tk.severity}</span>
                      <span className="badge">{tk.status}</span>
                      <button
                        type="button"
                        className="button ghost small"
                        onClick={() => convertTicketToTask(tk)}
                      >
                        + Jadi Tugas
                      </button>
                    </div>
                  ))
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
                <h1>Studio QA: Test Scenario &amp; Test Case</h1>
                <p>
                  Pilih skenario pengujian di sebelah kiri untuk mengelola daftar Test Case, langkah
                  pengujian, dan status Pass / Fail.
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => openModal('scenario')}
                >
                  + Test Scenario
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
                    <h2>{state.scenarios.length} Test Scenario</h2>
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
                              {passCount}/{scCases.length} Pass
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
                        activeScenarioCases.map((tc) => (
                          <div key={tc.id} className="testcase-card">
                            <div className="testcase-head">
                              <div
                                style={{ cursor: 'pointer', flex: 1 }}
                                onClick={() => openModal('testcase', tc)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span className="ticket-code">{tc.code}</span>
                                  <b style={{ fontSize: 15 }}>{tc.title}</b>
                                  <span className={`priority ${tc.priority}`}>{tc.priority}</span>
                                </div>
                                <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                  Prasyarat (Pre-condition): {tc.precondition || '-'} · Penguji:{' '}
                                  <strong>{tc.tester}</strong>
                                </small>
                              </div>

                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <div className="qa-status-group">
                                  {(['Pass', 'Fail', 'Blocked', 'Pending'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => updateTestCaseStatus(tc.id, st)}
                                      className={`qa-status-btn ${tc.status === st ? `active ${st}` : ''}`}
                                    >
                                      {st}
                                    </button>
                                  ))}
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
                                <b>LANGKAH PENGUJIAN (TEST STEPS)</b>
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
                        ))
                      ) : (
                        <p className="empty">
                          Belum ada Test Case pada skenario ini. Klik &quot;+ Tambah Test Case&quot;
                          untuk mulai mendokumentasikan pengujian.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="empty">Pilih atau buat Test Scenario terlebih dahulu.</p>
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
                      className={`calendar-day ${
                        d.getMonth() !== selectedDate.getMonth() ? 'other' : ''
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
                <h1>Analitik &amp; SLA Tim</h1>
                <p>Ringkasan performa penyelesaian tugas karyawan, tiket klien, dan metrik QA.</p>
              </div>
            </div>

            <article className="card insight">
              <div>
                <span>PENYELESAIAN TUGAS</span>
                <b>
                  {state.tasks.filter((t) => t.completed).length} / {state.tasks.length}
                </b>
              </div>
              <div>
                <span>TIKET KLIEN SELESAI</span>
                <b>
                  {
                    state.tickets.filter(
                      (tk) => tk.status === 'Diperbaiki' || tk.status === 'Closed'
                    ).length
                  }{' '}
                  / {state.tickets.length}
                </b>
              </div>
              <div>
                <span>RASIO LULUS QA (PASS)</span>
                <b>{qaPassRate}%</b>
              </div>
              <div>
                <span>TEST CASE GAGAL (FAIL)</span>
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
                          <b>Status {st}</b>
                          <span>
                            {count} Test Case ({pct}%)
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
                    <h2>Distribusi Beban Tugas per Karyawan</h2>
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
                            {done}/{personTasks.length} tugas selesai ({pct}%)
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
                  Seluruh riwayat tiket komplain klien, pembaruan hasil uji QA, dan pengingat tugas
                  karyawan.
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
                      <span>Paket Langganan Saat Ini</span>
                      <input type="text" disabled value={`Paket ${prefs.plan}`} />
                    </label>
                  </div>

                  <div className="settings-form-actions">
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setScreenMode('landing')}
                    >
                      Ubah Paket Langganan
                    </button>
                    <button type="submit" className="button primary">
                      Simpan Identitas
                    </button>
                  </div>
                </form>
              </article>

              <article className="card settings-card">
                <div className="settings-card-head">
                  <h2>Kredensial Login &amp; OAuth</h2>
                  <p>Perbarui email, kata sandi akun, atau tautkan akun Google / GitHub.</p>
                </div>
                <form
                  className="settings-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    pushToast(
                      'Kredensial Diperbarui',
                      'Email dan kata sandi akun Anda telah diperbarui.'
                    );
                  }}
                >
                  <div className="form-grid">
                    <label className="field full">
                      <span>Email Kredensial Utama</span>
                      <input
                        type="email"
                        required
                        value={prefs.userEmail}
                        onChange={(e) => setPrefs((p) => ({ ...p, userEmail: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Kata Sandi Baru</span>
                      <input type="password" placeholder="Minimal 8 karakter" />
                    </label>
                    <label className="field">
                      <span>Konfirmasi Kata Sandi</span>
                      <input type="password" placeholder="Ulangi kata sandi baru" />
                    </label>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <small style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Koneksi Single Sign-On (OAuth 2.0):
                    </small>
                    <div className="oauth-grid" style={{ margin: 0 }}>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => handleOAuthLogin('google')}
                      >
                        ✓ Hubungkan Google
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => handleOAuthLogin('github')}
                      >
                        ✓ Hubungkan GitHub
                      </button>
                    </div>
                  </div>

                  <div className="settings-form-actions">
                    <button type="submit" className="button primary">
                      Perbarui Kredensial
                    </button>
                  </div>
                </form>
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
                      <small>Kelembutan permukaan warna agar tidak menyilaukan mata</small>
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
                      <option value="soft">Teduh / Lembut (Default)</option>
                      <option value="warm">Hangat Redup</option>
                      <option value="crisp">Standar Bersih</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <b>Warna aksen utama</b>
                      <small>Warna tombol utama dan indikator aktif</small>
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
                  <h2>2. Database Supabase &amp; Cadangan Data</h2>
                  <p>Hubungkan ke PostgreSQL Supabase atau kelola cadangan JSON lokal.</p>
                </div>
                <form
                  className="settings-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const client = getSupabaseClient(prefs);
                    if (client) {
                      setCloudStatus('syncing');
                      pushStateToSupabase(client, state)
                        .then(() => {
                          setCloudStatus('connected');
                          pushToast(
                            'Sinkronisasi Supabase Berhasil',
                            'Seluruh proyek, tugas, tiket, dan QA test case telah tersimpan di cloud.'
                          );
                        })
                        .catch((err: Error) => {
                          setCloudStatus('error');
                          pushToast('Gagal Sinkronisasi Supabase', err.message);
                        });
                    } else {
                      pushToast('Disimpan Lokal', 'Konfigurasi workspace berhasil disimpan.');
                    }
                  }}
                >
                  <div className="form-grid">
                    <label className="field full">
                      <span>Supabase Project URL</span>
                      <input
                        type="url"
                        placeholder="https://xxxx.supabase.co"
                        value={prefs.supabaseUrl || ''}
                        onChange={(e) => setPrefs((p) => ({ ...p, supabaseUrl: e.target.value }))}
                      />
                    </label>
                    <label className="field full">
                      <span>Supabase Anon Key</span>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={prefs.supabaseAnonKey || ''}
                        onChange={(e) =>
                          setPrefs((p) => ({ ...p, supabaseAnonKey: e.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="settings-form-actions">
                    <button
                      type="button"
                      className="button danger-ghost"
                      onClick={() =>
                        askConfirm(
                          'Kosongkan Seluruh Data Contoh?',
                          'Seluruh proyek, tugas, tiket, dan test case contoh akan dihapus agar Anda bisa mulai dari awal.',
                          () => {
                            persistState({
                              events: [],
                              tasks: [],
                              projects: [],
                              tickets: [],
                              scenarios: [],
                              testCases: [],
                              notifications: []
                            });
                            pushToast('Data Dikosongkan', 'Ruang kerja siap diisi dari awal.');
                          },
                          'Ya, Kosongkan'
                        )
                      }
                    >
                      Mulai Kosong
                    </button>
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => {
                        const payload = JSON.stringify({ state, prefs }, null, 2);
                        const blob = new Blob([payload], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ruang-waktu-backup-${dateKey(today)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        pushToast('Ekspor Berhasil', 'File JSON berhasil diunduh.');
                      }}
                    >
                      Ekspor JSON
                    </button>
                    <button type="submit" className="button primary">
                      Simpan &amp; Sinkronkan
                    </button>
                  </div>
                </form>
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
                    ? 'Tugas Karyawan'
                    : modalKind === 'ticket'
                      ? 'Tiket Komplain Klien'
                      : modalKind === 'scenario'
                        ? 'Test Scenario QA'
                        : modalKind === 'testcase'
                          ? 'Test Case QA'
                          : modalKind === 'project'
                            ? 'Proyek'
                            : 'Agenda'}
                </h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup dialog">
                ×
              </button>
            </header>

            <div className="modal-tabs">
              {(
                [
                  ['task', 'Tugas Karyawan'],
                  ['ticket', 'Tiket Klien'],
                  ['scenario', 'Test Scenario'],
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
                      <span>Judul tugas karyawan *</span>
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
                        {['Todo', 'In Progress', 'In Review', 'Done'].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Nama karyawan (Assignee) *</span>
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
                        {['Kritis', 'Tinggi', 'Sedang', 'Rendah'].map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
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
                          `TKT-${state.tickets.length + 101}`
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
                        {['Kritis', 'Tinggi', 'Sedang', 'Rendah'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Status tiket</span>
                      <select
                        name="status"
                        defaultValue={(editingItem as ClientTicket | null)?.status || 'Open'}
                      >
                        {['Open', 'Investigasi', 'Diperbaiki', 'Closed'].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>PIC Karyawan Penanggung Jawab</span>
                      <input
                        name="assignee"
                        defaultValue={
                          (editingItem as ClientTicket | null)?.assignee || prefs.userName
                        }
                      />
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
                          `TS-${String(state.scenarios.length + 1).padStart(2, '0')}`
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
                      <span>Judul Test Scenario *</span>
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
                          `TC-${String(state.testCases.length + 1).padStart(3, '0')}`
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Test Scenario Terkait</span>
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
                      <span>Langkah Pengujian (Test Steps) *</span>
                      <textarea
                        name="steps"
                        required
                        defaultValue={(editingItem as TestCase | null)?.steps || ''}
                        placeholder="1. Buka menu transfer&#10;2. Masukkan nominal Rp 50.000&#10;3. Klik Kirim"
                      />
                    </label>
                    <label className="field full">
                      <span>Hasil yang Diharapkan (Expected Result) *</span>
                      <input
                        name="expectedResult"
                        required
                        defaultValue={(editingItem as TestCase | null)?.expectedResult || ''}
                        placeholder="Sistem menolak transaksi dan menampilkan pesan Saldo Tidak Cukup"
                      />
                    </label>
                    <label className="field full">
                      <span>Hasil Aktual (Actual Result)</span>
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
                        {['Pass', 'Fail', 'Blocked', 'Pending'].map((st) => (
                          <option key={st} value={st}>
                            {st}
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
                        {['Kritis', 'Tinggi', 'Sedang', 'Rendah'].map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Nama Penguji (QA Tester)</span>
                      <input
                        name="tester"
                        defaultValue={(editingItem as TestCase | null)?.tester || prefs.userName}
                      />
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
            <div className="confirm-icon">
              <AlertTriangle size={22} />
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
                className="button danger-solid"
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
