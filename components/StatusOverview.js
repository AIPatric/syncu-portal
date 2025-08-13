import { FaUserCheck, FaFileAlt } from 'react-icons/fa';

const tokens = {
  text: '#111', muted: '#6b7280', border: '#e5e7eb', card: '#fff',
  page: '#f2f2f2', primary: '#2d9cdb', success: '#16a34a',
  warn: '#f59e0b', danger: '#dc2626'
};

function computeProgress(summary) {
  const { reqTotal, reqOk, minTotal, minOk, deepTotal, deepOk } = summary;

  // dynamische Gewichtung: fehlende Kategorien werden auf die übrigen verteilt
  const weights = { req: 0.6, min: 0.25, deep: 0.15 };
  const active = [];
  if (reqTotal > 0) active.push('req');
  if (minTotal > 0) active.push('min');
  if (deepTotal > 0) active.push('deep');
  const sumW = active.reduce((s,k)=>s+weights[k],0) || 1;
  const norm = (k)=>weights[k]/sumW;

  const reqPart = reqTotal ? (reqOk/reqTotal)*norm('req') : 0;
  const minPart = minTotal ? (minOk/minTotal)*norm('min') : 0;
  const deepPart = deepTotal ? (deepOk/deepTotal)*norm('deep') : 0;
  return Math.round((reqPart+minPart+deepPart)*100);
}

function deriveStatus(summary, progress) {
  if (summary.deepFailed > 0) return 'Fehlgeschlagen';
  if (progress === 100) return 'Abgeschlossen';
  if (summary.anyUpload) return 'In Bearbeitung';
  return 'Wartet auf Upload';
}

export default function StatusOverview({ rows, onOpenDetail }) {
  // Gruppieren nach kunde_id + kundenrolle (oder nutze hier report_id, falls vorhanden)
  const grouped = rows.reduce((acc, r) => {
    const key = `${r.kunde_id}::${r.kundenrolle || ''}`;
    acc[key] = acc[key] || {
      kunde_id: r.kunde_id,
      kunde_name: r.kunde_name,
      kundenrolle: r.kundenrolle,
      startedAt: r.letztes_update || r.erkannt_am || r.gestartet_am,
      reqTotal: 0, reqOk: 0,
      minTotal: 0, minOk: 0,
      deepTotal: 0, deepOk: 0, deepFailed: 0,
      anyUpload: false
    };

    const g = acc[key];

    // Pflicht
    if (r.erforderlich) {
      g.reqTotal += 1;
      if (r.vorhanden) g.reqOk += 1;
    }

    // Mindestanzahl
    if (Number.isFinite(r?.mindestanzahl)) {
      g.minTotal += 1;
      if (r.mindestanzahl_erfüllt || r.mindestanzahl_erfuellt) g.minOk += 1;
    }

    // Deep
    if (r.tiefergehende_pruefung) {
      g.deepTotal += 1;
      const cs = (r.case_status || '').toLowerCase();
      if (cs === 'passed') g.deepOk += 1;
      if (cs === 'failed') g.deepFailed += 1;
    }

    // Upload vorhanden?
    if (r.file_url) g.anyUpload = true;

    // zuletzt aktualisiert
    const t = new Date(r.letztes_update || r.erkannt_am || r.gestartet_am || Date.now()).getTime();
    const cur = new Date(g.startedAt || 0).getTime();
    if (t > cur) g.startedAt = new Date(t).toISOString();

    return acc;
  }, {});

  const summaries = Object.values(grouped).map(s => {
    const progress = computeProgress(s);
    const status = deriveStatus(s, progress);
    return { ...s, progress, status };
  });

  const styles = {
    list: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 },
    card: {
      background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: 12,
      padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer'
    },
    row: { display: 'flex', alignItems: 'center', gap: 12 },
    title: { margin: 0, fontWeight: 700, color: tokens.text, fontSize: 16 },
    sub: { margin: 0, color: tokens.muted, fontSize: 13 },
    pill: (colorBg, colorText)=>({
      padding: '4px 10px', borderRadius: 999, background: colorBg, color: colorText,
      fontWeight: 600, fontSize: 12
    }),
    barWrap: { height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
    bar: (p)=>({ width: `${p}%`, height: '100%', background: tokens.primary }),
    meta: { display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: tokens.muted }
  };

  const pillFor = (status) => {
    switch (status) {
      case 'Abgeschlossen': return styles.pill('#dcfce7', tokens.success);
      case 'Fehlgeschlagen': return styles.pill('#fee2e2', tokens.danger);
      case 'In Bearbeitung': return styles.pill('#fef3c7', tokens.warn);
      default: return styles.pill('#dbeafe', '#2563eb');
    }
  };

  return (
    <div style={styles.list}>
      {summaries.map((s, i) => (
        <div key={i} style={styles.card} onClick={() => onOpenDetail(s)}>
          <div style={{ ...styles.row, justifyContent: 'space-between' }}>
            <div style={styles.row}>
              <FaUserCheck style={{ color: '#16a34a' }} />
              <div>
                <p style={styles.title}>{s.kunde_name}</p>
                <p style={styles.sub}>{s.kundenrolle || '—'}</p>
              </div>
            </div>
            <span style={pillFor(s.status)}>{s.status}</span>
          </div>

          <div style={styles.barWrap}><div style={styles.bar(s.progress)} /></div>
          <div style={styles.meta}>
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
