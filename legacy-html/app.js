const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const today = new Date();
today.setHours(0, 0, 0, 0);

let selected = new Date(today);
let view = 'dashboard';
let filter = 'all';
let kind = 'event';
let editing = null;

// Focus timer state
let focusDuration = 25 * 60;
let seconds = focusDuration;
let interval = null;
let totalFocusSeconds = Number(localStorage.getItem('ruangWaktuFocusSec') || 0);

// Command palette & PWA state
let cmdIndex = 0;
let deferredPwaPrompt = null;
const notifiedEvents = new Set();

// Helpers
const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const move = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const rel = (n) => key(move(today, n));
const id = () => Math.random().toString(36).slice(2, 9);

const fmt = (d, o = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Intl.DateTimeFormat('id-ID', o).format(d);

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const mins = (a, b) => {
  if (!a || !b) return 0;
  const [h, m] = a.split(':').map(Number);
  const [x, y] = b.split(':').map(Number);
  return Math.max(0, x * 60 + y - h * 60 - m);
};

const addMinsToTime = (timeStr, addMin) => {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + Number(addMin)) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
};

// Default preferences (Default Theme = Light, Soft low-glare)
const defaultPrefs = {
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
  userEmail: 'abil@example.com',
  userAvatar: 'AM',
  workspace: 'Ruang Pribadi'
};

let prefs = {
  ...defaultPrefs,
  ...JSON.parse(localStorage.getItem('ruangWaktuPrefs_v2') || '{}')
};

const savePrefs = () => {
  localStorage.setItem('ruangWaktuPrefs_v2', JSON.stringify(prefs));
};

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return 'Tanpa jam';
  if (prefs.timeFormat !== '12h') return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

// Default Application Data
const defaultState = {
  events: [
    ['Tinjau prioritas mingguan', '08:30', '09:00', 'Perencanaan'],
    ['Sesi kerja mendalam: arsitektur antarmuka', '09:30', '11:30', 'Fokus'],
    ['Istirahat makan siang & jeda layar', '12:15', '13:00', 'Pribadi'],
    ['Sinkronisasi progres proyek', '14:00', '14:45', 'Rapat'],
    ['Olahraga sore & peregangan', '17:30', '18:15', 'Kesehatan']
  ]
    .map(([title, startTime, endTime, category], i) => ({
      id: 'e' + i,
      title,
      startTime,
      endTime,
      category,
      date: rel(0),
      notes: ''
    }))
    .concat([
      {
        id: 'e6',
        title: 'Evaluasi catatan & baca buku',
        startTime: '20:00',
        endTime: '20:45',
        category: 'Pribadi',
        date: rel(1),
        notes: ''
      }
    ]),
  tasks: [
    ['Finalisasi sistem tipografi & palet warna', 'Tinggi', false, 'Ruang Waktu'],
    ['Kirim pembaruan rancangan ke klien', 'Tinggi', false, 'Website personal'],
    ['Susun agenda rapat mingguan', 'Sedang', false, 'Ruang Waktu'],
    ['Rapikan dokumentasi komponen UI', 'Rendah', true, 'Belajar UI sistem'],
    ['Perbarui halaman portofolio utama', 'Sedang', true, 'Website personal']
  ]
    .map(([title, priority, completed, project], i) => ({
      id: 't' + i,
      title,
      priority,
      completed,
      project,
      dueDate: rel(0),
      notes: ''
    }))
    .concat([
      {
        id: 't5',
        title: 'Eksplorasi interaksi kalender bulanan',
        priority: 'Sedang',
        completed: false,
        project: 'Ruang Waktu',
        dueDate: rel(1),
        notes: ''
      }
    ]),
  habits: [
    { id: 'h1', name: 'Minum air 2L', icon: '◌', completedDates: [rel(-2), rel(-1), rel(0)] },
    { id: 'h2', name: 'Olahraga 30m', icon: '↗', completedDates: [rel(-1)] },
    { id: 'h3', name: 'Membaca buku', icon: '▤', completedDates: [rel(-1), rel(0)] },
    { id: 'h4', name: 'Jurnal malam', icon: '✎', completedDates: [] }
  ],
  projects: [
    { id: 'p1', name: 'Ruang Waktu', status: 'Berjalan', notes: 'Pengembangan aplikasi produktivitas pribadi' },
    { id: 'p2', name: 'Website personal', status: 'Berjalan', notes: 'Pembaruan halaman portofolio dan studi kasus' },
    { id: 'p3', name: 'Belajar UI sistem', status: 'Belajar', notes: 'Eksplorasi komponen, token warna, dan aksesibilitas' }
  ]
};

let state = JSON.parse(localStorage.getItem('ruangWaktuState') || 'null') || structuredClone(defaultState);

// Migrate legacy habits if needed
state.habits = (state.habits || []).map((h) => {
  if (!Array.isArray(h.completedDates)) {
    return {
      ...h,
      completedDates: h.done ? [rel(0)] : []
    };
  }
  return h;
});

const save = () => {
  localStorage.setItem('ruangWaktuState', JSON.stringify(state));
};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================================
// WEB AUDIO API CHIME & BROWSER NOTIFICATIONS
// ============================================================================
function playChime() {
  if (!prefs.soundEffects) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.16);
      gain.gain.setValueAtTime(0.001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.7);
    });
  } catch (_) {}
}

function updateNotifStatusText() {
  const el = $('#notifPermissionStatus');
  const btn = $('#requestNotifBtn');
  if (!el || !btn) return;
  if (!('Notification' in window)) {
    el.textContent = 'Browser ini tidak mendukung notifikasi sistem.';
    btn.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    el.textContent = 'Izin aktif — pengingat akan tampil di perangkat Anda.';
    btn.textContent = 'Tes Notifikasi';
  } else if (Notification.permission === 'denied') {
    el.textContent = 'Izin ditolak di pengaturan browser Anda.';
    btn.textContent = 'Cek Izin';
  } else {
    el.textContent = 'Aktifkan agar pengingat muncul di desktop atau HP Anda.';
    btn.textContent = 'Aktifkan & Tes';
  }
}

function sendSystemNotification(title, body) {
  playChime();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'icon.svg' });
      return;
    } catch (_) {}
  }
  toast(`${title}: ${body}`);
}

function checkUpcomingScheduleReminders() {
  if (!prefs.remindSchedule) return;
  const nowStr = new Date().toTimeString().slice(0, 5);
  const todayKey = key(new Date());
  state.events.forEach((e) => {
    const uniqueKey = `${e.id}_${todayKey}_${e.startTime}`;
    if (e.date === todayKey && e.startTime === nowStr && !notifiedEvents.has(uniqueKey)) {
      notifiedEvents.add(uniqueKey);
      sendSystemNotification('Jadwal Dimulai Sekarang', `${e.title} (${formatTimeDisplay(e.startTime)})`);
    }
  });
}

// ============================================================================
// HABIT HELPERS (DATE-AWARE & STREAKS)
// ============================================================================
function isHabitDoneOn(habit, dateKey) {
  return Array.isArray(habit.completedDates) && habit.completedDates.includes(dateKey);
}

