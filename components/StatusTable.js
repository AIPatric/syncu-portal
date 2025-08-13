// components/StatusTable.js
import React, { Fragment, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
} from 'react-icons/fa';

const tokens = {
  colors: {
    text: '#111111',
    muted: '#6b7280',
    border: '#e5e7eb',
    rowAlt: '#f9fafb',
    headerBg: '#f3f4f6',
    dangerBg: '#fee2e2',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#f59e0b',
    red: '#dc2626',
    card: '#ffffff',
    chipOkBg: '#dcfce7',
    chipWarnBg: '#fef3c7',
    chipFailBg: '#fee2e2',
    chipInfoBg: '#dbeafe',
  },
  radius: 8,
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
};

function asNumberLoose(v) {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object') {
    for (const k of ['netto', 'value', 'betrag', 'amount']) {
      if (v && v[k] != null) {
        const n = asNumberLoose(v[k]);
        if (n != null) return n;
      }
    }
  }
  return null;
}

function extractNettoSummary(rows) {
  const isPayslip = (r) =>
    String(r.dokument_name || '').toLowerCase().includes('gehalts') ||
    String(r.anzeige_name || '').toLowerCase().includes('gehalts');

  const payslips = rows.filter(isPayslip);
  const selbstauskunftRow = rows.find((r) =>
    String(r.dokument_name || '').toLowerCase().includes('selbstauskunft')
  ) || null;

  const nettoCase = rows.find(
    (r) => String(r.case_typ || '').toLowerCase() === 'netto_abgleich'
  );
  const angegebenCase = rows.find(
    (r) => String(r.case_typ || '').toLowerCase().includes('angegebenes_netto')
  );

  const minNetto = asNumberLoose(nettoCase?.case_details);
  const selbstauskunftNetto =
    asNumberLoose(angegebenCase?.case_details) ??
    asNumberLoose(selbstauskunftRow?.case_details);

  const minReq = payslips[0]?.mindestanzahl ?? null;
  const have = payslips[0]?.anzahl_vorhanden ?? null;
  const minOk =
    (payslips[0]?.mindestanzahl_erfüllt || payslips[0]?.mindestanzahl_erfuellt) ?? null;

  const abgleichStatus = (nettoCase?.case_status || '').toLowerCase() || null;

  return {
    hasModule: payslips.length > 0 && !!selbstauskunftRow,
    minNetto,
    selbstauskunftNetto,
    minReq,
    have,
    minOk,
    abgleichStatus,
  };
}

function Badge({ kind, children }) {
  const palette = {
    ok: { bg: tokens.colors.chipOkBg, fg: tokens.colors.green },
    warn: { bg: tokens.colors.chipWarnBg, fg: tokens.colors.yellow },
    fail: { bg: tokens.colors.chipFailBg, fg: tokens.colors.red },
    info: { bg: tokens.colors.chipInfoBg, fg: tokens.colors.blue },
  }[kind || 'info'];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

function NettoPanel({ dataSummary }) {
  const { minNetto, selbstauskunftNetto, minReq, have, minOk, abgleichStatus } =
    dataSummary;

  let statusKind = 'info';
  let statusText = 'Unvollständig';
  if (abgleichStatus === 'passed') {
    statusKind = 'ok';
    statusText = 'Abgleich bestanden';
  } else if (abgleichStatus === 'failed') {
    statusKind = 'fail';
    statusText = 'Abgleich fehlgeschlagen';
  } else if (minOk === false) {
    statusKind = 'warn';
    statusText = 'Mindestanzahl nicht erfüllt';
  }

  const hasBoth = minNetto != null && selbstauskunftNetto != null;
  const delta = hasBoth ? Math.round((selbstauskunftNetto - minNetto) * 100) / 100 : null;

  const styles = {
    card: {
      background: tokens.colors.card,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius,
      padding: 16,
      boxShadow: tokens.shadowSm,
      marginBottom: 16,
    },
    head: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: { margin: 0, fontWeight: 700, color: tokens.colors.text, fontSize: 16 },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 12,
      marginTop: 8,
    },
    cell: {
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius,
      padding: 12,
      background: '#fafafa',
    },
    label: { margin: 0, color: tokens.colors.muted, fontSize: 12 },
    value: { margin: 0, color: tokens.colors.text, fontWeight: 700, fontSize: 18 },
    hint: { marginTop: 8, color: tokens.colors.muted, fontSize: 12 },
  };

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <h3 style={styles.title}>Bonität – Netto-Abgleich</h3>
        <Badge kind={statusKind}>{statusText}</Badge>
      </div>

      <div style={styles.row}>
        <div style={styles.cell}>
          <p style={styles.label}>Niedrigstes Netto (Gehaltsnachweise)</p>
          <p style={styles.value}>
            {minNetto != null
              ? `${minNetto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
              : '—'}
          </p>
        </div>
        <div style={styles.cell}>
          <p style={styles.label}>Selbstauskunft (Netto)</p>
          <p style={styles.value}>
            {selbstauskunftNetto != null
              ? `${selbstauskunftNetto.toLocaleString('de-DE', {
                  minimumFractionDigits: 2,
                })} €`
              : '—'}
          </p>
        </div>
        <div style={styles.cell}>
          <p style={styles.label}>Differenz</p>
          <p style={styles.value}>
            {delta != null
              ? `${delta.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
              : '—'}
          </p>
        </div>
      </div>

      {minReq != null && (
        <p style={styles.hint}>
          Mindestanzahl Gehaltsnachweise:{' '}
          {minOk ? (
            <strong style={{ color: tokens.colors.green }}>erfüllt</strong>
          ) : (
            <strong style={{ color: tokens.colors.yellow }}>offen</strong>
          )}{' '}
          ({have ?? 0}/{minReq})
        </p>
      )}
    </div>
  );
}

