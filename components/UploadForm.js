const handleUpload = async () => {
  if (!vorname.trim() || !nachname.trim()) {
    return setError('Bitte geben Sie Vor- und Nachnamen an.');
  }

  if (!initialRolleName) {
    return setError('Keine Rolle übergeben. Auswahl im Dashboard prüfen.');
  }

  if (files.length === 0) {
    return setError('Bitte mindestens eine Datei auswählen.');
  }

  setLoading(true);
  setError('');
  setSuccess('');

  const formData = new FormData();
  formData.append('vorname', vorname.trim());
  formData.append('nachname', nachname.trim());
  formData.append('rolleName', initialRolleName);
  files.forEach(file => formData.append('file', file));

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      throw new Error('Ungültige Server-Antwort. Bitte später erneut versuchen.');
    }

    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim Hochladen.');
    }

    setSuccess(data.message);
    if (data.fehler?.length) {
      setError('Einige Dateien konnten nicht verarbeitet werden:\n' + data.fehler.join('\n'));
    }

    setFiles([]);
    setVorname('');
    setNachname('');

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
