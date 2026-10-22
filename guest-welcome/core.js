/* TOC Guest Welcome – núcleo: iconos, textos por idioma, cálculo de tasa y maquetación de la hoja */

const TAX = { shared: 6.60, private: 7.70, maxNights: 7 };
const WIFI_PASSWORD = 'Tocbarcelona2024';

/* ---------- Iconos (mismo set que la tarjeta RULES) ---------- */
const S = 'fill="none" stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const svg = b => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g ${S}>${b}</g></svg>`;
const NO = '<circle cx="24" cy="24" r="20"/><path d="M10 10 L38 38"/>';
const ICONS = {
  checkin: svg('<path d="M26 6h12a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H26"/><path d="M6 24h22"/><path d="M20 16l8 8-8 8"/>'),
  checkout: svg('<path d="M22 6H10a2 2 0 0 0-2 2v32a2 2 0 0 0 2 2h12"/><path d="M20 24h22"/><path d="M34 16l8 8-8 8"/>'),
  reception: svg('<path d="M6 34h36"/><path d="M10 34a14 14 0 0 1 28 0"/><path d="M24 20v-4"/><path d="M20 16h8"/><path d="M8 40h32"/>'),
  breakfast: svg('<path d="M8 20h26v10a10 10 0 0 1-10 10h-6A10 10 0 0 1 8 30z"/><path d="M34 23h3a5 5 0 0 1 0 10h-3"/><path d="M15 6c-2 3 2 5 0 8"/><path d="M21 6c-2 3 2 5 0 8"/><path d="M27 6c-2 3 2 5 0 8"/>'),
  terrace: svg('<path d="M6 22a18 13 0 0 1 36 0z"/><path d="M24 9V6"/><path d="M24 22v20"/><path d="M15 42h18"/><path d="M15 22a9 13 0 0 1 9-13 9 13 0 0 1 9 13"/>'),
  nofood: svg('<path d="M13 22a8 6 0 0 1 16 0z"/><path d="M12 26h18"/><path d="M13 30h16a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z"/><path d="M31 16h8l-1.5 20h-5z"/><path d="M35 16l2-6"/>' + NO),
  laundry: svg('<rect x="9" y="5" width="30" height="38" rx="3"/><path d="M9 13h30"/><circle cx="24" cy="28" r="9"/><circle cx="15" cy="9" r="0.6"/><circle cx="20" cy="9" r="0.6"/><path d="M19 29c3-2 7 2 10-1"/>'),
  locker: svg('<rect x="10" y="21" width="28" height="22" rx="3"/><path d="M16 21v-6a8 8 0 0 1 16 0v6"/><circle cx="24" cy="30" r="2.5"/><path d="M24 32.5v4"/>'),
  kitchen: svg('<rect x="6" y="30" width="36" height="13" rx="2"/><path d="M12 36.5h6"/><circle cx="33" cy="36.5" r="2"/><path d="M12 18h24v8a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z"/><path d="M8 18h4"/><path d="M36 18h4"/><path d="M19 13c-1.5-2 1.5-3 0-5"/><path d="M29 13c-1.5-2 1.5-3 0-5"/>'),
  towel: svg('<path d="M8 14h28a4 4 0 0 1 0 8H8z"/><path d="M8 22h28a4 4 0 0 1 0 8H8z"/><path d="M8 30h28a4 4 0 0 1 0 8H8z"/><path d="M14 14v24"/>'),
  hairdryer: svg('<path d="M8 14h16a9 9 0 0 1 0 18h-2l-3 12h-6l2-12H8z"/><circle cx="24" cy="23" r="3"/><path d="M37 17l5-3"/><path d="M38 23h5"/><path d="M37 29l5 3"/>'),
  iron: svg('<path d="M5 36h36l-2-9a10 10 0 0 0-10-8H15a10 10 0 0 0-10 10z"/><path d="M15 19v-5h14a7 7 0 0 1 7 7"/><path d="M5 41h36"/><circle cx="16" cy="29" r="0.6"/><circle cx="23" cy="29" r="0.6"/><circle cx="30" cy="29" r="0.6"/>'),
  cocktail: svg('<path d="M9 8h30L24 25z"/><path d="M24 25v14"/><path d="M16 41h16"/><path d="M14 13h20"/><circle cx="33" cy="6" r="3.5"/>'),
  noclothes: svg('<path d="M24 10a2.5 2.5 0 1 1 2.5 2.5L24 14"/><path d="M24 14L11 21h26z"/><path d="M16 21l-4 6 4 2v9h16v-9l4-2-4-6"/>' + NO),
  nosmoking: svg('<rect x="9" y="25" width="26" height="6" rx="1"/><path d="M29 25v6"/><path d="M38 25v6"/><path d="M38 21c0-3-3-3-3-6"/>' + NO),
  quiet: svg('<rect x="6" y="8" width="26" height="32" rx="2"/><path d="M19 8v32"/><path d="M6 24h26"/><path d="M42 10a7 7 0 1 0 0 12 8 8 0 0 1 0-12z"/>'),
  novisitors: svg('<circle cx="17" cy="17" r="4.5"/><path d="M9 34v-3a8 8 0 0 1 16 0v3"/><circle cx="31" cy="17" r="4.5"/><path d="M27 23.5a8 8 0 0 1 12 7.5v3"/>' + NO),
  bed: svg('<path d="M5 38V12"/><path d="M5 30h38v8"/><path d="M43 30v-4a6 6 0 0 0-6-6H21v10"/><rect x="9" y="21" width="9" height="6" rx="2"/>'),
  safe: svg('<rect x="7" y="8" width="34" height="32" rx="3"/><circle cx="24" cy="24" r="7"/><path d="M24 17v3"/><path d="M24 28v3"/><path d="M17 24h3"/><path d="M28 24h3"/><path d="M11 40v3"/><path d="M37 40v3"/>'),
  wifi: svg('<path d="M5 18a28 28 0 0 1 38 0"/><path d="M11 25a19 19 0 0 1 26 0"/><path d="M17 32a10 10 0 0 1 14 0"/><circle cx="24" cy="38" r="1.6" fill="#1a1a1a"/>'),
};

