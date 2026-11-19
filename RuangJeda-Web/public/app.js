'use strict';

const { dayKey, dayKeys, dateFromKey, manualMinutes, readableDuration, recommendation, sample } = RuangJeda;
const el = (id) => document.getElementById(id);
const sourceNames = { android: 'Otomatis · Android', iphone: 'Manual · Durasi Layar iPhone', manual: 'Manual · pengaturan perangkat', example: 'Data contoh' };
const routes = { dasbor: 'Dasbor', checkin: 'Check-in', dukungan: 'Dukungan', data: 'Data dan izin' };
const storeKey = 'ruangjeda.v1';
const android = window.RuangJedaAndroid;
const isiPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const appleNative = window.RuangJedaAppleNative === true;
let records = { logs: {}, screen: {} };
let demoRecords = null;
let chartMode = 'checkin';
let installPrompt;
let toastTimer;
let route = 'dasbor';
let bootError = false;

try {
  const saved = JSON.parse(localStorage.getItem(storeKey));
  if (saved?.logs && saved?.screen) records = saved;
} catch {
  bootError = true;
}

function alertUser(message) {
  clearTimeout(toastTimer);
  el('toast').textContent = message;
  el('toast').hidden = false;
  toastTimer = setTimeout(() => { el('toast').hidden = true; }, 5000);
}

function persist(next) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(next));
    records = next;
    return true;
  } catch {
    alertUser('Catatan tidak bisa disimpan. Periksa pengaturan penyimpanan perangkat.');
    return false;
  }
}

function activeRecords() {
  return demoRecords || records;
}

function formatDate(date, part) {
  return new Intl.DateTimeFormat('id-ID', part === 'full'
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'short' }).format(date);
}

function grade(value) {
  return ['Sangat ringan', 'Ringan', 'Sedang', 'Kuat', 'Sangat kuat'][value - 1];
}

function setAdvice(data, dates) {
  const advice = recommendation(data.logs, data.screen, dates);
  for (const prefix of ['rec', 'support']) {
    el(prefix + '-heading').textContent = advice.title;
    el(prefix + '-body').textContent = advice.message;
    const context = el(prefix + '-context');
    context.textContent = advice.context;
    context.hidden = !advice.context;
  }
}

function fillForm(today) {
  el('checkin-form').reset();
  const entry = activeRecords().logs[today];
  if (entry) {
    for (const field of ['stress', 'anxiety']) {
      const selected = el(field + '-scale').querySelector('input[value="' + entry[field] + '"]');
      if (selected) selected.checked = true;
    }
  }
}

function render() {
  const dates = dayKeys(7);
  const today = dates.at(-1);
  const data = activeRecords();
  const entry = data.logs[today];
  const screen = data.screen[today];
  el('today').textContent = formatDate(dateFromKey(today), 'full');
  el('demo').hidden = !demoRecords;
  el('clear').disabled = Boolean(demoRecords);
  for (const field of ['stress', 'anxiety']) {
    el(field + '-value').textContent = entry ? entry[field] + '/5' : '–';
    el(field + '-meta').textContent = entry ? grade(entry[field]) : 'Belum diisi';
  }
  el('screen-value').textContent = screen ? readableDuration(screen.minutes) : '–';
  el('screen-meta').textContent = screen
    ? sourceNames[screen.source] + (screen.partial ? ' · parsial' : '')
    : 'Belum ada catatan';
  el('checkin-action').textContent = entry ? 'Perbarui check-in hari ini' : 'Isi check-in hari ini';
  const screenDate = el('screen-date');
  if (!screenDate.value || screenDate.value > today) screenDate.value = today;
  screenDate.max = today;
  setAdvice(data, dates);
  if (route === 'dasbor') drawChart(data, dates);
}

