// components/StatusTable.js
import React, { useMemo, useState, Fragment } from 'react';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
} from 'react-icons/fa';

// -------- Helpers --------
const isGehaltsnachweis = (row) => {
  const a = String(row?.dokument_name || '').toLowerCase();
  const b = String(row?.anzeige_name || '').toLowerCase();
  return a.includes('gehalts') || b.includes('gehalts');
};
const isSelbstauskunft = (row) => {
  const a = String(row?.dokument_name || '').toLowerCase();
  const b = String(row?.anzeige_name || '').toLowerCase();
  return a.includes('selbstauskunft') || b.includes('selbst auskunft') || b.includes('selbst-auskunft');
};

// DSGVO-konformer Download: signierte URL per API holen (120s)
async function signedDownload(raw) {
  const res = await fetch(`/api/get-download-url?raw=${encodeURIComponent(raw)}`);
  const json = await res.json();
  if (json?.url) {
    window.open(json.url, '_blank', 'noopener,noreferrer');
  } else {
    alert('Download nicht möglich.');
  }
}

// -------- Styles --------
const styles = {
  topControls: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' },
  chip: (active) => ({
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? '#2563eb' : '#e5e7eb'}`,
    color: active ? '#2563eb' : '#374151',
    background: active ? '#eff6ff' : '#fff',
    fontSize: 12,
    cursor: 'pointer',
  }),
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
  wrapper: { overflowX: 'auto' },
  table: {
    minWidth: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  theadTr: { backgroundColor: '#f3f4f6', textAlign: 'left' },
  th: { padding: 8, borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 14, color: '#111', cursor: 'pointer', userSelect: 'none' },
  td: { padding: 8, borderTop: '1px solid #e5e7eb', fontSize: 14, color: '#111', verticalAlign: 'top' },
  rowDanger: { backgroundColor: '#fee2e2' },
  center: { textAlign: 'center' },
  linkBtn: { color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'underline', padding: 0 },
  warnWrap: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f59e0b' },
  ok: { color: '#16a34a', display: 'inline' },
  bad: { color: '#dc2626', display: 'inline' },
  blueText: { color: '#2563eb', fontWeight: 700 },
  detailsCell: { padding: 16, backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', color: '#111' },
  subTable: { width: '100%', borderCollapse: 'collapse' },
  subThTd: { padding: 6, border: '1px solid #e5e7eb', fontSize: 14 },
};

// -------- Component --------
export default function StatusTable({ data }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedGehalts, setExpandedGehalts] = useState({});

  // Filter-Chips
  const [filter, setFilter] = useState({
    pflichtOffen: false,
    mindestOffen: false,
    deepFailed: false,
    deepOpen: false,
    withDownload: false,
  });
  const toggle = (k) => setFilter((f) => ({ ...f, [k]: !f[k] }));

  // Sortierung via Header oder Dropdown
  const [sort, setSort] = useState({ key: 'dokument', dir: 'asc' }); // 'dokument' | 'status' | 'datum'
  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const toggleRow = (index) => setExpandedRows((p) => ({ ...p, [index]: !p[index] }));
  const toggleGehaltsRow = (key) => setExpandedGehalts((p) => ({ ...p, [key]: !p[key] }));

  // Gehaltsnachweise gruppieren
  const gehaltsGroups = useMemo(() => {
    const map = {};
    data.forEach((row) => {
      if (!isGehaltsnachweis(row)) return;
      const key = `${row.kunde_id ?? ''}::${row.kundenrolle ?? ''}`;
      if (!map[key]) {
        map[key] = {
          key,
          kunde_id: row.kunde_id,
          kunde_name: row.kunde_name,
          kundenrolle: row.kundenrolle,
          mindestanzahl: Number.isFinite(row?.mindestanzahl) ? row.mindestanzahl : null,
          tiefergehende_pruefung: !!row.tiefergehende_pruefung,
          items: [],
          vorhandenCount: 0,
        };
      }
      map[key].items.push(row);
      if (row.vorhanden) map[key].vorhandenCount += 1;
      if (map[key].mindestanzahl == null && Number.isFinite(row?.mindestanzahl)) {
        map[key].mindestanzahl = row.mindestanzahl;
      }
    });
    return map;
  }, [data]);

  // Render-Sequenz
  const renderList = useMemo(() => {
    const seen = new Set();
    const list = [];
    data.forEach((row, index) => {
      if (isGehaltsnachweis(row)) {
        const key = `${row.kunde_id ?? ''}::${row.kundenrolle ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({ type: 'gehalt', key, group: gehaltsGroups[key], index });
      } else {
        list.push({ type: 'row', row, index });
      }
    });
    return list;
  }, [data, gehaltsGroups]);

  // Filter anwenden
  const filtered = useMemo(() => {
    return renderList.filter((item) => {
      if (item.type === 'gehalt') {
        const g = item.group;
        if (!g) return false;
        const minSet = Number.isFinite(g.mindestanzahl);
        const minOk = minSet ? g.vorhandenCount >= g.mindestanzahl : true;
        if (filter.mindestOffen && !(minSet && !minOk)) return false;
        if (filter.pflichtOffen && g.items.every((it) => !it.erforderlich || it.vorhanden)) return false;
        if (filter.withDownload && g.items.every((it) => !it.file_url)) return false;
        if (filter.deepOpen && g.items.every((it) => !it.tiefergehende_pruefung || it.case_status)) return false;
        if (filter.deepFailed && g.items.every((it) => String(it.case_status || '').toLowerCase() !== 'failed')) return false;
        return true;
      }
      const r = item.row;
      if (filter.pflichtOffen && !(r.erforderlich && !r.vorhanden)) return false;
      if (filter.mindestOffen && !(r.mindestanzahl != null && !(r.mindestanzahl_erfüllt || r.mindestanzahl_erfuellt))) return false;
      if (filter.deepOpen && !(r.tiefergehende_pruefung && !r.case_status)) return false;
      if (filter.deepFailed && !(String(r.case_status || '').toLowerCase() === 'failed')) return false;
      if (filter.withDownload && !r.file_url) return false;
      return true;
    });
  }, [renderList, filter]);

  // Sortierung anwenden
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const pickName = (it) =>
        it.type === 'gehalt' ? 'Gehaltsnachweise' : (it.row?.anzeige_name || it.row?.dokument_name || '');
      const pickStatusWeight = (it) => {
        const r = it.type === 'gehalt' ? null : it.row;
        if (!r) return 99;
        if (r.erforderlich && !r.vorhanden) return 0;
        if (r.mindestanzahl != null && !(r.mindestanzahl_erfüllt || r.mindestanzahl_erfuellt)) return 1;
        if (String(r.case_status || '').toLowerCase() === 'failed') return 2;
        return 3;
      };
      const pickDate = (it) => (it.type === 'gehalt' ? 0 : new Date(it.row?.erkannt_am || 0).getTime());

      if (sort.key === 'dokument') return dir * pickName(a).localeCompare(pickName(b));
      if (sort.key === 'status') return dir * (pickStatusWeight(a) - pickStatusWeight(b));
      if (sort.key === 'datum') return dir * (pickDate(a) - pickDate(b));
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  return (
    <div>
      {/* Filter / Sort Top-Leiste */}
      <div style={styles.topControls}>
        <button style={styles.chip(filter.pflichtOffen)} onClick={() => toggle('pflichtOffen')}>Pflicht offen</button>
        <button style={styles.chip(filter.mindestOffen)} onClick={() => toggle('mindestOffen')}>Mindestanzahl offen</button>
        <button style={styles.chip(filter.deepOpen)} onClick={() => toggle('deepOpen')}>Deep offen</button>
        <button style={styles.chip(filter.deepFailed)} onClick={() => toggle('deepFailed')}>Deep failed</button>
        <button style={styles.chip(filter.withDownload)} onClick={() => toggle('withDownload')}>mit Download</button>

        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>Sortieren nach:</span>
        <select
          value={`${sort.key}_${sort.dir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split('_');
            setSort({ key: k, dir: d });
          }}
          style={styles.select}
        >
          <option value="dokument_asc">Dokument A–Z</option>
          <option value="dokument_desc">Dokument Z–A</option>
          <option value="status_asc">Status ↑</option>
          <option value="status_desc">Status ↓</option>
          <option value="datum_desc">Datum neu → alt</option>
          <option value="datum_asc">Datum alt → neu</option>
        </select>
      </div>

      <div style={styles.wrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadTr}>
              <th style={styles.th} onClick={() => onSort('dokument')}>Kunde</th>
              <th style={styles.th} onClick={() => onSort('dokument')}>Rolle</th>
              <th style={styles.th} onClick={() => onSort('dokument')}>Dokument / Anzeigename</th>
              <th style={styles.th} onClick={() => onSort('status')}>Pflicht</th>
              <th style={styles.th} onClick={() => onSort('status')}>Vorhanden</th>
              <th style={styles.th}>Mindestanzahl</th>
              <th style={styles.th}>Tiefergehende Prüfung</th>
              <th style={styles.th}>Download</th>
              <th style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((item) => {
              // ------- Gehalts-Gruppe -------
              if (item.type === 'gehalt') {
                const g = item.group;
                if (!g) return null;
                const minSet = Number.isFinite(g.mindestanzahl);
                const minOk = minSet ? g.vorhandenCount >= g.mindestanzahl : false;
                const rowIsDanger = minSet && !minOk;

                return (
                  <Fragment key={`gehalt-${item.key}`}>
                    <tr style={rowIsDanger ? styles.rowDanger : undefined}>
                      <td style={styles.td}>{g.kunde_name}</td>
                      <td style={styles.td}>{g.kundenrolle}</td>
                      <td style={styles.td}><strong>Gehaltsnachweise</strong></td>
                      <td style={styles.td}>
                        {g.items.some((it) => !!it.erforderlich) ? <FaCheckCircle style={styles.ok} /> : <span>-</span>}
                      </td>
                      <td style={styles.td}>
                        {g.vorhandenCount > 0 ? <FaCheckCircle style={styles.ok} /> : <FaTimesCircle style={styles.bad} />}
                      </td>
                      <td style={styles.td}>
                        {minSet ? (minOk ? <FaCheckCircle style={styles.ok} /> :
                          <span style={styles.warnWrap}><FaExclamationTriangle />{`${g.vorhandenCount}/${g.mindestanzahl}`}</span>) : <span>-</span>}
                      </td>
                      <td style={styles.td}>{g.tiefergehende_pruefung ? <span style={styles.blueText}>Ja</span> : <span>-</span>}</td>
                      <td style={{ ...styles.td, ...styles.center }}>-</td>
                      <td style={{ ...styles.td, ...styles.center }}>
                        {g.items.length > 0 ? (
                          <button onClick={() => toggleGehaltsRow(g.key)} style={styles.linkBtn}>
                            {expandedGehalts[g.key] ? <FaChevronUp /> : <FaChevronDown />} Details
                          </button>
                        ) : <span>-</span>}
                      </td>
                    </tr>

                    {expandedGehalts[g.key] && (
                      <tr>
                        <td colSpan={9} style={styles.detailsCell}>
                          <table style={styles.subTable}>
                            <thead>
                              <tr>
                                <th style={styles.subThTd}>Anzeigename</th>
                                <th style={styles.subThTd}>Download</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.items.map((doc, i) => (
                                <tr key={`${g.key}-doc-${i}`}>
                                  <td style={styles.subThTd} title={doc.original_name || ''}>
                                    {doc.anzeige_name || doc.original_name || 'Datei'}
                                  </td>
                                  <td style={{ ...styles.subThTd, textAlign: 'center' }}>
                                    {doc.file_url ? (
                                      <button
                                        onClick={() => signedDownload(doc.file_url)}
                                        style={styles.linkBtn}
                                        title="Download"
                                      >
                                        <FaDownload />
                                        Download
                                      </button>
                                    ) : <span>-</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              }

              // ------- Normale Zeilen -------
              const row = item.row;
              const index = item.index;
              const istPflicht = !!row?.erforderlich;
              const vorhanden = !!row?.vorhanden;
              const mindestanzahlOk = !!row?.mindestanzahl_erfüllt || !!row?.mindestanzahl_erfuellt;
              const hatMindest = row?.mindestanzahl != null;
              const tiefergehend = !!row?.tiefergehende_pruefung;

              // Details nur für Nicht-Gehaltsnachweis und Nicht-Selbstauskunft
              const allowDetails = tiefergehend && !!row?.case_typ && !isGehaltsnachweis(row) && !isSelbstauskunft(row);
              const rowKey = `${row?.kunde_id || 'k'}-${row?.dokumenttyp_id || 'dt'}-${index}`;

              return (
                <Fragment key={rowKey}>
                  <tr style={istPflicht && !vorhanden ? styles.rowDanger : undefined}>
                    <td style={styles.td}>{row?.kunde_name}</td>
                    <td style={styles.td}>{row?.kundenrolle}</td>
                    <td style={styles.td}>
                      <div><strong>{row?.dokument_name}</strong></div>
                      {row?.anzeige_name && (
                        <div style={{ color: '#6b7280', fontSize: 12 }} title={row?.original_name || ''}>
                          {row.anzeige_name}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>{istPflicht ? <FaCheckCircle style={styles.ok} /> : <span>-</span>}</td>
                    <td style={styles.td}>{vorhanden ? <FaCheckCircle style={styles.ok} /> : <FaTimesCircle style={styles.bad} />}</td>
                    <td style={styles.td}>
                      {hatMindest ? (
                        mindestanzahlOk ? <FaCheckCircle style={styles.ok} /> :
                          <span style={styles.warnWrap}><FaExclamationTriangle />{`${row?.anzahl_vorhanden || 0}/${row?.mindestanzahl}`}</span>
                      ) : <span>-</span>}
                    </td>
                    <td style={styles.td}>
                      {tiefergehend ? <span style={styles.blueText}>Ja</span> : <span>-</span>}
                          </td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      {row?.file_url ? (
                        <button onClick={() => signedDownload(row.file_url)} style={styles.linkBtn} title="Download">
                          <FaDownload /> Download
                        </button>
                      ) : <span>-</span>}
                    </td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      {allowDetails ? (
                        <button onClick={() => toggleRow(index)} style={styles.linkBtn}>
                          {expandedRows[index] ? <FaChevronUp /> : <FaChevronDown />} Details
                        </button>
                      ) : <span>-</span>}
                    </td>
                  </tr>

                  {expandedRows[index] && allowDetails && (
                    <tr>
                      <td colSpan={9} style={styles.detailsCell}>
                        <div>
                          {row?.case_typ && (
                            <p style={{ margin: '0 0 6px 0' }}><strong>Case-Typ:</strong> {row.case_typ}</p>
                          )}
                          {row?.case_status && (
                            <p style={{ margin: '0 0 6px 0' }}><strong>Status:</strong> {row.case_status}</p>
                          )}
                          {row?.case_details && (
                            <>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Details:</strong></p>
                              <pre
                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, color: '#6b7280', marginTop: 4 }}
                              >
                                {typeof row.case_details === 'string' ? row.case_details : JSON.stringify(row.case_details, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
