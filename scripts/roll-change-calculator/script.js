const $ = (id) => document.getElementById(id);

let reminderTimers = [];
let countdownTimer = null;
let lastCalculation = null;
let notificationEnabled = false;

const readNumber = (id, label, options = {}) => {
  const raw = String($(id).value).trim().replace(',', '.');
  const value = Number(raw);
  const allowZero = options.allowZero === true;

  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new Error(`${label} muss ${allowZero ? 'größer oder gleich null' : 'größer als null'} sein.`);
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
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(restSeconds)}`;
};

const fillStartTime = (date) => {
  date.setMilliseconds(0);
  $('startDate').value = formatDateInput(date);
  $('startHour').value = pad(date.getHours());
  $('startMinute').value = pad(date.getMinutes());
  $('startSecond').value = pad(date.getSeconds());
};

fillStartTime(new Date());

const readKnownChangeDate = () => {
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

const getNextChangeTime = (knownChangeTime, durationSeconds) => {
  const now = Date.now();
  const durationMs = durationSeconds * 1000;

  if (durationMs <= 0) {
    throw new Error('Die Rollenlaufzeit muss größer als null sein.');
  }

  if (knownChangeTime.getTime() > now) {
    return new Date(knownChangeTime.getTime());
  }

  const elapsedMs = now - knownChangeTime.getTime();
  const intervalsPassed = Math.floor(elapsedMs / durationMs) + 1;
  return new Date(knownChangeTime.getTime() + intervalsPassed * durationMs);
};

const calculateRollChange = () => {
  const knownChangeTime = readKnownChangeDate();
  const speed = readNumber('speed', 'Geschwindigkeit');
  const targetLength = readNumber('targetLength', 'Rollenlänge');

  const durationSeconds = (targetLength / speed) * 60;
  const changeTime = getNextChangeTime(knownChangeTime, durationSeconds);

  lastCalculation = {
    knownChangeTime,
    speed,
    targetLength,
    durationSeconds,
    changeTime,
  };

  $('durationResult').textContent = formatDuration(durationSeconds);
  $('changeResult').textContent = formatTime(changeTime);
  $('statusText').textContent = `Automatik aktiv. Nächster Rollenwechsel um ${formatTime(changeTime)} Uhr.`;
  startCountdown();

  if (notificationEnabled) {
    scheduleDirectReminder(lastCalculation);
  }

  return lastCalculation;
};

const updateCountdown = () => {
  if (!lastCalculation) {
    $('countdownResult').textContent = '-';
    return;
  }

  const remainingSeconds = (lastCalculation.changeTime.getTime() - Date.now()) / 1000;

  if (remainingSeconds <= 0) {
    if (notificationEnabled) {
      notify('Rollenwechsel fällig', `Soll-Länge erreicht. Wechselzeit: ${formatTime(lastCalculation.changeTime)} Uhr.`);
    }

    lastCalculation.changeTime = new Date(lastCalculation.changeTime.getTime() + lastCalculation.durationSeconds * 1000);
    $('changeResult').textContent = formatTime(lastCalculation.changeTime);
    $('statusText').textContent = `Wechsel erreicht. Nächster Rollenwechsel um ${formatTime(lastCalculation.changeTime)} Uhr.`;

    if (notificationEnabled) {
      scheduleDirectReminder(lastCalculation);
    }
  }

  const nextRemainingSeconds = (lastCalculation.changeTime.getTime() - Date.now()) / 1000;
  $('countdownResult').textContent = formatDuration(nextRemainingSeconds);
};

const startCountdown = () => {
  if (countdownTimer) clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
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
    const now = new Date();
    fillStartTime(now);
    const calculation = calculateRollChange();
    $('statusText').textContent = `Wechsel jetzt übernommen um ${formatTime(now)} Uhr. Nächster Wechsel: ${formatTime(calculation.changeTime)} Uhr.`;
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

const scheduleDirectReminder = (calculation) => {
  clearReminders();
  const changeDelay = calculation.changeTime.getTime() - Date.now();

  if (changeDelay <= 0) return;

  reminderTimers.push(setTimeout(() => {
    notify('Rollenwechsel fällig', `Soll-Länge erreicht. Wechselzeit: ${formatTime(calculation.changeTime)} Uhr.`);
  }, changeDelay));
};

const enableNotifications = async () => {
  try {
    const calculation = calculateRollChange();

    if (!('Notification' in window)) {
      $('statusText').textContent = 'Benachrichtigungen werden von diesem Browser nicht unterstützt. Die App zeigt trotzdem eine Meldung an, wenn sie geöffnet bleibt.';
    } else if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    notificationEnabled = true;
    scheduleDirectReminder(calculation);
    $('statusText').textContent = `Benachrichtigung aktiv. Nächster Wechsel ${formatTime(calculation.changeTime)} Uhr.`;
  } catch (error) {
    alert(error.message);
  }
};

$('notifyButton').addEventListener('click', enableNotifications);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
