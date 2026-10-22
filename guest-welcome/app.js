/* Pantalla del recepcionista: lee la reserva, pide lo que falta y muestra la hoja */
(() => {
  const $ = id => document.getElementById(id);
  const LOGO = 'toc_logo.png';
  const state = { beds: [], lang: 'en', parsed: null, ready: false };

  /* ---------- Idiomas ---------- */
  $('langs').innerHTML = LANGS.map(([k, es, native]) =>
    `<button type="button" role="radio" data-lang="${k}" aria-checked="${k === state.lang}">${es}${es !== native ? `<small lang="${k}">${native}</small>` : ''}</button>`).join('');
  $('langs').addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]'); if (!b) return;
    state.lang = b.dataset.lang;
    $('langs').querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
    render();
  });

  /* ---------- Pegar reserva ---------- */
  let pasteTimer;
  $('paste').addEventListener('input', () => { clearTimeout(pasteTimer); pasteTimer = setTimeout(readPaste, 150); });

  function readPaste() {
    const text = $('paste').value.trim();
    const msg = $('parseMsg');
    if (!text) { msg.hidden = true; return; }
    const p = parsePMS(text);
    state.parsed = p;
    const missing = [];
    if (!p.arrival || !p.departure) missing.push('fechas');
    if (!p.roomCode) missing.push('tipo de habitación');
    if (!p.place) missing.push('habitación/cama');
    msg.hidden = false;
    msg.className = 'msg ' + (missing.length ? 'warn' : 'ok');
    msg.textContent = missing.length
      ? `Leída, pero falta: ${missing.join(', ')}. Complétalo abajo.`
      : (roomInfo(p.roomCode).private ? 'Reserva leída. Revisa los datos y confirma cuántos pagan tasa.' : 'Reserva leída. Revisa los datos y elige el idioma.');

    $('f-name').value = titleCase(p.name);
    $('f-arr').value = p.arrival;
    $('f-dep').value = p.departure;
    $('f-nights').value = p.nights || '';
    if (p.roomCode) selectRoom(p.roomCode);
    $('f-hd').checked = p.regime === 'HD';

    const priv = roomInfo($('f-room').value).private;
    const pl = splitPlace(p.place);
    state.beds = [priv ? { room: pl.room, bed: '' } : pl];
    $('f-pax').value = priv ? Math.max(1, 1 + p.companions.length) : 1;
    $('f-adults').value = priv ? '' : 1;

    // Canal
    const all = `${p.agency} ${p.contract} ${p.raw}`;
    let val = 'other|ask', other = '';
    if (/MIRAI/i.test(all)) val = 'web|web';
    else {
      const a = AGENCIES.find(x => x.re.test(p.agency || ''));
      if (a) val = `${a.name}|${a.mode}`;
      else other = titleCase(p.agency || '');
    }
    $('f-channel').value = val;
    $('f-other').value = other;
    $('f-unpaid').checked = false;
    $('f-amount').value = '';

    ['stepData', 'stepPay', 'stepLang', 'stepPrint'].forEach(id => $(id).hidden = false);
    drawBeds(); syncChannel(); render();
    if (priv) $('f-adults').focus({ preventScroll: true });
  }

  function selectRoom(code) {
    const info = roomInfo(code);
    const opt = [...$('f-room').options].find(o => roomInfo(o.value).key === info.key);
    if (opt) $('f-room').value = opt.value;
  }

  const titleCase = s => String(s || '').toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

  /* ---------- Camas / habitaciones ---------- */
  function drawBeds() {
    const priv = roomInfo($('f-room').value).private;
    $('bedsLabel').textContent = priv ? 'Habitación' : 'Habitación y cama';
    $('addBed').textContent = priv ? '+ Añadir habitación' : '+ Añadir cama';
    if (!state.beds.length) state.beds = [{ room: '', bed: '' }];
    $('beds').innerHTML = state.beds.map((x, i) => `
      <div class="bed-row${priv ? ' priv' : ''}" data-i="${i}">
        <input data-k="room" value="${escAttr(x.room)}" placeholder="Hab." aria-label="Habitación ${i + 1}">
        ${priv ? '' : `<input data-k="bed" value="${escAttr(x.bed)}" placeholder="Cama" aria-label="Cama ${i + 1}">`}
        <button type="button" class="x" title="Quitar" aria-label="Quitar" ${state.beds.length < 2 ? 'disabled' : ''}>×</button>
      </div>`).join('');
  }
  const escAttr = s => String(s ?? '').replace(/"/g, '&quot;');

  $('beds').addEventListener('input', e => {
    const row = e.target.closest('.bed-row'); if (!row) return;
    state.beds[+row.dataset.i][e.target.dataset.k] = e.target.value.trim();
    render();
  });
  $('beds').addEventListener('click', e => {
    if (!e.target.classList.contains('x')) return;
    state.beds.splice(+e.target.closest('.bed-row').dataset.i, 1);
    if (!roomInfo($('f-room').value).private) $('f-pax').value = state.beds.length;
    drawBeds(); render();
  });
  $('addBed').addEventListener('click', () => {
    const last = state.beds[state.beds.length - 1] || {};
    state.beds.push({ room: last.room || '', bed: '' });
    if (!roomInfo($('f-room').value).private) $('f-pax').value = state.beds.length;
    drawBeds(); render();
    const rows = $('beds').querySelectorAll('.bed-row');
    rows[rows.length - 1].querySelector(roomInfo($('f-room').value).private ? 'input' : 'input[data-k="bed"]').focus();
  });

  /* ---------- Campos ---------- */
  ['f-name', 'f-nights', 'f-pax', 'f-adults', 'f-amount', 'f-other', 'f-hd'].forEach(id => $(id).addEventListener('input', render));
  ['f-arr', 'f-dep'].forEach(id => $(id).addEventListener('input', () => {
    const a = $('f-arr').value.trim(), d = $('f-dep').value.trim();
    if (DATE_RE.test(a) && DATE_RE.test(d)) { const n = nightsBetween(a, d); if (n > 0) $('f-nights').value = n; }
    render();
  }));
  $('f-room').addEventListener('change', () => {
    if (roomInfo($('f-room').value).private) state.beds = state.beds.slice(0, 1).map(x => ({ room: x.room, bed: '' }));
    $('f-adults').value = '';
    drawBeds(); render();
  });
  $('f-channel').addEventListener('change', () => { syncChannel(); render(); });
  $('f-unpaid').addEventListener('change', () => { syncChannel(); render(); });

  function channel() {
    const [name, mode] = $('f-channel').value.split('|');
    const isOther = name === 'other';
    const unpaid = mode === 'prepaid' && $('f-unpaid').checked;
    return { name: isOther ? ($('f-other').value.trim() || '—') : name, mode: unpaid ? 'ask' : mode, baseMode: mode, isOther };
  }
  function syncChannel() {
    const c = channel();
    $('otherWrap').hidden = !c.isOther;
    $('unpaidWrap').hidden = c.baseMode !== 'prepaid';
    $('amountWrap').hidden = c.mode !== 'ask';
  }

  /* ---------- Tasa y avisos ---------- */
  function drawTax(b) {
    const box = $('taxBox');
    if (!Number.isFinite(b.adults16)) { box.innerHTML = '<p>Indica cuántas personas de 16 años o más pagan tasa para calcularla.</p>'; return; }
    const tx = computeTax(b);
    const f = v => v.toFixed(2).replace('.', ',') + ' €';
    let html = `<p class="tax-line">Tasa turística: <b>${f(tx.rate)}</b> × ${tx.persons} pers. × ${tx.nights} noches = <b>${f(tx.total)}</b></p>`;
    if (tx.capped) html += `<p class="note">Estancia de ${b.nights} noches: la tasa se cobra solo 7.</p>`;
    const pms = state.parsed && state.parsed.totalTax;
    if (!b.private && Number.isFinite(pms) && Math.abs(pms - tx.total) > 0.01)
      html += `<p class="note warn">El PMS marca ${f(pms)} de tasas. Revisa personas y noches.</p>`;
    if (b.private) html += `<p class="note">Privada: se aplica 7,70 € aunque el PMS marque 6,60 €.</p>`;
    if (b.mode === 'ask') html += `<p class="note">${b.channel === 'Hostelworld' ? 'Hostelworld' : 'Este canal'}: escribe abajo el importe total a cobrar (incluye la tasa).</p>`;
    else html += `<p class="note">${b.mode === 'web' ? 'Web (Mirai)' : b.channel}: el huésped solo paga la tasa.</p>`;
    box.innerHTML = html;
  }

  /* ---------- Hoja ---------- */
  function collect() {
    const c = channel();
    const priv = roomInfo($('f-room').value).private;
    const ad = $('f-adults').value.trim();
    const amt = $('f-amount').value.trim();
    return {
      name: $('f-name').value.trim(),
      arrival: $('f-arr').value.trim(), departure: $('f-dep').value.trim(),
      nights: parseInt($('f-nights').value, 10) || 0,
      regime: $('f-hd').checked ? 'HD' : 'HH',
      roomCode: $('f-room').value,
      channel: c.name, mode: c.mode,
      pax: priv ? (parseInt($('f-pax').value, 10) || 1) : state.beds.length,
      // En compartidas todos son mayores de edad (los menores solo van en privadas): pagan tasa todos
      adults16: priv ? (ad === '' ? NaN : parseInt(ad, 10)) : state.beds.length,
      amountToPay: amt === '' ? NaN : num(amt),
      beds: state.beds.map(x => ({ ...x })),
    };
  }

  function problems(b) {
    const p = [];
    if (!b.name) p.push('el nombre del titular');
    if (!DATE_RE.test(b.arrival) || !DATE_RE.test(b.departure) || b.nights < 1) p.push('las fechas');
    if (!b.beds.some(x => x.room)) p.push('la habitación');
    if (!roomInfo(b.roomCode).private && b.beds.some(x => !x.bed)) p.push('el número de cama');
    if (!Number.isFinite(b.adults16)) p.push('cuántos pagan tasa (16+)');
    if (b.mode === 'ask' && !Number.isFinite(b.amountToPay)) p.push('el importe a cobrar');
    return p;
  }

  function chips(b) {
    const max = Math.max(b.pax, 1);
    const cur = $('f-adults').value;
    $('adultChips').innerHTML = Array.from({ length: max + 1 }, (_, i) =>
      `<button type="button" data-v="${i}" aria-pressed="${String(i) === cur}">${i}</button>`).join('');
  }
  $('adultChips').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    $('f-adults').value = b.dataset.v; render();
  });

  function render() {
    if ($('stepData').hidden) return;
    const b = collect();
    const priv = roomInfo(b.roomCode).private;
    $('paxWrap').hidden = !priv;
    $('dormPax').hidden = priv;
    if (!priv) $('dormPax').textContent = `Compartida: ${b.beds.length} ${b.beds.length === 1 ? 'persona' : 'personas'} (una por cama). En compartidas todos pagan tasa.`;
    chips(b);
    $('f-adults').classList.toggle('done', Number.isFinite(b.adults16));
    $('f-amount').classList.toggle('done', Number.isFinite(b.amountToPay));
    drawTax({ ...b, private: roomInfo(b.roomCode).private });

    const sheetB = { ...b, adults16: Number.isFinite(b.adults16) ? b.adults16 : 0 };
    if (!DATE_RE.test(sheetB.arrival)) sheetB.arrival = '--/--/--';
    if (!DATE_RE.test(sheetB.departure)) sheetB.departure = '--/--/--';
    $('sheet').innerHTML = renderSheet(sheetB, state.lang, LOGO);
    $('empty').hidden = true;
    fit();
    shrinkToPage();

    const p = problems(b);
    state.ready = !p.length;
    $('print').disabled = !state.ready;
    $('blockMsg').hidden = state.ready;
    $('blockMsg').textContent = p.length ? `Falta ${p.join(', ')}.` : '';
  }

  /* Si un idioma no cabe en una página, compacta la hoja en uno o dos pasos */
  function shrinkToPage() {
    const page = $('sheet').querySelector('.page'); if (!page) return;
    const over = () => page.scrollHeight > page.clientHeight + 1;
    if (over()) page.classList.add('dense');
    if (over()) page.classList.add('denser');
  }
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => { if (!$('stepData').hidden) render(); });

  function fit() {
    const wrap = $('sheetWrap'), sheet = $('sheet');
    const w = wrap.clientWidth;
    const s = Math.min(1, w / 794);
    sheet.style.transform = `scale(${s})`;
    wrap.style.height = `${1123 * s}px`;
  }
  window.addEventListener('resize', fit);

  /* ---------- Imprimir ---------- */
  $('print').addEventListener('click', async () => {
    if (!state.ready) return;
    const old = document.title;
    document.title = `Bienvenida ${$('f-name').value.trim()} (${state.lang.toUpperCase()})`;
    try { await document.fonts.ready; } catch (e) { /* sigue */ }
    window.print();
    setTimeout(() => { document.title = old; }, 500);
  });

  /* ---------- Nueva reserva ---------- */
  $('reset').addEventListener('click', () => {
    $('paste').value = ''; $('parseMsg').hidden = true;
    ['stepData', 'stepPay', 'stepLang', 'stepPrint'].forEach(id => $(id).hidden = true);
    $('sheet').innerHTML = ''; $('sheetWrap').style.height = '0'; $('empty').hidden = false;
    state.beds = []; state.parsed = null;
    $('paste').focus();
  });
})();
