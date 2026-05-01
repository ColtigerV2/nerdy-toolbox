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

const readOptionalPositiveNumber = (id) => {
  const raw = String($(id).value).trim();
  if (!raw) return null;

  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Auftragslänge gesamt muss größer als null sein.');
  }

  return value;
};

const pad = (value) => String(value).padStart(2, '0');

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

const defaultStartTime = () => {
  const now = new Date();
  now.setMilliseconds(0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  $('startTime').value = local.toISOString().slice(0, 19);
};

defaultStartTime();

const calculateRollChange = () => {
  const startValue = $('startTime').value;
  if (!startValue) {
    throw new Error('Bitte eine Startzeit eingeben.');
  }

  const start = new Date(startValue);
  const speed = readNumber('speed', 'Geschwindigkeit');
  const targetLength = readNumber('targetLength', 'Rollenlänge');
  const warningSeconds = Number(String($('warningSeconds').value || '0').replace(',', '.'));
  const orderLength = readOptionalPositiveNumber('orderLength');
  const currentLength = readNumber('currentLength', 'Bereits gelaufen', { allowZero: true });

  if (!Number.isFinite(warningSeconds) || warningSeconds < 0) {
    throw new Error('Vorwarnung darf nicht negativ sein.');
  }

  if (orderLength !== null && currentLength > orderLength) {
    throw new Error('Bereits gelaufen darf nicht größer als die Auftragslänge sein.');
  }

  const durationSeconds = (targetLength / speed) * 60;
  const changeTime = new Date(start.getTime() + durationSeconds * 1000);
  const warningTime = new Date(changeTime.getTime() - warningSeconds * 1000);

  let remainingLength = null;
  let remainingChanges = null;
  let orderEndTime = null;

  if (orderLength !== null) {
    remainingLength = Math.max(0, orderLength - currentLength);
    remainingChanges = Math.ceil(remainingLength / targetLength);
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
    orderLength,
    currentLength,
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
