const $ = (id) => document.getElementById(id);

let reminderTimers = [];
let lastCalculation = null;

const readNumber = (id, label, options = {}) => {
  const raw = String($(id).value).trim().replace(',', '.');
  const value = Number(raw);
  const allowZero = options.allowZero === true;

  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new Error(`${label} muss ${allowZero ? 'größer oder gleich null' : 'größer als null'} sein.`);
  }

  return value;
};

const readOptionalPositiveNumber = (id, label) => {
  const raw = String($(id).value).trim();
  if (!raw) return null;

  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} muss größer als null sein.`);
  }

  return value;
};

const readIntegerRange = (id, label, min, max) => {
  const value = readNumber(id, label, { allowZero: min === 0 });
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`);
  }
  return value;
};

const pad = (value) => String(value).padStart(2, '0');

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const formatTime = (date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (seconds) => {
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(restSeconds)}`;
};

const formatNumber = (value) => {
  return value.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
};

const fillStartTime = (date) => {
  date.setMilliseconds(0);
  $('startDate').value = formatDateInput(date);
  $('startHour').value = pad(date.getHours());
  $('startMinute').value = pad(date.getMinutes());
  $('startSecond').value = pad(date.getSeconds());
};

const defaultStartTime = () => {
  fillStartTime(new Date());
};

defaultStartTime();

$('useNowButton').addEventListener('click', () => {
  const now = new Date();
  fillStartTime(now);
  $('statusText').textContent = `Aktuelle Zeit übernommen: ${formatTime(now)} Uhr.`;
});

const readStartDate = () => {
  const dateValue = $('startDate').value;
  if (!dateValue) {
    throw new Error('Bitte ein Datum eingeben.');
  }

  const hour = readIntegerRange('startHour', 'Stunde', 0, 23);
  const minute = readIntegerRange('startMinute', 'Minute', 0, 59);
  const second = readIntegerRange('startSecond', 'Sekunde', 0, 59);
  const [year, month, day] = dateValue.split('-').map(Number);

  return new Date(year, month - 1, day, hour, minute, second, 0);
};

const renderSchedule = ({ start, durationSeconds, warningSeconds, remainingChanges }) => {
  const body = $('scheduleBody');
  body.innerHTML = '';

  if (remainingChanges === null || remainingChanges <= 0) {
    body.innerHTML = '<tr><td colspan="3">Keine weiteren Wechsel berechnet.</td></tr>';
    return;
  }

  const visibleRows = Math.min(remainingChanges, 50);

  for (let index = 1; index <= visibleRows; index += 1) {
    const changeTime = new Date(start.getTime() + durationSeconds * 1000 * index);
    const warningTime = new Date(changeTime.getTime() - warningSeconds * 1000);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${index}</td><td>${formatTime(changeTime)}</td><td>${formatTime(warningTime)}</td>`;
    body.appendChild(row);
  }

  if (remainingChanges > visibleRows) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3">Weitere ${remainingChanges - visibleRows} Wechsel nicht angezeigt.</td>`;
    body.appendChild(row);
  }
};

