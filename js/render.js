// Páginas imprimibles que imitan la extranet de cada OTA.
import { OTA_LABEL, roomKeyFromOTA } from './sources.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = iso => { const [y, m, d] = (iso || '').split('-').map(Number); return { y, m, d, ok: !!y }; };
const EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const ES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ES_DAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const p2 = n => String(n).padStart(2, '0');
const f = {
  en: iso => { const x = D(iso); return x.ok ? `${EN[x.m - 1]} ${x.d}, ${x.y}` : ''; },
  us: iso => { const x = D(iso); return x.ok ? `${p2(x.m)}/${p2(x.d)}/${x.y}` : ''; },
  exp: iso => { const x = D(iso); return x.ok ? `${ES[x.m - 1]}. ${p2(x.d)}, ${x.y}` : ''; },
  bk: iso => { const x = D(iso); return x.ok ? `${x.d} ${ES[x.m - 1]}<br>${x.y}` : ''; },
  bkLong: iso => { const x = D(iso); return x.ok ? `${x.d} de ${ES_LONG[x.m - 1]} de ${x.y}` : ''; },
  hw: iso => { const x = D(iso); return x.ok ? `${x.d} ${EN[x.m - 1]} ${x.y}` : ''; },
  pms: iso => { const x = D(iso); return x.ok ? `${p2(x.d)}/${p2(x.m)}/${String(x.y).slice(2)}` : ''; },
  dmy: iso => { const x = D(iso); return x.ok ? `${p2(x.d)}/${p2(x.m)}/${x.y}` : ''; },
  dayEs: iso => { const x = D(iso); return x.ok ? ES_DAY[new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay()] : ''; }
};
const eur = (v, dec = 2) => isNaN(v) ? '' : v.toFixed(dec).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dot = v => isNaN(v) ? '' : v.toFixed(2);
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

const I = { // iconos SVG mínimos
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 15 6-6 6 6"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  sort: '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 4 7 10h10zM12 20l5-6H7z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  dl: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  print: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 3h10v5H7zM5 9h14a2 2 0 0 1 2 2v6h-4v4H7v-4H3v-6a2 2 0 0 1 2-2zm4 7v3h6v-3z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-4 4V4a1 1 0 0 1 1-1z"/></svg>',
  chatO: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  filter: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  card: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
  doc: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h8l4 4v14H6z"/><path d="M9 12h6M9 16h6"/></svg>',
  excel: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 14l2 2 4-4"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6"/></svg>'
};

/* ======================= PLANTILLAS ======================= */
// Cada plantilla: { orient, cls, top(first), wrapStart(first), thead, rows[], wrapEnd(last), bottom(last) }

