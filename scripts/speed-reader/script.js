const $ = (id) => document.getElementById(id);

let words = [];
let index = 0;
let timer = null;
let isRunning = false;
let wpm = 250;

const minWpm = 50;
const maxWpm = 900;
const stepWpm = 25;

const splitText = (text) => text
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean);

const intervalMs = () => Math.round(60000 / wpm);

const updateWordSize = () => {
  const word = $('currentWord').textContent || '';
  const length = word.length;
  let size = 'clamp(2.8rem, 15vw, 8rem)';

  if (length > 28) {
    size = 'clamp(1.4rem, 6vw, 3.2rem)';
  } else if (length > 22) {
    size = 'clamp(1.8rem, 8vw, 4.2rem)';
  } else if (length > 16) {
    size = 'clamp(2.1rem, 10vw, 5.4rem)';
  } else if (length > 11) {
    size = 'clamp(2.4rem, 12vw, 6.5rem)';
  }

  $('currentWord').style.setProperty('--word-size', size);
};

const updateLabels = () => {
  $('speedLabel').textContent = `${wpm} WPM`;
  $('progressLabel').textContent = `${words.length ? index + 1 : 0} / ${words.length}`;
  const progress = words.length ? ((index + 1) / words.length) * 100 : 0;
  $('progressBar').style.width = `${Math.min(100, Math.max(0, progress))}%`;
};

const showWord = () => {
  if (!words.length) {
    $('currentWord').textContent = 'Bereit';
    updateWordSize();
    updateLabels();
    return;
  }

  $('currentWord').textContent = words[index] || 'Ende';
  updateWordSize();
  updateLabels();
};

const stop = () => {
  if (timer) clearTimeout(timer);
  timer = null;
  isRunning = false;
  $('playPauseButton').textContent = 'Start';
};

const tick = () => {
  if (!isRunning) return;

  showWord();

  if (index >= words.length - 1) {
    stop();
    $('statusText').textContent = 'Text beendet.';
    return;
  }

  index += 1;
  timer = setTimeout(tick, intervalMs());
};

const start = () => {
  if (!words.length) {
    loadText();
  }

  if (!words.length) {
    alert('Bitte zuerst Text einfügen.');
    return;
  }

  isRunning = true;
  $('playPauseButton').textContent = 'Pause';
  $('statusText').textContent = 'Lesefokus läuft.';
  tick();
};

const loadText = () => {
  stop();
  words = splitText($('textInput').value);
  index = 0;
  showWord();
  $('statusText').textContent = words.length
    ? `${words.length} Wörter geladen.`
    : 'Noch kein Text geladen.';
};

const reset = () => {
  stop();
  index = 0;
  showWord();
  $('statusText').textContent = words.length ? 'Zurück zum Anfang.' : 'Noch kein Text geladen.';
};

const clearAll = () => {
  stop();
  words = [];
  index = 0;
  $('textInput').value = '';
  $('currentWord').textContent = 'Bereit';
  updateWordSize();
  $('statusText').textContent = 'Noch kein Text geladen.';
  updateLabels();
};

const changeSpeed = (delta) => {
  wpm = Math.min(maxWpm, Math.max(minWpm, wpm + delta));
  updateLabels();
  $('statusText').textContent = `Tempo: ${wpm} Wörter pro Minute.`;

  if (isRunning) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, intervalMs());
  }
};

$('loadButton').addEventListener('click', loadText);
$('clearButton').addEventListener('click', clearAll);
$('resetButton').addEventListener('click', reset);
$('slowerButton').addEventListener('click', () => changeSpeed(-stepWpm));
$('fasterButton').addEventListener('click', () => changeSpeed(stepWpm));
$('playPauseButton').addEventListener('click', () => {
  if (isRunning) {
    stop();
    $('statusText').textContent = 'Pausiert.';
  } else {
    start();
  }
});

$('textInput').addEventListener('input', () => {
  if (!isRunning) {
    words = [];
    index = 0;
    $('currentWord').textContent = 'Bereit';
    updateWordSize();
    $('statusText').textContent = 'Text geändert. Zum Starten Text laden oder Start drücken.';
    updateLabels();
  }
});

updateWordSize();
updateLabels();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
