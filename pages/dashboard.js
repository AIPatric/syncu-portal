import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { FaFileAlt, FaUserCheck, FaBuilding } from 'react-icons/fa'
import UploadForm from '../components/UploadForm'

export default function Dashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('services')
  const [selectedService, setSelectedService] = useState(null)
  const [subType, setSubType] = useState(null)

  const resetSelection = () => {
    setSelectedService(null)
    setSubType(null)
  }

  // Funktion zur Bestimmung des Rollennamens basierend auf subType
  const getRolleName = (type, sub) => {
    if (type === 'objektunterlagen') {
      return 'Verkäufer'; // Feste Rolle für Objektunterlagen
    } else if (type === 'bonitaet' && sub) {
      if (sub === 'angestellter') {
        return 'Käufer (angestellt)';
      } else if (sub === 'selbstständig') { // <-- HIER KORRIGIERT: 'selbstständig' statt 'selbstaendiger'
        return 'Käufer (selbstständig)'; // <-- Exakter Wert aus der Datenbank
      }
    }
    return ''; // Standardwert, falls keine Rolle zutrifft
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center space-x-4">
          <Image
            src="/logo_mikaeli.svg"
            alt="Kundenlogo"
            width={140}
            height={140}
            className="object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-[#111]">Willkommen auf Ihrem Dashboard</h1>
            <p className="text-gray-600">Mikaeli Immobilien-Finanzierung GbR</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex space-x-2 mb-6 bg-[#e5e7eb] p-1 rounded-md">
          <button
            onClick={() => {
              setActiveTab('services')
              resetSelection()
            }}
            className="flex-1 text-center py-2 rounded-md font-semibold transition"
            style={{
              backgroundColor: activeTab === 'services' ? '#ffffff' : '#d1d5db',
              color: activeTab === 'services' ? '#111111' : '#444',
            }}
          >
            Prüfungen
          </button>
          <button
            onClick={() => {
              setActiveTab('history')
              resetSelection()
            }}
            className="flex-1 text-center py-2 rounded-md font-semibold transition"
            style={{
              backgroundColor: activeTab === 'history' ? '#ffffff' : '#d1d5db',
              color: activeTab === 'history' ? '#111111' : '#444',
            }}
          >
            Verlauf
          </button>
        </div>

        {/* Auswahlkarten */}
        {activeTab === 'services' && !selectedService && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Objektunterlagen */}
            <div
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedService('objektunterlagen')}
            >
              <div className="flex items-center space-x-3 mb-2">
                <FaFileAlt className="text-blue-600 text-xl" />
                <h2 className="text-lg font-semibold text-[#111]">
                  Objektunterlagen prüfen
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Lassen Sie Ihre Objektunterlagen professionell prüfen und bewerten.
              </p>
              <button className="bg-[#2d9cdb] hover:bg-[#5cb682] text-white font-semibold py-2 px-4 rounded-md w-full">
                Auswählen
              </button>
            </div>

            {/* Bonitätsprüfung */}
            <div
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedService('bonitaet')}
            >
              <div className="flex items-center space-x-3 mb-2">
                <FaUserCheck className="text-green-600 text-xl" />
                <h2 className="text-lg font-semibold text-[#111]">Bonitätsprüfung</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Führen Sie eine umfassende Bonitätsprüfung durch.
              </p>
              <button className="bg-[#2d9cdb] hover:bg-[#5cb682] text-white font-semibold py-2 px-4 rounded-md w-full">
                Auswählen
              </button>
            </div>
          </div>
        )}

        {/* SubType Auswahl für Bonität */}
        {selectedService === 'bonitaet' && !subType && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#111]">Berufsgruppe wählen</h2>
              <button
                onClick={resetSelection}
                className="text-sm text-blue-600 hover:underline"
                style={{ color: '#2d9cdb' }}
              >
                Zurück
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div
                className="border rounded-md p-4 hover:shadow cursor-pointer"
                onClick={() => setSubType('angestellter')}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <FaBuilding className="text-blue-600" />
                  <p className="font-semibold text-[#111]">Angestellter</p>
                </div>
                <p className="text-sm text-gray-600">
                  Festes Anstellungsverhältnis (z. B. Gehaltsabrechnung)
                </p>
              </div>
              <div
                className="border rounded-md p-4 hover:shadow cursor-pointer"
                onClick={() => setSubType('selbstständig')} // <-- HIER KORRIGIERT: 'selbstständig' statt 'selbstaendiger'
              >
                <div className="flex items-center space-x-2 mb-1">
                  <FaUserCheck className="text-green-600" />
                  <p className="font-semibold text-[#111]">Selbständiger</p>
                </div>
                <p className="text-sm text-gray-600">
                  Freiberuflich oder gewerblich tätig (z. B. BWA, EÜR)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Uploadformular */}
        {(selectedService === 'objektunterlagen' || (selectedService === 'bonitaet' && subType)) && (
          <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#111]">
                {selectedService === 'objektunterlagen'
                  ? 'Objektunterlagen hochladen'
                  : `Bonitätsprüfung – ${subType}`}
              </h2>
              <button
                onClick={resetSelection}
                className="text-sm text-blue-600 hover:underline"
                style={{ color: '#2d9cdb' }}
              >
                Zurück zur Auswahl
              </button>
            </div>
            {/* Übergabe der Props an UploadForm */} 
            <UploadForm 
              mode={selectedService} 
              rolleName={getRolleName(selectedService, subType)} 
            />
          </div>
        )}

        {/* Verlauf (bleibt erstmal leer) */}
        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-lg text-center text-gray-600">
            <p>Bisher wurden keine Prüfungen durchgeführt.</p>
          }
        )}
      </div>
    </div>
  )
}
