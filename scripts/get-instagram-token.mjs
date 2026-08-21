#!/usr/bin/env node
/**
 * get-instagram-token.mjs
 * One-time setup: runs a local OAuth flow to get a long-lived Meta token
 * and your Instagram Business Account ID, then saves both to .env.
 *
 * Prerequisites (5 min):
 *   1. Go to https://developers.facebook.com/ → My Apps → Create App
 *   2. Choose app type: Business
 *   3. Add product: Instagram → Instagram Graph API
 *   4. Settings → Basic → copy App ID and App Secret
 *   5. Facebook Login → Settings → add Valid OAuth Redirect URI:
 *        http://localhost:3456/callback
 *
 * Usage:
 *   node scripts/get-instagram-token.mjs APP_ID APP_SECRET
 *
 * After running:
 *   - .env is updated with META_ACCESS_TOKEN and GILD_INSTAGRAM_BUSINESS_ID
 *   - Copy both vars to Cloudflare Pages → Settings → Environment Variables
 *   - Token expires in 60 days — re-run this script to refresh
 */

import http        from 'node:http';
import { URL }     from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { exec }    from 'node:child_process';
import { resolve } from 'node:path';

const [, , appId, appSecret] = process.argv;

if (!appId || !appSecret) {
  console.error('\n❌  Usage: node scripts/get-instagram-token.mjs APP_ID APP_SECRET\n');
  process.exit(1);
}

const PORT        = 3456;
const REDIRECT    = `http://localhost:${PORT}/callback`;
const SCOPE       = 'instagram_basic,pages_show_list,business_management';
const AUTH_URL    = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${SCOPE}&response_type=code`;
const ENV_PATH    = resolve(process.cwd(), '.env');

console.log('\n🔐 Opening browser for Meta OAuth login…');
console.log('   (If browser does not open, paste this URL manually)');
console.log('  ', AUTH_URL, '\n');

const opener = process.platform === 'darwin' ? 'open'
             : process.platform === 'win32'  ? 'start'
             :                                  'xdg-open';
exec(`${opener} "${AUTH_URL}"`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h2>❌ No auth code received. Please try again.</h2>');
    server.close();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><html><body style="font-family:sans-serif;padding:40px"><h2>✅ Authenticated! You can close this tab.</h2><p>Return to the terminal to see the result.</p></body></html>');
  server.close();

  try {
    console.log('🔄  Exchanging code for token…');

    // Short-lived token
    const shortRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
      `?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}` +
      `&client_secret=${appSecret}&code=${code}`
    );
    const shortData = await shortRes.json();
    if (shortData.error) throw new Error(shortData.error.message);
    const shortToken = shortData.access_token;

    // Long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);
    const longToken = longData.access_token;

    console.log('✅  Long-lived token obtained (60 days).');

    // Find Instagram Business Account ID
    console.log('🔍  Looking for Instagram Business Account…');
    const pagesRes  = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json();
    const pages     = pagesData.data || [];

    let igId = null;
    for (const page of pages) {
      const igRes  = await fetch(`https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${longToken}`);
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        igId = igData.instagram_business_account.id;
        console.log(`✅  Found Instagram Business Account: ${igId}`);
        break;
      }
    }

    if (!igId) {
      console.warn('⚠️   Could not auto-detect Instagram Business Account ID.');
      console.warn('    Make sure @gild.hq is a Professional/Business account connected to a Facebook Page.');
      console.warn('    Set GILD_INSTAGRAM_BUSINESS_ID manually in .env and Cloudflare.');
    }

    // Patch .env
    if (existsSync(ENV_PATH)) {
      let env = readFileSync(ENV_PATH, 'utf8');
      env = env.replace(/^META_ACCESS_TOKEN=.*/m, `META_ACCESS_TOKEN=${longToken}`);
      if (igId) env = env.replace(/^GILD_INSTAGRAM_BUSINESS_ID=.*/m, `GILD_INSTAGRAM_BUSINESS_ID=${igId}`);
      writeFileSync(ENV_PATH, env, 'utf8');
      console.log('\n📝  .env updated.');
    } else {
      console.warn('\n⚠️   .env not found — values not saved locally. Copy manually:');
    }

    console.log('\n📋  Add these to Cloudflare Pages → Settings → Environment Variables:');
    console.log(`    META_ACCESS_TOKEN        = ${longToken.slice(0, 24)}… (${longToken.length} chars)`);
    if (igId) console.log(`    GILD_INSTAGRAM_BUSINESS_ID = ${igId}`);
    console.log('\n🔁  Re-run this script in 50 days to refresh the token before it expires.\n');

  } catch (err) {
    console.error('\n❌  Error:', err.message, '\n');
  }
});

server.listen(PORT, () => {
  console.log(`   Waiting for callback on http://localhost:${PORT}/callback …\n`);
});
