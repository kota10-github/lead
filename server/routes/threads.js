const express = require('express');
const router = express.Router();
const { getValidToken, readToken, isExpiringSoon } = require('../lib/token-store');
const { postToThreads } = require('../lib/threads-client');
const { formatKpiPost } = require('../lib/format-post');

// POST /api/threads/post — KPIデータをThreadsに投稿
router.post('/post', async (req, res) => {
  try {
    const token = await getValidToken();
    if (!token) {
      return res.status(401).json({ error: 'Threads未連携。先に /auth/threads で認証してください。' });
    }

    const { kpiData } = req.body;
    if (!kpiData || !kpiData.kpis) {
      return res.status(400).json({ error: 'kpiData が不正です。' });
    }

    const text = formatKpiPost(kpiData);
    const result = await postToThreads(token.user_id, token.access_token, text);

    res.json({ success: true, thread_id: result.id, text });
  } catch (err) {
    console.error('Threads投稿エラー:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/threads/status — 接続ステータス確認
router.get('/status', (req, res) => {
  const token = readToken();
  if (!token) {
    return res.json({ connected: false });
  }

  const expiresAt = new Date(token.expires_at);
  const daysLeft = Math.floor((token.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
  const expired = token.expires_at < Date.now();

  res.json({
    connected: !expired,
    user_id: token.user_id,
    expires_at: expiresAt.toISOString(),
    days_left: daysLeft,
    expiring_soon: isExpiringSoon(token),
  });
});

module.exports = router;
