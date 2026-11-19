'use strict';

const RuangJeda = (() => {
  const dayKey = (date = new Date()) => {
    const pad = (part) => String(part).padStart(2, '0');
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  };

  const dateFromKey = (key) => new Date(key + 'T12:00:00');
  const dayKeys = (count, base = new Date()) => Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setDate(date.getDate() - (count - index - 1));
    return dayKey(date);
  });

  const manualMinutes = (hours, minutes) => {
    const total = hours * 60 + minutes;
    return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 &&
      minutes >= 0 && minutes < 60 && total <= 1440 ? total : null;
  };

  const readableDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return rest + ' mnt';
    return hours + ' j' + (rest ? ' ' + rest + ' mnt' : '');
  };

  function recommendation(logs, screen, dates) {
    const entries = dates.map((date) => logs[date]).filter(Boolean);
    const isStrong = (item) => Math.max(item.stress, item.anxiety) >= 4;
    const todayKey = dates.at(-1);
    const last = logs[todayKey];
    const recent = entries.slice(-3);
    let title, message;

    if (last && (Math.max(last.stress, last.anxiety) === 5 ||
        (isStrong(last) && recent.filter(isStrong).length >= 2))) {
      title = 'Pertimbangkan mencari dukungan';
      message = 'Check-in hari ini mencatat stres atau kecemasan yang kuat. Kamu bisa bercerita ke orang tepercaya atau menghubungi layanan konseling kampus.';
    } else if (last && isStrong(last)) {
      title = 'Luangkan waktu untuk jeda';
      message = 'Kamu melaporkan stres atau kecemasan yang kuat hari ini. Coba sisihkan waktu untuk beristirahat, lalu isi check-in kembali besok.';
    } else if (last && recent.length === 3 && ['stress', 'anxiety'].some((field) =>
        recent[0][field] < recent[1][field] && recent[1][field] < recent[2][field])) {
      title = 'Perhatikan tren check-in';
      message = 'Salah satu skor naik selama tiga check-in terakhir. Coba perhatikan aktivitas yang terasa membebani dan pertimbangkan bercerita ke orang tepercaya.';
    } else if (last) {
      title = 'Lanjutkan check-in';
      message = 'Check-in hari ini tersimpan. Isi kembali besok agar kamu bisa melihat perubahannya dari waktu ke waktu.';
    } else {
      title = 'Mulai dengan check-in';
      message = 'Catat apa yang kamu rasakan hari ini untuk melihat saran yang sesuai dengan jawabanmu.';
    }

    const todayScreen = screen[todayKey];
    const comparisonOffset = todayScreen && !todayScreen.partial ? -1 : -2;
    const previous = screen[dates.at(comparisonOffset - 1)];
    const current = screen[dates.at(comparisonOffset)];
    const context = last && isStrong(last) && previous && current && previous.minutes > 0 &&
      previous.source === current.source && !previous.partial && !current.partial &&
      current.minutes >= previous.minutes + 60
      ? 'Catatan harian lengkap terakhir menunjukkan durasi layar lebih lama dari hari sebelumnya. Coba perhatikan aktivitas yang memakai layar paling lama pada hari tersebut.'
      : '';

    return { title, message, context };
  }

  function sample(dates) {
    const stress = [2, 2, 3, 2, 4, 3, 5];
    const anxiety = [1, 2, 2, 3, 3, 3, 4];
    const minutes = [145, 188, 166, 192, 215, 204, 287];
    return {
      logs: Object.fromEntries(dates.map((date, i) => [date, { stress: stress[i], anxiety: anxiety[i] }])),
      screen: Object.fromEntries(dates.map((date, i) => [date, { minutes: minutes[i], source: 'example' }])),
    };
  }

  return { dayKey, dateFromKey, dayKeys, manualMinutes, readableDuration, recommendation, sample };
})();
if (typeof module === 'object') module.exports = RuangJeda;
