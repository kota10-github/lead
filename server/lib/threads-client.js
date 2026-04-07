const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createContainer(userId, accessToken, text) {
  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'TEXT',
      text,
      access_token: accessToken,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`コンテナ作成失敗: ${err}`);
  }
  return await res.json();
}

async function publishContainer(userId, accessToken, creationId) {
  const res = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`パブリッシュ失敗: ${err}`);
  }
  return await res.json();
}

async function postToThreads(userId, accessToken, text) {
  // Step 1: コンテナ作成
  const container = await createContainer(userId, accessToken, text);

  // Step 2: 3秒待機（Meta推奨）
  await sleep(3000);

  // Step 3: パブリッシュ
  const result = await publishContainer(userId, accessToken, container.id);
  return result;
}

module.exports = { postToThreads };
