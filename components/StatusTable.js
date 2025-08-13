import { useState } from 'react';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
} from 'react-icons/fa';

// Design Tokens wie in Dashboard
const tokens = {
  colors: {
    text: '#111111',
    muted: '#6b7280',
    border: '#e5e7eb',
    rowAlt: '#f9fafb',
    headerBg: '#f3f4f6',
    dangerBg: '#fef2f2',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#f59e0b',
    red: '#dc2626',
  },
  radius: 8,
  shadow: '0 1px 2px rgba(0,0,0,0.04)',
};

export default function StatusTable({ data }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const styles = {
    wrapper: { overflowX: 'auto' },
    table: {
      minWidth: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0,
      backgroundColor: '#ffffff',
      boxShadow: tokens.shadow,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius,
    },
    theadTr: {
      backgroundColor: tokens.colors.headerBg,
      textAlign: 'left',
    },
    th: {
      padding: 8,
      borderBottom: `1px solid ${tokens.colors.border}`,
      fontWeight: 600,
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
    rowDanger: {
      backgroundColor: '#fee2e2', // ähnlich bg-red-50
    },
    detailsCell: {
      padding: 16,
      backgroundColor: tokens.colors.rowAlt,
      borderTop: `1px solid ${tokens.colors.border}`,
    },
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
    warnWrap: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: tokens.colors.yellow,
    },
    ok: { color: tokens.colors.green, display: 'inline' },
    bad: { color: tokens.colors.red, display: 'inline' },
    blueText: { color: tokens.colors.blue, fontWeight: 600 },
    code: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      color: tokens.colors.muted,
      marginTop: 4,
    },
  };

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
          {data.map((row, index) => {
            const istPflicht = !!row.erforderlich;
            const vorhanden = !!row.vorhanden;
            const mindestanzahlOk = !!row.mindestanzahl_erfüllt || !!row.mindestanzahl_erfuellt; // robust gegen Umlaut/Variante
            const tiefergehend = !!row.tiefergehende_pruefung;

            return (
              <FragmentRow
                key={`${row.kunde_id || 'k'}-${row.dokumenttyp_id || index}-${index}`}
                row={row}
                index={index}
                istPflicht={istPflicht}
                vorhanden={vorhanden}
                mindestanzahlOk={mindestanzahlOk}
                tiefergehend={tiefergehend}
                expanded={!!expandedRows[index]}
                onToggle={() => toggleRow(index)}
                styles={styles}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  row,
  index,
  istPflicht,
  vorhanden,
  mindestanzahlOk,
  tiefergehend,
  expanded,
  onToggle,
  styles,
}) {
  return (
    <>
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
          {row.mindestanzahl ? (
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
            <button onClick={onToggle} style={styles.btnLink}>
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
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Case-Typ:</strong> {row.case_typ}
                </p>
              )}
              {row.case_status && (
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Status:</strong> {row.case_status}
                </p>
              )}
              {row.deep_summary && (
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Übersicht:</strong>{' '}
                  {`passed: ${row.deep_summary.passed || 0}, offen: ${row.deep_summary.offen || 0}, failed: ${row.deep_summary.failed || 0}`}
                </p>
              )}
              {row.case_details && (
                <>
                  <p style={{ margin: '0 0 4px 0' }}>
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
    </>
  );
}
