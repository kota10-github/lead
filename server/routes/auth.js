const express = require('express');
const router = express.Router();
const { writeToken } = require('../lib/token-store');

const THREADS_AUTH_URL = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
const THREADS_API_BASE = 'https://graph.threads.net';

// GET /auth/threads — OAuth認可開始
router.get('/threads', (req, res) => {
  const { THREADS_APP_ID, BASE_URL } = process.env;
  if (!THREADS_APP_ID) {
    return res.status(500).json({ error: 'THREADS_APP_ID not configured' });
  }
  const redirectUri = `${BASE_URL}/auth/threads/callback`;
  const params = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: redirectUri,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
  });
  res.redirect(`${THREADS_AUTH_URL}?${params}`);
});

// GET /auth/threads/callback — OAuthコールバック
router.get('/threads/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.status(400).send(`認証エラー: ${error || 'コードが取得できませんでした'}`);
  }

  try {
    const { THREADS_APP_ID, THREADS_APP_SECRET, BASE_URL } = process.env;
    const redirectUri = `${BASE_URL}/auth/threads/callback`;

    // 1. 短期トークン取得
    const tokenRes = await fetch(THREADS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: THREADS_APP_ID,
        client_secret: THREADS_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).send(`トークン取得失敗: ${err}`);
    }
    const shortToken = await tokenRes.json();

    // 2. 長期トークンへ交換
    const longRes = await fetch(
      `${THREADS_API_BASE}/access_token?` +
      new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: THREADS_APP_SECRET,
        access_token: shortToken.access_token,
      })
    );
    if (!longRes.ok) {
      const err = await longRes.text();
      return res.status(400).send(`長期トークン交換失敗: ${err}`);
    }
    const longToken = await longRes.json();

    // 3. ユーザーID取得
    const meRes = await fetch(
      `${THREADS_API_BASE}/v1.0/me?access_token=${longToken.access_token}`
    );
    const me = await meRes.json();

    // 4. トークン保存
    writeToken({
      access_token: longToken.access_token,
      user_id: me.id,
      expires_at: Date.now() + longToken.expires_in * 1000,
    });

    console.log('Threads認証完了 - user_id:', me.id);
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`認証処理エラー: ${err.message}`);
  }
});

module.exports = router;
