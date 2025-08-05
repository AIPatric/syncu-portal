// /pages/api/upload.js

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('API: Upload request received');
    
    // Parse the multipart form data manually
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      console.error('No boundary found in content-type');
      return res.status(400).json({ error: 'Invalid content-type header' });
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const body = buffer.toString();

    // Parse form fields
    const parts = body.split(`--${boundary}`);
    const fields = {};
    const files = [];

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        
        const fieldName = nameMatch[1];
        
        if (part.includes('filename=')) {
          // This is a file
          const filenameMatch = part.match(/filename="([^"]+)"/);
          const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
          
          if (filenameMatch) {
            const filename = filenameMatch[1];
            const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
            
            // Extract file data (everything after the double CRLF)
            const dataStart = part.indexOf('\r\n\r\n') + 4;
            const dataEnd = part.lastIndexOf('\r\n');
            const fileData = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
            
            files.push({
              originalFilename: filename,
              data: fileData,
              contentType: contentType
            });
          }
        } else {
          // This is a regular field
          const valueStart = part.indexOf('\r\n\r\n') + 4;
          const valueEnd = part.lastIndexOf('\r\n');
          const value = part.slice(valueStart, valueEnd);
          fields[fieldName] = value;
        }
      }
    }

    console.log('API: Parsed fields:', Object.keys(fields));
    console.log('API: Parsed files:', files.length);

    const { vorname, nachname, rolleName } = fields;
    
    if (!vorname || !nachname || !rolleName) {
      console.error('API: Missing required fields');
      return res.status(400).json({ error: 'Vorname, Nachname und Rolle sind Pflichtfelder.' });
    }

    if (files.length === 0) {
      console.error('API: No files provided');
      return res.status(400).json({ error: 'Es wurden keine Dateien zum Hochladen bereitgestellt.' });
    }

    // 1. Find rolle_id
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('API: Database error finding role:', rolleError);
      return res.status(500).json({ error: 'Datenbankfehler bei der Rollensuche.' });
    }
    
    if (!rolleData) {
      console.error(`API: Role not found: ${rolleName}`);
      return res.status(400).json({ error: `Rolle '${rolleName}' ist ungültig.` });
    }
    
    const rolle_id = rolleData.id;
    console.log(`API: Found role '${rolleName}' with ID: ${rolle_id}`);

    // 2. Create customer
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('API: Error creating customer:', kundeError);
      return res.status(500).json({ error: 'Der Kunde konnte nicht angelegt werden.' });
    }
    
    const kunde_id = kundeData.id;
    console.log(`API: Created customer '${vorname} ${nachname}' with ID: ${kunde_id}`);

    // 3. Upload files
    const uploadPromises = files.map(async (file) => {
      try {
        const fileExt = file.originalFilename.split('.').pop();
        const fileName = `${kunde_id}/${uuidv4()}.${fileExt}`;
        
        console.log(`API: Uploading file: ${file.originalFilename} -> ${fileName}`);
        
        const { error: storageError } = await supabaseAdmin.storage
          .from('upload')
          .upload(fileName, file.data, { 
            contentType: file.contentType,
            upsert: false
          });

        if (storageError) {
          console.error(`API: Storage error for ${file.originalFilename}:`, storageError);
          throw new Error(`Upload failed for ${file.originalFilename}: ${storageError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage.from('upload').getPublicUrl(fileName);
        console.log(`API: Successfully uploaded ${file.originalFilename}`);

        return {
          kunde_id,
          rolle_id,
          file_url: urlData.publicUrl,
          original_name: file.originalFilename,
          status: 'pending',
        };
      } catch (error) {
        console.error(`API: Error processing file ${file.originalFilename}:`, error);
        throw error;
      }
    });

    const queueInserts = await Promise.all(uploadPromises);
    console.log(`API: All ${queueInserts.length} files processed successfully`);

    // 4. Insert into queue
    const { error: queueError } = await supabaseAdmin
      .from('upload_queue')
      .insert(queueInserts);

    if (queueError) {
      console.error('API: Error inserting into upload queue:', queueError);
      return res.status(500).json({ error: 'Fehler beim Eintragen in die Warteschlange.' });
    }

    console.log('API: All operations completed successfully');
    return res.status(200).json({ 
      success: true, 
      message: `${files.length} Datei(en) erfolgreich hochgeladen und zur Verarbeitung vorgemerkt.` 
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Ein interner Serverfehler ist aufgetreten.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
