const $ = (id) => document.getElementById(id);

let reminderTimers = [];
let countdownTimer = null;
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

const updateCountdown = () => {
  if (!lastCalculation) {
    $('countdownResult').textContent = '-';
    return;
  }

  const remainingSeconds = (lastCalculation.changeTime.getTime() - Date.now()) / 1000;
  $('countdownResult').textContent = formatDuration(remainingSeconds);

  if (remainingSeconds <= 0) {
    $('statusText').textContent = `Rollenwechsel fällig seit ${formatTime(lastCalculation.changeTime)} Uhr.`;
  }
};

const startCountdown = () => {
  if (countdownTimer) clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
};

const calculateRollChange = () => {
  const start = readStartDate();
  const speed = readNumber('speed', 'Geschwindigkeit');
  const targetLength = readNumber('targetLength', 'Rollenlänge');

  const durationSeconds = (targetLength / speed) * 60;
  const changeTime = new Date(start.getTime() + durationSeconds * 1000);

  lastCalculation = {
    start,
    speed,
    targetLength,
    durationSeconds,
    changeTime,
  };

  $('durationResult').textContent = formatDuration(durationSeconds);
  $('changeResult').textContent = formatTime(changeTime);
  $('statusText').textContent = `Berechnet: nächster Rollenwechsel um ${formatTime(changeTime)} Uhr.`;
  startCountdown();

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

    const changeDelay = calculation.changeTime.getTime() - Date.now();

    if (changeDelay <= 0) {
      throw new Error('Die berechnete Wechselzeit liegt bereits in der Vergangenheit.');
    }

    reminderTimers.push(setTimeout(() => {
      notify('Rollenwechsel fällig', `Soll-Länge erreicht. Wechselzeit: ${formatTime(calculation.changeTime)} Uhr.`);
    }, changeDelay));

    $('statusText').textContent = `Benachrichtigung aktiv: Wechsel ${formatTime(calculation.changeTime)} Uhr.`;
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
