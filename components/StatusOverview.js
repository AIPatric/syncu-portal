// components/StatusOverview.js
import { FaUserCheck } from 'react-icons/fa';

export default function StatusOverview({ rows, onOpenDetail }) {
  // Gruppierung: kunde_id + kundenrolle
  const grouped = rows.reduce((acc, r) => {
    const key = `${r.kunde_id}::${r.kundenrolle || ''}`;
    acc[key] = acc[key] || {
      kunde_id: r.kunde_id,
      kunde_name: r.kunde_name,
      kundenrolle: r.kundenrolle,
      reqTotal: 0, reqOk: 0,
      minTotal: 0, minOk: 0,
      deepTotal: 0, deepOk: 0, deepFailed: 0,
      anyUpload: false,
      letztes_update: r.letztes_update || r.erkannt_am || null,
    };
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
    return acc;
  }, {});

  const computeProgress = (s) => {
    const w = { req: 0.6, min: 0.25, deep: 0.15 };
    const active = [];
    if (s.reqTotal) active.push('req');
    if (s.minTotal) active.push('min');
    if (s.deepTotal) active.push('deep');
    const sum = active.reduce((a, k) => a + w[k], 0) || 1;
    const part = (ok, total, k) => (total ? (ok / total) * (w[k] / sum) : 0);
    return Math.round(100 * (part(s.reqOk, s.reqTotal, 'req') + part(s.minOk, s.minTotal, 'min') + part(s.deepOk, s.deepTotal, 'deep')));
  };

  const deriveStatus = (s, p) => {
    if (s.deepFailed > 0) return 'Fehlgeschlagen';
    if (p === 100) return 'Abgeschlossen';
    if (s.anyUpload) return 'In Bearbeitung';
    return 'Wartet auf Upload';
  };

  const summaries = Object.values(grouped).map((s) => {
    const progress = computeProgress(s);
    const status = deriveStatus(s, progress);
    return { ...s, progress, status };
  });

  const card = {
    base: {
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      cursor: 'pointer',
    },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    left: { display: 'flex', alignItems: 'center', gap: 12 },
    title: { margin: 0, fontWeight: 700, color: '#111', fontSize: 16 },
    sub: { margin: 0, color: '#6b7280', fontSize: 13 },
    pill: (bg, fg) => ({ padding: '4px 10px', borderRadius: 999, background: bg, color: fg, fontWeight: 700, fontSize: 12 }),
    barWrap: { height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
    bar: (p) => ({ width: `${p}%`, height: '100%', background: '#2d9cdb' }),
    meta: { display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#6b7280' },
  };

  const pillFor = (status) => {
    switch (status) {
      case 'Abgeschlossen': return card.pill('#dcfce7', '#16a34a');
      case 'Fehlgeschlagen': return card.pill('#fee2e2', '#dc2626');
      case 'In Bearbeitung': return card.pill('#fef3c7', '#f59e0b');
      default: return card.pill('#dbeafe', '#2563eb');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
      {summaries.map((s, i) => (
        <div key={i} style={card.base} onClick={() => onOpenDetail(s)}>
          <div style={card.row}>
            <div style={card.left}>
              <FaUserCheck style={{ color: '#16a34a' }} />
              <div>
                <p style={card.title}>{s.kunde_name}</p>
                <p style={card.sub}>{s.kundenrolle || '—'}</p>
              </div>
            </div>
            <span style={pillFor(s.status)}>{s.status}</span>
          </div>
          <div style={card.barWrap}><div style={card.bar(s.progress)} /></div>
          <div style={card.meta}>
            <span>Fortschritt {s.progress}%</span>
            <span>
              Pflicht {s.reqOk}/{s.reqTotal}
              {s.minTotal > 0 && ` • Mindest ${s.minOk}/${s.minTotal}`}
              {s.deepTotal > 0 && ` • Deep ${s.deepOk}/${s.deepTotal}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