function drawChart(data, dates) {
  const canvas = el('chart');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const isScreen = chartMode === 'screen';
  const styles = getComputedStyle(canvas);
  const accent = styles.getPropertyValue('--accent').trim();
  const mint = styles.getPropertyValue('--mint').trim();
  const labelColor = styles.getPropertyValue('--dim').trim();
  const gridColor = styles.getPropertyValue('--chart-grid').trim();
  const series = isScreen
    ? [{ name: 'Durasi layar', color: accent, values: dates.map((d) => data.screen[d]?.minutes ?? null) }]
    : [{ name: 'Stres', color: accent, values: dates.map((d) => data.logs[d]?.stress ?? null) },
       { name: 'Kecemasan', color: mint, values: dates.map((d) => data.logs[d]?.anxiety ?? null) }];
  const values = series.flatMap((item) => item.values).filter((value) => value !== null);
  const min = isScreen ? 0 : 1;
  const max = isScreen ? Math.max(120, Math.ceil(Math.max(0, ...values) / 120) * 120) : 5;
  const margin = { left: 32, right: 13, top: 13, bottom: 27 };
  const step = (width - margin.left - margin.right) / (dates.length - 1);
  const y = (value) => margin.top + (max - value) / (max - min) * (height - margin.top - margin.bottom);
  const x = (index) => margin.left + step * index;
  ctx.font = '11px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let index = 0; index <= 4; index++) {
    const level = min + (max - min) * index / 4;
    ctx.fillStyle = labelColor;
    ctx.fillText(isScreen ? (level / 60).toLocaleString('id-ID') + 'j' : level, margin.left - 4, y(level));
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, y(level));
    ctx.lineTo(width - margin.right, y(level));
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  dates.forEach((date, index) => {
    if (width < 370 && index % 2) return;
    ctx.fillStyle = labelColor;
    ctx.fillText(dateFromKey(date).getDate(), x(index), height - 9);
  });
  for (const item of series) {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let gap = true;
    item.values.forEach((value, index) => {
      if (value === null) { gap = true; return; }
      if (gap) ctx.moveTo(x(index), y(value));
      else ctx.lineTo(x(index), y(value));
      gap = false;
    });
    ctx.stroke();
    item.values.forEach((value, index) => {
      if (value === null) return;
      const partial = isScreen && data.screen[dates[index]]?.partial;
      ctx.beginPath();
      ctx.arc(x(index), y(value), 3.4, 0, Math.PI * 2);
      if (partial) ctx.stroke();
      else ctx.fill();
    });
  }
  el('chart-description').textContent = isScreen ? 'Durasi tercatat per hari' : 'Skala check-in 1–5';
  el('chart-empty').hidden = values.length !== 0;
  el('chart-empty').textContent = isScreen
    ? 'Tambahkan durasi pertama di menu Data.'
    : 'Isi check-in untuk mulai melihat tren.';
  el('legend').replaceChildren(...series.map((item) => {
    const text = document.createElement('span');
    text.style.setProperty('--legend-color', item.color);
    text.textContent = item.name;
    return text;
  }));
  const table = document.createElement('table');
  const header = table.createTHead().insertRow();
  for (const label of ['Tanggal', ...series.map((item) => item.name)]) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  }
  const body = table.createTBody();
  dates.forEach((date, index) => {
    const row = body.insertRow();
    row.insertCell().textContent = formatDate(dateFromKey(date));
    for (const item of series) {
      const value = item.values[index];
      row.insertCell().textContent = value === null ? '–' : isScreen
        ? readableDuration(value) + (data.screen[date]?.partial ? ' (parsial)' : '') : value + '/5';
    }
  });
  el('chart-table').replaceChildren(table);
}

function switchRoute(initial = false) {
  route = location.hash.slice(1);
  if (!Object.hasOwn(routes, route)) route = 'dasbor';
  for (const key of Object.keys(routes)) el('view-' + key).hidden = key !== route;
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  el('page-name').textContent = routes[route];
  if (route === 'checkin') fillForm(dayKey());
  render();
  if (!initial) {
    el('main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function syncAndroid(manual = false) {
  if (!android || demoRecords) {
    if (manual && demoRecords) alertUser('Keluar dari mode contoh untuk memperbarui data perangkat.');
    return;
  }
  const status = el('sensor-status');
  status.hidden = false;
  try {
    const response = JSON.parse(android.screenTime());
    if (response.status === 'permission') {
      status.textContent = 'Akses penggunaan belum aktif.';
      return;
    }
    if (response.status !== 'ok' || response.days.length === 0) {
      status.textContent = 'Riwayat layar belum tersedia. Coba kembali setelah menggunakan HP.';
      return;
    }
    const screen = { ...records.screen };
    for (const entry of response.days) {
      const previous = screen[entry.date];
      if (entry.partial && previous && !previous.partial) continue;
      if (entry.partial && previous?.partial && previous.minutes > entry.minutes) continue;
      screen[entry.date] = { minutes: entry.minutes, partial: entry.partial, source: 'android' };
    }
    if (!persist({ ...records, screen })) return;
    status.textContent = 'Akses aktif. ' + response.days.length + ' hari terbaca dari riwayat Android.';
    render();
    if (manual) alertUser('Durasi layar Android diperbarui.');
  } catch {
    status.textContent = 'Durasi layar belum berhasil dibaca.';
  }
}

for (const field of ['stress', 'anxiety']) {
  for (let value = 1; value <= 5; value++) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = field;
    input.value = value;
    input.required = true;
    input.setAttribute('aria-label', value + ' · ' + grade(value));
    const text = document.createElement('span');
    text.textContent = value;
    text.setAttribute('aria-hidden', 'true');
    label.append(input, text);
    el(field + '-scale').append(label);
  }
}

el('checkin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const entry = { stress: Number(data.get('stress')), anxiety: Number(data.get('anxiety')) };
  const active = activeRecords();
  const next = { ...active, logs: { ...active.logs, [dayKey()]: entry } };
  if (demoRecords) demoRecords = next;
  else if (!persist(next)) return;
  alertUser(demoRecords ? 'Check-in disimpan di mode contoh.' : 'Check-in tersimpan di perangkat ini.');
  location.hash = 'dasbor';
});

