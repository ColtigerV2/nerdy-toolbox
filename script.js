const year = document.querySelector('#year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const formatNumber = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return 'Invalid value';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(decimals, 2),
  });
};

const unitValue = document.querySelector('#unit-value');
const unitType = document.querySelector('#unit-type');
const unitResult = document.querySelector('#unit-result');
const convertButton = document.querySelector('#convert-button');

const convertUnits = () => {
  const value = Number(unitValue.value);

  if (!Number.isFinite(value)) {
    unitResult.textContent = 'Please enter a valid number.';
    return;
  }

  const conversions = {
    'mm-in': { result: value / 25.4, label: 'in' },
    'in-mm': { result: value * 25.4, label: 'mm' },
    'kg-lb': { result: value * 2.2046226218, label: 'lb' },
    'lb-kg': { result: value / 2.2046226218, label: 'kg' },
    'c-f': { result: (value * 9) / 5 + 32, label: '°F' },
    'f-c': { result: ((value - 32) * 5) / 9, label: '°C' },
  };

  const conversion = conversions[unitType.value];
  unitResult.textContent = `${formatNumber(value)} → ${formatNumber(conversion.result)} ${conversion.label}`;
};

convertButton?.addEventListener('click', convertUnits);
unitValue?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') convertUnits();
});

const startTime = document.querySelector('#start-time');
const endTime = document.querySelector('#end-time');
const breakMinutes = document.querySelector('#break-minutes');
const workdayResult = document.querySelector('#workday-result');
const workdayButton = document.querySelector('#workday-button');

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const calculateWorkday = () => {
  if (!startTime.value || !endTime.value) {
    workdayResult.textContent = 'Please enter start and end time.';
    return;
  }

  let start = timeToMinutes(startTime.value);
  let end = timeToMinutes(endTime.value);
  const pause = Number(breakMinutes.value || 0);

  if (end < start) {
    end += 24 * 60;
  }

  const total = Math.max(0, end - start - pause);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  workdayResult.textContent = `${hours} h ${minutes} min total work time after breaks.`;
};

workdayButton?.addEventListener('click', calculateWorkday);

const batteryCells = document.querySelector('#battery-cells');
const batteryVoltage = document.querySelector('#battery-voltage');
const batteryResult = document.querySelector('#battery-result');
const batteryButton = document.querySelector('#battery-button');

const checkBattery = () => {
  const cells = Number(batteryCells.value);
  const voltage = Number(batteryVoltage.value);

  if (!Number.isFinite(voltage) || voltage <= 0) {
    batteryResult.textContent = 'Please enter a valid pack voltage.';
    return;
  }

  const cellVoltage = voltage / cells;
  let status = 'Storage / medium range';

  if (cellVoltage >= 4.15) status = 'Full or nearly full';
  else if (cellVoltage >= 3.8) status = 'Good / usable';
  else if (cellVoltage >= 3.5) status = 'Low - land soon';
  else status = 'Very low - avoid discharging further';

  batteryResult.textContent = `${formatNumber(cellVoltage, 2)} V per cell — ${status}.`;
};

batteryButton?.addEventListener('click', checkBattery);
batteryVoltage?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') checkBattery();
});
