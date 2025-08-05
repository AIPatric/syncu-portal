import { useState } from 'react';
import Image from 'next/image';
import { FaFileAlt, FaUserCheck, FaBuilding } from 'react-icons/fa';
import UploadForm from '../components/UploadForm';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState(null);
  const [subType, setSubType] = useState(null);

  const resetSelection = () => {
    setSelectedService(null);
    setSubType(null);
  };

  const getRolleName = (type, sub) => {
    if (type === 'objektunterlagen') return 'Verkäufer';
    if (type === 'bonitaet') {
      if (sub === 'angestellter') return 'Käufer (angestellt)';
      if (sub === 'selbstaendiger') return 'Käufer (selbstständig)';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center space-x-4">
          <Image src="/logo_mikaeli.svg" alt="Logo" width={140} height={140} />
          <div>
            <h1 className="text-2xl font-bold text-[#111]">Willkommen auf Ihrem Dashboard</h1>
            <p className="text-gray-600">Mikaeli Immobilien-Finanzierung GbR</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex space-x-2 mb-6 bg-[#e5e7eb] p-1 rounded-md">
          <button onClick={() => { setActiveTab('services'); resetSelection(); }} className={`flex-1 text-center py-2 rounded-md font-semibold transition ${activeTab === 'services' ? 'bg-white text-[#111]' : 'bg-[#d1d5db] text-[#444]'}`}>Prüfungen</button>
          <button onClick={() => { setActiveTab('history'); resetSelection(); }} className={`flex-1 text-center py-2 rounded-md font-semibold transition ${activeTab === 'history' ? 'bg-white text-[#111]' : 'bg-[#d1d5db] text-[#444]'}`}>Verlauf</button>
        </div>

        {activeTab === 'services' && !selectedService && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer" onClick={() => setSelectedService('objektunterlagen')}>
              <div className="flex items-center space-x-3 mb-2">
                <FaFileAlt className="text-blue-600 text-xl" />
                <h2 className="text-lg font-semibold text-[#111]">Objektunterlagen prüfen</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Lassen Sie Ihre Objektunterlagen professionell prüfen.</p>
              <button className="bg-[#2d9cdb] hover:bg-[#5cb682] text-white font-semibold py-2 px-4 rounded-md w-full">Auswählen</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer" onClick={() => setSelectedService('bonitaet')}>
              <div className="flex items-center space-x-3 mb-2">
                <FaUserCheck className="text-green-600 text-xl" />
                <h2 className="text-lg font-semibold text-[#111]">Bonitätsprüfung</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Führen Sie eine Bonitätsprüfung durch.</p>
              <button className="bg-[#2d9cdb] hover:bg-[#5cb682] text-white font-semibold py-2 px-4 rounded-md w-full">Auswählen</button>
            </div>
          </div>
        )}

        {selectedService === 'bonitaet' && !subType && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#111]">Berufsgruppe wählen</h2>
              <button onClick={resetSelection} className="text-sm text-blue-600 hover:underline">Zurück</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-md p-4 hover:shadow cursor-pointer" onClick={() => setSubType('angestellter')}>
                <div className="flex items-center space-x-2 mb-1">
                  <FaBuilding className="text-blue-600" />
                  <p className="font-semibold text-[#111]">Angestellter</p>
                </div>
                <p className="text-sm text-gray-600">Festes Anstellungsverhältnis</p>
              </div>
              <div className="border rounded-md p-4 hover:shadow cursor-pointer" onClick={() => setSubType('selbstaendiger')}>
                <div className="flex items-center space-x-2 mb-1">
                  <FaUserCheck className="text-green-600" />
                  <p className="font-semibold text-[#111]">Selbständiger</p>
                </div>
                <p className="text-sm text-gray-600">Gewerblich oder freiberuflich</p>
              </div>
            </div>
          </div>
        )}

        {(selectedService === 'objektunterlagen' || (selectedService === 'bonitaet' && subType)) && (
          <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#111]">
                {selectedService === 'objektunterlagen'
                  ? 'Objektunterlagen hochladen'
                  : `Bonitätsprüfung – ${subType}`}
              </h2>
              <button onClick={resetSelection} className="text-sm text-blue-600 hover:underline">Zurück zur Auswahl</button>
            </div>
            <UploadForm mode={selectedService} rolleName={getRolleName(selectedService, subType)} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-lg text-center text-gray-600">
            <p>Bisher wurden keine Prüfungen durchgeführt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