const calculateRollChange = () => {
  const start = readStartDate();
  const speed = readNumber('speed', 'Geschwindigkeit');
  const targetLength = readNumber('targetLength', 'Rollenlänge');
  const warningSeconds = Number(String($('warningSeconds').value || '0').replace(',', '.'));
  const orderChanges = readOptionalPositiveNumber('orderChanges', 'Wechsel gesamt');
  const currentChanges = readNumber('currentChanges', 'Produzierte Wechsel', { allowZero: true });

  if (!Number.isFinite(warningSeconds) || warningSeconds < 0) {
    throw new Error('Vorwarnung darf nicht negativ sein.');
  }

  if (orderChanges !== null && currentChanges > orderChanges) {
    throw new Error('Produzierte Wechsel dürfen nicht größer als Wechsel gesamt sein.');
  }

  const durationSeconds = (targetLength / speed) * 60;
  const changeTime = new Date(start.getTime() + durationSeconds * 1000);
  const warningTime = new Date(changeTime.getTime() - warningSeconds * 1000);

  let remainingLength = null;
  let remainingChanges = null;
  let orderEndTime = null;

  if (orderChanges !== null) {
    remainingChanges = Math.max(0, Math.ceil(orderChanges - currentChanges));
    remainingLength = remainingChanges * targetLength;
    const orderDurationSeconds = (remainingLength / speed) * 60;
    orderEndTime = new Date(start.getTime() + orderDurationSeconds * 1000);
  }

  lastCalculation = {
    start,
    speed,
    targetLength,
    warningSeconds,
    durationSeconds,
    changeTime,
    warningTime,
    orderChanges,
    currentChanges,
    remainingLength,
    remainingChanges,
    orderEndTime,
  };

  $('durationResult').textContent = formatDuration(durationSeconds);
  $('warningResult').textContent = formatTime(warningTime);
  $('changeResult').textContent = formatTime(changeTime);
  $('remainingLengthResult').textContent = remainingLength === null ? '-' : formatNumber(remainingLength);
  $('remainingChangesResult').textContent = remainingChanges === null ? '-' : String(remainingChanges);
  $('orderEndResult').textContent = orderEndTime === null ? '-' : formatTime(orderEndTime);

  renderSchedule(lastCalculation);

  const orderText = orderEndTime === null
    ? ''
    : ` Auftragsende um ${formatTime(orderEndTime)} Uhr, noch ${remainingChanges} Wechsel.`;

  $('statusText').textContent = `Berechnet: nächster Rollenwechsel um ${formatTime(changeTime)} Uhr.${orderText}`;

  return lastCalculation;
};

$('calculateButton').addEventListener('click', () => {
  try {
    calculateRollChange();
  } catch (error) {
    alert(error.message);
  }
});

$('completeChangeButton').addEventListener('click', () => {
  try {
    const nextProduced = readNumber('currentChanges', 'Produzierte Wechsel', { allowZero: true }) + 1;
    const orderChanges = readOptionalPositiveNumber('orderChanges', 'Wechsel gesamt');

    if (orderChanges !== null && nextProduced > orderChanges) {
      throw new Error('Alle Wechsel sind bereits erledigt.');
    }

    $('currentChanges').value = String(nextProduced);
    const now = new Date();
    fillStartTime(now);
    const calculation = calculateRollChange();
    clearReminders();
    $('statusText').textContent = `Wechsel erledigt um ${formatTime(now)} Uhr. Nächster Wechsel: ${formatTime(calculation.changeTime)} Uhr.`;
  } catch (error) {
    alert(error.message);
  }
});

const clearReminders = () => {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers = [];
};

const notify = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([250, 120, 250]);
  }

  alert(`${title}\n\n${body}`);
};

const scheduleReminder = async () => {
  try {
    const calculation = calculateRollChange();

    if (!('Notification' in window)) {
      $('statusText').textContent = 'Benachrichtigungen werden von diesem Browser nicht unterstützt. Die App zeigt trotzdem eine Meldung an, wenn sie geöffnet bleibt.';
    } else if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    clearReminders();

    const now = Date.now();
    const warningDelay = calculation.warningTime.getTime() - now;
    const changeDelay = calculation.changeTime.getTime() - now;

    if (changeDelay <= 0) {
      throw new Error('Die berechnete Wechselzeit liegt bereits in der Vergangenheit.');
    }

    if (warningDelay > 0 && calculation.warningSeconds > 0) {
      reminderTimers.push(setTimeout(() => {
        notify('Rollenwechsel bald fällig', `Noch ca. ${Math.round(calculation.warningSeconds)} Sekunden bis zum Rollenwechsel um ${formatTime(calculation.changeTime)} Uhr.`);
      }, warningDelay));
    }

    reminderTimers.push(setTimeout(() => {
      notify('Rollenwechsel fällig', `Soll-Länge erreicht. Wechselzeit: ${formatTime(calculation.changeTime)} Uhr.`);
    }, changeDelay));

    $('statusText').textContent = `Benachrichtigung aktiv: Vorwarnung ${formatTime(calculation.warningTime)} Uhr, Wechsel ${formatTime(calculation.changeTime)} Uhr.`;
  } catch (error) {
    alert(error.message);
  }
};

$('notifyButton').addEventListener('click', scheduleReminder);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
