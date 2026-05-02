const $ = (id) => document.getElementById(id);

const fields = [
  { key: 'Material', label: 'Material', action: 'Material prüfen und bei Bedarf wechseln.' },
  { key: 'Thickness', label: 'Stärke', action: 'Stärke umstellen und Messung/Freigabe durchführen.' },
  { key: 'Width', label: 'Breite', action: 'Breite einstellen und Randbeschnitt prüfen.' },
  { key: 'Chill', label: 'Chill', action: 'Chill-Werte prüfen und einstellen.' },
  { key: 'PumpH', label: 'Pumpe H', action: 'Pumpe H prüfen und einstellen.' },
  { key: 'PumpCo', label: 'Pumpe Co', action: 'Pumpe Co prüfen und einstellen.' },
  { key: 'Lfm', label: 'LFM', action: 'Laufmeter / Länge prüfen.' },
  { key: 'Kg', label: 'KG', action: 'Kilogramm / Materialmenge prüfen.' },
  { key: 'Additive', label: 'Additiv', action: 'Additiv prüfen und Dosierung einstellen.' },
  { key: 'Powder', label: 'Puder', action: 'Puder prüfen und Einstellung anpassen.' },
  { key: 'Coating', label: 'Coating', action: 'Coating prüfen und Einstellung anpassen.' },
];

const normalize = (value) => String(value || '').trim();

const readPair = (key) => {
  const oldValue = normalize($(`old${key}`).value);
  const newValue = normalize($(`new${key}`).value);
  return { oldValue, newValue };
};

const buildChangeItem = ({ label, oldValue, newValue, action }, index) => {
  const item = document.createElement('div');
  item.className = 'change-item';
  item.innerHTML = `
    <strong>${index}. ${label}</strong>
    <span>Alt: ${oldValue || '—'} → Neu: ${newValue || '—'}</span>
    <span>${action}</span>
  `;
  return item;
};

const compareOrders = () => {
  const container = $('changeoverList');
  const summary = $('summaryText');
  container.innerHTML = '';

  const changes = fields
    .map((field) => ({ ...field, ...readPair(field.key) }))
    .filter(({ oldValue, newValue }) => oldValue || newValue)
    .filter(({ oldValue, newValue }) => oldValue !== newValue);

  if (changes.length === 0) {
    summary.textContent = 'Keine Unterschiede gefunden oder noch keine Werte eingetragen.';
    container.innerHTML = '<div class="empty-state">Keine Umstellung erkannt.</div>';
    return;
  }

  summary.textContent = `${changes.length} Unterschied${changes.length === 1 ? '' : 'e'} gefunden.`;

  changes.forEach((change, index) => {
    container.appendChild(buildChangeItem(change, index + 1));
  });
};

const clearInputs = () => {
  document.querySelectorAll('input').forEach((input) => {
    input.value = '';
  });
  $('summaryText').textContent = 'Noch keine Umstellliste erstellt.';
  $('changeoverList').innerHTML = '<div class="empty-state">Fülle alte und neue Werte aus und tippe auf „Umstellliste erstellen“.</div>';
};

$('compareButton').addEventListener('click', compareOrders);
$('clearButton').addEventListener('click', clearInputs);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
