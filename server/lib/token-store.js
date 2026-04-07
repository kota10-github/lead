const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const REFRESH_THRESHOLD_DAYS = 7;

function readToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeToken(data) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));
}

function isExpiringSoon(token) {
  if (!token || !token.expires_at) return true;
  const daysLeft = (token.expires_at - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft < REFRESH_THRESHOLD_DAYS;
}

async function refreshIfNeeded(token) {
  if (!token || !isExpiringSoon(token)) return token;

  const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${token.access_token}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Token refresh failed:', await res.text());
    return token;
  }
  const data = await res.json();
  const updated = {
    ...token,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  writeToken(updated);
  console.log('Token refreshed successfully');
  return updated;
}

async function getValidToken() {
  const token = readToken();
  if (!token) return null;
  return await refreshIfNeeded(token);
}

module.exports = { readToken, writeToken, getValidToken, isExpiringSoon };
