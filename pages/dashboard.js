// pages/Dashboard.js
import { useState, useEffect } from 'react';
import StatusOverview from '../components/StatusOverview';
import StatusTable from '../components/StatusTable';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('history');
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState(null);

  useEffect(() => {
    fetch('/api/dokumentenstatus')
      .then((res) => res.json())
      .then((data) => {
        setStatusData(data);
        setLoading(false);
      });
  }, []);

  // Filterdaten für Detailansicht
  const filteredRows = activeReport
    ? statusData.filter(
        (r) =>
          String(r.kunde_id) === String(activeReport.kunde_id) &&
          String(r.kundenrolle || '') === String(activeReport.kundenrolle || '')
      )
    : statusData;

  // Netto-Abgleich-Daten extrahieren
  const extractNettoData = (rows) => {
    let lowestNetto = null;
    let selfReportedNetto = null;

    rows.forEach((row) => {
      if (row.dokument_name.toLowerCase().includes('gehaltsnachweis') && row.case_typ === 'netto_abgleich') {
        const val = parseFloat(row.case_details?.value || row.case_details) || null;
        if (val !== null) {
          if (lowestNetto === null || val < lowestNetto) lowestNetto = val;
        }
      }
      if (row.dokument_name.toLowerCase().includes('selbstauskunft')) {
        const val = parseFloat(row.case_details?.value || row.case_details) || null;
        if (val !== null) selfReportedNetto = val;
      }
    });

    const bestanden = lowestNetto !== null && selfReportedNetto !== null && lowestNetto >= selfReportedNetto;

    return { lowestNetto, selfReportedNetto, bestanden };
  };

  const nettoInfo = activeReport ? extractNettoData(filteredRows) : null;

  const styles = {
    container: { padding: '20px' },
    tabs: { display: 'flex', marginBottom: '20px', gap: '10px' },
    tab: (active) => ({
      padding: '10px 15px',
      cursor: 'pointer',
      backgroundColor: active ? '#2563eb' : '#e5e7eb',
      color: active ? '#fff' : '#000',
      borderRadius: '6px'
    }),
    statusWrap: { background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' },
    panelTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '10px' },
    linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' },
    nettoBox: {
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '20px',
      background: '#f9fafb'
    },
    nettoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
    nettoLabel: { fontWeight: '600' },
    badge: (ok) => ({
      display: 'inline-flex',
      alignItems: 'center',
      color: ok ? '#16a34a' : '#dc2626',
      fontWeight: '600'
    })
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <div style={styles.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          Status
        </div>
        {/* Weitere Tabs */}
      </div>

      {activeTab === 'history' && (
        <div style={styles.statusWrap}>
          {loading ? (
            <p>Lade Daten...</p>
          ) : !activeReport ? (
            <StatusOverview rows={statusData} onOpenDetail={(summary) => setActiveReport(summary)} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={styles.panelTitle}>
                  {activeReport.kunde_name} — {activeReport.kundenrolle || '—'}
                </h2>
                <button onClick={() => setActiveReport(null)} style={styles.linkBtn}>
                  Zur Übersicht
                </button>
              </div>

              {/* Netto-Abgleich Info-Box */}
              {nettoInfo && (
                <div style={styles.nettoBox}>
                  <div style={styles.nettoRow}>
                    <span style={styles.nettoLabel}>Selbstauskunft Netto:</span>
                    <span>{nettoInfo.selfReportedNetto !== null ? nettoInfo.selfReportedNetto.toFixed(2) + ' €' : '-'}</span>
                  </div>
                  <div style={styles.nettoRow}>
                    <span style={styles.nettoLabel}>Niedrigster Gehaltsnachweis Netto:</span>
                    <span>{nettoInfo.lowestNetto !== null ? nettoInfo.lowestNetto.toFixed(2) + ' €' : '-'}</span>
                  </div>
                  <div style={styles.nettoRow}>
                    <span style={styles.nettoLabel}>Abgleich:</span>
                    <span style={styles.badge(nettoInfo.bestanden)}>
                      {nettoInfo.bestanden ? (
                        <>
                          <FaCheckCircle style={{ marginRight: '4px' }} /> Bestanden
                        </>
                      ) : (
                        <>
                          <FaTimesCircle style={{ marginRight: '4px' }} /> Nicht bestanden
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Detail-Tabelle */}
              <StatusTable data={filteredRows} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