function tplPMS(pms) {
  const items = [...pms.items].sort((a, b) => a.loc.localeCompare(b.loc));
  const [dIss, tIss] = (pms.issued || '').split(' ');
  const issued = dIss ? `${dIss.replace(/\//g, '-').replace(/-(\d{2})$/, '-20$1')} ${(tIss || '').slice(0, 5)}` : '';
  const dd = f.pms(pms.date), dd2 = f.pms(pms.dateTo || pms.date);
  const top = () => `
    <div class="pms-stamp">${esc(issued)}</div>
    <div class="pms-title"><span>Panel de Reservas</span></div>
    <div class="pms-rule"></div>
    <div class="pms-filters">
      <div class="c1"><div><b>Llegada</b><span class="bx">${dd}</span><span class="bx">${dd2}</span></div><i>Tipo Cliente</i><i>Nombre Cliente</i><i>Empresa</i></div>
      <div class="c2"><i>Toma</i><i>D. Line</i><i>País</i><i>Huésped</i><i>Fuente de Negocio</i></div>
      <div class="c3"><div><i>Status</i> <span>Todos</span></div><i>Motivo</i><i>Segmento</i><i>C.R.S.</i><i>Bono</i></div>
    </div>`;
  const cols = ['Localizador', 'Llegada', 'Apellido 1', 'Nombre', 'Cliente', 'Pax', 'Nch.', 'Tipo', 'Rég.', 'Status', 'Salida', 'Precio', 'Master', 'Comisión'];
  const widths = [10.5, 5.6, 12.3, 8.3, 11, 3, 3.4, 8.8, 3.6, 6.6, 5.6, 4.8, 9.5, 5.5];
  const thead = `<colgroup>${widths.map(w => `<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${cols.map((c, i) => `<th class="${i >= 5 && i <= 6 || i >= 11 ? 'r' : ''}">${c}</th>`).join('')}</tr></thead>`;
  const rows = items.map(it => `<tr>
    <td>${esc(it.loc)}</td><td>${f.pms(it.arrival)}</td><td class="b">${esc(it.apellido)}</td><td>${esc(it.nombre)}</td>
    <td>${esc(it.cliente)}</td><td class="r">${it.pax}</td><td class="r">${it.nights}</td><td>&nbsp;${esc(it.tipo)}</td>
    <td>${esc(it.reg)}</td><td>${esc(it.status)}</td><td>${f.pms(it.departure)}</td><td class="r">${eur(it.precio)}</td>
    <td>&nbsp;${esc(it.master)}</td><td class="r">${eur(it.comision)}</td></tr>`);
  return {
    orient: 'land', cls: 'pms', top, thead, rows,
    wrapStart: () => '', wrapEnd: () => '',
    bottom: (last, n) => `<div class="pms-foot"><span>Powered by</span><span>${n}</span></div>`
  };
}

function tplCtrip(recs, date, date2 = date) {
  const top = () => `
    <div class="ct-head"><h1>Reservations</h1><div class="ct-links"><span>${I.edit} Settings</span><span>${I.dl} Download</span></div></div>
    <div class="ct-filter">
      <span class="ct-in ph">Guest name, reservation no. (i...</span>
      <span class="ct-in">Check-in date ${I.down}</span>
      <span class="ct-in wide">${f.en(date)} <i>→</i> ${f.en(date2)} ${I.cal}</span>
      <span class="ct-in">${I.filter} More filters (0) ${I.down}</span>
      <span class="ct-clear">Clear</span>
      <span class="ct-btn">Show</span>
    </div>`;
  const thead = `<thead><tr><th>Guest(s)</th><th>Amount</th><th>Check-in ${I.arrowUp}</th><th>Check-out</th><th>Room type</th><th>Booking date</th><th>Reservation</th><th>Status</th></tr></thead>`;
  const rows = recs.map(r => `<tr>
    <td><span class="ct-name">${esc(r.name)}</span>${r.remarks ? `<div class="ct-sr">${I.doc} Special requests</div>` : ''}</td>
    <td>${esc(r.currency)} ${dot(r.amount)}</td><td>${f.en(r.arrival)}</td><td>${f.en(r.departure)}</td>
    <td class="ct-room">${esc(r.room)}<div>${r.units} room(s)</div></td><td>${f.en(r.booked)}</td>
    <td>${esc(r.id)} <span class="ct-copy">${I.copy}</span></td>
    <td class="${r.status === 'cancelled' ? 'ct-can' : 'ct-ok'}">${r.status === 'cancelled' ? 'Canceled' : esc(r.statusText || 'Confirmed')}</td></tr>`);
  return {
    orient: 'land', cls: 'ctrip', top, thead, rows,
    wrapStart: first => `<div class="ct-card">${first ? `<div class="ct-cardhead"><b>Reservation list (${recs.length})</b><span>Auto-confirmation deactivated</span></div>` : ''}`,
    wrapEnd: last => `${last ? `<div class="ct-pag"><span class="dis">‹</span><span class="on">1</span><span>›</span></div>` : ''}</div>`,
    bottom: () => ''
  };
}

function tplG2(recs, date, date2 = date) {
  const g2d = iso => { const x = D(iso); return x.ok ? `${p2(x.d)} ${ES[x.m - 1].slice(0, 3)} ${x.y}` : ''; };
  const top = () => '';
  const thead = `<thead><tr><th>G2 Booking ID</th><th>Created</th><th>Lead Name</th><th class="g2-sorted">Check-in <span class="g2-tri">&#9650;</span></th><th>Check-out</th><th>Status</th><th>Passengers</th></tr></thead>`;
  const rows = recs.map((r, i) => `<tr class="${i % 2 ? 'g2-alt' : ''}">
    <td><span class="g2-id">${esc(r.id)}</span></td><td>${g2d(r.booked)}</td><td>${esc(r.name)}</td>
    <td>${g2d(r.arrival)}</td><td>${g2d(r.departure)}</td>
    <td class="${r.status === 'cancelled' ? 'g2-can' : 'g2-ok'}">${esc(r.statusText || (r.status === 'cancelled' ? 'Cancelled' : 'Confirmed'))}</td>
    <td>${esc(r.passengers || (r.units ? r.units + ' Adult' + (r.units > 1 ? 's' : '') : ''))}</td></tr>`);
  return {
    orient: 'land', cls: 'g2', top, thead, rows,
    wrapStart: () => '<div class="g2-wrap">',
    wrapEnd: last => `${last ? '<div class="g2-pag"><span>&lt; Previous</span><span>Next &gt;</span></div>' : ''}</div>`,
    bottom: () => ''
  };
}

function tplHotelbeds(recs, date, date2 = date) {
  const us = f.us(date), us2 = f.us(date2);
  const top = () => `
    <div class="hb-top">
      <div><h1>Resultados de búsqueda</h1>
        <div class="hb-sub"><span>${recs.length} Booking services</span><a>${I.print} Print</a><a>${I.excel} Import from Excel</a><a>${I.excel} Export to Excel</a></div></div>
      <div class="hb-fil"><span class="hb-sel date">${I.cal} ${us}${us2 !== us ? ' - ' + us2 : ''}</span><span class="hb-sel">registro ${I.down}</span><span class="hb-sel">estado ${I.down}</span><span class="hb-sel">Habitación ${I.down}</span><span class="hb-sel">Rates ${I.down}</span></div>
    </div>
    <div class="hb-applied"><b>Filter applied:</b><span class="hb-chip">${us} - ${us2} ${I.x}</span><span class="hb-chip">registro</span><a>Clear All</a></div>`;
  const thead = `<thead><tr><th>Referenci...</th><th>Service id.</th><th>API Booking id</th><th>Nombre del cli...</th><th>Fecha de cr...</th><th>Fecha de cancel...</th><th>registro</th><th>salida</th><th>Adultos/Niños/Bebés</th><th>Habitación</th><th>estado</th><th>Referencia de c...</th><th>Código de cancelac...</th></tr></thead>`;
  const code = r => { const k = roomKeyFromOTA(r.room); return k.beds ? `BED/C${k.beds}${k.bath === 'BC' ? '-FH' : ''}` : esc(r.contract); };
  const rows = recs.map(r => `<tr>
    <td class="hb-link">${esc(r.id.replace('-', '.'))}</td><td>${esc(r.serviceId)}</td><td>${esc(r.apiId)}</td><td class="trunc">${esc(r.name.toUpperCase())}</td>
    <td>${f.us(r.booked)}</td><td>${f.us(r.cancelDate)}</td><td>${f.us(r.arrival)}</td><td>${f.us(r.departure)}</td>
    <td>${r.adults}/${r.children}/${r.babies}</td><td class="hb-room"><div>1 x ${esc(r.room)}</div><small>${code(r)}</small></td>
    <td class="${r.status === 'cancelled' ? 'hb-can' : 'hb-ok'}">${esc(r.statusText)}</td><td class="trunc">${r.status === 'cancelled' ? esc(r.cancelRef) : ''}</td><td></td></tr>`);
  return {
    orient: 'land', cls: 'hotelbeds', top, thead, rows,
    wrapStart: () => `<div class="hb-box"><div class="hb-group">Toc Hostel Barcelona ${I.up}</div>`,
    wrapEnd: () => '</div>', bottom: () => ''
  };
}

function tplExpedia(recs, date, date2 = date) {
  const dd = D(date), de = D(date2);
  const sh = x => x.ok ? `${x.d}/${x.m}/${String(x.y).slice(2)}` : '';
  const short = sh(dd), short2 = sh(de);
  const range = `Del ${f.dayEs(date)}, ${dd.d} de ${ES[dd.m - 1]}. de ${dd.y} al ${f.dayEs(date2)}, ${de.d} de ${ES[de.m - 1]}. de ${de.y}`;
  const top = () => `
    <div class="ex-head"><h1>Reservas</h1><div class="ex-icons"><a>Comentarios</a>${I.chat}${I.dl}${I.print}${I.more}</div></div>
    <div class="ex-grey">
      <div class="ex-search"><span class="ex-in">${I.search}<em>Nombre, número de confirmación, ID de reserva o número de itinerario</em></span><span class="ex-pill">Buscar</span></div>
      <div class="ex-ftitle">Filtros</div>
      <div class="ex-radios"><span class="on"><i></i>Entrada</span><span><i></i>Salida</span><span><i></i>De reserva</span><span><i></i>De cancelación</span></div>
      <div class="ex-dates"><span class="ex-box"><small>Desde</small>${short}</span><span class="ex-box"><small>Hasta</small>${short2}</span><span class="ex-pill">Aplicar</span><span class="ex-more">Más filtros ${I.filter}</span></div>
      <a class="ex-reset">Restablecer</a>
      <div class="ex-range">${range}</div>
    </div>`;
  const thead = `<thead><tr><th></th><th>Huésped</th><th>Reserva</th><th>Confirmación ${I.info}</th><th>De entrada ${I.arrowUp}</th><th>De salida</th><th>Habitación</th><th>De reserva</th><th>Importe de la<br>reserva</th></tr></thead>`;
  const rows = recs.map(r => `<tr>
    <td class="ex-ic">${I.chat}</td><td><span class="ex-name">${esc(r.name)}</span></td>
    <td>${esc(r.id)}${r.booked && daysBetween(r.booked, date2) <= 6 ? '<div><span class="ex-badge">Reciente</span></div>' : ''}</td>
    <td><span class="ex-pen">${I.pencil}</span> ${esc(r.confirmation)}</td><td>${f.exp(r.arrival)}</td><td>${f.exp(r.departure)}</td>
    <td class="ex-room">${esc(r.room)}</td><td>${f.exp(r.booked)}</td>
    <td><b>${eur(r.amount)} EUR</b><div class="ex-sub">${esc(r.payment)}</div></td></tr>`);
  return {
    orient: 'land', cls: 'expedia', top, thead, rows,
    wrapStart: () => '<div class="ex-card">',
    wrapEnd: last => `${last ? `<div class="ex-foot"><span>Mostrar:</span><span class="ex-sel">100 ${I.down}</span><span class="ex-cnt">${I.chevL} 1-${recs.length} de ${recs.length} resultados ${I.chev}</span></div>` : ''}</div>`,
    bottom: last => last ? '<div class="ex-help">' + I.chatO + ' Ayuda</div>' : ''
  };
}

function tplHostelworld(recs, date, date2 = date) {
  const top = () => `<div class="hw-tab">Bookings</div>`;
  const multi = date2 !== date;
  const thead = `<thead><tr><th>Reference</th><th class="c">Name</th><th class="c">Arriving</th><th class="c">Nights</th><th class="c">beds</th><th class="c">Status</th><th></th></tr></thead>`;
  const rows = recs.map(r => `<tr><td>${esc(r.id)}</td><td class="c">${esc(r.name)}</td><td class="c">${f.hw(r.arrival)}</td><td class="c">${r.nights || ''}</td><td class="c">${r.units}</td>
    <td class="c">${r.status === 'cancelled' ? 'Cancelled' : esc(r.statusText || 'OK')}</td><td class="r"><span class="hw-view">View</span></td></tr>`);
  return {
    orient: 'land', cls: 'hostelworld', top, thead, rows,
    wrapStart: first => `<div class="hw-card"><div class="hw-nav"><span>Bookings</span><span>Cancelled</span><span class="on">Arrivals</span><span>Non-refundable</span><span>Advanced Search</span></div>${first ? (multi ? `<h2>Arrivals ${f.hw(date)} – ${f.hw(date2)}</h2>` : '<h2>Arriving Today</h2>') : ''}`,
    wrapEnd: () => '</div>', bottom: () => ''
  };
}

const bkRoomEs = s => {
  let m;
  if ((m = s.match(/^Bed in (\d+)-Bed Mixed Dormitory Room(?: with Shared Bathroom)?$/i))) return `Cama en habitación mixta compartida de ${m[1]} camas${/shared/i.test(s) ? ' con baño compartido' : ''}`;
  if ((m = s.match(/^Bed in (\d+)-Bed Female Dormitory Room$/i))) return `Cama en habitación compartida femenina de ${m[1]} camas`;
  if (/^Quadruple Room$/i.test(s)) return 'Habitación cuádruple';
  if (/^Double Room$/i.test(s)) return 'Habitación Doble';
  if (/^Twin Room$/i.test(s)) return 'Habitación Twin';
  return s;
};
function tplBooking(recs, date, date2 = date) {
  const genius = r => (r.pms || []).some(p => /genius/i.test(p.obs));
  const top = () => `
    <div class="bk-head"><h1>Reservas</h1><div class="bk-acts"><span>${I.print} Imprimir lista de reservas</span></div></div>
    <div class="bk-fil">
      <label><small>Fecha de</small><span class="bk-in sel">Check-in ${I.down}</span></label>
      <label><small>Del</small><span class="bk-in d">${f.bkLong(date)}</span></label>
      <label><small>Al</small><span class="bk-in d">${f.bkLong(date2)}</span></label>
      <span class="bk-btn o">Más filtros ${I.down}</span><span class="bk-btn s">Mostrar</span>
      <span class="bk-btn o card">${I.card} Gestiona tus tarjetas de crédito virtuales</span>
    </div>`;
  const thead = `<thead><tr><th>Nombre del<br>huésped</th><th>Check-<br>in ${I.arrowUp}</th><th>Check-<br>out</th><th>Habitaciones</th><th>Fecha de<br>reserva</th><th>Estado</th><th>Precio</th><th>Comisión y<br>cargos</th><th>Número de<br>reserva</th></tr></thead>`;
  const persons = r => r.children ? `${r.adults} adulto${r.adults === 1 ? '' : 's'}, ${r.children} niño${r.children === 1 ? '' : 's'}${r.childAges ? ` (${esc(r.childAges.replace(/\s/g, ''))})` : ''}` : `${r.persons} persona${r.persons === 1 ? '' : 's'}`;
  const rows = recs.map(r => {
    const can = r.status === 'cancelled';
    return `<tr>
    <td><span class="bk-name">${esc(r.name)}</span>${genius(r) ? ' <span class="bk-genius">Genius</span>' : ''}<div class="bk-p">${persons(r)}</div></td>
    <td>${f.bk(r.arrival)}</td><td>${f.bk(r.departure)}</td><td class="bk-room">${esc(bkRoomEs(r.room))}</td><td>${f.bk(r.booked)}</td>
    <td>${can ? '<b class="bk-can">Cancelada</b>' : `<b>OK</b><div class="bk-s">${esc(r.payStatus || 'Pago mediante Booking.com')}</div>`}</td>
    <td>€ ${can ? '0' : eur(r.amount)}<div class="bk-s">Transferencia<br>bancaria</div></td>
    <td>€ ${can ? '0' : eur(r.commission)}</td><td><span class="bk-link">${esc(r.id)}</span></td></tr>`;
  });
  return { orient: 'port', cls: 'booking', top, thead, rows, wrapStart: () => '', wrapEnd: () => '', bottom: () => '' };
}

function tplAgoda(recs, date, date2 = date) {
  const top = () => `
    <div class="ag-head"><h1>Reservations</h1><span class="ag-exp">${I.dl} Export CSV</span></div>
    <div class="ag-panel">
      <div class="ag-row"><span class="ag-field big"><small>Booking ID / Guest name</small>${I.search}<em>Booking ID / Guest name</em></span>
      <span class="ag-field"><small>Check-in dates</small>${I.cal} ${f.en(date)} - ${f.en(date2)}<i>${I.x}</i></span><span class="ag-btn">Search</span></div>
      <div class="ag-chips"><span>Filters:</span><span class="ag-chip on">2 statuses ${I.x}</span><span class="ag-chip">All rooms ${I.down}</span><span class="ag-chip">All rate plans ${I.down}</span><span class="ag-chip">All Targeted promotions ${I.down}</span><span class="ag-chip">All payment models ${I.down}</span></div>
    </div>`;
  const thead = `<thead><tr><th>Booking ID</th><th>Guest name</th><th>Check-in ${I.sort}</th><th>Check-out ${I.sort}</th><th>Room &amp; occupancy</th><th>Payment model</th><th>Quick actions</th></tr></thead>`;
  const rows = recs.map(r => `<tr>
    <td>${esc(r.id)}<div class="${r.status === 'cancelled' ? 'ag-can' : 'ag-ok'}">${esc(r.statusText)}</div></td><td>${esc(r.name)}</td>
    <td>${f.en(r.arrival)}<div class="ag-s">15:00</div></td><td>${f.en(r.departure)}<div class="ag-s">11:00</div></td>
    <td>1 × ${esc(r.room)}<div class="ag-s">${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children ? ` ${r.children} child` : ''} | ${r.nights} night${r.nights === 1 ? '' : 's'}</div></td>
    <td>${esc(r.payment)}</td><td><span class="ag-qa">${I.chatO}</span><span class="ag-chev">${I.chev}</span></td></tr>`);
  return {
    orient: 'land', cls: 'agoda', top, thead, rows,
    wrapStart: () => '<div class="ag-table">',
    wrapEnd: last => `</div>${last ? `<div class="ag-pag"><span>${I.chevL}</span><b>1</b><span>${I.chev}</span></div>` : ''}`,
    bottom: () => ''
  };
}

/* ======================= PAGINADOR ======================= */
function pageShell(t, first, last, n) {
  const el = document.createElement('div');
  el.className = `page ${t.orient} ota-${t.cls}`;
  el.innerHTML = `<div class="sheet">${t.top(first)}<div class="fit">${t.wrapStart(first)}<table class="t">${t.thead}<tbody></tbody></table>${t.wrapEnd(last)}</div>${t.bottom(last, n)}</div>`;
  return el;
}
const overflow = page => { const fit = page.querySelector('.fit'); return fit.scrollHeight > fit.clientHeight + 1; };

function paginate(t, host, label) {
  const pages = [];
  let i = 0;
  if (!t.rows.length) {
    const pg = pageShell(t, true, true, 1);
    host.appendChild(pg);
    pg.querySelector('tbody').innerHTML = `<tr><td colspan="20" class="empty">Sin reservas para esta fecha</td></tr>`;
    pages.push(pg);
  }
  while (i < t.rows.length) {
    const first = pages.length === 0;
    let pg = pageShell(t, first, true, pages.length + 1);
    host.appendChild(pg);
    let tb = pg.querySelector('tbody');
    let placed = 0;
    while (i < t.rows.length) {
      tb.insertAdjacentHTML('beforeend', t.rows[i]);
      if (overflow(pg) && placed > 0) { tb.lastElementChild.remove(); break; }
      i++; placed++;
    }
    if (i < t.rows.length) { // no es la última: rehacer sin pie de "último"
      const html = tb.innerHTML;
      const np = pageShell(t, first, false, pages.length + 1);
      host.replaceChild(np, pg);
      np.querySelector('tbody').innerHTML = html;
      pg = np;
    }
    pages.push(pg);
  }
  pages.forEach((pg, k) => {
    const tag = document.createElement('div');
    tag.className = 'pfoot';
    tag.textContent = `${label} · ${k + 1}/${pages.length}`;
    if (t.cls !== 'pms') pg.appendChild(tag);
  });
  return pages;
}

export function buildPrint(host, data) {
  host.innerHTML = '';
  const sections = [];
  const date = data.date, date2 = data.dateTo || data.date;
  if (data.sources.pms) sections.push(['pms', tplPMS(data.sources.pms)]);
  const recs = id => (data.sources[id] || []).filter(r => !date || !r.arrival || (r.arrival >= date && r.arrival <= date2));
  if (data.sources.ctrip) sections.push(['ctrip', tplCtrip(recs('ctrip'), date, date2)]);
  if (data.sources.g2) sections.push(['g2', tplG2(recs('g2'), date, date2)]);
  if (data.sources.hotelbeds) sections.push(['hotelbeds', tplHotelbeds(recs('hotelbeds'), date, date2)]);
  if (data.sources.expedia) sections.push(['expedia', tplExpedia(recs('expedia'), date, date2)]);
  if (data.sources.hostelworld) sections.push(['hostelworld', tplHostelworld(recs('hostelworld'), date, date2)]);
  if (data.sources.booking) sections.push(['booking', tplBooking(recs('booking'), date, date2)]);
  if (data.sources.agoda) sections.push(['agoda', tplAgoda(recs('agoda'), date, date2)]);
  let count = 0;
  const out = [];
  for (const [id, t] of sections) {
    const pages = paginate(t, host, OTA_LABEL[id]);
    count += pages.length;
    out.push({ id, pages: pages.length });
  }
  return { total: count, sections: out };
}
