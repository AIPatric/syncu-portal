// pages/Dashboard.js
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FaFileAlt, FaUserCheck, FaBuilding } from 'react-icons/fa';

import UploadForm from '../components/UploadForm';
import StatusTable from '../components/StatusTable';
import StatusOverview from '../components/StatusOverview'; // neue Übersicht (Cards)

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
  },
  shadow: '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
  radius: 12,
  radiusSm: 8,
};

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState(null);
  const [subType, setSubType] = useState(null);

  // Statusdaten
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null); // Übersicht -> Detail

  const resetSelection = () => {
    setSelectedService(null);
    setSubType(null);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      setLoading(true);
      fetch('/api/dokumentenstatus')
        .then((res) => res.json())
        .then((data) => {
          setStatusData(Array.isArray(data) ? data : []);
          setLoading(false);
          setActiveReport(null); // immer mit Übersicht starten
        })
        .catch((err) => {
          console.error('Fehler beim Laden der Statusdaten:', err);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const getRolleName = (type, sub) => {
    if (type === 'objektunterlagen') return 'Verkäufer';
    if (type === 'bonitaet' && sub) {
      if (sub === 'angestellter') return 'Käufer (angestellt)';
      if (sub === 'selbstaendiger') return 'Käufer (selbstständig)';
    }
    return '';
  };

  const styles = {
    page: { minHeight: '100vh', backgroundColor: tokens.colors.bgPage },
    header: {
      backgroundColor: tokens.colors.bgCard,
      borderBottom: `1px solid ${tokens.colors.border}`,
      boxShadow: tokens.shadow,
    },
    headerInner: {
      maxWidth: 1152,
      margin: '0 auto',
      padding: '24px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    },
    title: { fontSize: 24, fontWeight: 700, color: tokens.colors.text, margin: 0 },
    subtitle: { color: tokens.colors.textMuted, margin: 0 },
    container: { maxWidth: 1152, margin: '0 auto', padding: '24px 16px' },

    tabs: {
      display: 'flex',
      gap: 8,
      marginBottom: 24,
      backgroundColor: tokens.colors.bgTabs,
      padding: 4,
      borderRadius: tokens.radiusSm,
    },
    tabBtn: (active) => ({
      flex: 1,
      textAlign: 'center',
      padding: '10px 12px',
      borderRadius: tokens.radiusSm,
      fontWeight: 600,
      transition: 'background-color 120ms ease, color 120ms ease',
      backgroundColor: active ? tokens.colors.bgCard : tokens.colors.tabIdle,
      color: active ? tokens.colors.text : '#444444',
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
      color: '#ffffff',
      fontWeight: 600,
      padding: '10px 16px',
      borderRadius: tokens.radiusSm,
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 120ms ease',
    },

    panel: {
      backgroundColor: tokens.colors.bgCard,
      padding: 24,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
    },
    panelHeaderRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    panelTitle: { fontSize: 18, fontWeight: 700, color: tokens.colors.text, margin: 0 },
    linkBtn: {
      fontSize: 14,
      color: tokens.colors.primary,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
      padding: 0,
    },
    statusWrap: { backgroundColor: tokens.colors.bgCard, padding: 24, borderRadius: tokens.radius },
  };

  const [hoverCard, setHoverCard] = useState(null);

  // Zeilen nach gewählter Gruppe filtern (wenn Detail geöffnet)
  const filteredRows = activeReport
    ? statusData.filter(
        (r) =>
          String(r.kunde_id) === String(activeReport.kunde_id) &&
          String(r.kundenrolle || '') === String(activeReport.kundenrolle || '')
      )
    : statusData;

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/logo_mikaeli.svg"
              alt="Kundenlogo"
              width={140}
              height={140}
              style={{ objectFit: 'contain' }}
            />
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
          <button
            onClick={() => {
              setActiveTab('services');
              resetSelection();
            }}
            style={styles.tabBtn(activeTab === 'services')}
          >
            Prüfungen
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              resetSelection();
            }}
            style={styles.tabBtn(activeTab === 'history')}
          >
            Status
          </button>
        </div>

        {/* Auswahlkarten */}
        {activeTab === 'services' && !selectedService && (
          <div style={styles.cardGrid}>
            {/* Objektunterlagen */}
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
              <p style={styles.cardText}>
                Lassen Sie Ihre Objektunterlagen professionell prüfen und bewerten.
              </p>
              <button
                style={styles.primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primary)}
              >
                Auswählen
              </button>
            </div>

            {/* Bonitätsprüfung */}
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
              <button onClick={resetSelection} style={styles.linkBtn}>
                Zurück
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              <div
                style={{
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radiusSm,
                  padding: 16,
                  cursor: 'pointer',
                }}
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
                style={{
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radiusSm,
                  padding: 16,
                  cursor: 'pointer',
                }}
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
        {(selectedService === 'objektunterlagen' ||
          (selectedService === 'bonitaet' && subType)) && (
          <div style={{ ...styles.panel, marginTop: 24 }}>
            <div style={styles.panelHeaderRow}>
              <h2 style={styles.panelTitle}>
                {selectedService === 'objektunterlagen'
                  ? 'Objektunterlagen hochladen'
                  : `Bonitätsprüfung – ${subType}`}
              </h2>
              <button onClick={resetSelection} style={styles.linkBtn}>
                Zurück zur Auswahl
              </button>
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
              // Übersichtskarten (immer zuerst)
              <StatusOverview rows={statusData} onOpenDetail={(summary) => setActiveReport(summary)} />
            ) : (
              // Detailansicht (Checkliste)
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <h2 style={styles.panelTitle}>
                    {activeReport.kunde_name} — {activeReport.kundenrolle || '—'}
                  </h2>
                  <button onClick={() => setActiveReport(null)} style={styles.linkBtn}>
                    Zur Übersicht
                  </button>
                </div>
                <StatusTable data={filteredRows} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
