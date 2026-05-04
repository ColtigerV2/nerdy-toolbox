const $ = (id) => document.getElementById(id);

const DENSITIES = {
  PET: { primary: 1.34, secondary: 0.93 },
  PP: { primary: 0.91, secondary: 0.91 },
};

function toNumber(value) {
  if (typeof value !== 'string') return Number(value) || 0;
  return Number(value.replaceAll('.', '').replace(',', '.')) || 0;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value) {
  if (!Number.isFinite(value)) return '--';
  return Math.round(value).toLocaleString('de-DE');
}

function getMaterialType() {
  return document.querySelector('input[name="materialType"]:checked')?.value || 'PET';
}

function getBaseData() {
  const materialType = getMaterialType();
  const petThickness = toNumber($('petThickness').value);
  const peThickness = toNumber($('peThickness').value);
  const widthMm = toNumber($('widthMm').value);
  const coreOuterMm = toNumber($('coreSelect').value);
  const densities = DENSITIES[materialType];

  const totalThicknessMicron = petThickness + peThickness;
  const weightedDensity = totalThicknessMicron > 0
    ? ((petThickness * densities.primary) + (peThickness * densities.secondary)) / totalThicknessMicron
    : 0;

  return {
    materialType,
    petThickness,
    peThickness,
    widthMm,
    coreOuterMm,
    totalThicknessMicron,
    density: weightedDensity,
  };
}

function weightFromLength(lengthLfm, base) {
  return lengthLfm * (base.widthMm / 1000) * (base.totalThicknessMicron / 1000) * base.density;
}

function lengthFromWeight(weightKg, base) {
  const kgPerLfm = (base.widthMm / 1000) * (base.totalThicknessMicron / 1000) * base.density;
  return kgPerLfm > 0 ? weightKg / kgPerLfm : 0;
}

function diameterFromLength(lengthLfm, base) {
  const lengthMm = lengthLfm * 1000;
  const thicknessMm = base.totalThicknessMicron / 1000;
  return Math.sqrt((base.coreOuterMm ** 2) + ((4 * lengthMm * thicknessMm) / Math.PI));
}

function lengthFromDiameter(diameterMm, base) {
  const thicknessMm = base.totalThicknessMicron / 1000;
  const usableArea = (Math.PI * ((diameterMm ** 2) - (base.coreOuterMm ** 2))) / 4;
  return thicknessMm > 0 ? (usableArea / thicknessMm) / 1000 : 0;
}

function updateBaseDisplay() {
  const base = getBaseData();
  $('totalThickness').textContent = `${formatNumber(base.totalThicknessMicron, 0)} µ`;
  $('densityValue').textContent = `${formatNumber(base.density, 2)} g/cm³`;
  $('coreDiameter').textContent = `${formatInteger(base.coreOuterMm)} mm`;
}

function calculateFromLength() {
  const base = getBaseData();
  const length = toNumber($('lengthInput').value);
  const diameter = diameterFromLength(length, base);
  const weight = weightFromLength(length, base);
  $('diameterFromLength').textContent = `${formatInteger(diameter)} mm`;
  $('weightFromLength').textContent = `${formatNumber(weight, 1)} kg`;
}

function calculateFromDiameter() {
  const base = getBaseData();
  const diameter = toNumber($('diameterInput').value);
  const length = lengthFromDiameter(diameter, base);
  const weight = weightFromLength(length, base);
  $('lengthFromDiameter').textContent = `${formatInteger(length)} LFM`;
  $('weightFromDiameter').textContent = `${formatNumber(weight, 1)} kg`;
}

function calculateFromWeight() {
  const base = getBaseData();
  const weight = toNumber($('weightInput').value);
  const length = lengthFromWeight(weight, base);
  const diameter = diameterFromLength(length, base);
  $('lengthFromWeight').textContent = `${formatInteger(length)} LFM`;
  $('diameterFromWeight').textContent = `${formatInteger(diameter)} mm`;
}

function recalculateAll() {
  updateBaseDisplay();
  calculateFromLength();
  calculateFromDiameter();
  calculateFromWeight();
}

function setDefaults() {
  $('petThickness').value = '195';
  $('peThickness').value = '0';
  $('widthMm').value = '1144';
  $('lengthInput').value = '2330';
  $('diameterInput').value = '890';
  $('weightInput').value = '900';
}

function bindEvents() {
  ['petThickness', 'peThickness', 'widthMm', 'coreSelect', 'lengthInput', 'diameterInput', 'weightInput'].forEach((id) => {
    $(id).addEventListener('input', recalculateAll);
    $(id).addEventListener('change', recalculateAll);
  });

  document.querySelectorAll('input[name="materialType"]').forEach((input) => {
    input.addEventListener('change', recalculateAll);
  });

  $('calcFromLength').addEventListener('click', calculateFromLength);
  $('calcFromDiameter').addEventListener('click', calculateFromDiameter);
  $('calcFromWeight').addEventListener('click', calculateFromWeight);
}

function init() {
  setDefaults();
  bindEvents();
  recalculateAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
}

init();
