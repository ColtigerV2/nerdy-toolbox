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
  const value = Number(String(element.value).replace(',', '.'));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return value;
};

const format = (value) => {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
};

const baseline = () => {
  const thickness = readNumber('baseThickness', 'Current thickness');
  const speed = readNumber('baseSpeed', 'Current speed');
  const pump1 = readNumber('basePump1', 'Current Pump 1');
  const pump2 = readNumber('basePump2', 'Current Pump 2');

  return { thickness, speed, pump1, pump2 };
};

const showError = (message) => {
  alert(message);
};

$('calculatePumps').addEventListener('click', () => {
  try {
    const base = baseline();
    const targetThickness = readNumber('targetThicknessPumps', 'Target thickness');
    const targetSpeed = readNumber('targetSpeedPumps', 'Target speed');

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
    const targetThickness = readNumber('targetThicknessSpeed', 'Target thickness');
    const targetPump1 = readNumber('targetPump1Speed', 'Pump 1');

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
