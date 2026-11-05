import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

// Ruang Waktu Brand Logo Icon (Direct from icon.png specification)
export const BrandLogoIcon: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect width="512" height="512" rx="112" fill="currentColor" fillOpacity="0.1" />
    <rect x="24" y="24" width="464" height="464" rx="92" stroke="currentColor" strokeWidth="20" strokeOpacity="0.2" />
    <circle cx="376" cy="136" r="32" fill="#10B981" />
    <path
      d="M168 144h112c52 0 86 28 86 74 0 34-18 58-52 68l60 82h-60l-52-72h-34v72h-60V144zm60 44v60h52c22 0 36-12 36-30s-14-30-36-30h-52z"
      fill="#10B981"
    />
  </svg>
);

// 1. Dashboard Icon (Linear / Raycast inspired split canvas grid)
export const DashboardIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="7.5" height="10.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="6" rx="2" />
    <rect x="13.5" y="12" width="7.5" height="9" rx="2" />
    <rect x="3" y="16.5" width="7.5" height="4.5" rx="2" />
  </svg>
);

// 2. Projects Icon (Workspace folders & roadmap canvas)
export const ProjectsIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9.2C9.8 4.5 10.3 4.8 10.7 5.2L12.3 7.3C12.7 7.7 13.2 8 13.8 8H19C20.1 8 21 8.9 21 10V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V6.5Z" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <line x1="8" y1="11" x2="12" y2="11" />
  </svg>
);

// 3. Tasks Icon (Segmented checkbox with precision check glyph)
export const TasksIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <path d="M8 12.5L10.8 15.3L16 9.5" />
  </svg>
);

// 4. Tickets Icon (Support stub with punch notches and barcode accent)
export const TicketsIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 9C4 9 5 8 5 6.5C5 5 4 4 2.5 4H21.5C20 4 19 5 19 6.5C19 8 20 9 21.5 9V15C20 15 19 16 19 17.5C19 19 20 20 21.5 20H2.5C4 20 5 19 5 17.5C5 16 4 15 2.5 15V9Z" />
    <line x1="12" y1="8" x2="12" y2="16" strokeDasharray="2 2" />
  </svg>
);

// 5. QA Testing Icon (Chemical laboratory flask / precision verification beaker)
export const QAIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 3H15" />
    <path d="M10 3V8.5L5.2 17.5C4.6 18.6 5.4 20 6.6 20H17.4C18.6 20 19.4 18.6 18.8 17.5L14 8.5V3" />
    <line x1="7.5" y1="15" x2="16.5" y2="15" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
  </svg>
);

// 6. Calendar Icon (Modern date slate with active status pill)
export const CalendarIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <line x1="16" y1="2.5" x2="16" y2="5" />
    <line x1="8" y1="2.5" x2="8" y2="5" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <circle cx="12" cy="14.5" r="1.5" fill="currentColor" />
  </svg>
);

// 7. Analytics / Insights Icon (Stepped telemetry meters)
export const AnalyticsIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="13" width="4" height="8" rx="1.5" />
    <rect x="10" y="8" width="4" height="13" rx="1.5" />
    <rect x="17" y="3" width="4" height="18" rx="1.5" />
  </svg>
);

// 8. Notifications Icon (Resonant bell chime)
export const NotificationsIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 8.5C18 5.46 15.31 3 12 3C8.69 3 6 5.46 6 8.5C6 14.5 4 16.5 4 16.5H20C20 16.5 18 14.5 18 8.5Z" />
    <path d="M10.2 19.5C10.6 20.4 11.2 21 12 21C12.8 21 13.4 20.4 13.8 19.5" />
  </svg>
);

// 9. Settings Icon (Concentric precision rotary dial)
export const SettingsIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// 10. Search Icon (Precision magnifying scanner)
export const SearchIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="11" cy="11" r="7.5" />
    <path d="M20.5 20.5L16.3 16.3" />
  </svg>
);

// 11. Plus / Add Icon (Micro-action plus)
export const PlusIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// 12. Sound SFX Icon (Speaker waves)
export const VolumeIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

// 13. Sound SFX Muted Icon
export const VolumeMuteIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);

// 14. Ambient BackSound Icon (Ambient tone wave)
export const AmbientMusicIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

// 15. Ambient BackSound Muted
export const AmbientMusicOffIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
    <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
  </svg>
);

// 16. Theme Dark / Moon Icon
export const ThemeMoonIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// 17. Theme Light / Sun Icon
export const ThemeSunIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="4.5" />
    <line x1="12" y1="1.5" x2="12" y2="3.5" />
    <line x1="12" y1="20.5" x2="12" y2="22.5" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1.5" y1="12" x2="3.5" y2="12" />
    <line x1="20.5" y1="12" x2="22.5" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// 18. Security / Shield Check Icon
