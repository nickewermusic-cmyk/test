// Check my Reservations — lectores de hojas de cálculo sin dependencias.
// Devuelven siempre una matriz de filas: Array<Array<string|number|null>>

/* ---------------- CSV ---------------- */
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch]++;
  }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

/* ---------------- ZIP / XLSX ---------------- */
async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP inválido');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    files[name] = { method, csize, lho };
    p += 46 + nlen + elen + clen;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name];
      if (!f) return null;
      const lnl = dv.getUint16(f.lho + 26, true), lel = dv.getUint16(f.lho + 28, true);
      const start = f.lho + 30 + lnl + lel;
      const data = u8.subarray(start, start + f.csize);
      const out = f.method === 0 ? data : await inflateRaw(data);
      return dec.decode(out);
    }
  };
}

function xmlUnescape(s) {
  return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const map = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
    if (map[e.toLowerCase()]) return map[e.toLowerCase()];
    if (e[1] === 'x' || e[1] === 'X') return String.fromCodePoint(parseInt(e.slice(2), 16));
    return String.fromCodePoint(parseInt(e.slice(1), 10));
  });
}
function textOfSi(si) {
  // concatena todos los <t> (incluye rich text <r><t>)
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g;
  let m;
  while ((m = re.exec(si))) out += m[1] ? xmlUnescape(m[1]) : '';
  return out;
}
function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function parseXLSX(buf) {
  const zip = await unzip(buf);
  const ssXml = await zip.text('xl/sharedStrings.xml');
  const shared = [];
  if (ssXml) {
    const re = /<si>([\s\S]*?)<\/si>|<si\/>/g;
    let m;
    while ((m = re.exec(ssXml))) shared.push(m[1] ? textOfSi(m[1]) : '');
  }
  // primera hoja según workbook + rels
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await zip.text('xl/workbook.xml');
  const rels = await zip.text('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const sm = wb.match(/<sheet\b[^>]*?r:id="([^"]+)"/) || wb.match(/<sheet\b[^>]*?\bid="([^"]+)"/);
    if (sm) {
      const rm = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${sm[1]}"[^>]*>`));
      if (rm) {
        const t = rm[0].match(/Target="([^"]+)"/)[1];
        sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
      }
    }
  }
  let xml = await zip.text(sheetPath);
  if (!xml) {
    const alt = zip.names.find(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n));
    xml = await zip.text(alt);
  }
  const rows = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rm, autoRow = 0;
  while ((rm = rowRe.exec(xml))) {
    const rAttr = rm[1].match(/\br="(\d+)"/);
    const ri = rAttr ? +rAttr[1] - 1 : autoRow;
    autoRow = ri + 1;
    const row = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm, autoCol = 0;
    while ((cm = cellRe.exec(rm[2]))) {
      const attrs = cm[1], inner = cm[2] || '';
      const ref = attrs.match(/\br="([A-Z]+)\d+"/);
      const ci = ref ? colIndex(ref[1]) : autoCol;
      autoCol = ci + 1;
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const vm = inner.match(/<v>([\s\S]*?)<\/v>/);
      let val = null;
      if (t === 's') val = vm ? shared[+vm[1]] : '';
      else if (t === 'inlineStr') val = textOfSi(inner);
      else if (t === 'str' || t === 'e') val = vm ? xmlUnescape(vm[1]) : '';
      else if (t === 'b') val = vm ? (vm[1] === '1') : null;
      else if (vm) { const num = Number(vm[1]); val = isNaN(num) ? xmlUnescape(vm[1]) : num; }
      row[ci] = val;
    }
    rows[ri] = row;
  }
  return normalize(rows);
}