/* ---------- Códigos de habitación del PMS ---------- */
const ROOM_CODES = [
  { re: /^1d\b/i, key: 'd8mix_sh', private: false },
  { re: /^1e\b/i, key: 'd8mix_en', private: false },
  { re: /^1g\b.*\bBC\b/i, key: 'd6mix_sh', private: false },
  { re: /^1g\b/i, key: 'd6mix_en', private: false },
  { re: /^1f\b/i, key: 'd8fem', private: false },
  { re: /^1h\b/i, key: 'd6fem', private: false },
  { re: /^4\s*DB/i, key: 'double', private: true },
  { re: /^9g\b/i, key: 'family4', private: true },
];

const AGENCIES = [
  { re: /BOOKING/i, name: 'Booking.com', mode: 'prepaid' },
  { re: /HOTELBEDS/i, name: 'Hotelbeds', mode: 'prepaid' },
  { re: /CTRIP|TRIP\.COM/i, name: 'Trip.com', mode: 'prepaid' },
  { re: /EXPEDIA/i, name: 'Expedia', mode: 'prepaid' },
  { re: /\bG2\b/i, name: 'G2 Travel', mode: 'prepaid' },
  { re: /HOSTELWORLD/i, name: 'Hostelworld', mode: 'ask' },
  { re: /MIRAI|WEB|DIRECT/i, name: 'web', mode: 'web' },
];

