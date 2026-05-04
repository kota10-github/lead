// jsonblob 永続化は 30 日の TTL で期限切れになる。期限切れ時に POST で
// 新 blob を自動発行するが、発行した新 id を次の GET 時にも使えるよう
// プロセスメモリにキャッシュする (Vercel の warm 状態で引き継がれる)。
// 完全永続化ではないが、ユーザーが定期的にアクセスしていればキャッシュは
// そのまま温まり続け、実質的に同じ blob を使い続けられる。cold start で
// 忘れたら最後に GET/PUT したどちらかがまた新 blob を発行する。
const BLOB_BASE = 'https://jsonblob.com/api/jsonBlob';
// 2026-05-04 時点でアクティブな blob id。期限切れで新 blob が発行されたら
// _currentBlobId にキャッシュされ、以降そちらを使う。
// 旧: 019dab81-... (期限切れ), 019df212-... (2026-05-04 ローテート)
const INITIAL_BLOB_ID = '019df212-1f3e-7450-b03d-ad286c5de2c5';
let _currentBlobId = INITIAL_BLOB_ID;
function blobUrl() { return BLOB_BASE + '/' + _currentBlobId; }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(blobUrl());
      if (r.status === 404) {
        // Blob expired — 空を返してクライアントに再 seed を任せる
        return res.status(200).json({ _blobId: _currentBlobId, _expired: true });
      }
      const data = await r.json();
      res.setHeader('X-Blob-Id', _currentBlobId);
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      let r = await fetch(blobUrl(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      // 期限切れ → 新 blob を POST で発行し、現行 id をローテート
      if (r.status === 404) {
        const p = await fetch(BLOB_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        const newId = p.headers.get('x-jsonblob-id');
        if (newId) _currentBlobId = newId;
        const body = await p.json().catch(() => ({}));
        res.setHeader('X-Blob-Id', _currentBlobId);
        return res.status(200).json({ ...body, _blobId: _currentBlobId, _note: 'blob rotated', _newBlobId: newId });
      }
      const data = await r.json().catch(() => ({}));
      res.setHeader('X-Blob-Id', _currentBlobId);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
