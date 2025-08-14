// components/StatusOverview.js
import { useEffect, useMemo, useState } from 'react';

export default function StatusOverview({ rows, onOpenDetail }) {
  // Aggregation je (kunde_id + kundenrolle)
  const grouped = useMemo(() => {
    const acc = {};
    for (const r of rows) {
      const key = `${r.kunde_id}::${r.kundenrolle || ''}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          kunde_id: r.kunde_id,
          kunde_name: r.kunde_name,
          kundenrolle: r.kundenrolle,
          reqTotal: 0, reqOk: 0,
          minTotal: 0, minOk: 0,
          deepTotal: 0, deepOk: 0, deepFailed: 0,
          anyUpload: false,
          last: r.letztes_update || r.erkannt_am || null,
        };
      }
      const g = acc[key];
      if (r.erforderlich) { g.reqTotal++; if (r.vorhanden) g.reqOk++; }
      if (r.mindestanzahl != null) { g.minTotal++; if (r.mindestanzahl_erfüllt || r.mindestanzahl_erfuellt) g.minOk++; }
      if (r.tiefergehende_pruefung) {
        g.deepTotal++;
        const s = String(r.case_status || '').toLowerCase();
        if (s === 'passed') g.deepOk++;
        if (s === 'failed') g.deepFailed++;
      }
      if (r.file_url) g.anyUpload = true;
      if (r.erkannt_am && (!g.last || new Date(r.erkannt_am) > new Date(g.last))) g.last = r.erkannt_am;
    }
    return Object.values(acc);
  }, [rows]);

  // Fortschritt & Basis-Status
  const calcProgressStatus = (g) => {
    const w = { req: 0.6, min: 0.25, deep: 0.15 };
    const active = ['req', 'min', 'deep'].filter(k => (k === 'req' ? g.reqTotal : k === 'min' ? g.minTotal : g.deepTotal));
    const sum = active.reduce((a, k) => a + w[k], 0) || 1;
    const part = (ok, total, k) => (total ? (ok / total) * (w[k] / sum) : 0);
    const progress = Math.round(100 * (part(g.reqOk, g.reqTotal, 'req') + part(g.minOk, g.minTotal, 'min') + part(g.deepOk, g.deepTotal, 'deep')));
    let status = 'Wartet auf Upload';
    if (g.deepFailed > 0) status = 'Fehlgeschlagen';
    else if (progress === 100) status = 'Abgeschlossen';
    else if (g.anyUpload) status = 'In Bearbeitung';
    return { progress, status };
  };

  // ----- LocalStorage: Ausblenden & Manuell abgeschlossen -----
  const LS_HIDE = 'report_hidden_v1';
  const LS_MANUAL_DONE = 'report_manual_done_v1';

  const [hidden, setHidden] = useState({});
  const [manualDone, setManualDone] = useState({});
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    try {
      const h = localStorage.getItem(LS_HIDE);
      if (h) setHidden(JSON.parse(h));
      const m = localStorage.getItem(LS_MANUAL_DONE);
      if (m) setManualDone(JSON.parse(m));
    } catch {}
  }, []);

  const persist = (key, obj) => {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  };
  const hide = (key) => { const n = { ...hidden, [key]: true }; setHidden(n); persist(LS_HIDE, n); };
  const unhide = (key) => { const n = { ...hidden }; delete n[key]; setHidden(n); persist(LS_HIDE, n); };

  const markDone = (key) => { const n = { ...manualDone, [key]: { at: Date.now() } }; setManualDone(n); persist(LS_MANUAL_DONE, n); };
  const undoDone = (key) => { const n = { ...manualDone }; delete n[key]; setManualDone(n); persist(LS_MANUAL_DONE, n); };

  // Enriched Summaries + manuell überschreiben
  const summaries = useMemo(() => {
    return grouped.map((g) => {
      const { progress, status } = calcProgressStatus(g);
      const isManual = !!manualDone[g.key];
      return {
        ...g,
        progress,
        status: isManual ? 'Manuell abgeschlossen' : status,
        manualDone: isManual,
        manualAt: manualDone[g.key]?.at || null,
      };
    });
  }, [grouped, manualDone]);

  // ----- Suche/Sort/Filter -----
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_desc'); // name_asc | progress_desc | last_desc
  const [statusFilter, setStatusFilter] = useState('all'); // all | offen | bearbeitung | fertig | fehl | manuell

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = summaries.filter(s => {
      if (!showHidden && hidden[s.key]) return false;
      if (q) {
        const str = `${s.kunde_name} ${s.kundenrolle || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'offen' && s.status !== 'Wartet auf Upload') return false;
        if (statusFilter === 'bearbeitung' && s.status !== 'In Bearbeitung') return false;
        if (statusFilter === 'fertig' && s.status !== 'Abgeschlossen') return false;
        if (statusFilter === 'fehl' && s.status !== 'Fehlgeschlagen') return false;
        if (statusFilter === 'manuell' && s.status !== 'Manuell abgeschlossen') return false;
      }
      return true;
    });

    arr.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return (a.kunde_name || '').localeCompare(b.kunde_name || '');
        case 'progress_desc': return b.progress - a.progress;
        case 'last_desc':
        default:
          return new Date(b.last || 0) - new Date(a.last || 0);
      }
    });
    return arr;
  }, [summaries, search, sortBy, statusFilter, showHidden, hidden]);

  // ----- Styles -----
  const card = {
    controls: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
    input: {
      padding: '8px 10px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      minWidth: 220,
      backgroundColor: '#fff',
      color: '#111',
      fontSize: 14,
      outline: 'none',
    },
    select: {
      padding: '8px 10px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      backgroundColor: '#fff',
      color: '#111',
      fontSize: 14,
      lineHeight: '20px',
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      outline: 'none',
      cursor: 'pointer',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 220px) 1fr 180px 150px 220px',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
    },
    header: { fontWeight: 700, color: '#111' },
    sub: { color: '#6b7280', fontSize: 12, marginLeft: 6 },
    barWrap: { height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
    bar: (p) => ({ width: `${p}%`, height: '100%', background: '#2d9cdb' }),
    pill: (bg, fg) => ({ padding: '4px 10px', borderRadius: 999, background: bg, color: fg, fontWeight: 700, fontSize: 12, textAlign: 'center' }),
    btnLink: { color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 12 },
    meta: { color: '#111', fontSize: 14, fontWeight: 400 },
  };
  const pillFor = (status, manual) => {
    if (manual) return card.pill('#e5e7eb', '#374151'); // neutral: „Manuell abgeschlossen“
    switch (status) {
      case 'Abgeschlossen': return card.pill('#dcfce7', '#16a34a');
      case 'Fehlgeschlagen': return card.pill('#fee2e2', '#dc2626');
      case 'In Bearbeitung': return card.pill('#fef3c7', '#f59e0b');
      default: return card.pill('#dbeafe', '#2563eb');
    }
  };

  return (
    <div>
      <div style={card.controls}>
        <input
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={card.input}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={card.select}>
          <option value="all">Alle Status</option>
          <option value="offen">Wartet auf Upload</option>
          <option value="bearbeitung">In Bearbeitung</option>
          <option value="fertig">Abgeschlossen</option>
          <option value="fehl">Fehlgeschlagen</option>
          <option value="manuell">Manuell abgeschlossen</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={card.select}>
          <option value="last_desc">Neueste zuerst</option>
          <option value="progress_desc">Fortschritt absteigend</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <label
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
        >
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            style={{ width: 16, height: 16, margin: 0, cursor: 'pointer', accentColor: '#2563eb' }}
          />
          <span style={{ fontSize: 14, lineHeight: '20px', color: '#111' }}>Ausgeblendete anzeigen</span>
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {/* Kopfzeile */}
        <div style={{ ...card.row, background: '#f9fafb' }}>
          <div style={card.header}>Kunde</div>
          <div style={card.header}>Rolle</div>
          <div style={card.header}>Fortschritt</div>
          <div style={card.header}>Status</div>
          <div style={card.header}>Letztes Update</div>
          <div style={card.header}></div>
        </div>

        {filtered.map((s) => (
          <div key={s.key} style={card.row}>
            <div>
              <span style={{ fontWeight: 700, color: '#111' }}>{s.kunde_name}</span>
            </div>

            <div style={card.meta}>
              {s.kundenrolle || '—'}
            </div>

            <div>
              <div style={card.barWrap}><div style={card.bar(s.progress)} /></div>
              <div style={card.sub}>
                Fortschritt {s.progress}% • Pflicht {s.reqOk}/{s.reqTotal}
                {s.minTotal > 0 ? ` • Mindest ${s.minOk}/${s.minTotal}` : ''}
                {s.deepTotal > 0 ? ` • Deep ${s.deepOk}/${s.deepTotal}` : ''}
              </div>
            </div>

            <div>
              <span style={pillFor(s.status, s.manualDone)}>{s.status}</span>
              {s.manualDone && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                  gesetzt am {new Date(s.manualAt).toLocaleString('de-DE')}
                </div>
              )}
            </div>

            <div style={card.meta}>
              {s.last ? new Date(s.last).toLocaleString('de-DE') : '—'}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={card.btnLink} onClick={() => onOpenDetail(s)}>Öffnen</button>

              {!s.manualDone ? (
                <button style={card.btnLink} onClick={() => markDone(s.key)}>Als abgeschlossen markieren</button>
              ) : (
                <button style={card.btnLink} onClick={() => undoDone(s.key)}>Manuell-Status entfernen</button>
              )}

              {!hidden[s.key] ? (
                <button style={card.btnLink} onClick={() => hide(s.key)}>Ausblenden</button>
              ) : (
                <button style={card.btnLink} onClick={() => unhide(s.key)}>Einblenden</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