export const SecurityShieldIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// 19. Database / Cloud Sync Icon
export const DatabaseSyncIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <ellipse cx="12" cy="5" rx="8.5" ry="3" />
    <path d="M3.5 5v6c0 1.66 3.8 3 8.5 3s8.5-1.34 8.5-3V5" />
    <path d="M3.5 11v6c0 1.66 3.8 3 8.5 3s8.5-1.34 8.5-3v-6" />
  </svg>
);

// 20. Scenario / Test Suite Icon (Linear style binder folder)
export const ScenarioIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9.2C9.8 4.5 10.3 4.8 10.7 5.2L12.3 7.3C12.7 7.7 13.2 8 13.8 8H19C20.1 8 21 8.9 21 10V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V6.5Z" />
    <circle cx="9.5" cy="14" r="1.2" fill="currentColor" />
    <line x1="13" y1="14" x2="17" y2="14" />
  </svg>
);

// 21. Sparkles / AI Assistant Icon
export const AssistantSparklesIcon: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z" />
    <path d="M19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
  </svg>
);

// Catalog of all custom icons for easy review
export const CUSTOM_ICONS_CATALOG = [
  {
    name: 'BrandLogoIcon',
    label: 'Logo Utama Ruang Waktu',
    component: BrandLogoIcon,
    reference: 'Ruang Waktu Brand Identity / icon.png',
    category: 'Brand'
  },
  {
    name: 'DashboardIcon',
    label: 'Dashboard Ruang Kerja',
    component: DashboardIcon,
    reference: 'Linear & Raycast App Workspace',
    category: 'Navigasi'
  },
  {
    name: 'ProjectsIcon',
    label: 'Manajemen Proyek',
    component: ProjectsIcon,
    reference: 'GitHub Projects & Vercel Dashboard',
    category: 'Navigasi'
  },
  {
    name: 'TasksIcon',
    label: 'Papan Tugas Karyawan',
    component: TasksIcon,
    reference: 'Notion & Things 3 Checklist Matrix',
    category: 'Navigasi'
  },
  {
    name: 'TicketsIcon',
    label: 'Helpdesk Komplain Klien',
    component: TicketsIcon,
    reference: 'Zendesk & Linear Issue Stub',
    category: 'Navigasi'
  },
  {
    name: 'QAIcon',
    label: 'QA Studio & Skenario Uji',
    component: QAIcon,
    reference: 'Postman & Cypress Test Laboratory',
    category: 'Navigasi'
  },
  {
    name: 'CalendarIcon',
    label: 'Kalender & Jadwal Sprint',
    component: CalendarIcon,
    reference: 'Cron & Notion Calendar',
    category: 'Navigasi'
  },
  {
    name: 'AnalyticsIcon',
    label: 'Laporan & Telemetri',
    component: AnalyticsIcon,
    reference: 'Raycast Telemetry & Datadog Meters',
    category: 'Navigasi'
  },
  {
    name: 'NotificationsIcon',
    label: 'Pusat Notifikasi & SLA',
    component: NotificationsIcon,
    reference: 'Vercel Realtime Activity Chime',
    category: 'Navigasi'
  },
  {
    name: 'SettingsIcon',
    label: 'Pengaturan Sistem',
    component: SettingsIcon,
    reference: 'Apple macOS & Raycast Rotary Dial',
    category: 'Navigasi'
  },
  {
    name: 'SearchIcon',
    label: 'Pencarian Spotlight (Cmd+K)',
    component: SearchIcon,
    reference: 'Raycast Quick Search Scanner',
    category: 'Aksi'
  },
  {
    name: 'PlusIcon',
    label: 'Tambah Data Cepat',
    component: PlusIcon,
    reference: 'Linear Minimal Plus Action',
    category: 'Aksi'
  },
  {
    name: 'ScenarioIcon',
    label: 'Skenario Uji QA',
    component: ScenarioIcon,
    reference: 'Linear Binder Suite & Test Matrix',
    category: 'Navigasi'
  },
  {
    name: 'VolumeIcon',
    label: 'Efek Suara UI (SFX)',
    component: VolumeIcon,
    reference: 'Web Audio UI Mechanical Click',
    category: 'Media'
  },
  {
    name: 'SecurityShieldIcon',
    label: 'Keamanan & Autentikasi',
    component: SecurityShieldIcon,
    reference: 'Supabase RLS & Cloudflare Shield',
    category: 'Status'
  },
  {
    name: 'DatabaseSyncIcon',
    label: 'Koneksi Supabase DB',
    component: DatabaseSyncIcon,
    reference: 'PostgreSQL & Cloud Infrastructure',
    category: 'Status'
  },
  {
    name: 'AssistantSparklesIcon',
    label: 'Asisten AI & Rekomendasi',
    component: AssistantSparklesIcon,
    reference: 'Gemini & OpenAI Starburst',
    category: 'Fitur'
  }
];