/* ---------------- CFB + BIFF8 (.xls) ---------------- */
function readCFBStream(buf, wanted) {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const sig = dv.getUint32(0, true);
  if (sig !== 0xe011cfd0) throw new Error('No es un archivo Excel 97-2003');
  const secSize = 1 << dv.getUint16(30, true);
  const miniSize = 1 << dv.getUint16(32, true);
  const firstDir = dv.getInt32(48, true);
  const miniCutoff = dv.getUint32(56, true);
  const firstMiniFat = dv.getInt32(60, true);
  const firstDifat = dv.getInt32(68, true);
  const nDifat = dv.getUint32(72, true);
  const secOff = s => (s + 1) * secSize;
  // DIFAT
  const difat = [];
  for (let i = 0; i < 109; i++) { const v = dv.getInt32(76 + i * 4, true); if (v >= 0) difat.push(v); }
  let ds = firstDifat;
  for (let k = 0; k < nDifat && ds >= 0; k++) {
    const per = secSize / 4 - 1;
    for (let i = 0; i < per; i++) { const v = dv.getInt32(secOff(ds) + i * 4, true); if (v >= 0) difat.push(v); }
    ds = dv.getInt32(secOff(ds) + per * 4, true);
  }
  const fat = [];
  for (const s of difat) for (let i = 0; i < secSize / 4; i++) fat.push(dv.getInt32(secOff(s) + i * 4, true));
  const chain = (start) => { const out = []; let s = start; const seen = new Set(); while (s >= 0 && !seen.has(s) && s < fat.length) { seen.add(s); out.push(s); s = fat[s]; } return out; };
  const readChain = (start, size) => {
    const secs = chain(start);
    const out = new Uint8Array(secs.length * secSize);
    secs.forEach((s, i) => out.set(u8.subarray(secOff(s), secOff(s) + secSize), i * secSize));
    return size != null ? out.subarray(0, size) : out;
  };
  const dir = readChain(firstDir);
  const ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  const entries = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const nlen = ddv.getUint16(o + 64, true);
    let name = '';
    for (let i = 0; i < Math.max(0, nlen / 2 - 1); i++) name += String.fromCharCode(ddv.getUint16(o + i * 2, true));
    entries.push({ name, type: dir[o + 66], start: ddv.getInt32(o + 116, true), size: ddv.getUint32(o + 120, true) });
  }
  const root = entries.find(e => e.type === 5);
  const ent = entries.find(e => wanted.includes(e.name));
  if (!ent) throw new Error('El .xls no tiene hoja de cálculo');
  if (ent.size >= miniCutoff) return readChain(ent.start, ent.size);
  // mini stream
  const miniStream = readChain(root.start, root.size);
  const mf = readChain(firstMiniFat);
  const mfdv = new DataView(mf.buffer, mf.byteOffset, mf.byteLength);
  const minifat = []; for (let i = 0; i < mf.length / 4; i++) minifat.push(mfdv.getInt32(i * 4, true));
  const out = new Uint8Array(Math.ceil(ent.size / miniSize) * miniSize);
  let s = ent.start, i = 0;
  while (s >= 0 && i < out.length) { out.set(miniStream.subarray(s * miniSize, (s + 1) * miniSize), i); i += miniSize; s = minifat[s]; }
  return out.subarray(0, ent.size);
}

function rkToNumber(rk) {
  let v;
  if (rk & 2) v = rk >> 2;
  else { const b = new DataView(new ArrayBuffer(8)); b.setUint32(4, rk & 0xfffffffc, true); b.setUint32(0, 0, true); v = b.getFloat64(0, true); }
  return rk & 1 ? v / 100 : v;
}

