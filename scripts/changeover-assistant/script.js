const $ = (id) => document.getElementById(id);

const fields = [
  {
    key: 'Material',
    label: 'Material',
    action: 'Material prüfen und bei Bedarf wechseln.',
    patterns: [],
  },
  {
    key: 'Thickness',
    label: 'Stärke',
    action: 'Stärke umstellen und Messung/Freigabe durchführen.',
    patterns: [],
  },
  {
    key: 'Width',
    label: 'Breite',
    action: 'Breite einstellen und Randbeschnitt prüfen.',
    patterns: [],
  },
  {
    key: 'Chill',
    label: 'Chill',
    action: 'Chill-Wert prüfen und einstellen.',
    patterns: [
      /^\s*Abzug\s+([\d,.]+\s*(?:m\/min)?)/im,
      /\bAbzug\s*[:\-]?\s*([\d,.]+\s*(?:m\/min)?)/i,
      /^\s*Chill\s+([^\n]+)/im,
      /\bChill\s*[:\-]?\s*([^\n]+)/i,
    ],
  },
  {
    key: 'PumpH',
    label: 'Pumpe H',
    action: 'Pumpe H prüfen und einstellen.',
    patterns: [
      /\bPumpe\s*H\s*[:\-]?\s*([\d,.]+)/i,
      /\bP\s*H\s*[:\-]?\s*([\d,.]+)/i,
    ],
  },
  {
    key: 'PumpCo',
    label: 'Pumpe Co',
    action: 'Pumpe Co prüfen und einstellen.',
    patterns: [
      /\bPumpe\s*Co\s*[:\-]?\s*([\d,.]+)/i,
      /\bP\s*Co\s*[:\-]?\s*([\d,.]+)/i,
    ],
  },
  {
    key: 'Lfm',
    label: 'LFM',
    action: 'Laufmeter / Länge prüfen.',
    patterns: [
      /^\s*LFM\s+pro\s+Rolle\s+([\d,.]+\s*LFM?)/im,
      /\bLFM\s+pro\s+Rolle\s*[:\-]?\s*([\d,.]+\s*LFM?)/i,
    ],
  },
  {
    key: 'Kg',
    label: 'KG',
    action: 'Kilogramm / Materialmenge prüfen.',
    patterns: [
      /^\s*KG\s+pro\s+Rolle\s+([\d,.]+\s*KG?)/im,
      /\bKG\s+pro\s+Rolle\s*[:\-]?\s*([\d,.]+\s*KG?)/i,
    ],
  },
  {
    key: 'Additive',
    label: 'Additiv',
    action: 'Additiv prüfen und Dosierung einstellen.',
    patterns: [
      /^\s*Additiv\s+([^\n]+)/im,
      /\bAdditiv\s*[:\-]?\s*([^\n]+)/i,
    ],
  },
  {
    key: 'Powder',
    label: 'Puder',
    action: 'Puder prüfen und Einstellung anpassen.',
    patterns: [
      /^\s*Puder\s+([^\n]+)/im,
      /\bPuder\s*[:\-]?\s*([^\n]+)/i,
    ],
  },
  {
    key: 'Coating',
    label: 'Coating',
    action: 'Coating prüfen und Einstellung anpassen.',
    patterns: [
      /^\s*Coating\s+([^\n]+)/im,
      /\bCoating\s*[:\-]?\s*([^\n]+)/i,
    ],
  },
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
    if (input.type !== 'file') input.value = '';
  });
  document.querySelectorAll('textarea').forEach((textarea) => {
    textarea.value = '';
  });
  $('summaryText').textContent = 'Noch keine Umstellliste erstellt.';
  $('changeoverList').innerHTML = '<div class="empty-state">Fülle alte und neue Werte aus und tippe auf „Umstellliste erstellen“.</div>';
  $('ocrStatus').textContent = 'OCR ist ein Hilfsmittel. Bitte erkannte Werte immer prüfen.';
};

