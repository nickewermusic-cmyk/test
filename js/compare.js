import { OTA_ORDER, OTA_LABEL, idKey, roomKeyFromPMS, roomKeyFromOTA, describeKey, pmsOta } from './sources.js';

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u3040-\u9fff\uac00-\ud7af]+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(t => t.length >= 2);
const fmt = iso => iso ? iso.split('-').reverse().join('/') : '—';

// OTAs donde un dorm "mixto" sin mención al baño es baño privado (así nombran el producto)
const PRIVATE_BY_DEFAULT = new Set(['booking', 'ctrip', 'agoda', 'expedia', 'hotelbeds']);
// OTAs cuyo export trae nº de camas/habitaciones fiable
const COUNT_UNITS = new Set(['booking', 'ctrip', 'hotelbeds', 'hostelworld', 'agoda']);

export function compare(sources) {
  // sources: { pms: {date, issued, items}, booking: [..], ... } (+ fileNames)
  const pms = sources.pms;
  const issues = [];
  const add = (sev, ota, rec, msg) => issues.push({ sev, ota, id: rec ? rec.id : '', name: rec ? rec.name : '', msg });
  const date = pms ? pms.date : '';
  const dateTo = pms ? (pms.dateTo || pms.date) : '';
  const inRange = r => !r.arrival || (r.arrival >= date && r.arrival <= dateTo);
  const summary = {};

  if (!pms) issues.push({ sev: 'error', ota: 'pms', id: '', name: '', msg: 'Falta el Listado de Reservas del PMS: sin él no se puede comprobar nada.' });

  const byKey = new Map();
  if (pms) for (const it of pms.items) {
    const k = idKey(it.bono);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(it);
  }
  const used = new Set();
  const findPMS = (ota, rec) => {
    const keys = [idKey(rec.id)];
    if (rec.confirmation) keys.push(idKey(rec.confirmation));
    for (const k of keys) if (k && byKey.has(k)) return [k, byKey.get(k)];
    // coincidencia parcial (p. ej. bonos con prefijos)
    const k0 = keys[0];
    if (k0 && k0.length >= 6) for (const [k, v] of byKey) if (k.endsWith(k0) || k0.endsWith(k)) return [k, v];
    return [null, null];
  };

  for (const ota of OTA_ORDER) {
    if (ota === 'pms' || !sources[ota]) continue;
    const all = sources[ota];
    const recs = date ? all.filter(inRange) : all;
    const other = all.length - recs.length;
    const s = summary[ota] = { total: recs.length, confirmed: 0, cancelled: 0, ok: 0, issues: 0, otherDates: other };
    if (other > 0) issues.push({ sev: 'info', ota, id: '', name: '', msg: `${other} reserva(s) del archivo tienen una fecha de llegada fuera del rango del listado del PMS y no se comprobaron.` });
    const seen = new Map();
    for (const rec of recs) {
      rec.check = 'ok';
      const before = issues.length;
      const k = idKey(rec.id);
      if (seen.has(k) && rec.status === 'confirmed' && seen.get(k).status === 'confirmed') add('warn', ota, rec, 'Reserva duplicada en el archivo de la OTA.');
      seen.set(k, rec);
      if (rec.status === 'cancelled') s.cancelled++; else s.confirmed++;
      if (!pms) { rec.check = 'na'; continue; }
      const [key, rows] = findPMS(ota, rec);
      rec.pms = rows || [];
      if (key) used.add(key);
      if (rec.status === 'cancelled') {
        if (rows && rows.some(r => !/cancel|anul/i.test(r.status))) add('error', ota, rec, `Cancelada en ${OTA_LABEL[ota]}, pero sigue activa en el PMS (${rows[0].loc}). Hay que cancelarla.`);
      } else if (!rows) {
        add('error', ota, rec, `Confirmada en ${OTA_LABEL[ota]} y NO está en el PMS. Hay que cargarla.`);
      } else {
        const p = rows[0];
        if (!/confirm/i.test(p.status)) add('warn', ota, rec, `En el PMS figura como "${p.status}" (en la OTA está confirmada).`);
        if (rec.arrival && p.arrival && rec.arrival !== p.arrival) add('error', ota, rec, `Fecha de entrada distinta: OTA ${fmt(rec.arrival)} · PMS ${fmt(p.arrival)}.`);
        if (rec.departure && p.departure && rec.departure !== p.departure) add('error', ota, rec, `Fecha de salida distinta: OTA ${fmt(rec.departure)} · PMS ${fmt(p.departure)}.`);
        // nombre
        const ot = new Set(tokens(rec.cleanName || rec.name));
        const pt = new Set(rows.flatMap(r => tokens(r.titular)));
        if (ot.size && pt.size && ![...ot].some(t => pt.has(t))) add('warn', ota, rec, `Nombre distinto: OTA "${rec.name}" · PMS "${rows.map(r => r.titular.replace(/\s*,\s*/, ' ').replace(/\s+$/, '')).filter((v, i, a) => a.indexOf(v) === i).join(' / ')}".`);
        // producto
        const ok = roomKeyFromOTA(rec.room, { defaultPrivate: PRIVATE_BY_DEFAULT.has(ota) });
        const pkeys = [...new Set(rows.map(r => r.tipo))];
        const bad = [];
        for (const t of pkeys) {
          const pk = roomKeyFromPMS(t);
          let diff = false;
          if (ok.kind !== '?' && pk.kind !== '?' && ok.kind !== pk.kind) diff = true;
          if (ok.beds && pk.beds && ok.beds !== pk.beds) diff = true;
          if (ok.bath && pk.bath && ok.bath !== pk.bath) diff = true;
          if (diff) bad.push(t);
        }
        if (bad.length) add('error', ota, rec, `Producto distinto: ${OTA_LABEL[ota]} vende "${rec.room}" (${describeKey(ok)}) y el PMS tiene ${bad.map(t => `"${t}" (${describeKey(roomKeyFromPMS(t))})`).join(', ')}.`);
        // nº de camas / habitaciones
        if (COUNT_UNITS.has(ota) && rec.units) {
          const isDorm = rows.every(r => ['MIX', 'FEM'].includes(roomKeyFromPMS(r.tipo).kind));
          const pmsUnits = rows.length;
          if (isDorm && pmsUnits !== rec.units) add('warn', ota, rec, `Cantidad de camas distinta: OTA ${rec.units} · PMS ${pmsUnits}.`);
          if (!isDorm && pmsUnits !== rec.units) add('warn', ota, rec, `Cantidad de habitaciones distinta: OTA ${rec.units} · PMS ${pmsUnits}.`);
        }
        if (ota === 'g2' && rec.persons) {
          const pax = rows.reduce((a, r) => a + (r.pax || 0), 0);
          if (pax && pax !== rec.persons) add('warn', ota, rec, `Personas distintas: G2 ${rec.persons} (${rec.passengers}) \u00b7 PMS ${pax}.`);
        }
        if (ota === 'booking' && rec.persons && !rows.every(r => ['MIX', 'FEM'].includes(roomKeyFromPMS(r.tipo).kind))) {
          const pax = rows.reduce((a, r) => a + (r.pax || 0), 0);
          if (pax && pax !== rec.persons) add('warn', ota, rec, `Personas distintas: OTA ${rec.persons} · PMS ${pax}.`);
        }
      }
      const mine = issues.slice(before);
      if (mine.some(i => i.sev === 'error')) rec.check = 'error';
      else if (mine.some(i => i.sev === 'warn')) rec.check = 'warn';
      else s.ok++;
      s.issues += mine.filter(i => i.sev !== 'info').length;
    }
  }

  // Reservas del PMS de una OTA cuyo archivo se subió, pero que no aparecen en él
  const pmsCounts = {};
  if (pms) {
    const groups = new Map();
    for (const it of pms.items) {
      const k = idKey(it.bono) || it.loc;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    for (const [k, rows] of groups) {
      const ota = pmsOta(rows[0]);
      pmsCounts[ota] = (pmsCounts[ota] || 0) + 1;
      if (!sources[ota] || used.has(k)) continue;
      const p = rows[0];
      issues.push({ sev: 'warn', ota, id: p.bono, name: p.titular.replace(/\s*,\s*/, ' '), msg: `Está en el PMS (${p.loc}) como reserva de ${OTA_LABEL[ota]}, pero no aparece en el listado de la OTA. ¿Cambio de fechas o cancelación?` });
      if (summary[ota]) summary[ota].issues++;
    }
    for (const ota of OTA_ORDER) {
      if (ota === 'pms' || sources[ota] || !pmsCounts[ota]) continue;
      issues.push({ sev: 'error', ota, id: '', name: '', msg: `No subiste el archivo de ${OTA_LABEL[ota]} y en el PMS hay ${pmsCounts[ota]} reserva(s) suyas en estas fechas.` });
    }
  }
  const order = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.sev] - order[b.sev] || OTA_ORDER.indexOf(a.ota) - OTA_ORDER.indexOf(b.ota));
  return { date, dateTo, issued: pms ? pms.issued : '', summary, issues, pmsCounts };
}