export default function StatusTable({ data }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (index) =>
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));

  const nettoSummary = useMemo(() => extractNettoSummary(data), [data]);

  const styles = {
    wrapper: { overflowX: 'auto' },
    table: {
      minWidth: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0,
      backgroundColor: '#ffffff',
      boxShadow: tokens.shadowSm,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius,
    },
    theadTr: { backgroundColor: tokens.colors.headerBg, textAlign: 'left' },
    th: {
      padding: 8,
      borderBottom: `1px solid ${tokens.colors.border}`,
      fontWeight: 700,
      fontSize: 14,
      color: tokens.colors.text,
    },
    td: {
      padding: 8,
      borderTop: `1px solid ${tokens.colors.border}`,
      fontSize: 14,
      color: tokens.colors.text,
      verticalAlign: 'top',
    },
    rowDanger: { backgroundColor: tokens.colors.dangerBg },
    detailsCell: {
      padding: 16,
      backgroundColor: tokens.colors.rowAlt,
      borderTop: `1px solid ${tokens.colors.border}`,
      color: tokens.colors.text,
    },
    center: { textAlign: 'center' },
    link: {
      color: tokens.colors.blue,
      textDecoration: 'underline',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    btnLink: {
      color: tokens.colors.blue,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      textDecoration: 'underline',
      padding: 0,
    },
    warnWrap: { display: 'inline-flex', alignItems: 'center', gap: 6, color: tokens.colors.yellow },
    ok: { color: tokens.colors.green, display: 'inline' },
    bad: { color: tokens.colors.red, display: 'inline' },
    blueText: { color: tokens.colors.blue, fontWeight: 700 },
    code: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      color: tokens.colors.muted,
      marginTop: 4,
    },
  };

  return (
    <div>
      {nettoSummary.hasModule && <NettoPanel dataSummary={nettoSummary} />}

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
            {data.map((row, index) => {
              const istPflicht = !!row.erforderlich;
              const vorhanden = !!row.vorhanden;
              const mindestanzahlOk =
                !!row.mindestanzahl_erfüllt || !!row.mindestanzahl_erfuellt;
              const tiefergehend = !!row.tiefergehende_pruefung;
              const expanded = !!expandedRows[index];

              const key = `${row.kunde_id || 'k'}-${row.dokumenttyp_id || index}-${index}`;

              return (
                <Fragment key={key}>
                  <tr style={istPflicht && !vorhanden ? styles.rowDanger : undefined}>
                    <td style={styles.td}>{row.kunde_name}</td>
                    <td style={styles.td}>{row.kundenrolle}</td>
                    <td style={styles.td}>{row.dokument_name}</td>

                    <td style={styles.td}>
                      {istPflicht ? <FaCheckCircle style={styles.ok} /> : <span>-</span>}
                    </td>

                    <td style={styles.td}>
                      {vorhanden ? (
                        <FaCheckCircle style={styles.ok} />
                      ) : (
                        <FaTimesCircle style={styles.bad} />
                      )}
                    </td>

                    <td style={styles.td}>
                      {row.mindestanzahl != null ? (
                        mindestanzahlOk ? (
                          <FaCheckCircle style={styles.ok} />
                        ) : (
                          <span style={styles.warnWrap}>
                            <FaExclamationTriangle />
                            {`${row.anzahl_vorhanden || 0}/${row.mindestanzahl}`}
                          </span>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      {tiefergehend ? <span style={styles.blueText}>Ja</span> : <span>-</span>}
                    </td>

                    <td style={{ ...styles.td, ...styles.center }}>
                      {row.file_url ? (
                        <a
                          href={row.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.link}
                        >
                          <FaDownload />
                          Download
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    <td style={{ ...styles.td, ...styles.center }}>
                      {tiefergehend && (row.case_typ || row.deep_summary) ? (
                        <button onClick={() => toggleRow(index)} style={styles.btnLink}>
                          {expanded ? <FaChevronUp /> : <FaChevronDown />}
                          Details
                        </button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>

                  {expanded && tiefergehend && (row.case_typ || row.deep_summary) && (
                    <tr>
                      <td colSpan={9} style={styles.detailsCell}>
                        <div>
                          {row.case_typ && (
                            <p style={{ margin: '0 0 6px 0', color: tokens.colors.text }}>
                              <strong>Case-Typ:</strong> {row.case_typ}
                            </p>
                          )}
                          {row.case_status && (
                            <p style={{ margin: '0 0 6px 0', color: tokens.colors.text }}>
                              <strong>Status:</strong> {row.case_status}
                            </p>
                          )}
                          {row.deep_summary && (
                            <p style={{ margin: '0 0 6px 0', color: tokens.colors.text }}>
                              <strong>Übersicht:</strong>{' '}
                              {`passed: ${row.deep_summary.passed || 0}, offen: ${
                                row.deep_summary.offen || 0
                              }, failed: ${row.deep_summary.failed || 0}`}
                            </p>
                          )}
                          {row.case_details && (
                            <>
                              <p style={{ margin: '0 0 4px 0', color: tokens.colors.text }}>
                                <strong>Details:</strong>
                              </p>
                              <pre style={styles.code}>
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
    </div>
  );
}