function getHabitStreak(habit) {
  const dates = new Set(habit.completedDates || []);
  let streak = 0;
  let cursor = new Date(today);
  if (!dates.has(key(cursor))) {
    cursor = move(cursor, -1);
  }
  while (dates.has(key(cursor))) {
    streak++;
    cursor = move(cursor, -1);
  }
  return streak;
}

// ============================================================================
// THEME & VISUAL PREFERENCES (WITH CLICK ANIMATION)
// ============================================================================
function applyVisualPrefs() {
  const isDark = prefs.theme === 'dark';
  document.body.dataset.theme = prefs.theme;
  document.body.dataset.softness = prefs.lightSoftness || 'soft';
  document.body.dataset.accent = prefs.accent || 'emerald';
  document.body.dataset.calendarDensity = prefs.calendarDensity || 'standard';

  $('#themeColor').content = isDark ? '#060B09' : '#E6EEE9';
  $('#themeToggle').setAttribute('aria-pressed', String(isDark));
  $('#themeToggle').setAttribute(
    'aria-label',
    isDark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'
  );
  $('#settingsThemeToggle').checked = isDark;

  // Sync settings controls
  $('#settingLightSoftness').value = prefs.lightSoftness || 'soft';
  $('#settingCalendarDensity').value = prefs.calendarDensity || 'standard';
  $('#settingStartMonday').checked = Boolean(prefs.startMonday);
  $('#settingTimeFormat').value = prefs.timeFormat || '24h';
  $('#settingDefaultDuration').value = String(prefs.defaultDuration || 60);
  $('#settingRemindSchedule').checked = Boolean(prefs.remindSchedule);
  $('#settingRemindDeadline').checked = Boolean(prefs.remindDeadline);
  $('#settingSoundEffects').checked = prefs.soundEffects !== false;

  $$('#accentPicker .accent-swatch').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.accent === prefs.accent);
  });

  // Sync profile identity
  const firstName = (prefs.userName || 'Pengguna').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  $('#greetingTitle').textContent = `${timeGreeting}, ${firstName}.`;
  $('#headerUserName').textContent = prefs.userName;
  $('#menuUserName').textContent = prefs.userName;
  $('#menuUserEmail').textContent = prefs.userEmail;
  $('#headerAvatar').textContent = prefs.userAvatar || 'RW';
  $('#menuAvatar').textContent = prefs.userAvatar || 'RW';
  $('#workspaceLabel').textContent = prefs.workspace || 'Ruang Pribadi';
  $('#headerWorkspace').textContent = prefs.workspace || 'Ruang Pribadi';

  $('#settingUserName').value = prefs.userName || '';
  $('#settingUserEmail').value = prefs.userEmail || '';
  $('#settingUserAvatar').value = prefs.userAvatar || '';
  $('#settingWorkspace').value = prefs.workspace || '';

  updateNotifStatusText();
}

function toggleThemeWithAnimation(nextTheme, sourceElement) {
  const targetTheme = nextTheme || (prefs.theme === 'dark' ? 'light' : 'dark');
  if (targetTheme === prefs.theme) return;

  const btn = sourceElement || $('#themeToggle');
  btn.classList.add('is-animating');
  setTimeout(() => btn.classList.remove('is-animating'), 420);

  document.body.classList.add('theme-transitioning');
  clearTimeout(document.body._themeTimer);
  document.body._themeTimer = setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 400);

  if (document.startViewTransition && btn) {
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      prefs.theme = targetTheme;
      savePrefs();
      applyVisualPrefs();
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
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
    prefs.theme = targetTheme;
    savePrefs();
    applyVisualPrefs();
  }

  toast(targetTheme === 'dark' ? 'Tema gelap diaktifkan.' : 'Tema terang (teduh) diaktifkan.');
}

// ============================================================================
// PROJECT PROGRESS & METRICS CALCULATION
// ============================================================================
function getProjectStats(projectName) {
  const linked = state.tasks.filter(
    (t) => (t.project || '').toLowerCase() === projectName.toLowerCase()
  );
  if (!linked.length) {
    return { done: 0, total: 0, pct: 0, detail: 'Belum ada tugas terkait' };
  }
  const done = linked.filter((t) => t.completed).length;
  const pct = Math.round((done / linked.length) * 100);
  return {
    done,
    total: linked.length,
    pct,
    detail: `${done} dari ${linked.length} tugas selesai`
  };
}

function updateFocusMetricDisplay() {
  const activeUsed = focusDuration - seconds;
  const total = Math.max(0, totalFocusSeconds + (interval ? activeUsed : 0));
  const hrs = Math.floor(total / 3600);
  const mns = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  $('#focusMetric').textContent = `${hrs}j ${mns}m`;
}

