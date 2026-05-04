const STORAGE_KEY = 'coltigerv2-time-tracker-v1';

const $ = (id) => document.getElementById(id);

const state = {
  entries: loadEntries(),
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentTime() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function minutesFromTime(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function timeFromMinutes(minutes) {
  if (!Number.isFinite(minutes)) return '--:--';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function calculateEntry(entry) {
  const start = minutesFromTime(entry.start);
  const end = minutesFromTime(entry.end);
  let breakMinutes = Number(entry.breakMinutes || 0);

  if (entry.breakStart && entry.breakEnd) {
    const bStart = minutesFromTime(entry.breakStart);
    const bEnd = minutesFromTime(entry.breakEnd);
    if (bStart !== null && bEnd !== null && bEnd >= bStart) {
      breakMinutes = bEnd - bStart;
    }
  }

  let grossMinutes = 0;
  let netMinutes = 0;

  if (start !== null && end !== null && end >= start) {
    grossMinutes = end - start;
    netMinutes = Math.max(0, grossMinutes - breakMinutes);
  }

  return { grossMinutes, breakMinutes, netMinutes };
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function setStatus(message) {
  $('status').textContent = message;
}

function findEntry(date) {
  return state.entries.find((entry) => entry.date === date);
}

function upsertEntry(entry) {
  const existingIndex = state.entries.findIndex((item) => item.date === entry.date);
  if (existingIndex >= 0) {
    state.entries[existingIndex] = entry;
  } else {
    state.entries.push(entry);
  }
  state.entries.sort((a, b) => b.date.localeCompare(a.date));
  saveEntries();
  render();
}

function fillTodayForm(entry) {
  $('startTime').value = entry?.start || '';
  $('endTime').value = entry?.end || '';
  $('breakStart').value = entry?.breakStart || '';
  $('breakEnd').value = entry?.breakEnd || '';
  $('note').value = entry?.note || '';
  updateTodaySummary();
}

function getTodayEntryFromForm() {
  return {
    date: todayIso(),
    start: $('startTime').value,
    end: $('endTime').value,
    breakStart: $('breakStart').value,
    breakEnd: $('breakEnd').value,
    breakMinutes: 0,
    note: $('note').value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function updateTodaySummary() {
  const calculated = calculateEntry(getTodayEntryFromForm());
  $('grossToday').textContent = timeFromMinutes(calculated.grossMinutes);
  $('breakToday').textContent = timeFromMinutes(calculated.breakMinutes);
  $('netToday').textContent = timeFromMinutes(calculated.netMinutes);
}

function renderEntries() {
  const body = $('entriesBody');
  body.innerHTML = '';

  const selectedMonth = $('monthPicker').value || currentMonth();
  const entries = state.entries.filter((entry) => entry.date.startsWith(selectedMonth));

  if (!entries.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7">Noch keine Einträge für diesen Monat.</td>';
    body.appendChild(row);
    return;
  }

  entries.forEach((entry) => {
    const calc = calculateEntry(entry);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.start || '-'}</td>
      <td>${entry.end || '-'}</td>
      <td>${timeFromMinutes(calc.breakMinutes)}</td>
      <td><strong>${timeFromMinutes(calc.netMinutes)}</strong></td>
      <td>${entry.note || ''}</td>
      <td><button class="delete" type="button" data-delete="${entry.date}">Löschen</button></td>
    `;
    body.appendChild(row);
  });
}

function renderMonthSummary() {
  const selectedMonth = $('monthPicker').value || currentMonth();
  const entries = state.entries.filter((entry) => entry.date.startsWith(selectedMonth));
  const totals = entries.reduce((acc, entry) => {
    const calc = calculateEntry(entry);
    acc.net += calc.netMinutes;
    acc.breaks += calc.breakMinutes;
    return acc;
  }, { net: 0, breaks: 0 });

  $('monthDays').textContent = String(entries.length);
  $('monthNet').textContent = timeFromMinutes(totals.net);
  $('monthBreak').textContent = timeFromMinutes(totals.breaks);
}

function render() {
  $('todayDate').textContent = todayIso();
  renderEntries();
  renderMonthSummary();
  updateTodaySummary();
}

function saveToday() {
  const entry = getTodayEntryFromForm();
  if (!entry.start && !entry.end && !entry.breakStart && !entry.breakEnd && !entry.note) {
    setStatus('Keine Daten zum Speichern vorhanden.');
    return;
  }
  upsertEntry(entry);
  setStatus('Tag gespeichert.');
}

function saveManual() {
  const date = $('manualDate').value;
  if (!date) {
    setStatus('Bitte ein Datum für den manuellen Eintrag wählen.');
    return;
  }

  const entry = {
    date,
    start: $('manualStart').value,
    end: $('manualEnd').value,
    breakStart: '',
    breakEnd: '',
    breakMinutes: Number($('manualBreak').value || 0),
    note: $('manualNote').value.trim(),
    updatedAt: new Date().toISOString(),
  };

  upsertEntry(entry);
  setStatus('Manueller Eintrag gespeichert.');
}

function deleteEntry(date) {
  state.entries = state.entries.filter((entry) => entry.date !== date);
  saveEntries();
  if (date === todayIso()) fillTodayForm(null);
  render();
  setStatus('Eintrag gelöscht.');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const rows = [['Datum', 'Kommen', 'Gehen', 'Pause', 'Netto', 'Notiz']];
  state.entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry) => {
      const calc = calculateEntry(entry);
      rows.push([
        entry.date,
        entry.start || '',
        entry.end || '',
        timeFromMinutes(calc.breakMinutes),
        timeFromMinutes(calc.netMinutes),
        entry.note || '',
      ]);
    });

  const csv = rows.map((row) => row.map(csvEscape).join(';')).join('\n');
  downloadFile(`stempelzeiten_${currentMonth()}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportJson() {
  const backup = {
    app: 'ColtigerV2 Stempelzeiten',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
  };
  downloadFile(`stempelzeiten_backup_${todayIso()}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

async function importJson(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const entries = Array.isArray(backup) ? backup : backup.entries;
    if (!Array.isArray(entries)) throw new Error('Invalid backup format');

    const map = new Map(state.entries.map((entry) => [entry.date, entry]));
    entries.forEach((entry) => {
      if (entry && entry.date) map.set(entry.date, entry);
    });
    state.entries = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    saveEntries();
    const today = findEntry(todayIso());
    fillTodayForm(today);
    render();
    setStatus('Backup importiert.');
  } catch (error) {
    console.error(error);
    setStatus('Backup konnte nicht importiert werden.');
  }
}

function bindEvents() {
  $('clockInBtn').addEventListener('click', () => {
    $('startTime').value = currentTime();
    updateTodaySummary();
    saveToday();
  });

  $('breakStartBtn').addEventListener('click', () => {
    $('breakStart').value = currentTime();
    updateTodaySummary();
    saveToday();
  });

  $('breakEndBtn').addEventListener('click', () => {
    $('breakEnd').value = currentTime();
    updateTodaySummary();
    saveToday();
  });

  $('clockOutBtn').addEventListener('click', () => {
    $('endTime').value = currentTime();
    updateTodaySummary();
    saveToday();
  });

  ['startTime', 'endTime', 'breakStart', 'breakEnd', 'note'].forEach((id) => {
    $(id).addEventListener('input', updateTodaySummary);
  });

  $('saveDayBtn').addEventListener('click', saveToday);
  $('clearDayBtn').addEventListener('click', () => {
    fillTodayForm(null);
    setStatus('Heutige Eingabe geleert. Noch nicht aus gespeicherten Daten gelöscht.');
  });

  $('saveManualBtn').addEventListener('click', saveManual);
  $('monthPicker').addEventListener('change', render);
  $('exportCsvBtn').addEventListener('click', exportCsv);
  $('exportJsonBtn').addEventListener('click', exportJson);
  $('importJsonInput').addEventListener('change', (event) => importJson(event.target.files[0]));

  $('entriesBody').addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    deleteEntry(button.dataset.delete);
  });
}

function init() {
  $('monthPicker').value = currentMonth();
  $('manualDate').value = todayIso();
  const todayEntry = findEntry(todayIso());
  fillTodayForm(todayEntry);
  bindEvents();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
}

init();
