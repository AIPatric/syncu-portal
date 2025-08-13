// components/StatusTable.js
import React, { useMemo, useState, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
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

const getDownloadUrl = (fileUrl) => {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const { data } = supabase.storage.from('upload').getPublicUrl(fileUrl);
  return data?.publicUrl || null;
};

// -------- Styles --------
const styles = {
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
  th: {
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 700,
    fontSize: 14,
    color: '#111',
  },
  td: {
    padding: 8,
    borderTop: '1px solid #e5e7eb',
    fontSize: 14,
    color: '#111',
    verticalAlign: 'top',
  },
  rowDanger: { backgroundColor: '#fee2e2' },
  center: { textAlign: 'center' },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnLink: {
    color: '#2563eb',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    textDecoration: 'underline',
    padding: 0,
  },
  warnWrap: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f59e0b' },
  ok: { color: '#16a34a', display: 'inline' },
  bad: { color: '#dc2626', display: 'inline' },
  blueText: { color: '#2563eb', fontWeight: 700 },
  detailsCell: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    color: '#111',
  },
  subTable: { width: '100%', borderCollapse: 'collapse' },
  subThTd: { padding: 6, border: '1px solid #e5e7eb', fontSize: 14 },
};

// -------- Component --------
export default function StatusTable({ data }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedGehalts, setExpandedGehalts] = useState({});

  const toggleRow = (index) =>
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));

  const toggleGehaltsRow = (key) =>
    setExpandedGehalts((prev) => ({ ...prev, [key]: !prev[key] }));

  // Gehaltsnachweise gruppieren nach Kunde + Rolle
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

  // Render-Sequenz: eine Gehalts-Gruppe + alle anderen Zeilen
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

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.theadTr}>
            <th style={styles.th}>Kunde</th>
            <th style={styles.th}>Rolle</th>
            <th style={styles.th}>Dokument</th>
            <th style={styles.th}>Pflicht</th>
            <th style={styles.th}>Vorhanden</th>
            <th style={styles.th}>Mindestanzahl</th>
            <th style={styles.th}>Tiefergehende Prüfung</th>
            <th style={styles.th}>Download</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {renderList.map((item) => {
            // ---- Gehaltsnachweis aggregiert ----
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
                    <td style={styles.td}>Gehaltsnachweise</td>
                    <td style={styles.td}>
                      {g.items.some((it) => !!it.erforderlich) ? (
                        <FaCheckCircle style={styles.ok} />
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {g.vorhandenCount > 0 ? (
                        <FaCheckCircle style={styles.ok} />
                      ) : (
                        <FaTimesCircle style={styles.bad} />
                      )}
                    </td>
                    <td style={styles.td}>
                      {minSet ? (
                        minOk ? (
                          <FaCheckCircle style={styles.ok} />
                        ) : (
                          <span style={styles.warnWrap}>
                            <FaExclamationTriangle />
                            {`${g.vorhandenCount}/${g.mindestanzahl}`}
                          </span>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {g.tiefergehende_pruefung ? <span style={styles.blueText}>Ja</span> : <span>-</span>}
                    </td>
                    <td style={{ ...styles.td, ...styles.center }}>-</td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      {g.items.length > 0 ? (
                        <button onClick={() => toggleGehaltsRow(g.key)} style={styles.btnLink}>
                          {expandedGehalts[g.key] ? <FaChevronUp /> : <FaChevronDown />} Details
                        </button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>

                  {expandedGehalts[g.key] && (
                    <tr>
                      <td colSpan={9} style={styles.detailsCell}>
                        <table style={styles.subTable}>
                          <thead>
                            <tr>
                              <th style={styles.subThTd}>Dateiname</th>
                              <th style={styles.subThTd}>Download</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.items.map((doc, i) => {
                              const url = getDownloadUrl(doc.file_url);
                              return (
                                <tr key={`${g.key}-doc-${i}`}>
                                  <td style={styles.subThTd}>{doc.original_name || doc.anzeige_name || 'Datei'}</td>
                                  <td style={{ ...styles.subThTd, textAlign: 'center' }}>
                                    {url ? (
                                      <a href={url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                        <FaDownload />
                                        Download
                                      </a>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            }

            // ---- Normale Zeilen ----
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
                  <td style={styles.td}>{row?.dokument_name}</td>
                  <td style={styles.td}>{istPflicht ? <FaCheckCircle style={styles.ok} /> : <span>-</span>}</td>
                  <td style={styles.td}>{vorhanden ? <FaCheckCircle style={styles.ok} /> : <FaTimesCircle style={styles.bad} />}</td>
                  <td style={styles.td}>
                    {hatMindest ? (
                      mindestanzahlOk ? (
                        <FaCheckCircle style={styles.ok} />
                      ) : (
                        <span style={styles.warnWrap}>
                          <FaExclamationTriangle />
                          {`${row?.anzahl_vorhanden || 0}/${row?.mindestanzahl}`}
                        </span>
                      )
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td style={styles.td}>{tiefergehend ? <span style={styles.blueText}>Ja</span> : <span>-</span>}</td>
                  <td style={{ ...styles.td, ...styles.center }}>
                    {getDownloadUrl(row?.file_url) ? (
                      <a href={getDownloadUrl(row?.file_url)} target="_blank" rel="noopener noreferrer" style={styles.link}>
                        <FaDownload />
                        Download
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, ...styles.center }}>
                    {allowDetails ? (
                      <button onClick={() => toggleRow(index)} style={styles.btnLink}>
                        {expandedRows[index] ? <FaChevronUp /> : <FaChevronDown />} Details
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>

                {expandedRows[index] && allowDetails && (
                  <tr>
                    <td colSpan={9} style={styles.detailsCell}>
                      <div>
                        {row?.case_typ && (
                          <p style={{ margin: '0 0 6px 0' }}>
                            <strong>Case-Typ:</strong> {row.case_typ}
                          </p>
                        )}
                        {row?.case_status && (
                          <p style={{ margin: '0 0 6px 0' }}>
                            <strong>Status:</strong> {row.case_status}
                          </p>
                        )}
                        {row?.case_details && (
                          <>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>Details:</strong>
                            </p>
                            <pre
                              style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                fontSize: 12,
                                color: '#6b7280',
                                marginTop: 4,
                              }}
                            >
                              {typeof row.case_details === 'string'
                                ? row.case_details
                                : JSON.stringify(row.case_details, null, 2)}
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
  );
}
