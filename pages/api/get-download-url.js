// /pages/api/get-download-url.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';

/**
 * Erzeugt eine signierte Download-URL (120s).
 * Query: ?raw=<file_url_or_path>
 * - Akzeptiert volle Supabase-URLs und Pfade wie "upload/dir/file.pdf" oder "/upload/dir/file.pdf"
 */
export default async function handler(req, res) {
  try {
    const raw = req.query.raw;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'raw (file url or path) required' });
    }

    // 1) Wenn es eine absolute http-URL zu DEINEM Projekt ist: Bucket + Pfad parsen
    const project = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//i, '') || '';
    let s = raw.trim();

    // Wenn absolute URL: Domain abtrennen
    s = s.replace(new RegExp(`^https?://${project}/?`, 'i'), '');

    // Bekannte Präfixe entfernen
    s = s.replace(/^\/+/, '');
    s = s.replace(/^storage\/v1\/object\//, '');
    s = s.replace(/^public\//, '').replace(/^sign\//, '');

    // Jetzt sollte "<bucket>/<path...>" übrig bleiben
    const m = s.match(/^([^/]+)\/(.+)$/);
    if (!m) {
      return res.status(400).json({ error: 'cannot parse bucket/path from raw' });
    }
    const bucket = m[1];
    const path = m[2];

    // 120 Sekunden
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(path, 120);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ url: data?.signedUrl || null });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'internal error' });
  }
}