el('screen-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const minutes = manualMinutes(el('screen-hours').valueAsNumber, el('screen-minutes').valueAsNumber);
  const date = el('screen-date').value;
  if (minutes === null || !date || date > dayKey()) {
    alertUser('Periksa tanggal dan durasi. Maksimum 24 jam per hari.');
    return;
  }
  const active = activeRecords();
  if (active.screen[date]?.source === 'android') {
    alertUser('Tanggal ini sudah memakai hasil pembacaan Android.');
    return;
  }
  const entry = { minutes, partial: !demoRecords && date === dayKey(),
    source: demoRecords ? 'example' : isiPhone ? 'iphone' : 'manual' };
  const next = { ...active, screen: { ...active.screen, [date]: entry } };
  if (demoRecords) demoRecords = next;
  else if (!persist(next)) return;
  el('screen-form').reset();
  alertUser(demoRecords ? 'Durasi disimpan di mode contoh.' : 'Durasi layar tersimpan.');
  render();
});

for (const [mode, id] of [['checkin', 'chart-checkin'], ['screen', 'chart-screen']]) {
  el(id).addEventListener('click', () => {
    chartMode = mode;
    el('chart-checkin').setAttribute('aria-pressed', String(mode === 'checkin'));
    el('chart-screen').setAttribute('aria-pressed', String(mode === 'screen'));
    render();
  });
}

const clearDialog = el('clear-dialog');
el('clear').addEventListener('click', () => {
  if (demoRecords) return;
  clearDialog.returnValue = 'cancel';
  clearDialog.showModal();
});
clearDialog.addEventListener('close', () => {
  if (clearDialog.returnValue !== 'clear' || demoRecords) return;
  if (persist({ logs: {}, screen: {} })) {
    render();
    alertUser('Catatan lokal dihapus.');
  }
});
el('start-demo').addEventListener('click', () => {
  demoRecords = sample(dayKeys(7));
  location.hash = 'dasbor';
  render();
});
el('exit-demo').addEventListener('click', () => {
  demoRecords = null;
  if (route === 'checkin') fillForm(dayKey());
  render();
  syncAndroid();
});

el('android-actions').hidden = !android;
el('install-card').hidden = Boolean(android) || appleNative;
el('data-source').textContent = android
  ? 'Jika kamu mengizinkan, RuangJeda membaca durasi layar interaktif dari Android saat aplikasi dibuka. Hanya total harian yang disimpan.'
  : appleNative ? 'Laporan Durasi Layar tersedia pada tab Layar iPhone. Untuk memasukkan angkanya ke grafik, catat ringkasannya di bawah.'
    : 'Catat angka yang kamu lihat di pengaturan perangkat. Angka itu akan muncul di grafik durasi layar.';
el('manual-help').textContent = isiPhone
  ? 'Buka Pengaturan → Durasi Layar → Lihat Semua Aktivitas App & Situs Web. Pilih tampilan Hari, lalu masukkan total yang ditampilkan.'
  : 'Buka Durasi Layar atau Kesehatan Digital di perangkat sumber. Pilih tanggal dan masukkan total harian yang ditampilkan.';
el('install-help').textContent = isiPhone
  ? 'Buka RuangJeda di Safari, pilih Bagikan lalu Tambah ke Layar Utama dan aktifkan Buka sebagai App Web.'
  : 'Gunakan menu pasang aplikasi di Chrome atau Edge. Di Safari Mac, pilih File lalu Tambahkan ke Dock.';
el('grant').addEventListener('click', () => {
  if (demoRecords) alertUser('Keluar dari mode contoh untuk mengatur izin.');
  else if (android) android.openSettings();
});
el('refresh').addEventListener('click', () => syncAndroid(true));

if (!android && !appleNative && window.isSecureContext && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  el('install').hidden = false;
});
el('install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  el('install').hidden = true;
});

window.addEventListener('hashchange', () => switchRoute());
window.addEventListener('resize', () => {
  if (route === 'dasbor') drawChart(activeRecords(), dayKeys(7));
});
window.addEventListener('focus', () => { render(); syncAndroid(); });
window.RuangJedaResume = syncAndroid;
switchRoute(true);
syncAndroid();
if (bootError) alertUser('Catatan lokal belum bisa dibaca.');
