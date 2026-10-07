// Detección de cada fuente (PMS / OTA) y extracción a un formato común.

export const OTA_ORDER = ['pms', 'ctrip', 'g2', 'hotelbeds', 'expedia', 'hostelworld', 'booking', 'agoda'];
export const OTA_LABEL = {
  pms: 'Prestige / MIRAI', ctrip: 'Ctrip / Trip.com', g2: 'G2 Extranet', hotelbeds: 'Hotelbeds',
  expedia: 'Expedia', hostelworld: 'Hostelworld', booking: 'Booking.com', agoda: 'Agoda'
};

/* ---------- utilidades ---------- */
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  ene: 1, abr: 4, ago: 8, dic: 12, sept: 9, set: 9 };
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y < 100 ? 2000 + y : y}-${pad(m)}-${pad(d)}`;

export function toISO(v, order = 'dmy') {
  if (v == null || v === '') return '';
  if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) { // serial Excel
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return '';
  }
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    return order === 'mdy' ? iso(+m[3], +m[1], +m[2]) : iso(+m[3], +m[2], +m[1]);
  }
  // "October 4, 2026" / "23:35, October 3, 2026" / "Oct 4, 2026"
  if ((m = s.match(/([A-Za-zé]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/))) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()] || MONTHS[m[1].slice(0, 4).toLowerCase()];
    if (mo) return iso(+m[3], mo, +m[2]);
  }
  // "4th Oct 26" / "4 de oct. de 2026" / "4 oct 2026"
  if ((m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([A-Za-zé]{3,})\.?\s+(?:de\s+)?(\d{2,4})/))) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) return iso(+m[3], mo, +m[1]);
  }
  return '';
}

export const num = v => {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).replace(/[^\d,.-]/g, '');
  if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return parseFloat(s.replace(/,/g, ''));
};
export const str = v => (v == null ? '' : String(v)).trim();
export const idKey = v => str(typeof v === 'number' ? Math.round(v) : v).toUpperCase().replace(/PREPAID$/i, '').replace(/[^A-Z0-9]/g, '');
const lc = s => str(s).toLowerCase();

/* ---------- producto (tipo de cama/habitación) ---------- */
// Devuelve {kind:'MIX'|'FEM'|'DBL'|'QUAD'|'?', beds:number|null, bath:'BC'|'PRIV'|null}
export function roomKeyFromPMS(code) {
  const s = str(code).toUpperCase();
  if (/FAMILIAR|QUAD|CUAD/.test(s)) return { kind: 'QUAD', beds: 4, bath: 'PRIV' };
  if (/\bDB\b|DOBLE|DOUBLE/.test(s)) return { kind: 'DBL', beds: 2, bath: 'PRIV' };
  const beds = +(s.match(/(\d+)\s*(?:MIXTA|FEM)/) || [])[1] || null;
  if (/FEM/.test(s)) return { kind: 'FEM', beds, bath: null };
  if (/MIXTA/.test(s)) return { kind: 'MIX', beds, bath: /\bBC\b/.test(s) ? 'BC' : 'PRIV' };
  return { kind: '?', beds: null, bath: null };
}
export function roomKeyFromOTA(text, { defaultPrivate = true } = {}) {
  const s = lc(text);
  if (/quad|cuádr|cuadr|familiar|family|4 pax|for 4/.test(s) && !/dorm|compartid|bed in|cama en/.test(s)) return { kind: 'QUAD', beds: 4, bath: 'PRIV' };
  if (/double|doble|twin|for 2|matrimonio/.test(s) && !/dorm|compartid|bed in|cama en/.test(s)) return { kind: 'DBL', beds: 2, bath: 'PRIV' };
  const bm = s.match(/(\d+)\s*-?\s*(?:bed|camas|pax|literas|beds|person dorm|people)/) || s.match(/capacity\s*(\d+)/) || s.match(/de\s*(\d+)\s*camas/);
  const beds = bm ? +bm[1] : null;
  let bath = null;
  if (/shared bath|baño compartido|bano compartido|shared bathroom|\bbc\b/.test(s)) bath = 'BC';
  else if (/private bath|baño privado|bano privado|en-?suite|private bathroom/.test(s)) bath = 'PRIV';
  let kind = '?';
  if (/female|femenin|mujeres|women|girls/.test(s)) kind = 'FEM';
  else if (/mixed|mixta|mixto|dorm|compartida|bed in|cama en/.test(s)) kind = 'MIX';
  if (kind === 'MIX' && !bath && defaultPrivate && beds) bath = 'PRIV';
  if (kind === 'FEM') bath = null;
  return { kind, beds, bath };
}
export const describeKey = k => {
  if (!k) return '';
  if (k.kind === 'QUAD') return 'Cuádruple';
  if (k.kind === 'DBL') return 'Doble';
  if (k.kind === '?') return 'desconocido';
  return `${k.kind === 'FEM' ? 'Femenina' : 'Mixta'}${k.beds ? ' de ' + k.beds : ''}${k.bath === 'BC' ? ', baño compartido' : k.bath === 'PRIV' ? ', baño privado' : ''}`;
};

/* ---------- localizar cabecera ---------- */
function findHeader(rows, mustHave, maxScan = 15) {
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const r = (rows[i] || []).map(c => lc(c));
    if (mustHave.every(h => r.some(c => c === h.toLowerCase() || c.startsWith(h.toLowerCase())))) return i;
  }
  return -1;
}
function objects(rows, hi) {
  const head = (rows[hi] || []).map(str);
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (!r.some(v => str(v) !== '')) continue;
    const o = { __row: r };
    head.forEach((h, j) => { if (h && !(h in o)) o[h] = r[j]; });
    out.push(o);
  }
  return { head, items: out };
}
const pick = (o, ...keys) => {
  for (const k of keys) {
    if (k in o && str(o[k]) !== '') return o[k];
    const hit = Object.keys(o).find(x => x.toLowerCase() === k.toLowerCase() || x.toLowerCase().startsWith(k.toLowerCase()));
    if (hit && str(o[hit]) !== '') return o[hit];
  }
  return '';
};

/* ---------- detectores + extractores ---------- */
const detectors = [
  {
    id: 'pms',
    test: rows => findHeader(rows, ['LOCALIZADOR', 'TITULAR', 'BONO'], 20) >= 0,
    parse(rows) {
      const hi = findHeader(rows, ['LOCALIZADOR', 'TITULAR', 'BONO'], 20);
      const head = rows[hi].map(c => str(c).toUpperCase());
      const col = n => head.indexOf(n);
      const idx = { loc: col('LOCALIZADOR'), grupo: col('GRUPO'), tit: col('TITULAR'), lleg: col('LLEGADA'), sal: col('SALIDA'),
        st: col('STATUS RSV.'), estado: col('ESTADO'), hab: col('HABITACIÓN'), pax: col('PAX'), n: col('NOCHES'), tipo: col('TIPO'),
        reg: col('RÉG.'), bono: col('BONO'), cli: col('CLIENTE'), val: col('VAL. RESERVA'), com: col('COMISIÓN'), precio: col('PRECIO'),
        tarifa: col('TARIFA'), obs: col('OBSERVACIONES'), fuente: col('FUENTE DE NEGOCIO'), master: head.lastIndexOf('GRUPO') };
      // fecha del listado y hora de emisión
      let date = '', dateTo = '', issued = '';
      for (let i = 0; i < hi; i++) {
        const r = rows[i] || [];
        r.forEach(c => { const m = str(c).match(/Hora emisi[oó]n:\s*(.+)/i); if (m) issued = m[1]; });
        if (!date && /^\d{2}\/\d{2}\/\d{2,4}$/.test(str(r[0]))) { date = toISO(r[0]); if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(str(r[1]))) dateTo = toISO(r[1]); }
      }
      const items = [];
      for (let i = hi + 1; i < rows.length; i++) {
        const r = rows[i] || [];
        if (!str(r[idx.loc])) continue;
        const tit = str(r[idx.tit]);
        const [ap, nom] = tit.split(/\s*,\s*/);
        items.push({
          loc: str(r[idx.loc]), titular: tit, apellido: str(ap), nombre: str(nom), arrival: toISO(r[idx.lleg]), departure: toISO(r[idx.sal]),
          status: str(r[idx.st]), estado: str(r[idx.estado]), hab: str(r[idx.hab]), pax: num(r[idx.pax]) || 0, nights: num(r[idx.n]) || 0,
          tipo: str(r[idx.tipo]), reg: str(r[idx.reg]), bono: str(typeof r[idx.bono] === 'number' ? Math.round(r[idx.bono]) : r[idx.bono]),
          cliente: str(r[idx.cli]), valor: num(r[idx.val]), comision: num(r[idx.com]), precio: num(r[idx.precio]),
          master: str(r[idx.master]) || str(r[idx.grupo]), obs: str(r[idx.obs]), fuente: str(r[idx.fuente])
        });
      }
      const arr = items.map(i => i.arrival).filter(Boolean).sort();
      const from = date || arr[0] || '', to = (dateTo && dateTo >= from ? dateTo : '') || (date ? date : arr[arr.length - 1] || '');
      return { date: from, dateTo: to, issued, items };
    }
  },
  {
    id: 'ctrip',
    test: rows => findHeader(rows, ['Reservation No.', 'Room ID', 'Guest Name']) >= 0,
    parse(rows) {
      const { items } = objects(rows, findHeader(rows, ['Reservation No.', 'Room ID', 'Guest Name']));
      return items.map(o => {
        const st = str(pick(o, 'Reservation Status'));
        return {
          id: str(pick(o, 'Reservation No.')).replace(/prepaid$/i, ''), name: str(pick(o, 'Guest Name')),
          arrival: toISO(pick(o, 'Check-in Date')), departure: toISO(pick(o, 'Check-out Date')),
          booked: toISO(pick(o, 'Booking Date')), status: /cancel/i.test(st) ? 'cancelled' : 'confirmed', statusText: st,
          room: str(pick(o, 'Room Name')).replace(/\s+-\s+(PPY|PP|BAR|NR)\b.*$/i, ''), roomId: str(pick(o, 'Room ID')),
          units: num(pick(o, 'Room(s)')) || 1, amount: num(pick(o, 'Net Rate')), currency: str(pick(o, 'Currency')) || 'EUR',
          remarks: str(pick(o, 'Remarks')), nights: num(pick(o, 'Night(s)'))
        };
      });
    }
  },
  {
    id: 'hotelbeds',
    test: rows => findHeader(rows, ['bookingNumber', 'incomingOfficeId']) >= 0,
    parse(rows) {
      const { items } = objects(rows, findHeader(rows, ['bookingNumber', 'incomingOfficeId']));
      return items.map(o => {
        const st = str(pick(o, 'statusDescription')) || str(pick(o, 'status'));
        return {
          id: `${str(pick(o, 'incomingOfficeId'))}-${str(pick(o, 'bookingNumber'))}`, serviceId: str(pick(o, 'roomNumber')) || '1',
          name: str(pick(o, 'customer')).replace(/\s+/g, ' '), arrival: toISO(pick(o, 'dateFrom')), departure: toISO(pick(o, 'dateTo')),
          booked: toISO(pick(o, 'creationDate')), cancelDate: toISO(pick(o, 'cancellationDate')),
          status: /cancel|^c$/i.test(st) || str(pick(o, 'status')) === 'C' ? 'cancelled' : 'confirmed', statusText: st,
          room: str(pick(o, 'description')), contract: str(pick(o, 'contractName')), cancelRef: str(pick(o, 'confirmationNumber')),
          adults: num(pick(o, 'adultNumber')) || 0, children: num(pick(o, 'childrenNumber')) || 0, babies: num(pick(o, 'babyNumber')) || 0,
          units: 1, apiId: str(pick(o, 'externalBookingCode'))
        };
      });
    }
  },
  {
    id: 'expedia',
    test: rows => findHeader(rows, ['ID de reserva', 'Huésped']) >= 0 || findHeader(rows, ['Reservation ID', 'Guest']) >= 0,
    parse(rows) {
      let hi = findHeader(rows, ['ID de reserva', 'Huésped']);
      if (hi < 0) hi = findHeader(rows, ['Reservation ID', 'Guest']);
      const { items } = objects(rows, hi);
      return items.map(o => {
        const st = str(pick(o, 'Estado', 'Status'));
        return {
          id: str(pick(o, 'ID de reserva', 'Reservation ID')), confirmation: str(pick(o, 'N.º de confirmación', 'Confirmation')),
          name: str(pick(o, 'Huésped', 'Guest')), arrival: toISO(pick(o, 'De entrada', 'Check-in')), departure: toISO(pick(o, 'De salida', 'Check-out')),
          booked: toISO(pick(o, 'Fecha de reserva', 'Booked')), status: /cancel/i.test(st) ? 'cancelled' : 'confirmed', statusText: st,
          room: str(pick(o, 'Habitación', 'Room')), payment: str(pick(o, 'Tipo de pago', 'Payment')),
          amount: num(pick(o, 'Importe de la reserva', 'Booking amount')), units: 1
        };
      });
    }
  },
  {
    id: 'hostelworld',
    test: rows => findHeader(rows, ['Reference', 'Guest Name', 'Arrival']) >= 0,
    parse(rows) {
      const { items } = objects(rows, findHeader(rows, ['Reference', 'Guest Name', 'Arrival']));
      return items.filter(o => str(pick(o, 'Guest Name')) && /\d+-\d+/.test(str(pick(o, 'Reference')))).map(o => {
        const arrival = toISO(pick(o, 'Arrival')), nights = num(pick(o, 'Nights')) || 0;
        const d = new Date(arrival + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + nights);
        const st = str(pick(o, 'Status'));
        return {
          id: str(pick(o, 'Reference')), name: str(pick(o, 'Guest Name')), arrival, nights,
          departure: arrival ? d.toISOString().slice(0, 10) : '', booked: toISO(pick(o, 'Booked')),
          status: /cancel/i.test(st) ? 'cancelled' : 'confirmed', statusText: st || 'OK',
          room: str(pick(o, 'Room Type')), units: num(pick(o, 'Guests')) || 1, amount: num(pick(o, 'Bed Price')),
          source: str(pick(o, 'Source'))
        };
      });
    }
  },
  {
    id: 'booking',
    test: rows => findHeader(rows, ['Número de reserva', 'Nombre del cliente']) >= 0 || findHeader(rows, ['Book number', 'Guest name']) >= 0,
    parse(rows) {
      let hi = findHeader(rows, ['Número de reserva', 'Nombre del cliente']);
      if (hi < 0) hi = findHeader(rows, ['Book number', 'Guest name']);
      const { items } = objects(rows, hi);
      return items.map(o => {
        const st = str(pick(o, 'Estado', 'Status'));
        return {
          id: str(typeof o['Número de reserva'] === 'number' ? Math.round(o['Número de reserva']) : pick(o, 'Número de reserva', 'Book number')),
          name: str(pick(o, 'Nombre del cliente', 'Guest name')), bookedBy: str(pick(o, 'Reservado por', 'Booker name')),
          arrival: toISO(pick(o, 'Entrada', 'Check-in')), departure: toISO(pick(o, 'Salida', 'Check-out')),
          booked: toISO(pick(o, 'Fecha de reserva', 'Booked on')), status: /cancel|no_show/i.test(st) ? 'cancelled' : 'confirmed', statusText: st,
          room: str(pick(o, 'Tipo de unidad', 'Unit type')), units: num(pick(o, 'Habitaciones', 'Rooms')) || 1,
          persons: num(pick(o, 'Personas', 'Persons')) || 1, adults: num(pick(o, 'Adultos', 'Adults')) || 0,
          children: num(pick(o, 'Niños', 'Children')) || 0, childAges: str(pick(o, 'Edades de los niños', 'Ages')),
          amount: num(pick(o, 'Precio', 'Price')), commission: num(pick(o, 'Importe de la comisión', 'Commission amount')),
          payStatus: str(pick(o, 'Estado del pago', 'Payment status')), payMethod: str(pick(o, 'Método de pago', 'Payment method'))
        };
      });
    }
  },
  {
    id: 'g2',
    test: rows => findHeader(rows, ['G2 Booking ID', 'Lead Name']) >= 0,
    parse(rows) {
      const { items } = objects(rows, findHeader(rows, ['G2 Booking ID', 'Lead Name']));
      return items.filter(o => str(pick(o, 'G2 Booking ID'))).map(o => {
        const st = str(pick(o, 'Status'));
        const pax = str(pick(o, 'Passengers'));
        const adults = +(pax.match(/(\d+)\s*adult/i) || [])[1] || 0;
        const children = +(pax.match(/(\d+)\s*(?:child|ni)/i) || [])[1] || 0;
        const infants = +(pax.match(/(\d+)\s*(?:infant|beb)/i) || [])[1] || 0;
        const name = str(pick(o, 'Lead Name'));
        return {
          id: str(pick(o, 'G2 Booking ID')), name, cleanName: name.replace(/^(mr|mrs|ms|miss|mx|dr)\.?\s+/i, ''),
          booked: toISO(pick(o, 'Created')), arrival: toISO(pick(o, 'Check-in')), departure: toISO(pick(o, 'Check-out')),
          status: /cancel|anul/i.test(st) ? 'cancelled' : 'confirmed', statusText: st || 'Confirmed',
          passengers: pax, adults, children, infants, persons: (adults + children) || null, room: '', units: null
        };
      });
    }
  },
  {
    id: 'agoda',
    test: rows => findHeader(rows, ['BookingID', 'Customer_Name']) >= 0,
    parse(rows) {
      const { items } = objects(rows, findHeader(rows, ['BookingID', 'Customer_Name']));
      return items.map(o => {
        const st = str(pick(o, 'Status'));
        const id = str(o.__row[0]);
        return {
          id, name: str(pick(o, 'Customer_Name')), arrival: toISO(pick(o, 'StayDateFrom')), departure: toISO(pick(o, 'StayDateTo')),
          booked: toISO(pick(o, 'BookedDate')), status: /cancel|reject/i.test(st) ? 'cancelled' : 'confirmed', statusText: st,
          room: str(pick(o, 'RoomType')), adults: num(pick(o, 'No_of_adult')) || 1, children: num(pick(o, 'No_of_children')) || 0,
          nights: num(pick(o, 'No_of_night')) || 0, payment: str(pick(o, 'PaymentModel')), amount: num(pick(o, 'ReferenceSellInclusive')),
          units: num(pick(o, 'No_of_adult')) || 1
        };
      });
    }
  }
];

// G2 / desconocido: extractor genérico por nombres de columna habituales
export function parseGeneric(rows) {
  let hi = -1, best = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = (rows[i] || []).map(lc).join('|');
    const score = ['ref', 'book', 'name', 'nombre', 'guest', 'huésped', 'arriv', 'check', 'llegada', 'entrada', 'status', 'estado', 'room', 'habit']
      .filter(k => r.includes(k)).length;
    if (score > best) { best = score; hi = i; }
  }
  if (hi < 0) return [];
  const { items } = objects(rows, hi);
  return items.map(o => {
    const st = str(pick(o, 'Status', 'Estado', 'Booking status'));
    return {
      id: str(pick(o, 'Booking ID', 'Reservation ID', 'Reference', 'Booking Reference', 'Booking No', 'Reservation No', 'Localizador', 'Referencia', 'Número de reserva', 'ID', 'Code')),
      name: str(pick(o, 'Guest Name', 'Guest', 'Name', 'Lead name', 'Holder', 'Customer', 'Cliente', 'Nombre', 'Huésped')),
      arrival: toISO(pick(o, 'Check-in', 'Check in', 'Arrival', 'Arrival date', 'Date from', 'Llegada', 'Entrada', 'From')),
      departure: toISO(pick(o, 'Check-out', 'Check out', 'Departure', 'Departure date', 'Date to', 'Salida', 'To')),
      booked: toISO(pick(o, 'Booking date', 'Booked', 'Created', 'Creation date', 'Fecha de reserva')),
      status: /cancel|anulad/i.test(st) ? 'cancelled' : 'confirmed', statusText: st || 'Confirmed',
      room: str(pick(o, 'Room type', 'Room', 'Room name', 'Habitación', 'Product', 'Producto')),
      units: num(pick(o, 'Rooms', 'Beds', 'Pax', 'Guests', 'Adults')) || 1,
      amount: num(pick(o, 'Amount', 'Total', 'Price', 'Importe', 'Precio'))
    };
  }).filter(x => x.id);
}

export function detectSource(rows, fileName = '') {
  for (const d of detectors) if (d.test(rows)) return d.id;
  if (/g2/i.test(fileName)) return 'g2';
  return null;
}
export function parseSource(id, rows) {
  if (id === 'g2' && findHeader(rows, ['G2 Booking ID', 'Lead Name']) < 0) return parseGeneric(rows);
  const d = detectors.find(x => x.id === id);
  return d ? d.parse(rows) : parseGeneric(rows);
}

// A qué OTA pertenece una línea del PMS
export function pmsOta(item) {
  const c = item.cliente.toLowerCase(), l = item.loc.toUpperCase();
  if (/booking\.com/.test(c) || /-BK-/.test(l)) return 'booking';
  if (/ctrip|trip\.com/.test(c) || /-CT-/.test(l)) return 'ctrip';
  if (/expedia/.test(c) || /-EX-/.test(l)) return 'expedia';
  if (/hotelbeds/.test(c) || /-HB-/.test(l)) return 'hotelbeds';
  if (/agoda/.test(c) || /-AGD?-/.test(l)) return 'agoda';
  if (/hostelworld/.test(c) || /-HW-/.test(l)) return 'hostelworld';
  if (/\bg2\b|g2 ?travel|gta/.test(c) || /-G2-/.test(l)) return 'g2';
  if (/mirai/.test(c) || /-HS-/.test(l)) return 'mirai';
  return 'otros';
}

// ---------- G2: tabla copiada y pegada desde la extranet ----------
export const G2_HEADER = ['G2 Booking ID', 'Created', 'Lead Name', 'Check-in', 'Check-out', 'Status', 'Passengers'];
const G2_DATE = '\\d{1,2}\\s+[A-Za-zé]{3,5}\\.?\\s+\\d{4}';
export function g2RowsFromPaste(html, text) {
  let rows = [];
  if (html && /<t[dh][\s>]/i.test(html) && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    rows = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()))
      .filter(r => r.some(c => c));
  }
  if (!rows.length && text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.some(l => l.includes('\t'))) rows = lines.map(l => l.split('\t').map(c => c.trim()));
    else {
      // texto sin tabuladores: reconstruir por patrón (código, fecha, nombre, fecha, fecha, estado, pasajeros)
      const re = new RegExp(`([A-Z0-9]{6,14})\\s+(${G2_DATE})\\s+(.+?)\\s+(${G2_DATE})\\s+(${G2_DATE})\\s+([A-Za-z]+)\\s+(\\d+\\s+\\w+(?:,?\\s*\\d+\\s+\\w+)*)`, 'g');
      let m; const joined = lines.join(' ');
      while ((m = re.exec(joined))) rows.push(m.slice(1, 8));
    }
  }
  rows = rows.map(r => r.filter((c, i) => !(i === r.length - 1 && c === '')));
  // quitar filas de paginación / vacías
  rows = rows.filter(r => !r.every(c => /^(<?\s*previous|next\s*>?|)$/i.test(c)));
  const hasHeader = rows.length && rows[0].some(c => /booking id|lead name/i.test(c));
  if (!hasHeader) rows.unshift(G2_HEADER.slice());
  // solo filas con pinta de reserva (código en la 1a columna)
  return [rows[0], ...rows.slice(1).filter(r => /^[A-Z0-9-]{5,}$/i.test(r[0] || ''))];
}
