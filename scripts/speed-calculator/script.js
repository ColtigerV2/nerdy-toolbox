const $ = (id) => document.getElementById(id);

const readNumber = (id, label) => {
  const value = Number(String($(id).value).trim().replace(',', '.'));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} muss größer als null sein.`);
  }

  return value;
};

const format = (value) => {
  return value.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
};

const calculate = () => {
  try {
    const thickness1 = readNumber('thickness1', 'Stärke 1');
    const speed1 = readNumber('speed1', 'Geschwindigkeit 1');
    const thickness2 = readNumber('thickness2', 'Stärke 2');

    const speed2 = (thickness1 * speed1) / thickness2;
    $('resultSpeed2').textContent = format(speed2);
  } catch (error) {
    alert(error.message);
  }
};

$('calculateButton').addEventListener('click', calculate);

['thickness1', 'speed1', 'thickness2'].forEach((id) => {
  $(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') calculate();
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
