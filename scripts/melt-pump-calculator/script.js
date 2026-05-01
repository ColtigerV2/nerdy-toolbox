const $ = (id) => document.getElementById(id);

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach((item) => item.classList.toggle('active', item === tab));
    panels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${target}`));
  });
});

const readNumber = (id, label) => {
  const element = $(id);
  const value = Number(String(element.value).trim().replace(',', '.'));

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

const baseline = () => {
  const thickness = readNumber('baseThickness', 'Aktuelle Stärke');
  const speed = readNumber('baseSpeed', 'Aktuelle Geschwindigkeit');
  const pump1 = readNumber('basePump1', 'Aktuelle Pumpe 1');
  const pump2 = readNumber('basePump2', 'Aktuelle Pumpe 2');

  return { thickness, speed, pump1, pump2 };
};

const showError = (message) => {
  alert(message);
};

$('calculatePumps').addEventListener('click', () => {
  try {
    const base = baseline();
    const targetThickness = readNumber('targetThicknessPumps', 'Ziel-Stärke');
    const targetSpeed = readNumber('targetSpeedPumps', 'Ziel-Geschwindigkeit');

    const baseFactor = base.thickness * base.speed;
    const targetFactor = targetThickness * targetSpeed;
    const ratio = targetFactor / baseFactor;

    $('resultPump1').textContent = format(base.pump1 * ratio);
    $('resultPump2').textContent = format(base.pump2 * ratio);
  } catch (error) {
    showError(error.message);
  }
});

$('calculateSpeed').addEventListener('click', () => {
  try {
    const base = baseline();
    const targetThickness = readNumber('targetThicknessSpeed', 'Ziel-Stärke');
    const targetPump1 = readNumber('targetPump1Speed', 'Pumpe 1');

    const pumpRatio = targetPump1 / base.pump1;
    const targetFactor = base.thickness * base.speed * pumpRatio;
    const speed = targetFactor / targetThickness;
    const pump2 = base.pump2 * pumpRatio;

    $('resultSpeed').textContent = format(speed);
    $('resultPump2Speed').textContent = format(pump2);
  } catch (error) {
    showError(error.message);
  }
});