// ============================================================================
// RENDER VIEWS
// ============================================================================
function renderDashboard() {
  const day = key(selected);
  const isToday = day === key(today);
  const nowStr = new Date().toTimeString().slice(0, 5);

  $('#liveClock').textContent = formatTimeDisplay(nowStr);

  const events = state.events
    .filter((e) => e.date === day)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  const tasks = state.tasks.filter((t) => t.dueDate === day);
  const openTasks = tasks.filter((t) => !t.completed);
  const nextEvent =
    events.find((e) => !isToday || !e.startTime || e.startTime >= nowStr) || events[0];

  const weekTasks = state.tasks.filter((t) => t.dueDate >= rel(-6) && t.dueDate <= rel(0));
  const weekDone = weekTasks.filter((t) => t.completed).length;
  const weekPct = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;

  $('#dateLabel').textContent = fmt(selected, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  $('#scheduleLabel').textContent = isToday
    ? 'Agenda terurut untuk hari ini'
    : `Agenda pada ${fmt(selected)}`;

  $('#taskMetric').textContent = openTasks.length;
  $('#taskNote').textContent = `${tasks.filter((t) => t.completed).length} selesai dari ${tasks.length} tugas hari ini`;

  $('#eventMetric').textContent = nextEvent
    ? formatTimeDisplay(nextEvent.startTime)
    : '—';
  $('#eventNote').textContent = nextEvent ? nextEvent.title : 'Tidak ada agenda terjadwal';

  $('#weekMetric').textContent = `${weekPct}%`;
  $('#weekBar').style.width = `${weekPct}%`;
  $('#sideProgressText').textContent = `${weekPct}%`;
  $('#sideProgressBar').style.width = `${weekPct}%`;

  $('#noticeDot').style.display =
    (prefs.remindDeadline && openTasks.length > 0) || (prefs.remindSchedule && events.length > 0)
      ? 'block'
      : 'none';

  // Render Timeline
  $('#timeline').innerHTML = events.length
    ? events
        .map((e) => {
          const isPast = isToday && e.endTime && e.endTime < nowStr;
          const isLive =
            isToday && e.startTime && e.endTime && e.startTime <= nowStr && e.endTime >= nowStr;
          const duration = mins(e.startTime, e.endTime);

          return `
            <div class="event ${isPast ? 'is-past' : ''} ${isLive ? 'is-live' : ''}">
              <div class="event-time">
                ${esc(formatTimeDisplay(e.startTime))}
                <small>${e.endTime ? esc(formatTimeDisplay(e.endTime)) : ''}</small>
              </div>
              <div class="event-dot"></div>
              <div class="event-content" data-edit-event="${esc(e.id)}">
                <div>
                  <b>
                    ${esc(e.title)}
                    ${isLive ? '<span class="live-pill">BERLANGSUNG</span>' : ''}
                  </b>
                  <p>${esc(e.category || 'Umum')}${duration ? ` · ${duration} menit` : ''}${e.notes ? ` · ${esc(e.notes)}` : ''}</p>
                </div>
                <button type="button" data-edit-event="${esc(e.id)}" aria-label="Ubah kegiatan">⋯</button>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">Tidak ada agenda pada tanggal ini. Klik "+ Tambah kegiatan ke jadwal" untuk merencanakan hari Anda.</p>';

  // Render Top 3 Priorities
  const priorities = state.tasks
    .filter((t) => !t.completed)
    .sort(
      (a, b) =>
        ['Tinggi', 'Sedang', 'Rendah'].indexOf(a.priority) -
        ['Tinggi', 'Sedang', 'Rendah'].indexOf(b.priority)
    )
    .slice(0, 3);

  $('#priorities').innerHTML =
    priorities
      .map(
        (t, i) => `
        <div class="priority">
          <span>0${i + 1}</span>
          <div class="priority-body" data-edit-task="${esc(t.id)}">
            <b>${esc(t.title)}</b>
            <small>${esc(t.project || 'Pribadi')} · Prioritas ${esc(t.priority)}</small>
          </div>
          <button type="button" data-toggle="${esc(t.id)}" title="Tandai selesai" aria-label="Tandai selesai">✓</button>
        </div>
      `
      )
      .join('') || '<p class="empty">Semua tugas prioritas telah selesai.</p>';

  // Render Habits for selected date
  const hs = state.habits;
  const doneCount = hs.filter((h) => isHabitDoneOn(h, day)).length;
  $('#habitNote').textContent = `${doneCount} dari ${hs.length} kebiasaan selesai`;
  $('#habits').innerHTML = hs.length
    ? hs
        .map((h) => {
          const done = isHabitDoneOn(h, day);
          return `
            <button type="button" class="habit ${done ? 'done' : ''}" data-habit="${esc(h.id)}">
              <i>${done ? '✓' : esc(h.icon)}</i>
              <span>${esc(h.name)}</span>
            </button>
          `;
        })
        .join('')
    : '<p class="empty" style="grid-column:1/-1;padding:12px">Belum ada kebiasaan.</p>';

  // Render Active Projects with dynamic progress
  $('#projects').innerHTML = state.projects.length
    ? state.projects
        .map((p) => {
          const stats = getProjectStats(p.name);
          return `
            <div class="project" data-edit-project="${esc(p.id)}" style="cursor:pointer">
              <div>
                <b>${esc(p.name)}</b>
                <small>${esc(stats.detail)}</small>
              </div>
              <i><b style="width:${stats.pct}%"></b></i>
              <span>${stats.pct}%</span>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">Belum ada proyek aktif.</p>';

  // Bind Dashboard Events
  $$('#timeline [data-edit-event]').forEach((el) => {
    el.onclick = (ev) => {
      ev.stopPropagation();
      const item = state.events.find((e) => e.id === el.dataset.editEvent);
      if (item) openModal('event', item);
    };
  });

  $$('#priorities [data-edit-task]').forEach((el) => {
    el.onclick = () => {
      const item = state.tasks.find((t) => t.id === el.dataset.editTask);
      if (item) openModal('task', item);
    };
  });

  $$('#priorities [data-toggle]').forEach((b) => {
    b.onclick = () => toggleTask(b.dataset.toggle);
  });

  $$('#habits [data-habit]').forEach((b) => {
    b.onclick = () => toggleHabit(b.dataset.habit);
  });

  $$('#projects [data-edit-project]').forEach((el) => {
    el.onclick = () => {
      const item = state.projects.find((p) => p.id === el.dataset.editProject);
      if (item) openModal('project', item);
    };
  });
}

function renderCalendar() {
  const startMonday = prefs.startMonday !== false;
  const weekdayLabels = startMonday
    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  $('#calendarWeekdays').innerHTML = weekdayLabels.map((w) => `<span>${w}</span>`).join('');

  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const offset = startMonday ? (first.getDay() + 6) % 7 : first.getDay();
  const start = move(first, -offset);

  $('#calendarTitle').textContent = fmt(selected, { month: 'long', year: 'numeric' });

  $('#calendarDays').innerHTML = Array.from({ length: 42 }, (_, i) => {
    const d = move(start, i);
    const k = key(d);
    const dayEvents = state.events
      .filter((e) => e.date === k)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const shown = dayEvents.slice(0, 2);
    const extra = dayEvents.length - shown.length;

    return `
      <button type="button" class="calendar-day ${d.getMonth() !== selected.getMonth() ? 'other' : ''} ${k === key(today) ? 'current' : ''}" data-day="${k}">
        <span class="calendar-day-num">${d.getDate()}</span>
        ${shown
          .map(
            (e) =>
              `<div class="calendar-event">${esc(formatTimeDisplay(e.startTime))} ${esc(e.title)}</div>`
          )
          .join('')}
        ${extra > 0 ? `<span class="calendar-more">+${extra} kegiatan lagi</span>` : ''}
      </button>
    `;
  }).join('');

  $$('[data-day]').forEach((b) => {
    b.onclick = () => {
      selected = new Date(b.dataset.day + 'T00:00:00');
      show('dashboard');
      toast(`Menampilkan jadwal ${fmt(selected, { day: 'numeric', month: 'long' })}`);
    };
  });
}

function renderTasks() {
  const pr = $('#priorityFilter').value;
  const query = ($('#taskSearchInput')?.value || '').trim().toLowerCase();

  const list = state.tasks
    .filter(
      (t) =>
        filter === 'all' ||
        (filter === 'open' && !t.completed) ||
        (filter === 'done' && t.completed) ||
        (filter === 'today' && t.dueDate === key(today))
    )
    .filter((t) => pr === 'all' || t.priority === pr)
    .filter(
      (t) =>
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.project || '').toLowerCase().includes(query) ||
        (t.notes || '').toLowerCase().includes(query)
    );

  $('#taskList').innerHTML = list.length
    ? list
        .map(
          (t) => `
          <div class="task ${t.completed ? 'done' : ''}">
            <button type="button" class="task-check" data-toggle="${esc(t.id)}" aria-label="Tandai tugas selesai">
              ${t.completed ? '✓' : ''}
            </button>
            <div class="task-body" data-edit-task="${esc(t.id)}">
              <b>${esc(t.title)}</b>
              <small>${t.dueDate ? fmt(new Date(t.dueDate + 'T00:00:00'), { day: 'numeric', month: 'short' }) : 'Tanpa tenggat'}${t.notes ? ' · ' + esc(t.notes) : ''}</small>
            </div>
            <span class="task-project">${esc(t.project || 'Pribadi')}</span>
            <span class="pill ${esc(t.priority.toLowerCase())}">${esc(t.priority)}</span>
            <button type="button" class="task-delete" data-delete="${esc(t.id)}" aria-label="Hapus tugas">×</button>
          </div>
        `
        )
        .join('')
    : '<p class="empty">Tidak ada tugas yang cocok dengan filter atau pencarian ini.</p>';

  $('#taskBadge').textContent = state.tasks.filter((t) => !t.completed).length;

  $$('#taskList [data-toggle]').forEach((b) => {
    b.onclick = () => toggleTask(b.dataset.toggle);
  });
  $$('#taskList [data-edit-task]').forEach((el) => {
    el.onclick = () => {
      const item = state.tasks.find((t) => t.id === el.dataset.editTask);
      if (item) openModal('task', item);
    };
  });
  $$('#taskList [data-delete]').forEach((b) => {
    b.onclick = () => delTask(b.dataset.delete);
  });
}

function renderOther() {
  const dayKey = key(selected);
  const h = state.habits;

  $('#habitManager').innerHTML = h.length
    ? h
        .map((x) => {
          const done = isHabitDoneOn(x, dayKey);
          const streak = getHabitStreak(x);
          return `
            <div>
              <span style="cursor:pointer" data-edit-habit="${esc(x.id)}">
                <b>${esc(x.icon)} ${esc(x.name)}</b>
                <small>Rentetan aktif: ${streak} hari berturut-turut · Klik untuk ubah</small>
              </span>
              <div class="habit-row-actions">
                <button type="button" class="habit-toggle-btn ${done ? 'done' : ''}" data-habit="${esc(x.id)}">
                  ${done ? '✓ Selesai hari ini' : 'Tandai selesai'}
                </button>
                <button type="button" class="task-delete" data-del-habit="${esc(x.id)}" aria-label="Hapus kebiasaan">×</button>
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="empty">Belum ada kebiasaan harian. Klik "+ Kebiasaan baru" untuk memulai.</p>';

  $$('#habitManager [data-habit]').forEach((b) => {
    b.onclick = () => toggleHabit(b.dataset.habit);
  });
  $$('#habitManager [data-edit-habit]').forEach((el) => {
    el.onclick = () => {
      const item = state.habits.find((x) => x.id === el.dataset.editHabit);
      if (item) openModal('habit', item);
    };
  });
  $$('#habitManager [data-del-habit]').forEach((b) => {
    b.onclick = () => {
      state.habits = state.habits.filter((x) => x.id !== b.dataset.delHabit);
      save();
      render();
      toast('Kebiasaan dihapus.');
    };
  });

  // Projects Board
  $('#board').innerHTML = ['Berjalan', 'Belajar', 'Selesai']
    .map((status) => {
      const cols = state.projects.filter((p) => p.status === status);
      return `
        <div class="column">
          <h3>${status} <span>${cols.length}</span></h3>
          ${
            cols
              .map((p) => {
                const stats = getProjectStats(p.name);
                return `
                  <div class="board-item" data-edit-project="${esc(p.id)}">
                    <b>${esc(p.name)}</b>
                    <small>${esc(p.notes ? p.notes + ' · ' : '')}${esc(stats.detail)} (${stats.pct}%)</small>
                    <div class="progress slim"><b style="width:${stats.pct}%"></b></div>
                  </div>
                `;
              })
              .join('') || '<p class="empty">Belum ada proyek pada kolom ini.</p>'
          }
        </div>
      `;
    })
    .join('');

  $$('#board [data-edit-project]').forEach((el) => {
    el.onclick = () => {
      const item = state.projects.find((p) => p.id === el.dataset.editProject);
      if (item) openModal('project', item);
    };
  });

  // Focus Select
  const openTasks = state.tasks.filter((t) => !t.completed);
  $('#focusSelect').innerHTML =
    openTasks.map((t) => `<option value="${esc(t.id)}">${esc(t.title)} (${esc(t.project)})</option>`).join('') ||
    '<option>Semua tugas telah selesai</option>';

  // Insights & Breakdowns
  const totalDone = state.tasks.filter((t) => t.completed).length;
  const hpct = h.length ? Math.round((h.filter((x) => isHabitDoneOn(x, dayKey)).length / h.length) * 100) : 0;

  $('#insights').innerHTML = `
    <div>
      <span>TUGAS DISELESAIKAN</span>
      <b>${totalDone} dari ${state.tasks.length}</b>
    </div>
    <div>
      <span>TOTAL WAKTU FOKUS</span>
      <b>${$('#focusMetric').textContent}</b>
    </div>
    <div>
      <span>KONSISTENSI HARI INI</span>
      <b>${hpct}%</b>
    </div>
  `;

  // 7-Day Activity Bar Chart
  const days7 = Array.from({ length: 7 }, (_, i) => move(today, i - 4));
  const counts = days7.map((d) => {
    const k = key(d);
    const evC = state.events.filter((e) => e.date === k).length;
    const tkC = state.tasks.filter((t) => t.dueDate === k).length;
    return {
      date: d,
      key: k,
      total: evC + tkC,
      label: fmt(d, { weekday: 'short' })
    };
  });
  const maxDayCount = Math.max(1, ...counts.map((c) => c.total));

  $('#weeklyChart').innerHTML = counts
    .map((c) => {
      const heightPct = Math.max(8, Math.round((c.total / maxDayCount) * 100));
      return `
        <div class="chart-col">
          <span class="chart-val">${c.total} item</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${heightPct}%"></div>
          </div>
          <span class="chart-day">${esc(c.label)}</span>
        </div>
      `;
    })
    .join('');

  // Category Breakdown
  const catMap = {};
  let totalEventMins = 0;
  state.events.forEach((e) => {
    const dur = mins(e.startTime, e.endTime) || 30;
    const cat = e.category || 'Umum';
    catMap[cat] = (catMap[cat] || 0) + dur;
    totalEventMins += dur;
  });

  $('#categoryBreakdown').innerHTML = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, m]) => {
      const pct = totalEventMins ? Math.round((m / totalEventMins) * 100) : 0;
      return `
        <div class="breakdown-item">
          <div class="breakdown-head">
            <b>${esc(cat)}</b>
            <span>${m} menit (${pct}%)</span>
          </div>
          <div class="progress slim"><b style="width:${pct}%"></b></div>
        </div>
      `;
    })
    .join('') || '<p class="empty">Belum ada data kegiatan.</p>';

  // Priority Breakdown
  $('#priorityBreakdown').innerHTML = ['Tinggi', 'Sedang', 'Rendah']
    .map((prio) => {
      const allP = state.tasks.filter((t) => t.priority === prio);
      const doneP = allP.filter((t) => t.completed).length;
      const pct = allP.length ? Math.round((doneP / allP.length) * 100) : 0;
      return `
        <div class="breakdown-item">
          <div class="breakdown-head">
            <b>Prioritas ${prio}</b>
            <span>${doneP}/${allP.length} selesai (${pct}%)</span>
          </div>
          <div class="progress slim"><b style="width:${pct}%"></b></div>
        </div>
      `;
    })
    .join('');
}

function render() {
  updateFocusMetricDisplay();
  renderDashboard();
  renderCalendar();
  renderTasks();
  renderOther();

  const savedNote = localStorage.getItem('ruangWaktuNote') || '';
  if ($('#quickNote').value !== savedNote) {
    $('#quickNote').value = savedNote;
  }
}

function show(v) {
  view = v;
  $$('.view').forEach((x) => x.classList.toggle('active', x.id === v + 'View'));
  $$('[data-view]').forEach((x) => {
    if (x.closest('.nav') || x.classList.contains('settings-nav')) {
      x.classList.toggle('active', x.dataset.view === v);
    }
  });

  const names = {
    dashboard: 'Ringkasan',
    calendar: 'Kalender',
    tasks: 'Tugas saya',
    projects: 'Proyek',
    habits: 'Kebiasaan',
    focus: 'Mode fokus',
    insights: 'Wawasan',
    settings: 'Pengaturan'
  };

  $('#crumb').textContent = names[v] || 'Ringkasan';
  const sub =
    v === 'dashboard'
      ? key(selected) === key(today)
        ? 'Hari ini'
        : fmt(selected, { day: 'numeric', month: 'short' })
      : '';
  $('#crumbSub').textContent = sub;
  $('#crumbSep').style.display = sub ? 'inline' : 'none';

  $('.sidebar').classList.remove('open');
  render();
}

// ============================================================================
// ACTIONS & MODAL (EVENT, TASK, PROJECT, HABIT)
// ============================================================================
function toggleTask(i) {
  const t = state.tasks.find((x) => x.id === i);
  if (!t) return;
  t.completed = !t.completed;
  save();
  render();
  toast(t.completed ? 'Tugas ditandai selesai.' : 'Tugas dibuka kembali.');
}

function toggleHabit(i) {
  const h = state.habits.find((x) => x.id === i);
  if (!h) return;
  const dayKey = key(selected);
  if (!Array.isArray(h.completedDates)) h.completedDates = [];
  const exists = h.completedDates.includes(dayKey);
  h.completedDates = exists
    ? h.completedDates.filter((d) => d !== dayKey)
    : [...h.completedDates, dayKey];
  save();
  render();
  toast(exists ? 'Status kebiasaan dibatalkan.' : 'Kebiasaan hari ini tercatat.');
}

function delTask(i) {
  const t = state.tasks.find((x) => x.id === i);
  if (t && confirm(`Hapus tugas "${t.title}"?`)) {
    state.tasks = state.tasks.filter((x) => x.id !== i);
    save();
    render();
    toast('Tugas dihapus.');
  }
}

function openModal(k = 'event', item = null) {
  kind = k;
  editing = item;

  const titles = {
    event: 'kegiatan',
    task: 'tugas',
    project: 'proyek',
    habit: 'kebiasaan'
  };

  $('#modalEyebrow').textContent = item ? 'PERBARUI ITEM' : 'ITEM BARU';
  $('#modalTitle').textContent = (item ? 'Ubah ' : 'Tambah ') + (titles[k] || 'item');
  $$('#modalTabs button').forEach((b) => b.classList.toggle('active', b.dataset.type === k));

  const delBtn = $('#deleteItemBtn');
  delBtn.hidden = !item;

  const date = item?.date || item?.dueDate || key(selected);
  const defaultStart = item?.startTime || '09:00';
  const defaultEnd = item?.endTime || addMinsToTime(defaultStart, prefs.defaultDuration || 60);
  const projectOptions = state.projects.map((p) => p.name);

  if (k === 'event') {
    $('#fields').innerHTML = `
      <label class="field full">
        <span>Nama kegiatan *</span>
        <input name="title" required placeholder="Contoh: Diskusi desain produk" value="${esc(item?.title)}">
      </label>
      <label class="field">
        <span>Tanggal *</span>
        <input name="date" type="date" required value="${esc(date)}">
      </label>
      <label class="field">
        <span>Kategori</span>
        <select name="category">
          ${['Fokus', 'Perencanaan', 'Rapat', 'Pribadi', 'Kesehatan', 'Keluarga']
            .map((x) => `<option ${item?.category === x ? 'selected' : ''}>${x}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field">
        <span>Waktu mulai</span>
        <input name="startTime" id="modalStartTime" type="time" value="${esc(item ? item.startTime : defaultStart)}">
      </label>
      <label class="field">
        <span>Waktu selesai</span>
        <input name="endTime" id="modalEndTime" type="time" value="${esc(item ? item.endTime : defaultEnd)}">
      </label>
      <label class="field full">
        <span>Catatan</span>
        <textarea name="notes" placeholder="Tambahkan detail lokasi, tautan rapat, atau agenda…">${esc(item?.notes)}</textarea>
      </label>
    `;
  } else if (k === 'task') {
    $('#fields').innerHTML = `
      <label class="field full">
        <span>Nama tugas *</span>
        <input name="title" required placeholder="Contoh: Tinjau ulang dokumen spesifikasi" value="${esc(item?.title)}">
      </label>
      <label class="field">
        <span>Jatuh tempo</span>
        <input name="dueDate" type="date" value="${esc(date)}">
      </label>
      <label class="field">
        <span>Prioritas</span>
        <select name="priority">
          ${['Tinggi', 'Sedang', 'Rendah']
            .map(
              (x) =>
                `<option ${item?.priority === x || (!item && x === 'Sedang') ? 'selected' : ''}>${x}</option>`
            )
            .join('')}
        </select>
      </label>
      <label class="field full">
        <span>Proyek</span>
        <input name="project" list="projectSuggestions" value="${esc(item?.project || projectOptions[0] || 'Pribadi')}">
        <datalist id="projectSuggestions">
          ${projectOptions.map((n) => `<option value="${esc(n)}"></option>`).join('')}
        </datalist>
      </label>
      <label class="field full">
        <span>Catatan</span>
        <textarea name="notes" placeholder="Catatan tambahan untuk tugas ini…">${esc(item?.notes)}</textarea>
      </label>
    `;
  } else if (k === 'project') {
    $('#fields').innerHTML = `
      <label class="field full">
        <span>Nama proyek *</span>
        <input name="name" required placeholder="Contoh: Peluncuran Aplikasi Mobile" value="${esc(item?.name)}">
      </label>
      <label class="field full">
        <span>Status proyek</span>
        <select name="status">
          ${['Berjalan', 'Belajar', 'Selesai']
            .map((x) => `<option ${item?.status === x ? 'selected' : ''}>${x}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field full">
        <span>Deskripsi singkat</span>
        <textarea name="notes" placeholder="Tujuan atau ruang lingkup proyek ini…">${esc(item?.notes)}</textarea>
      </label>
    `;
  } else if (k === 'habit') {
    $('#fields').innerHTML = `
      <label class="field full">
        <span>Nama kebiasaan *</span>
        <input name="name" required placeholder="Contoh: Meditasi pagi 10 menit" value="${esc(item?.name)}">
      </label>
      <label class="field full">
        <span>Simbol ikon</span>
        <select name="icon">
          ${[
            ['◌', '◌ Air / Kesehatan'],
            ['↗', '↗ Olahraga / Gerak'],
            ['▤', '▤ Membaca / Belajar'],
            ['✎', '✎ Jurnal / Menulis'],
            ['✦', '✦ Fokus / Meditasi']
          ]
            .map(
              ([val, label]) =>
                `<option value="${val}" ${item?.icon === val ? 'selected' : ''}>${label}</option>`
            )
            .join('')}
        </select>
      </label>
    `;
  }

  const startInput = $('#modalStartTime');
  const endInput = $('#modalEndTime');
  if (startInput && endInput && !item) {
    startInput.onchange = () => {
      if (startInput.value) {
        endInput.value = addMinsToTime(startInput.value, prefs.defaultDuration || 60);
      }
    };
  }

  $('#overlay').classList.add('open');
  setTimeout(() => $('#fields input')?.focus(), 20);
}

function closeModal() {
  $('#overlay').classList.remove('open');
}

$('#deleteItemBtn').onclick = () => {
  if (!editing) return;
  const label = editing.title || editing.name || 'item ini';
  if (!confirm(`Hapus "${label}"?`)) return;

  if (kind === 'event') {
    state.events = state.events.filter((e) => e.id !== editing.id);
  } else if (kind === 'task') {
    state.tasks = state.tasks.filter((t) => t.id !== editing.id);
  } else if (kind === 'project') {
    state.projects = state.projects.filter((p) => p.id !== editing.id);
  } else if (kind === 'habit') {
    state.habits = state.habits.filter((h) => h.id !== editing.id);
  }

  save();
  closeModal();
  render();
  toast('Item berhasil dihapus.');
};

$('#form').onsubmit = (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));

  if (kind === 'event') {
    if (d.startTime && d.endTime && d.startTime >= d.endTime) {
      return toast('Waktu selesai harus setelah waktu mulai.');
    }
    const item = { ...(editing || {}), ...d, id: editing?.id || id() };
    state.events = editing
      ? state.events.map((a) => (a.id === editing.id ? item : a))
      : [...state.events, item];
    selected = new Date(d.date + 'T00:00:00');
  } else if (kind === 'task') {
    const item = {
      ...(editing || {}),
      ...d,
      id: editing?.id || id(),
      completed: editing?.completed || false
    };
    state.tasks = editing
      ? state.tasks.map((a) => (a.id === editing.id ? item : a))
      : [...state.tasks, item];
  } else if (kind === 'project') {
    const item = { ...(editing || {}), ...d, id: editing?.id || id() };
    state.projects = editing
      ? state.projects.map((a) => (a.id === editing.id ? item : a))
      : [...state.projects, item];
  } else if (kind === 'habit') {
    const item = {
      ...(editing || {}),
      ...d,
      id: editing?.id || id(),
      completedDates: editing?.completedDates || []
    };
    state.habits = editing
      ? state.habits.map((a) => (a.id === editing.id ? item : a))
      : [...state.habits, item];
  }

  save();
  closeModal();
  render();
  toast(editing ? 'Perubahan berhasil disimpan.' : 'Item baru berhasil ditambahkan.');
};

// ============================================================================
// FOCUS TIMER WITH SVG RING & SOUND
// ============================================================================
const RING_CIRCUMFERENCE = 2 * Math.PI * 98;

function tick() {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  $('#timer').textContent = `${m}:${s}`;

  const progress = Math.max(0, Math.min(1, (focusDuration - seconds) / focusDuration));
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  const ring = $('#timerRingProgress');
  if (ring) {
    ring.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${offset}`;
  }
  updateFocusMetricDisplay();
}

function toggleFocusTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    $('#focusButton').textContent = 'Lanjutkan fokus';
    $('#focusState').textContent = 'DIJEDA';
    return;
  }

  if (seconds <= 0) seconds = focusDuration;
  $('#focusButton').textContent = 'Jeda sesi';
  $('#focusState').textContent = 'SEDANG FOKUS';

  interval = setInterval(() => {
    seconds--;
    totalFocusSeconds++;
    localStorage.setItem('ruangWaktuFocusSec', String(totalFocusSeconds));
    tick();

    if (seconds <= 0) {
      clearInterval(interval);
      interval = null;
      $('#focusButton').textContent = 'Mulai sesi baru';
      $('#focusState').textContent = 'SESI SELESAI';
      sendSystemNotification('Sesi Fokus Selesai', 'Waktunya istirahat sejenak dan regangkan tubuh Anda.');
    }
  }, 1000);
}

function resetFocusTimer(newMinutes) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  if (newMinutes) {
    focusDuration = newMinutes * 60;
  }
  seconds = focusDuration;
  $('#focusButton').textContent = 'Mulai fokus';
  $('#focusState').textContent = 'SIAP MEMULAI';
  tick();
}

$$('.focus-presets button').forEach((btn) => {
  btn.onclick = () => {
    $$('.focus-presets button').forEach((b) => b.classList.toggle('active', b === btn));
    resetFocusTimer(Number(btn.dataset.minutes));
  };
});

$('#focusButton').onclick = toggleFocusTimer;
$('#focusReset').onclick = () => {
  resetFocusTimer();
  toast('Timer fokus diatur ulang.');
};

// ============================================================================
// INTERACTIVE COMMAND PALETTE (CTRL+K)
// ============================================================================
function getCommandItems(query = '') {
  const q = query.trim().toLowerCase();
  const baseActions = [
    { label: '+ Tambah kegiatan jadwal baru', meta: 'Aksi', run: () => openModal('event') },
    { label: '+ Tambah tugas baru', meta: 'Aksi', run: () => openModal('task') },
    { label: '+ Tambah proyek baru', meta: 'Aksi', run: () => openModal('project') },
    { label: '+ Tambah kebiasaan baru', meta: 'Aksi', run: () => openModal('habit') },
    { label: 'Buka Ringkasan Hari Ini', meta: 'Navigasi', run: () => show('dashboard') },
    { label: 'Buka Kalender Bulanan', meta: 'Navigasi', run: () => show('calendar') },
    { label: 'Buka Daftar Tugas Saya', meta: 'Navigasi', run: () => show('tasks') },
    { label: 'Mulai Mode Fokus', meta: 'Navigasi', run: () => show('focus') },
    { label: 'Buka Wawasan & Statistik', meta: 'Navigasi', run: () => show('insights') },
    { label: 'Buka Pengaturan & Tema', meta: 'Navigasi', run: () => show('settings') },
    {
      label: prefs.theme === 'dark' ? 'Beralih ke Mode Terang (Teduh)' : 'Beralih ke Mode Gelap',
      meta: 'Tema',
      run: () => toggleThemeWithAnimation()
    }
  ];

  const taskMatches = state.tasks.map((t) => ({
    label: `Tugas: ${t.title}`,
    meta: t.completed ? 'Selesai' : `Prioritas ${t.priority}`,
    run: () => openModal('task', t)
  }));

  const eventMatches = state.events.map((e) => ({
    label: `Jadwal: ${e.title}`,
    meta: `${e.date} · ${formatTimeDisplay(e.startTime)}`,
    run: () => openModal('event', e)
  }));

  const projectMatches = state.projects.map((p) => ({
    label: `Proyek: ${p.name}`,
    meta: p.status,
    run: () => openModal('project', p)
  }));

  const all = [...baseActions, ...eventMatches, ...taskMatches, ...projectMatches];
  if (!q) return baseActions;
  return all.filter(
    (item) => item.label.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q)
  );
}

function renderCommandResults() {
  const items = getCommandItems($('#commandInput').value);
  if (cmdIndex >= items.length) cmdIndex = 0;

  $('#commandResults').innerHTML = items.length
    ? items
        .map(
          (item, i) => `
          <button type="button" class="${i === cmdIndex ? 'active' : ''}" data-cmd-idx="${i}">
            <span>${esc(item.label)}</span>
            <small>${esc(item.meta)}</small>
          </button>
        `
        )
        .join('')
    : '<p class="empty">Tidak ditemukan hasil yang cocok.</p>';

  $$('#commandResults [data-cmd-idx]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.cmdIdx);
      $('#command').classList.remove('open');
      items[idx]?.run();
    };
  });
}

