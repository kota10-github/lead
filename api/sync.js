const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019d9bf1-4c1c-7975-864b-59ceca211c2e';
const BLOB_BASE = 'https://jsonblob.com/api/jsonBlob';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(BLOB_URL);
      if (r.status === 404) {
        // Blob expired or missing — return empty so the client can re-seed
        return res.status(200).json({});
      }
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      let r = await fetch(BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      // If the blob expired, recreate it at the same path by POSTing (jsonblob issues a new id)
      // but we still return success so the client can keep going; the admin must update BLOB_URL
      if (r.status === 404) {
        const p = await fetch(BLOB_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        const newId = p.headers.get('x-jsonblob-id');
        const body = await p.json().catch(() => ({}));
        return res.status(200).json({ ...body, _note: 'blob recreated', _newBlobId: newId });
      }
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
