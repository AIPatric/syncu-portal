// pages/Dashboard.js
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { FaFileAlt, FaUserCheck, FaBuilding } from 'react-icons/fa';

import UploadForm from '../components/UploadForm';
import StatusTable from '../components/StatusTable';
import StatusOverview from '../components/StatusOverview';

const tokens = {
  colors: {
    text: '#111111',
    textMuted: '#6b7280',
    bgPage: '#f2f2f2',
    bgCard: '#ffffff',
    bgTabs: '#e5e7eb',
    tabIdle: '#d1d5db',
    primary: '#2d9cdb',
    primaryHover: '#5cb682',
    border: '#e5e7eb',
    green: '#16a34a',
    red: '#dc2626',
  },
  shadow: '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
  radius: 12,
  radiusSm: 8,
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState(null);
  const [subType, setSubType] = useState(null);

  // Statusdaten
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  const resetSelection = () => {
    setSelectedService(null);
    setSubType(null);
  };

  useEffect(() => {
    if (activeTab !== 'history') return;
    setLoading(true);
    fetch('/api/dokumentenstatus')
      .then((r) => r.json())
      .then((data) => {
        setStatusData(Array.isArray(data) ? data : []);
        setActiveReport(null);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  const getRolleName = (type, sub) => {
    if (type === 'objektunterlagen') return 'Verkäufer';
    if (type === 'bonitaet' && sub) {
      if (sub === 'angestellter') return 'Käufer (angestellt)';
      if (sub === 'selbstaendiger') return 'Käufer (selbstständig)';
    }
    return '';
  };

  // --- Rows des aktuell geöffneten Reports (Detail) ---
  const filteredRows = useMemo(() => {
    if (!activeReport) return statusData;
    return statusData.filter(
      (r) =>
        String(r.kunde_id) === String(activeReport.kunde_id) &&
        String(r.kundenrolle || '') === String(activeReport.kundenrolle || '')
    );
  }, [statusData, activeReport]);

  // --- Netto-Abgleich (robuste Extraktion) ---
  const nettoInfo = useMemo(() => {
    if (!activeReport) return null;

    const isGehalts = (r) => {
      const a = String(r?.dokument_name || '').toLowerCase();
      const b = String(r?.anzeige_name || '').toLowerCase();
      return a.includes('gehalts') || b.includes('gehalts');
    };

    // erweitert: erkennt auch "Antrag"
    const isSelbstauskunftByName = (r) => {
      const a = String(r?.dokument_name || '').toLowerCase();
      const b = String(r?.anzeige_name || '').toLowerCase();
      return (
        a.includes('selbstauskunft') ||
        b.includes('selbstauskunft') ||
        b.includes('selbst auskunft') ||
        b.includes('selbst-auskunft') ||
        a.includes('antrag') ||
        b.includes('antrag')
      );
    };

    // erkennt Selbstauskunft über case_typ / case_details
    const isSelbstauskunftByCase = (r) => {
      const t = String(r?.case_typ || '').toLowerCase();
      let d = r?.case_details;
      try {
        d = typeof d === 'string' ? d.toLowerCase() : JSON.stringify(d || {}).toLowerCase();
      } catch {
        d = '';
      }
      return (
        t.includes('selbstauskunft') ||
        t.includes('self') ||
        t.includes('antrag') ||
        d.includes('selbstauskunft') ||
        d.includes('self_report') ||
        d.includes('angegebenes_netto') ||
        d.includes('net_income') ||
        d.includes('monthly_net')
      );
    };

    const collectNumbers = (row) => {
      const candidates = [
        row.netto,
        row.netto_betrag,
        row.netto_monat,
        row.extracted_netto,
        row.angegebenes_netto,
        row.anzeige_name,
        row.original_name,
      ];

      if (row.case_details != null) {
        let cd = row.case_details;
        if (typeof cd === 'string') {
          try {
            cd = JSON.parse(cd);
          } catch {}
        }
        if (cd && typeof cd === 'object') {
          [
            'netto',
            'betrag',
            'amount',
            'summary',
            'value',
            'angegebenes_netto',
            'lowest_netto',
            'min_netto',
            'monthly_net',
            'net_income',
          ].forEach((k) => candidates.push(cd[k]));
          candidates.push(JSON.stringify(cd));
        } else {
          candidates.push(row.case_details);
        }
      }

      const parseNums = (v) => {
        if (v == null) return [];
        if (typeof v === 'number' && isFinite(v)) return [v];
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        if (!s) return [];
        const m = s.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:\.\d{2})/g);
        if (!m) return [];
        return m
          .map((x) => parseFloat(x.replace(/\./g, '').replace(',', '.')))
          .filter((n) => isFinite(n));
      };

      const plausible = [];
      for (const c of candidates) plausible.push(...parseNums(c));
      // plausibler Monats-Netto-Korridor, um Datums- oder Aktennummern zu filtern
      return plausible.filter((n) => n >= 500 && n <= 50000);
    };

    let lowest = null;
    let selfRep = null;

    for (const r of filteredRows) {
      if (isGehalts(r)) {
        const nums = collectNumbers(r);
        for (const n of nums) lowest = lowest == null ? n : Math.min(lowest, n);
      }

      if (isSelbstauskunftByName(r) || isSelbstauskunftByCase(r)) {
        const nums = collectNumbers(r);
        if (nums.length) selfRep = Math.max(...nums);
      }
    }

    // Fallback: falls noch keine Selbstauskunft gefunden wurde
    if (selfRep == null) {
      for (const r of filteredRows) {
        if (isGehalts(r)) continue;
        if (!isSelbstauskunftByCase(r)) continue;
        const nums = collectNumbers(r);
        if (nums.length) {
          selfRep = Math.max(...nums);
          break;
        }
      }
    }

    const bestanden = lowest != null && selfRep != null && lowest >= selfRep;
    const diff = lowest != null && selfRep != null ? lowest - selfRep : null; // positiv = bestanden
    return { lowest, selfRep, diff, bestanden };
  }, [activeReport, filteredRows]);

  const styles = {
    page: { minHeight: '100vh', backgroundColor: tokens.colors.bgPage },
    header: { backgroundColor: tokens.colors.bgCard, borderBottom: `1px solid ${tokens.colors.border}`, boxShadow: tokens.shadow },
    headerInner: { maxWidth: 1152, margin: '0 auto', padding: '24px 16px', display: 'flex', alignItems: 'center', gap: 16 },
    title: { fontSize: 24, fontWeight: 700, color: tokens.colors.text, margin: 0 },
    subtitle: { color: tokens.colors.textMuted, margin: 0 },
    container: { maxWidth: 1152, margin: '0 auto', padding: '24px 16px' },

    tabs: { display: 'flex', gap: 8, marginBottom: 24, backgroundColor: tokens.colors.bgTabs, padding: 4, borderRadius: tokens.radiusSm },
    tabBtn: (active) => ({
      flex: 1,
      textAlign: 'center',
      padding: '10px 12px',
      borderRadius: tokens.radiusSm,
      fontWeight: 600,
      transition: 'background-color 120ms ease, color 120ms ease',
      backgroundColor: active ? tokens.colors.bgCard : tokens.colors.tabIdle,
      color: active ? tokens.colors.text : '#444',
      border: 'none',
      cursor: 'pointer',
    }),

    cardGrid: { display: 'flex', flexWrap: 'wrap', gap: 24 },
    card: {
      backgroundColor: tokens.colors.bgCard,
      padding: 24,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
      cursor: 'pointer',
      flex: '1 1 320px',
      maxWidth: 'calc(50% - 12px)',
      transition: 'transform 120ms ease, box-shadow 120ms ease',
    },
    cardHover: { transform: 'translateY(-1px)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 600, color: tokens.colors.text, margin: 0 },
    cardText: { fontSize: 14, color: tokens.colors.textMuted, margin: '0 0 16px 0' },
    primaryBtn: {
      backgroundColor: tokens.colors.primary,
      color: '#fff',
      fontWeight: 600,
      padding: '10px 16px',
      borderRadius: tokens.radiusSm,
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 120ms ease',
    },

    panel: { backgroundColor: tokens.colors.bgCard, padding: 24, borderRadius: tokens.radius, boxShadow: tokens.shadow },
    panelHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    panelTitle: { fontSize: 18, fontWeight: 700, color: tokens.colors.text, margin: 0 },
    linkBtn: { fontSize: 14, color: tokens.colors.primary, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
    statusWrap: { backgroundColor: tokens.colors.bgCard, padding: 24, borderRadius: tokens.radius },

    nettoBox: { border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radiusSm, padding: 16, background: '#f9fafb', marginBottom: 16 },
    nettoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'stretch' },
    nettoCell: { background: '#fff', border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radiusSm, padding: 12 },
    nettoLabel: { margin: 0, color: tokens.colors.textMuted, fontSize: 12 },
    nettoValue: { margin: 0, color: tokens.colors.text, fontWeight: 700, fontSize: 18 },
    nettoBadge: (ok) => ({
      justifySelf: 'end',
      alignSelf: 'start',
      padding: '4px 10px',
      borderRadius: 999,
      background: ok ? '#dcfce7' : '#fee2e2',
      color: ok ? tokens.colors.green : tokens.colors.red,
      fontWeight: 700,
      fontSize: 12,
    }),
  };

  const [hoverCard, setHoverCard] = useState(null);

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/logo_mikaeli.svg" alt="Kundenlogo" width={140} height={140} style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={styles.title}>Willkommen auf Ihrem Dashboard</h1>
            <p style={styles.subtitle}>Mikaeli Immobilien-Finanzierung GbR</p>
          </div>
        </div>
      </header>

      <div style={styles.container}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button onClick={() => { setActiveTab('services'); resetSelection(); }} style={styles.tabBtn(activeTab === 'services')}>Prüfungen</button>
          <button onClick={() => { setActiveTab('history'); resetSelection(); }} style={styles.tabBtn(activeTab === 'history')}>Status</button>
        </div>

        {/* Auswahlkarten */}
        {activeTab === 'services' && !selectedService && (
          <div style={styles.cardGrid}>
            <div
              style={{ ...styles.card, ...(hoverCard === 'objekt' ? styles.cardHover : {}) }}
              onMouseEnter={() => setHoverCard('objekt')}
              onMouseLeave={() => setHoverCard(null)}
              onClick={() => setSelectedService('objektunterlagen')}
            >
              <div style={styles.cardHeader}>
                <FaFileAlt style={{ color: '#2563eb', fontSize: 20 }} />
                <h2 style={styles.cardTitle}>Objektunterlagen prüfen</h2>
              </div>
              <p style={styles.cardText}>Lassen Sie Ihre Objektunterlagen professionell prüfen und bewerten.</p>
              <button
                style={styles.primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primary)}
              >
                Auswählen
              </button>
            </div>

            <div
              style={{ ...styles.card, ...(hoverCard === 'bonitaet' ? styles.cardHover : {}) }}
              onMouseEnter={() => setHoverCard('bonitaet')}
              onMouseLeave={() => setHoverCard(null)}
              onClick={() => setSelectedService('bonitaet')}
            >
              <div style={styles.cardHeader}>
                <FaUserCheck style={{ color: '#16a34a', fontSize: 20 }} />
                <h2 style={styles.cardTitle}>Bonitätsprüfung</h2>
              </div>
              <p style={styles.cardText}>Führen Sie eine umfassende Bonitätsprüfung durch.</p>
              <button
                style={styles.primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primary)}
              >
                Auswählen
              </button>
            </div>
          </div>
        )}

        {/* SubType Auswahl */}
        {selectedService === 'bonitaet' && !subType && (
          <div style={styles.panel}>
            <div style={styles.panelHeaderRow}>
              <h2 style={styles.panelTitle}>Berufsgruppe wählen</h2>
              <button onClick={resetSelection} style={styles.linkBtn}>Zurück</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div
                style={{ border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radiusSm, padding: 16, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => setSubType('angestellter')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FaBuilding style={{ color: '#2563eb' }} />
                  <p style={{ fontWeight: 600, color: tokens.colors.text, margin: 0 }}>Angestellter</p>
                </div>
                <p style={{ fontSize: 14, color: tokens.colors.textMuted, margin: 0 }}>
                  Festes Anstellungsverhältnis (z. B. Gehaltsabrechnung)
                </p>
              </div>

              <div
                style={{ border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radiusSm, padding: 16, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => setSubType('selbstaendiger')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FaUserCheck style={{ color: '#16a34a' }} />
                  <p style={{ fontWeight: 600, color: tokens.colors.text, margin: 0 }}>Selbständiger</p>
                </div>
                <p style={{ fontSize: 14, color: tokens.colors.textMuted, margin: 0 }}>
                  Freiberuflich oder gewerblich tätig (z. B. BWA, EÜR)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Uploadformular */}
        {(selectedService === 'objektunterlagen' || (selectedService === 'bonitaet' && subType)) && (
          <div style={{ ...styles.panel, marginTop: 24 }}>
            <div style={styles.panelHeaderRow}>
              <h2 style={styles.panelTitle}>
                {selectedService === 'objektunterlagen' ? 'Objektunterlagen hochladen' : `Bonitätsprüfung – ${subType}`}
              </h2>
              <button onClick={resetSelection} style={styles.linkBtn}>Zurück zur Auswahl</button>
            </div>
            <UploadForm mode={selectedService} rolleName={getRolleName(selectedService, subType)} />
          </div>
        )}

        {/* Status-Tab */}
        {activeTab === 'history' && (
          <div style={styles.statusWrap}>
            {loading ? (
              <p>Lade Daten...</p>
            ) : !activeReport ? (
              <StatusOverview rows={statusData} onOpenDetail={(summary) => setActiveReport(summary)} />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={styles.panelTitle}>
                    {activeReport.kunde_name} — {activeReport.kundenrolle || '—'}
                  </h2>
                  <button onClick={() => setActiveReport(null)} style={styles.linkBtn}>Zur Übersicht</button>
                </div>

                {/* Netto-Abgleich Box */}
                {nettoInfo && (
                  <div style={styles.nettoBox}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ color: tokens.colors.text }}>Bonität – Netto-Abgleich</strong>
                      <span style={styles.nettoBadge(nettoInfo.bestanden)}>
                        {nettoInfo.bestanden ? 'Abgleich bestanden' : 'Abgleich nicht bestanden'}
                      </span>
                    </div>
                    <div style={styles.nettoGrid}>
                      <div style={styles.nettoCell}>
                        <p style={styles.nettoLabel}>Niedrigstes Netto (Gehaltsnachweise)</p>
                        <p style={styles.nettoValue}>
                          {nettoInfo.lowest != null ? nettoInfo.lowest.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '—'}
                        </p>
                      </div>
                      <div style={styles.nettoCell}>
                        <p style={styles.nettoLabel}>Selbstauskunft (Netto)</p>
                        <p style={styles.nettoValue}>
                          {nettoInfo.selfRep != null ? nettoInfo.selfRep.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '—'}
                        </p>
                      </div>
                      <div style={styles.nettoCell}>
                        <p style={styles.nettoLabel}>Differenz</p>
                        <p style={styles.nettoValue}>
                          {nettoInfo.diff != null ? nettoInfo.diff.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '—'}
                        </p>
                      </div>
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
    </div>
  );
}
