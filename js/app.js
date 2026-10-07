import { readSpreadsheet } from './readers.js';
import { detectSource, parseSource, OTA_ORDER, OTA_LABEL, g2RowsFromPaste } from './sources.js';
import { compare } from './compare.js';
import { buildPrint } from './render.js';

const $ = s => document.querySelector(s);
const state = { files: [] }; // {name, rows, source, auto}

const drop = $('#drop'), input = $('#file');
drop.addEventListener('click', () => input.click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
$('#print').addEventListener('click', () => window.print());

// ---- G2: pegar la tabla copiada de la extranet ----
const g2box = $('#g2paste');
g2box.addEventListener('paste', e => {
  e.preventDefault();
  const cd = e.clipboardData;
  const rows = g2RowsFromPaste(cd.getData('text/html'), cd.getData('text/plain'));
  const n = rows.length - 1;
  const msg = $('#g2msg');
  if (n < 1) { msg.textContent = 'No encontré reservas de G2 en lo pegado. Seleccioná la tabla entera (desde "G2 Booking ID" hasta la última fila) y copiala de nuevo.'; msg.className = 'g2msg err'; return; }
  state.files = state.files.filter(f => !f.pasted);
  state.files.push({ name: `G2 \u00b7 pegado (${n} reserva${n === 1 ? '' : 's'})`, rows, source: 'g2', auto: true, pasted: true });
  msg.textContent = `${n} reserva${n === 1 ? '' : 's'} de G2 cargada${n === 1 ? '' : 's'}.`; msg.className = 'g2msg ok';
  run();
});

function rtfToText(rtf) {
  return rtf.replace(/\{\\\*[^{}]*\}/g, '').replace(/\\par[d]?\b ?/g, '\n').replace(/\\tab\b ?/g, '\t').replace(/\\cell\b ?/g, '\t').replace(/\\row\b ?/g, '\n')
    .replace(/\\'([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
}

async function addFiles(fileList) {
  const list = [...fileList]; // copia: el FileList se vacía al resetear el input
  for (const file of list) {
    try {
      if (/\.(txt|text|rtf)$/i.test(file.name)) { // tabla de G2 copiada y guardada en un documento de notas
        let text = await file.text();
        if (/^\s*\{\\rtf/.test(text)) text = rtfToText(text);
        const rows = g2RowsFromPaste(null, text);
        state.files = state.files.filter(f => f.name !== file.name);
        if (rows.length < 2) state.files.push({ name: file.name, rows: null, source: null, error: 'sin reservas de G2' });
        else state.files.push({ name: file.name, rows, source: 'g2', auto: true });
        continue;
      }
      const rows = await readSpreadsheet(file.name, await file.arrayBuffer());
      const src = detectSource(rows, file.name);
      state.files = state.files.filter(f => f.name !== file.name);
      state.files.push({ name: file.name, rows, source: src || 'g2', auto: !!src });
    } catch (err) {
      state.files.push({ name: file.name, rows: null, source: null, error: err.message });
    }
  }
  run();
}

function renderFiles() {
  const ul = $('#files');
  ul.innerHTML = '';
  state.files.forEach((f, i) => {
    const li = document.createElement('li');
    if (f.error) {
      li.className = 'unk';
      li.innerHTML = `<b style="color:var(--err)">No se pudo leer${f.error === 'sin reservas de G2' ? ' (no encontré reservas de G2)' : ''}</b><span class="fn" title="${f.name}">${f.name}</span><button aria-label="Quitar">×</button>`;
    } else {
      if (!f.auto) li.className = 'unk';
      const opts = OTA_ORDER.map(id => `<option value="${id}" ${id === f.source ? 'selected' : ''}>${OTA_LABEL[id]}</option>`).join('');
      li.innerHTML = `<select aria-label="Fuente">${opts}</select><span class="fn" title="${f.name}">${f.name}</span>${f.auto ? '' : '<small style="color:var(--warn)">¿es G2? revisá</small>'}<button aria-label="Quitar">×</button>`;
      li.querySelector('select').addEventListener('change', e => { f.source = e.target.value; f.auto = true; run(); });
    }
    li.querySelector('button').addEventListener('click', () => { state.files.splice(i, 1); run(); });
    ul.appendChild(li);
  });
}

function collect() {
  const sources = {};
  for (const f of state.files) {
    if (f.error) continue;
    const parsed = parseSource(f.source, f.rows);
    if (f.source === 'pms') sources.pms = parsed;
    else sources[f.source] = (sources[f.source] || []).concat(parsed);
  }
  return sources;
}

const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  ok: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>',
  bad: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>'
};

function run() {
  renderFiles();
  if (!state.files.length) { $('#result').hidden = true; $('#pages').innerHTML = ''; $('#day').hidden = true; return; }
  const sources = collect();
  const res = compare(sources);
  $('#result').hidden = false;

  if (res.date) {
    const fmtD = iso => { const [y, m, d] = iso.split('-'); return { txt: `${d}/${m}/${y}`, wd: new Date(Date.UTC(+y, +m - 1, +d)).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' }) }; };
    const a = fmtD(res.date), multi = res.dateTo && res.dateTo !== res.date;
    $('#day').hidden = false;
    $('#day').innerHTML = multi
      ? `Llegadas del<b>${a.txt} al ${fmtD(res.dateTo).txt}</b>${res.issued ? `PMS exportado ${escH(res.issued)}` : ''}`
      : `Llegadas del<b>${a.wd} ${a.txt}</b>${res.issued ? `PMS exportado ${escH(res.issued)}` : ''}`;
  }

  const errs = res.issues.filter(i => i.sev === 'error').length;
  const warns = res.issues.filter(i => i.sev === 'warn').length;
  const v = $('#verdict');
  if (!errs && !warns) {
    v.className = 'verdict ok';
    v.innerHTML = `${ICON.ok}<div><div class="big">Todo correcto</div>Todas las reservas confirmadas están en el PMS y ninguna cancelada sigue cargada.</div>`;
  } else {
    v.className = errs ? 'verdict bad' : 'verdict warn';
    v.innerHTML = `${ICON.bad}<div><div class="big">${errs + warns} anomalía${errs + warns === 1 ? '' : 's'}</div>${errs ? `${errs} a corregir` : ''}${errs && warns ? ' · ' : ''}${warns ? `${warns} a revisar` : ''}</div>`;
  }

  // tarjetas por fuente
  const cards = $('#cards');
  cards.innerHTML = '';
  for (const id of OTA_ORDER) {
    const c = document.createElement('div');
    const mine = res.issues.filter(i => i.ota === id && i.sev !== 'info');
    const dot = mine.some(i => i.sev === 'error') ? 'err' : mine.length ? 'warn' : '';
    if (id === 'pms') {
      if (!sources.pms) { c.className = 'card missing'; c.innerHTML = `<h3>${OTA_LABEL.pms}<span class="dot err"></span></h3><div class="n">Falta el Listado de Reservas</div>`; }
      else {
        const locs = new Set(sources.pms.items.map(i => i.loc)).size;
        c.className = 'card'; c.innerHTML = `<h3>${OTA_LABEL.pms}<span class="dot"></span></h3><div class="n">${locs} reservas · ${sources.pms.items.length} líneas</div>`;
      }
    } else if (!sources[id]) {
      const n = res.pmsCounts[id] || 0;
      c.className = 'card missing';
      c.innerHTML = `<h3>${OTA_LABEL[id]}<span class="dot ${n ? 'err' : 'off'}"></span></h3><div class="n">${n ? `Sin archivo · ${n} en el PMS` : 'Sin archivo'}</div>`;
    } else {
      const s = res.summary[id];
      c.className = 'card';
      c.innerHTML = `<h3>${OTA_LABEL[id]}<span class="dot ${dot}"></span></h3><div class="n">${s.confirmed} confirmada${s.confirmed === 1 ? '' : 's'} · ${s.cancelled} cancelada${s.cancelled === 1 ? '' : 's'}${s.issues ? ` · <b style="color:var(--${dot === 'err' ? 'err' : 'warn'})">${s.issues} aviso${s.issues === 1 ? '' : 's'}</b>` : ''}</div>`;
    }
    cards.appendChild(c);
  }

  $('#issues').innerHTML = res.issues.map(i => `
    <div class="issue ${i.sev}"><div class="src">${OTA_LABEL[i.ota] || i.ota}</div>
    <div class="who">${escH(i.name) || '&nbsp;'}${i.id ? `<small>${escH(i.id)}</small>` : ''}</div>
    <div class="msg">${escH(i.msg)}</div></div>`).join('');

  // páginas
  const host = $('#pages');
  const measure = document.createElement('div');
  measure.className = 'measure';
  document.body.appendChild(measure);
  const info = buildPrint(measure, { date: res.date, dateTo: res.dateTo, sources });
  host.innerHTML = '';
  const W = Math.min(host.clientWidth || 1040, 1040);
  for (const page of [...measure.children]) {
    const pv = document.createElement('div');
    pv.className = 'pv';
    const land = page.classList.contains('land');
    const pw = land ? 1122.5 : 793.7, ph = land ? 793.7 : 1122.5;
    const landW = Math.min(500, W - 8);
    const s = land ? landW / pw : (landW * 210 / 297) / ph;
    pv.style.width = pw * s + 'px'; pv.style.height = ph * s + 'px';
    page.style.transform = `scale(${s})`;
    pv.appendChild(page);
    host.appendChild(pv);
  }
  measure.remove();
  const sheets = Math.ceil(info.total / 2);
  $('#pinfo').textContent = `${info.total} página${info.total === 1 ? '' : 's'} · ${sheets} hoja${sheets === 1 ? '' : 's'} a doble cara · orden: ${info.sections.map(s => OTA_LABEL[s.id]).join(' → ')}`;
  const dn = iso => iso.split('-').reverse().join('-');
  document.title = `Check my Reservations ${res.date ? dn(res.date) + (res.dateTo && res.dateTo !== res.date ? ' a ' + dn(res.dateTo) : '') : ''}`;
}