/* ---------- Utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ltr = s => `<bdi dir="ltr">${s}</bdi>`;

function money(v, t) {
  const n = v.toFixed(2).replace('.', t.dec);
  return ltr(t.euroAfter ? `${n} €` : `€${n}`);
}

function fullDate(s) {               // "22/10/26" -> "22/10/2026"
  const [d, m, y] = s.split('/');
  return `${d}/${m}/${y.length === 2 ? '20' + y : y}`;
}

function roomInfo(code) {
  const r = ROOM_CODES.find(x => x.re.test(code.trim()));
  return r || { key: null, private: false };
}

function agencyInfo(agency) {
  return AGENCIES.find(a => a.re.test(agency || '')) || { name: agency || '', mode: 'ask' };
}

function computeTax(b) {
  const rate = b.private ? TAX.private : TAX.shared;
  const nights = Math.min(b.nights, TAX.maxNights);
  return { rate, nights, persons: b.adults16, total: Math.round(rate * nights * b.adults16 * 100) / 100, capped: b.nights > TAX.maxNights };
}

/* ---------- Hoja A4 ---------- */
const RULES_DORM = ['reception', 'breakfast', 'terrace', 'kitchen', 'laundry', 'nofood_d', 'cocktail', 'towel', 'hairdryer', 'iron', 'noclothes', 'nosmoking', 'quiet', 'novisitors', 'bed'];
const RULES_PRIV = ['reception', 'breakfast', 'terrace', 'kitchen', 'laundry', 'nofood_p', 'cocktail', 'iron', 'noclothes', 'nosmoking', 'quiet', 'novisitors'];
const ICON_FOR = { nofood_d: 'nofood', nofood_p: 'nofood' };

/* b = { name, arrival, departure, nights, regime, roomCode, channel, mode ('prepaid'|'web'|'ask'),
         pax, adults16, amountToPay, beds: [{room, bed}] } */
function renderSheet(b, lang, logoSrc) {
  const t = I18N[lang];
  const room = roomInfo(b.roomCode || '');
  b.private = room.private;
  const tax = computeTax(b);

  const facts = [
    [t.bookedVia, b.mode === 'web' ? t.ourWebsite : esc(b.channel)],
    [t.roomType, t.rt[room.key] || esc(b.roomCode)],
    [t.checkin, `<strong>${ltr(fullDate(b.arrival))}</strong> · ${t.from3}`],
    [t.checkout, `<strong>${ltr(fullDate(b.departure))}</strong> · ${t.until11}`],
    [t.nights, `<strong>${b.nights}</strong>`],
    [t.guests, `<strong>${b.pax}</strong>`],
  ];
  if (b.regime === 'HD') facts.push([t.breakfast, t.breakfastIncl]);

  const tile = (label, value, icon) => `<div class="tile"><div class="tile-ic">${ICONS[icon]}</div><div class="tile-l">${label}</div><div class="tile-v">${esc(value || '—')}</div></div>`;
  const beds = b.beds && b.beds.length ? b.beds : [{ room: '', bed: '' }];
  let place;
  if (room.private) {
    const many = beds.length > 1;
    place = `<div class="tiles ${many ? 'rooms' : 'one'}">${beds.map(x => tile(t.room, x.room, 'checkin')).join('')}</div>
             <p class="place-note"><span class="mini">${ICONS.safe}</span><span>${t.safeNote}</span></p>`;
  } else {
    const rows = beds.map(x => `<div class="tiles${beds.length > 1 ? ' compact' : ''}">${tile(t.room, x.room, 'checkin')}${tile(t.bed, x.bed, 'bed')}${tile(t.locker, x.bed, 'locker')}</div>`).join('');
    place = `<div class="bed-rows${beds.length > 3 ? ' tight' : ''}">${rows}</div><p class="place-note"><span class="mini">${ICONS.locker}</span><span>${t.lockerNote}</span></p>`;
  }

  const taxStr = money(tax.total, t);
  const taxLine = t.taxLine(money(tax.rate, t), tax.persons, tax.nights);
  let payBig, payLines;
  if (b.mode === 'ask') {
    const amt = Number.isFinite(b.amountToPay) ? money(b.amountToPay, t) : ltr('____ €');
    payBig = [t.payAmount, amt];
    payLines = [t.includesTax(taxStr), taxLine];
  } else {
    payBig = [t.payTaxOnly, taxStr];
    payLines = [`<strong>${b.mode === 'web' ? t.paidWeb : t.paidBy(esc(b.channel))}</strong>`, t.onlyTax, taxLine];
  }
  payLines.push(t.taxAge);
  if (tax.capped) payLines.push(t.taxCap);

  const ruleKeys = room.private ? RULES_PRIV : RULES_DORM;
  const cols = ruleKeys.length % 5 === 0 ? 5 : 4;
  const rules = ruleKeys.map(k => {
    const [main, sub] = t.rules[k];
    return `<div class="rule"><div class="r-ic">${ICONS[ICON_FOR[k] || k]}</div><div class="r-tx"><b>${main}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`;
  }).join('');

  return `<section class="page lang-${lang}" dir="${t.dir}" lang="${lang}">
  <header class="top">
    <img class="logo" src="${logoSrc}" alt="TOC Hostel & Suites">
    <div class="top-r"><div class="kicker">${t.welcome}</div><div class="city">Barcelona</div></div>
  </header>
  <div class="accent"></div>

  <h1 class="greet">${t.greeting(esc(b.name))}</h1>
  <p class="intro">${t.intro}</p>

  <div class="sec-title">${t.yourBooking}</div>
  <section class="booking">
    <dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="place">${place}</div>
  </section>

  <div class="sec-title">${t.payment}</div>
  <section class="pay">
    <div class="pay-big"><div class="pay-l">${payBig[0]}</div><div class="pay-v">${payBig[1]}</div></div>
    <div class="pay-lines">${payLines.map(l => `<p>${l}</p>`).join('')}</div>
  </section>

  <div class="sec-title">${t.goodToKnow}</div>
  <section class="rules" style="--cols:${cols}">${rules}</section>

  <section class="wifi">
    <div class="w-ic">${ICONS.wifi}</div>
    <div class="w-l">${t.wifi}<span>${t.password}</span></div>
    <div class="w-v">${ltr(WIFI_PASSWORD)}</div>
  </section>

  <footer class="foot">
    <div class="closing">${t.closing}</div>
    <div class="team">${t.team}</div>
    <div class="small">${ltr('Gran Via de les Corts Catalanes 580 · bcn@tochostels.com · +34 934 534 425')}<br>${t.valuables}</div>
  </footer>
</section>`;
}