export function parseXLS(buf) {
  const wb = readCFBStream(buf, ['Workbook', 'Book']);
  const dv = new DataView(wb.buffer, wb.byteOffset, wb.byteLength);
  const recs = [];
  for (let p = 0; p + 4 <= wb.length;) {
    const type = dv.getUint16(p, true), len = dv.getUint16(p + 2, true);
    recs.push({ type, off: p + 4, len, pos: p });
    p += 4 + len;
  }
  const latin = new TextDecoder('windows-1252');
  const utf16 = new TextDecoder('utf-16le');
  // SST con CONTINUE
  const sst = [];
  const sheetOffsets = [];
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (r.type === 0x0085) sheetOffsets.push({ pos: dv.getUint32(r.off, true), kind: wb[r.off + 5] });
    if (r.type === 0x00fc) {
      const chunks = [wb.subarray(r.off, r.off + r.len)];
      let j = i + 1;
      while (j < recs.length && recs[j].type === 0x003c) { chunks.push(wb.subarray(recs[j].off, recs[j].off + recs[j].len)); j++; }
      let ci = 0, p = 8;
      const total = new DataView(chunks[0].buffer, chunks[0].byteOffset).getUint32(4, true);
      const need = n => { if (p + n > chunks[ci].length && p >= chunks[ci].length) { ci++; p = 0; } };
      const u8at = () => { need(1); return chunks[ci][p++]; };
      const u16 = () => { const a = u8at(), b = u8at(); return a | (b << 8); };
      const u32 = () => (u16() | (u16() << 16)) >>> 0;
      const skip = n => { while (n > 0) { if (p >= chunks[ci].length) { ci++; p = 0; } const take = Math.min(n, chunks[ci].length - p); p += take; n -= take; } };
      for (let k = 0; k < total && ci < chunks.length; k++) {
        const cch = u16();
        let flags = u8at();
        const rich = flags & 8 ? u16() : 0;
        const ext = flags & 4 ? u32() : 0;
        let s = '', left = cch;
        while (left > 0) {
          if (p >= chunks[ci].length) { ci++; p = 0; flags = chunks[ci][p++]; }
          const wide = flags & 1;
          const avail = Math.floor((chunks[ci].length - p) / (wide ? 2 : 1));
          const take = Math.min(left, avail);
          const bytes = chunks[ci].subarray(p, p + take * (wide ? 2 : 1));
          s += wide ? utf16.decode(bytes) : latin.decode(bytes);
          p += bytes.length; left -= take;
        }
        skip(rich * 4 + ext);
        sst.push(s);
      }
      i = j - 1;
    }
  }
  const ws = sheetOffsets.find(s => s.kind === 0) || sheetOffsets[0];
  let startIdx = ws ? recs.findIndex(r => r.pos === ws.pos) : -1;
  if (startIdx < 0) startIdx = recs.findIndex((r, k) => k > 0 && r.type === 0x0809);
  const rows = [];
  const set = (r, c, v) => { (rows[r] || (rows[r] = []))[c] = v; };
  let pendingFormula = null;
  for (let i = startIdx + 1; i < recs.length; i++) {
    const { type, off, len } = recs[i];
    if (type === 0x000a) break;
    if (type === 0x0809) break;
    const row = () => dv.getUint16(off, true), col = () => dv.getUint16(off + 2, true);
    switch (type) {
      case 0x00fd: set(row(), col(), sst[dv.getUint32(off + 6, true)]); break;
      case 0x0203: set(row(), col(), dv.getFloat64(off + 6, true)); break;
      case 0x027e: set(row(), col(), rkToNumber(dv.getInt32(off + 6, true))); break;
      case 0x00bd: {
        const r = row(), c1 = col(), n = (len - 6) / 6;
        for (let k = 0; k < n; k++) set(r, c1 + k, rkToNumber(dv.getInt32(off + 4 + k * 6 + 2, true)));
        break;
      }
      case 0x0204: case 0x00d6: {
        const cch = dv.getUint16(off + 6, true);
        const flags = wb[off + 8];
        const bytes = flags & 1 ? wb.subarray(off + 9, off + 9 + cch * 2) : wb.subarray(off + 9, off + 9 + cch);
        set(row(), col(), flags & 1 ? utf16.decode(bytes) : latin.decode(bytes));
        break;
      }
      case 0x0205: if (wb[off + 7] === 0) set(row(), col(), !!wb[off + 6]); break;
      case 0x0006: {
        const r = row(), c = col();
        if (dv.getUint16(off + 12, true) === 0xffff) {
          if (wb[off + 6] === 0) pendingFormula = [r, c];
          else if (wb[off + 6] === 1) set(r, c, !!wb[off + 8]);
        } else set(r, c, dv.getFloat64(off + 6, true));
        break;
      }
      case 0x0207: if (pendingFormula) {
        const cch = dv.getUint16(off, true), flags = wb[off + 2];
        const bytes = flags & 1 ? wb.subarray(off + 3, off + 3 + cch * 2) : wb.subarray(off + 3, off + 3 + cch);
        set(pendingFormula[0], pendingFormula[1], flags & 1 ? utf16.decode(bytes) : latin.decode(bytes));
        pendingFormula = null;
      } break;
    }
  }
  return normalize(rows);
}

function normalize(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const row = [];
    for (let j = 0; j < r.length; j++) row[j] = r[j] === undefined ? null : r[j];
    out.push(row);
  }
  return out;
}

/* ---------------- Entrada única ---------------- */
export async function readSpreadsheet(name, buf) {
  const u8 = new Uint8Array(buf.slice(0, 8));
  if (u8[0] === 0x50 && u8[1] === 0x4b) return parseXLSX(buf);
  if (u8[0] === 0xd0 && u8[1] === 0xcf) return parseXLS(buf);
  // HTML disfrazado de .xls (algunas extranets lo hacen)
  let text = new TextDecoder('utf-8').decode(buf);
  if (/^\s*<(!doctype|html|table)/i.test(text)) return parseHTMLTable(text);
  if (text.includes('\ufffd')) text = new TextDecoder('windows-1252').decode(buf);
  return parseCSV(text);
}

function parseHTMLTable(html) {
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const cells = [];
    const tdRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let c;
    while ((c = tdRe.exec(m[1]))) cells.push(xmlUnescape(c[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()));
    rows.push(cells);
  }
  return rows;
}
