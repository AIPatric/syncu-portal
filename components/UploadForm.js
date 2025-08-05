// /components/UploadForm.js - Verbesserte Fehlerbehandlung

import { useState } from 'react';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

export default function UploadForm({ mode, rolleName: initialRolleName }) {
  const [files, setFiles] = useState([]);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (selectedFiles) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = Array.from(selectedFiles).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Ungültiger Dateityp: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`Datei ist zu groß: ${file.name} (max. 10MB)`);
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
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    // Validation
    if (!vorname.trim() || !nachname.trim()) {
      return setError('Bitte geben Sie Vor- und Nachnamen an.');
    }
    if (!initialRolleName) {
      return setError('Es wurde keine gültige Rolle übergeben. Bitte wählen Sie eine Option im Dashboard.');
    }
    if (files.length === 0) {
      return setError('Bitte wählen Sie mindestens eine Datei zum Hochladen aus.');
    }

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
      console.log('Sending upload request...');
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      // WICHTIG: Prüfe zuerst den Response Status und Content-Type
      if (!res.ok) {
        // Versuche Text zu lesen für bessere Fehlermeldungen
        let errorMessage;
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          errorMessage = errorData.error || `Server Error ${res.status}`;
        } else {
          // Falls Server HTML oder Text zurückgibt
          const errorText = await res.text();
          console.error('Non-JSON error response:', errorText);
          errorMessage = `Server Error ${res.status}: ${errorText.substring(0, 100)}...`;
        }
        
        throw new Error(errorMessage);
      }

      // Prüfe Content-Type vor JSON-Parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await res.text();
        console.error('Expected JSON but got:', contentType, responseText);
        throw new Error('Server gab unerwarteten Content-Type zurück');
      }

      // Erst jetzt JSON parsen
      const data = await res.json();
      console.log('Success response:', data);

      setSuccess(data.message);
      setFiles([]);
      setVorname('');
      setNachname('');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#111111' }} className="w-full max-w-xl mx-auto p-6 shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {mode === 'objektunterlagen' ? 'Objektunterlagen hochladen' : 'Bonitätsunterlagen hochladen'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Vorname" 
          value={vorname} 
          onChange={(e) => setVorname(e.target.value)} 
          className="w-full border border-gray-300 rounded-md p-2" 
          style={{ color: '#111111' }} 
        />
        <input 
          type="text" 
          placeholder="Nachname" 
          value={nachname} 
          onChange={(e) => setNachname(e.target.value)} 
          className="w-full border border-gray-300 rounded-md p-2" 
          style={{ color: '#111111' }} 
        />
      </div>

      <div 
        onDrop={handleDrop} 
        onDragOver={(e) => { 
          e.preventDefault(); 
          e.stopPropagation(); 
          setDragActive(true); 
        }} 
        onDragLeave={() => setDragActive(false)} 
        className={`w-full p-6 border-2 border-dashed rounded-md transition-colors ${
          dragActive ? 'border-green-400 bg-green-50' : 'border-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <FaCloudUploadAlt style={{ color: '#2d9cdb' }} className="text-4xl" />
          <label htmlFor="file-upload" className="cursor-pointer font-medium text-center">
            <span style={{ color: '#111' }}>
              Dateien hierher ziehen oder{' '}
              <span style={{ color: '#2d9cdb', textDecoration: 'underline' }}>klicken</span>
            </span>
          </label>
          <input 
            id="file-upload" 
            type="file" 
            accept=".pdf,.jpg,.jpeg,.png" 
            multiple 
            onChange={(e) => handleFiles(e.target.files)} 
            className="hidden" 
          />
          <p className="text-xs text-gray-500">Erlaubt: PDF, JPG, PNG (max. 10MB)</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3" style={{ backgroundColor: '#f2f2f2' }}>
          {files.map((file, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-1">
              <span className="truncate pr-2">{file.name}</span>
              <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                <FiX className="text-gray-500 hover:text-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <button 
          onClick={handleUpload} 
          disabled={loading || files.length === 0} 
          className="px-6 py-2 rounded-md font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          style={{ backgroundColor: loading ? '#a0aec0' : '#2d9cdb' }}
        >
          {loading ? 'Wird hochgeladen...' : `Jetzt ${files.length} Datei(en) hochladen`}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-center text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-center text-green-600">{success}</p>}
    </div>
  );
}