/* ---------- Lector del texto copiado del PMS (Prestige) ----------
   No depende de cómo vengan separadas las líneas (saltos, tabuladores, espacios,
   todo en una línea…): busca cada etiqueta y toma lo que hay hasta la siguiente. */
const PMS_LABELS = ['Localizador', 'Bono', 'Estancia', 'R[eé]gimen', 'Fecha toma', 'Contrato', 'Agencia', 'Total tasas', 'Total(?!\\s+tasas)', 'Prepagado', 'Observaciones'];
const LABEL_ALT = PMS_LABELS.join('|');
const DATE_RE = /^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})$/;
const DATE_G = /\d{1,2}\/\d{1,2}\/(?:20\d{2}(?!\d)|\d{2})/g;   // año de 2 cifras: "24/10/262" = 24/10/26 + 2 noches
const ROOM_G = /(?:^|[^\w])(1[d-h]\s*\d\s*(?:MIXTA|FEM)(?:\s*BC)?|4\s*DB\s*STANDARD|9g\s*FAMILIAR\s*4\s*PAX)\s*(\d{1,4}(?:\s*-\s*\d{1,3})?)?/i;
const num = s => parseFloat(String(s).replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));

function cleanText(text) {
  return String(text || '').normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')          // caracteres invisibles
    .replace(/[\u00A0\u2007\u202F]/g, ' ')          // espacios no separables
    .replace(/\r\n?|\u2028|\u2029/g, '\n');
}

