// pages/api/dokumentenstatus.js
export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://hrfymjdvkatezgpwdbsh.supabase.co/rest/v1/dashboard_dokumentenstatus',
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}
