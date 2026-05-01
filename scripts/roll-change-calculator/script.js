const $ = (id) => document.getElementById(id);

let reminderTimers = [];
let lastCalculation = null;

const readNumber = (id, label) => {
  const value = Number(String($(id).value).trim().replace(',', '.'));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} muss größer als null sein.`);
  }

  return value;
};

const pad = (value) => String(value).padStart(2, '0');

const formatTime = (date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDuration = (minutes) => {
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return `${pad(hours)}:${pad(rest)}`;
};

const defaultStartTime = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  $('startTime').value = local.toISOString().slice(0, 16);
};

defaultStartTime();

const calculateRollChange = () => {
  const startValue = $('startTime').value;
  if (!startValue) {
    throw new Error('Bitte eine Startzeit eingeben.');
  }

  const start = new Date(startValue);
  const speed = readNumber('speed', 'Geschwindigkeit');
  const targetLength = readNumber('targetLength', 'Soll-Länge');
  const warningMinutes = Number(String($('warningMinutes').value || '0').replace(',', '.'));

  if (!Number.isFinite(warningMinutes) || warningMinutes < 0) {
    throw new Error('Vorwarnung darf nicht negativ sein.');
  }

  const durationMinutes = targetLength / speed;
  const changeTime = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const warningTime = new Date(changeTime.getTime() - warningMinutes * 60 * 1000);

  lastCalculation = {
    start,
    speed,
    targetLength,
    warningMinutes,
    durationMinutes,
    changeTime,
    warningTime,
  };

  $('durationResult').textContent = formatDuration(durationMinutes);
  $('warningResult').textContent = formatTime(warningTime);
  $('changeResult').textContent = formatTime(changeTime);
  $('statusText').textContent = `Berechnet: Rollenwechsel um ${formatTime(changeTime)} Uhr.`;

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

    if (warningDelay > 0 && calculation.warningMinutes > 0) {
      reminderTimers.push(setTimeout(() => {
        notify('Rollenwechsel bald fällig', `Noch ca. ${calculation.warningMinutes} Minuten bis zum Rollenwechsel um ${formatTime(calculation.changeTime)} Uhr.`);
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
