const $ = (id) => document.getElementById(id);

const fields = [
  { key: 'Order', label: 'Auftragsnummer', action: 'Auftragspapiere und Etiketten auf neuen Auftrag umstellen.' },
  { key: 'Article', label: 'Artikel', action: 'Artikelwechsel prüfen und Muster/Freigabe einplanen.' },
  { key: 'Material', label: 'Material', action: 'Materialwechsel vorbereiten und Materialversorgung prüfen.' },
  { key: 'Color', label: 'Farbe', action: 'Farb-/Sortenwechsel prüfen und Verunreinigungen ausschließen.' },
  { key: 'Thickness', label: 'Stärke [µm]', action: 'Stärke umstellen und Messung/Freigabe durchführen.' },
  { key: 'Width', label: 'Breite [mm]', action: 'Breite einstellen, Messer/Format und Randbeschnitt prüfen.' },
  { key: 'RollLength', label: 'Rollenlänge [m]', action: 'Rollenlänge im Wickler/Auftrag prüfen.' },
  { key: 'Speed', label: 'Geschwindigkeit [m/min]', action: 'Liniengeschwindigkeit anpassen und Prozess stabilisieren.' },
  { key: 'Pump1', label: 'Pumpe 1 [rpm]', action: 'Pumpe 1 einstellen oder neu berechnen.' },
  { key: 'Pump2', label: 'Pumpe 2 [rpm]', action: 'Pumpe 2 einstellen oder neu berechnen.' },
  { key: 'Treatment', label: 'Korona / Behandlung', action: 'Behandlung/Korona prüfen und einstellen.' },
  { key: 'Packaging', label: 'Verpackung', action: 'Verpackung, Etiketten und Palettierung auf neuen Auftrag umstellen.' },
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

const addFixedChecklist = (container, startIndex) => {
  const fixedItems = [
    'Auftragsdaten gegen Auftragspapiere prüfen.',
    'Maschineneinstellungen vor Produktionsstart kontrollieren.',
    'Erstmuster ziehen und Qualität freigeben lassen.',
    'Dokumentation / Etiketten / Verpackung prüfen.',
  ];

  fixedItems.forEach((text, offset) => {
    const item = document.createElement('div');
    item.className = 'change-item warning';
    item.innerHTML = `<strong>${startIndex + offset}. Standardprüfung</strong><span>${text}</span>`;
    container.appendChild(item);
  });
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

  summary.textContent = `${changes.length} Unterschied${changes.length === 1 ? '' : 'e'} gefunden. Daraus wurde eine Umstellliste erstellt.`;

  changes.forEach((change, index) => {
    container.appendChild(buildChangeItem(change, index + 1));
  });

  addFixedChecklist(container, changes.length + 1);
};

const clearInputs = () => {
  document.querySelectorAll('input').forEach((input) => {
    input.value = '';
  });
  $('summaryText').textContent = 'Noch keine Umstellliste erstellt.';
  $('changeoverList').innerHTML = '<div class="empty-state">Fülle alten und neuen Auftrag aus und tippe auf „Umstellliste erstellen“.</div>';
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