function parsePMS(text) {
  // Prestige pega las etiquetas a los valores ("Localizador1061…", "RégimenHH", "Total76,31"): las separa
  const clean = cleanText(text).replace(new RegExp(`(${LABEL_ALT})(?=[^\\s:])`, 'gi'), '$1 ');
  const flat = clean.replace(/\s+/g, ' ').trim();
  const out = { name: '', companions: [], arrival: '', departure: '', nights: null, regime: 'HH', roomCode: '', place: '', agency: '', contract: '', total: null, totalTax: null, prepaid: null, raw: clean };

  const field = label => {
    const m = flat.match(new RegExp(`(?:^|\\s)(?:${label})\\s*:?\\s+(.*?)(?=\\s+(?:${LABEL_ALT})(?:\\s|:|$)|$)`, 'i'));
    return m ? m[1].trim() : '';
  };

  // Titular y acompañantes: lo que hay antes de la primera etiqueta
  const first = flat.search(new RegExp(`(?:^|\\s)(?:${LABEL_ALT})(?:\\s|:|$)`, 'i'));
  const headFlat = first > 0 ? flat.slice(0, first).trim() : flat.split(' ').slice(0, 3).join(' ');
  const headLines = clean.split(/\n|\t/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (headLines.length > 1 && headFlat.startsWith(headLines[0])) {
    out.name = headLines[0];
    const rest = headFlat.slice(headLines[0].length).trim();
    if (rest.includes('/')) out.companions = rest.split('/').map(s => s.trim()).filter(Boolean);
  } else {
    out.name = headFlat;
    if (headFlat.includes('/')) {             // todo en una línea: titular + "ACOMP 1/ ACOMP 2/"
      const parts = headFlat.split('/').map(s => s.trim()).filter(Boolean);
      out.companions = parts.slice(1);
      out.name = parts[0];
    }
  }

  // Estancia: entrada, salida y noches
  const est = field('Estancia');
  let dates = (est.match(DATE_G) || []);
  if (dates.length < 2) {                      // sin etiqueta: fechas del texto, sin la "Fecha toma"
    const toma = (field('Fecha toma').match(DATE_G) || [])[0];
    dates = (flat.match(DATE_G) || []).filter(d => d !== toma);
  }
  if (dates[0]) out.arrival = dates[0];
  if (dates[1]) out.departure = dates[1];
  if (out.arrival && out.departure) out.nights = nightsBetween(out.arrival, out.departure);
  else { const n = est.replace(DATE_G, ' ').match(/\b(\d{1,3})\b/); out.nights = n ? +n[1] : null; }

  const reg = field('R[eé]gimen').match(/\b(HH|HD|MP|PC|AD|SA)\b/i);
  if (reg) out.regime = reg[1].toUpperCase();

  // Tipo de habitación y habitación-cama (p. ej. "1d 8 MIXTA BC 001-4" o "4 DB STANDARD 315")
  const rm = flat.match(ROOM_G);
  if (rm) {
    out.roomCode = rm[1].replace(/\s+/g, ' ').trim();
    if (rm[2]) out.place = rm[2].replace(/\s+/g, '');
  }

  out.agency = field('Agencia');
  out.contract = field('Contrato');
  const money = label => { const m = field(label).match(/-?\d[\d.\s]*,\d{1,2}|-?\d+(?:\.\d{1,2})?/); return m ? num(m[0]) : null; };
  out.total = money('Total(?!\\s+tasas)');
  out.totalTax = money('Total tasas');
  out.prepaid = money('Prepagado');

  // Si no hay etiqueta "Agencia", busca el nombre de la OTA en todo el texto o en el localizador
  if (!out.agency) {
    const ota = flat.match(/booking\.com|ctrip|trip\.com|expedia|hotelbeds|hostelworld|\bG2\b|mirai/i);
    if (ota) out.agency = ota[0];
    else {
      const loc = field('Localizador').match(/-(BK|CT|EX|HB|HW)-/i);
      const map = { BK: 'Booking.com', CT: 'Ctrip', EX: 'Expedia', HB: 'Hotelbeds', HW: 'Hostelworld' };
      if (loc) out.agency = map[loc[1].toUpperCase()];
    }
  }
  return out;
}

function toDate(s) {
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y < 100 ? 2000 + y : y, m - 1, d);
}
function nightsBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 86400000);
}
function splitPlace(p) {             // "001-5" -> {room:'001', bed:'5'} ; "315" -> {room:'315', bed:''}
  const m = String(p || '').match(/^(\w+)-(\w+)$/);
  return m ? { room: m[1], bed: m[2] } : { room: String(p || ''), bed: '' };
}

if (typeof module !== 'undefined') module.exports = { renderSheet, ICONS, computeTax, roomInfo, agencyInfo, parsePMS, splitPlace, nightsBetween, cleanText };