function openCommandPalette() {
  closeAccount();
  $('#commandInput').value = '';
  cmdIndex = 0;
  renderCommandResults();
  $('#command').classList.add('open');
  setTimeout(() => $('#commandInput').focus(), 20);
}

$('#commandInput').oninput = () => {
  cmdIndex = 0;
  renderCommandResults();
};

$('#commandInput').onkeydown = (e) => {
  const items = getCommandItems($('#commandInput').value);
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdIndex = (cmdIndex + 1) % items.length;
    renderCommandResults();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdIndex = (cmdIndex - 1 + items.length) % items.length;
    renderCommandResults();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    $('#command').classList.remove('open');
    items[cmdIndex]?.run();
  }
};

// ============================================================================
// DATA BACKUP (EXPORT, IMPORT & START CLEAN)
// ============================================================================
function exportJsonBackup() {
  const data = JSON.stringify({ state, prefs, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruang-waktu-backup-${key(today)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Cadangan JSON berhasil diunduh.');
}

function triggerImportJson() {
  closeAccount();
  $('#importFileInput').click();
}

$('#importFileInput').onchange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (parsed.state && Array.isArray(parsed.state.events) && Array.isArray(parsed.state.tasks)) {
        state = parsed.state;
        save();
      }
      if (parsed.prefs) {
        prefs = { ...defaultPrefs, ...parsed.prefs };
        savePrefs();
        applyVisualPrefs();
      }
      render();
      toast('Data cadangan berhasil dipulihkan.');
    } catch (_) {
      toast('File JSON tidak valid.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
};

function clearAllDemoData() {
  closeAccount();
  if (
    confirm(
      'Kosongkan seluruh jadwal, tugas, proyek, dan kebiasaan contoh agar Anda bisa mulai mengisi data pribadi dari awal?'
    )
  ) {
    state = { events: [], tasks: [], habits: [], projects: [] };
    totalFocusSeconds = 0;
    localStorage.setItem('ruangWaktuFocusSec', '0');
    save();
    render();
    toast('Ruang kerja siap digunakan dari kosong.');
  }
}

// ============================================================================
// EVENT LISTENERS & SETTINGS WIRING
// ============================================================================
$$('[data-view]').forEach((b) => {
  b.onclick = () => show(b.dataset.view);
});

$('#brandLink').onclick = (e) => {
  e.preventDefault();
  show('dashboard');
};

$('#workspaceButton').onclick = () => show('settings');

$('#add').onclick = $('#addEvent').onclick = $('#calendarAdd').onclick = () => openModal('event');
$('#taskAdd').onclick = () => openModal('task');
$('#projectAdd').onclick = () => openModal('project');
$('#habitAdd').onclick = () => openModal('habit');

$('#prevDay').onclick = () => {
  selected = move(selected, -1);
  render();
};

$('#nextDay').onclick = () => {
  selected = move(selected, 1);
  render();
};

$('#today').onclick = () => {
  selected = new Date(today);
  render();
  toast('Kembali ke agenda hari ini.');
};

$('#calendarToday').onclick = () => {
  selected = new Date(today);
  renderCalendar();
  toast('Menampilkan bulan berjalan.');
};

$('#prevMonth').onclick = () => {
  selected = new Date(selected.getFullYear(), selected.getMonth() - 1, 1);
  renderCalendar();
};

$('#nextMonth').onclick = () => {
  selected = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
  renderCalendar();
};

$$('#modalTabs button').forEach((b) => {
  b.onclick = () => openModal(b.dataset.type, null);
});

$('#close').onclick = $('#cancel').onclick = closeModal;
$('#overlay').onclick = (e) => {
  if (e.target === $('#overlay')) closeModal();
};

$$('#filters button').forEach((b) => {
  b.onclick = () => {
    filter = b.dataset.filter;
    $$('#filters button').forEach((x) => x.classList.toggle('active', x === b));
    renderTasks();
  };
});

$('#priorityFilter').onchange = renderTasks;
$('#taskSearchInput').oninput = renderTasks;

$('#quickNote').oninput = (e) => {
  localStorage.setItem('ruangWaktuNote', e.target.value);
  $('#noteSaved').textContent = 'Tersimpan otomatis';
};

function closeAccount() {
  $('#accountMenu').classList.remove('open');
  $('#accountButton').setAttribute('aria-expanded', 'false');
}

$('#accountButton').onclick = () => {
  const open = !$('#accountMenu').classList.contains('open');
  $('#accountMenu').classList.toggle('open', open);
  $('#accountButton').setAttribute('aria-expanded', String(open));
};

$('#exportDataMenu').onclick = () => {
  closeAccount();
  exportJsonBackup();
};
$('#exportDataBtn').onclick = exportJsonBackup;
$('#importDataMenu').onclick = triggerImportJson;
$('#importDataBtn').onclick = triggerImportJson;
$('#clearAllDataMenu').onclick = clearAllDemoData;
$('#clearAllDataBtn').onclick = clearAllDemoData;

$('#logout').onclick = () => {
  closeAccount();
  if (confirm('Kembalikan seluruh jadwal dan tugas ke data contoh awal?')) {
    state = structuredClone(defaultState);
    save();
    render();
    toast('Data contoh awal berhasil dipulihkan.');
  }
};

$('#hamburger').onclick = () => {
  const shell = $('#shell');
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if (isMobile) {
    const open = !$('.sidebar').classList.contains('open');
    $('.sidebar').classList.toggle('open', open);
    $('#hamburger').setAttribute('aria-expanded', String(open));
  } else {
    const collapsed = !shell.classList.contains('sidebar-collapsed');
    shell.classList.toggle('sidebar-collapsed', collapsed);
    $('#hamburger').setAttribute('aria-expanded', String(!collapsed));
    localStorage.setItem('ruangWaktuSidebar', collapsed ? 'collapsed' : 'open');
  }
};

$('#sidebarClose').onclick = $('#sidebarScrim').onclick = () => {
  $('.sidebar').classList.remove('open');
  $('#hamburger').setAttribute('aria-expanded', 'false');
};

$('#notice').onclick = () => {
  closeAccount();
  const openCount = state.tasks.filter((t) => !t.completed && t.dueDate === key(today)).length;
  const eventCount = state.events.filter((e) => e.date === key(today)).length;
  toast(`Hari ini: ${eventCount} jadwal kegiatan & ${openCount} tugas belum selesai.`);
};

$('#goFocus').onclick = () => show('focus');
$('#search').onclick = openCommandPalette;

// Theme Toggle Buttons
$('#themeToggle').onclick = (e) => {
  toggleThemeWithAnimation(null, e.currentTarget);
};

$('#settingsThemeToggle').onchange = (e) => {
  toggleThemeWithAnimation(e.target.checked ? 'dark' : 'light', e.target.closest('.switch'));
};

// Settings Group 1: Display Preferences
$('#settingLightSoftness').onchange = (e) => {
  prefs.lightSoftness = e.target.value;
  savePrefs();
  applyVisualPrefs();
  toast('Kelembutan mode terang diperbarui.');
};

$$('#accentPicker .accent-swatch').forEach((btn) => {
  btn.onclick = () => {
    prefs.accent = btn.dataset.accent;
    savePrefs();
    applyVisualPrefs();
    toast('Warna aksen diperbarui.');
  };
});

$('#settingCalendarDensity').onchange = (e) => {
  prefs.calendarDensity = e.target.value;
  savePrefs();
  applyVisualPrefs();
  toast('Tampilan kalender diperbarui.');
};

// Settings Group 2: Schedule Preferences
$('#settingStartMonday').onchange = (e) => {
  prefs.startMonday = e.target.checked;
  savePrefs();
  renderCalendar();
  toast(prefs.startMonday ? 'Minggu dimulai pada hari Senin.' : 'Minggu dimulai pada hari Minggu.');
};

$('#settingTimeFormat').onchange = (e) => {
  prefs.timeFormat = e.target.value;
  savePrefs();
  render();
  toast(`Format waktu diubah ke ${prefs.timeFormat === '12h' ? '12 jam' : '24 jam'}.`);
};

$('#settingDefaultDuration').onchange = (e) => {
  prefs.defaultDuration = Number(e.target.value);
  savePrefs();
  toast(`Durasi default kegiatan: ${prefs.defaultDuration} menit.`);
};

// Settings Group 3: Notifications & Sound
$('#settingRemindSchedule').onchange = (e) => {
  prefs.remindSchedule = e.target.checked;
  savePrefs();
  renderDashboard();
  toast(prefs.remindSchedule ? 'Pengingat jadwal diaktifkan.' : 'Pengingat jadwal dinonaktifkan.');
};

$('#settingRemindDeadline').onchange = (e) => {
  prefs.remindDeadline = e.target.checked;
  savePrefs();
  renderDashboard();
  toast(prefs.remindDeadline ? 'Pengingat deadline diaktifkan.' : 'Pengingat deadline dinonaktifkan.');
};

$('#settingSoundEffects').onchange = (e) => {
  prefs.soundEffects = e.target.checked;
  savePrefs();
  if (prefs.soundEffects) playChime();
  toast(prefs.soundEffects ? 'Efek suara diaktifkan.' : 'Efek suara dinonaktifkan.');
};

$('#requestNotifBtn').onclick = async () => {
  if (!('Notification' in window)) {
    return toast('Browser ini tidak mendukung Web Notification.');
  }
  if (Notification.permission === 'default') {
    const res = await Notification.requestPermission();
    updateNotifStatusText();
    if (res === 'granted') {
      sendSystemNotification('Ruang Waktu Aktif', 'Notifikasi jadwal dan tugas siap mengingatkan Anda.');
    } else {
      toast('Izin notifikasi belum diberikan.');
    }
  } else if (Notification.permission === 'granted') {
    sendSystemNotification('Tes Pengingat Ruang Waktu', 'Notifikasi dan nada dering berfungsi dengan baik.');
  } else {
    toast('Silakan aktifkan izin notifikasi pada pengaturan situs di browser Anda.');
  }
};

// Settings Group 4: Account & Workspace
$('#accountSettingsForm').onsubmit = (e) => {
  e.preventDefault();
  prefs.userName = $('#settingUserName').value.trim() || 'Pengguna';
  prefs.userEmail = $('#settingUserEmail').value.trim() || 'email@example.com';
  prefs.userAvatar = ($('#settingUserAvatar').value.trim() || prefs.userName.slice(0, 2)).toUpperCase();
  prefs.workspace = $('#settingWorkspace').value.trim() || 'Ruang Pribadi';
  savePrefs();
  applyVisualPrefs();
  toast('Profil dan ruang kerja berhasil disimpan.');
};

// Global Click & Keyboard Handlers
document.addEventListener('click', (e) => {
  if (!e.target.closest('.account')) closeAccount();
  if (e.target.closest('#accountMenu button[data-view]')) setTimeout(closeAccount, 0);
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
  if (e.key === 'Escape') {
    $('#command').classList.remove('open');
    closeModal();
    closeAccount();
    $('.sidebar').classList.remove('open');
  }
});

$('#command').onclick = (e) => {
  if (e.target === $('#command')) $('#command').classList.remove('open');
};

// ============================================================================
// PWA SERVICE WORKER & INSTALL PROMPT
// ============================================================================
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const btn = $('#installPwaBtn');
  if (btn) btn.hidden = false;
});

$('#installPwaBtn').onclick = async () => {
  if (!deferredPwaPrompt) return;
  deferredPwaPrompt.prompt();
  await deferredPwaPrompt.userChoice;
  deferredPwaPrompt = null;
  $('#installPwaBtn').hidden = true;
};

// Initialize Sidebar State, Theme, Timer, Reminders & Views
if (
  localStorage.getItem('ruangWaktuSidebar') === 'collapsed' &&
  !window.matchMedia('(max-width: 760px)').matches
) {
  $('#shell').classList.add('sidebar-collapsed');
  $('#hamburger').setAttribute('aria-expanded', 'false');
}

setInterval(() => {
  checkUpcomingScheduleReminders();
  if (view === 'dashboard') {
    $('#liveClock').textContent = formatTimeDisplay(new Date().toTimeString().slice(0, 5));
  }
}, 30000);

applyVisualPrefs();
tick();
render();
