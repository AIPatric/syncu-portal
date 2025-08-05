import { useState } from 'react';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

export default function UploadForm({ mode, rolleName: initialRolleName = '' }) {
  const [files, setFiles] = useState([]);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (selectedFiles) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024;

    const validFiles = Array.from(selectedFiles).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Ungültiger Dateityp: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`Datei zu groß: ${file.name} (max. 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!vorname.trim() || !nachname.trim()) return setError('Vor- und Nachname sind Pflicht.');
    if (!initialRolleName) return setError('Keine gültige Rolle übergeben.');
    if (files.length === 0) return setError('Bitte mindestens eine Datei auswählen.');

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('vorname', vorname.trim());
    formData.append('nachname', nachname.trim());
    formData.append('rolleName', initialRolleName);

    files.forEach(file => {
      formData.append('file', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler beim Upload');

      setSuccess(data.message);
      setFiles([]);
      setVorname('');
      setNachname('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 shadow-lg rounded-xl bg-white text-[#111]">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {mode === 'objektunterlagen' ? 'Objektunterlagen hochladen' : 'Bonitätsunterlagen hochladen'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input type="text" placeholder="Vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
        <input type="text" placeholder="Nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
      </div>

      <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} className={`w-full p-6 border-2 border-dashed rounded-md transition-colors ${dragActive ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
        <div className="flex flex-col items-center gap-4">
          <FaCloudUploadAlt className="text-4xl text-[#2d9cdb]" />
          <label htmlFor="file-upload" className="cursor-pointer font-medium text-center">
            <span style={{ color: '#111' }}>
              Dateien hierher ziehen oder{' '}
              <span style={{ color: '#2d9cdb', textDecoration: 'underline' }}>klicken</span>
            </span>
          </label>
          <input id="file-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          <p className="text-xs text-gray-500">PDF, JPG, PNG (max. 10MB)</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-[#f2f2f2]">
          {files.map((file, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-1">
              <span className="truncate pr-2">{file.name}</span>
              <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><FiX className="text-gray-500 hover:text-gray-700" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <button onClick={handleUpload} disabled={loading || files.length === 0} className="px-6 py-2 rounded-md font-semibold text-white disabled:opacity-50" style={{ backgroundColor: loading ? '#a0aec0' : '#2d9cdb' }}>
          {loading ? 'Wird hochgeladen...' : `Jetzt ${files.length} Datei(en) hochladen`}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-center text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-center text-green-600">{success}</p>}
    </div>
  );
}