const setOcrStatus = (message) => {
  $('ocrStatus').textContent = message;
};

const runOcr = async (side) => {
  const imageInput = $(`${side}Image`);
  const output = $(`${side}OcrText`);
  const file = imageInput.files && imageInput.files[0];

  if (!file) {
    alert('Bitte zuerst ein Foto auswählen.');
    return;
  }

  if (!window.Tesseract) {
    alert('OCR-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.');
    return;
  }

  try {
    setOcrStatus('OCR läuft... Das kann auf dem Handy etwas dauern.');
    const result = await Tesseract.recognize(file, 'deu+eng', {
      logger: (progress) => {
        if (progress.status === 'recognizing text') {
          setOcrStatus(`OCR läuft... ${Math.round(progress.progress * 100)} %`);
        }
      },
    });
    output.value = result.data.text.trim();
    setOcrStatus('OCR fertig. Bitte Text und übernommene Werte kontrollieren.');
  } catch (error) {
    console.error(error);
    setOcrStatus('OCR fehlgeschlagen. Foto bitte erneut versuchen oder Werte manuell eintragen.');
  }
};

const cleanExtractedValue = (value) => normalize(value)
  .replace(/\s+/g, ' ')
  .replace(/[;|]+$/g, '')
  .replace(/^(Food|Qualit[äa]t)\s+/i, '')
  .trim();

const normalizeMaterialCode = (code) => {
  const match = normalize(code).toUpperCase().match(/P\s*(\d{3,4})/);
  return match ? `P${match[1]}` : cleanExtractedValue(code);
};

const extractExtrusionMaterialParts = (text) => {
  const lines = text.split(/\n+/).map((line) => cleanExtractedValue(line));
  const materialLine = lines.find((line) => /^Material\s+/i.test(line) && !/KA1|KA1-PE|PE\s*50|P199/i.test(line));

  if (!materialLine) return {};

  const cleaned = materialLine.replace(/^Material\s*[:\-]?\s*/i, '').trim();
  const match = cleaned.match(/\b(P\s*\d{3,4}\s*F?)\s+([\d,.]+)\s+([\d,.]+)/i);

  if (!match) return { Material: normalizeMaterialCode(cleaned) };

  return {
    Material: normalizeMaterialCode(match[1]),
    Thickness: match[2],
    Width: match[3],
  };
};

const extractValues = (text) => {
  const values = extractExtrusionMaterialParts(text);

  fields.forEach((field) => {
    if (values[field.key]) return;

    for (const pattern of field.patterns || []) {
      const match = text.match(pattern);
      if (match && match[1]) {
        values[field.key] = cleanExtractedValue(match[1]);
        break;
      }
    }
  });

  return values;
};

const applyOcrValues = (side) => {
  const text = $(`${side}OcrText`).value;
  const values = extractValues(text);
  const prefix = side === 'old' ? 'old' : 'new';
  let applied = 0;

  Object.entries(values).forEach(([key, value]) => {
    const input = $(`${prefix}${key}`);
    if (input && value) {
      input.value = value;
      applied += 1;
    }
  });

  setOcrStatus(applied > 0
    ? `${applied} Wert${applied === 1 ? '' : 'e'} übernommen. Bitte kontrollieren.`
    : 'Keine passenden Werte erkannt. Du kannst den Text manuell kopieren oder die Felder direkt ausfüllen.');
};

$('compareButton').addEventListener('click', compareOrders);
$('clearButton').addEventListener('click', clearInputs);
$('oldOcrButton').addEventListener('click', () => runOcr('old'));
$('newOcrButton').addEventListener('click', () => runOcr('new'));
$('oldApplyOcrButton').addEventListener('click', () => applyOcrValues('old'));
$('newApplyOcrButton').addEventListener('click', () => applyOcrValues('new'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app still works online if service worker registration fails.
    });
  });
}
