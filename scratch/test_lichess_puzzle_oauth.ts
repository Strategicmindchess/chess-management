/**
 * TEST: Lichess Puzzle Activity API
 * 
 * Tests 3 things:
 * 1. Public /activity endpoint (what we currently use) — no auth
 * 2. Authenticated /api/puzzle/activity endpoint — needs puzzle:read scope
 * 3. What the OAuth URL would look like for a student to grant access
 *
 * USERNAME: TrijalPanday
 *
 * Run: npx tsx scratch/test_lichess_puzzle_oauth.ts
 * Or with token: LICHESS_TOKEN=lip_xxx npx tsx scratch/test_lichess_puzzle_oauth.ts
 */

import * as crypto from 'crypto';

const LICHESS_USERNAME = 'TrijalPanday';
const LICHESS_TOKEN    = process.env.LICHESS_TOKEN ?? null;
const BASE             = 'https://lichess.org';

// August 2026 period
const PERIOD_START = new Date('2026-08-01T00:00:00.000Z');
const PERIOD_END   = new Date('2026-08-31T23:59:59.999Z');

// ─────────────────────────────────────────────────────────────────────────────

function separator(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─────────────────────────────────────────────────────────────────────────────

async function test1_publicActivity() {
  separator('TEST 1: Current method — Public /activity endpoint');
  
  const url = `${BASE}/api/user/${LICHESS_USERNAME}/activity`;
  console.log(`GET ${url}`);
  console.log('Auth: None (public)');

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
      'Accept': 'application/json',
    }
  });

  console.log(`\nHTTP Status: ${resp.status} ${resp.statusText}`);

  if (!resp.ok) {
    console.log(`❌ FAILED`);
    return;
  }

  const activity: any[] = await resp.json();
  console.log(`✅ OK — returned ${activity.length} entries`);

  if (activity.length > 0) {
    const oldest = new Date(activity[activity.length - 1].interval.start);
    const newest = new Date(activity[0].interval.start);
    console.log(`   Date range: ${oldest.toISOString().slice(0,10)} → ${newest.toISOString().slice(0,10)}`);
    console.log(`   Days span: ${Math.round((newest.getTime() - oldest.getTime()) / 86400000)} days`);
  }

  // Count puzzles
  let totalPlayed = 0, totalSolved = 0;
  let augPlayed = 0, augSolved = 0;

  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts || !entry.puzzles) continue;
    const score = entry.puzzles.score;
    const played = (score?.win ?? 0) + (score?.loss ?? 0) + (score?.draw ?? 0);
    const solved = score?.win ?? 0;
    totalPlayed += played;
    totalSolved += solved;
    if (ts >= PERIOD_START.getTime() && ts <= PERIOD_END.getTime()) {
      augPlayed += played;
      augSolved += solved;
    }
  }

  console.log(`\n   All entries: ${totalPlayed} played, ${totalSolved} solved`);
  console.log(`   Aug 2026:    ${augPlayed} played, ${augSolved} solved`);
  console.log(`\n   ⚠️  LIMITATION: This API only returns last ~${activity.length} active days.`);
  console.log(`   Earlier August puzzle data is NOT included if user had gaps in activity.`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function test2_puzzleActivityAuthenticated() {
  separator('TEST 2: Authenticated /api/puzzle/activity endpoint (puzzle:read scope)');

  const url = `${BASE}/api/puzzle/activity?max=100`;
  console.log(`GET ${url}`);
  console.log(`Auth: Bearer token (puzzle:read scope required)`);
  console.log(`Token provided: ${LICHESS_TOKEN ? '✅ YES (from LICHESS_TOKEN env var)' : '❌ NO'}`);

  if (!LICHESS_TOKEN) {
    console.log(`\n⚠️  Skipping authenticated test — no token provided.`);
    console.log(`   To test: Create a personal token at https://lichess.org/account/oauth/token`);
    console.log(`   Select scope: "Read puzzle activity" (puzzle:read)`);
    console.log(`   Then run: LICHESS_TOKEN=lip_xxxx npx tsx scratch/test_lichess_puzzle_oauth.ts`);
    
    // Still test what happens without token
    console.log(`\n   Testing without token to see error response...`);
    const noAuthResp = await fetch(url, {
      headers: { 'User-Agent': 'SMC-CRM/1.0', 'Accept': 'application/x-ndjson' }
    });
    console.log(`   No-auth response: ${noAuthResp.status} ${noAuthResp.statusText}`);
    const body = await noAuthResp.text();
    console.log(`   Response body: ${body.slice(0, 200)}`);
    return;
  }

  // With token
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${LICHESS_TOKEN}`,
      'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
      'Accept': 'application/x-ndjson',
    }
  });

  console.log(`\nHTTP Status: ${resp.status} ${resp.statusText}`);

  if (!resp.ok) {
    const body = await resp.text();
    console.log(`❌ FAILED: ${body}`);
    return;
  }

  // Parse NDJSON stream
  const text = await resp.text();
  const lines = text.trim().split('\n').filter(Boolean);
  const puzzles = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  console.log(`✅ OK — returned ${puzzles.length} puzzle activity entries`);

  if (puzzles.length > 0) {
    console.log(`   First entry (sample):`, JSON.stringify(puzzles[0], null, 2));
    
    // Find entries in Aug 2026
    const augPuzzles = puzzles.filter((p: any) => {
      const ts = p.date;
      return ts >= PERIOD_START.getTime() && ts <= PERIOD_END.getTime();
    });
    
    console.log(`\n   Aug 2026 entries: ${augPuzzles.length}`);
    const augSolved = augPuzzles.filter((p: any) => p.win).length;
    const augLost   = augPuzzles.filter((p: any) => !p.win).length;
    console.log(`   Aug 2026 solved: ${augSolved}`);
    console.log(`   Aug 2026 failed: ${augLost}`);
    console.log(`   Aug 2026 total attempts: ${augPuzzles.length}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function test3_showOAuthURL() {
  separator('TEST 3: What OAuth URL would look like for puzzle:read');

  // Generate PKCE verifier & challenge (same as OAuth flow)
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'smc-crm',
    redirect_uri: `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/lichess/callback`,
    scope: 'puzzle:read',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: 'random-state-value',
  });

  const oauthUrl = `${BASE}/oauth?${params.toString()}`;

  console.log(`\n  PKCE Verifier (save in session): ${verifier}`);
  console.log(`  PKCE Challenge (sent to Lichess): ${challenge}`);
  console.log(`\n  Step 1 — Redirect user to:`);
  console.log(`  ${oauthUrl}`);
  console.log(`\n  Step 2 — After user approves, Lichess calls:`);
  console.log(`  /api/auth/lichess/callback?code=ABC123&state=random-state-value`);
  console.log(`\n  Step 3 — Exchange code for token:`);
  console.log(`  POST ${BASE}/api/token`);
  console.log(`  Body: {`);
  console.log(`    grant_type: "authorization_code",`);
  console.log(`    code: "ABC123",              // from callback`);
  console.log(`    code_verifier: "${verifier.slice(0,20)}...", // from session`);
  console.log(`    client_id: "smc-crm",`);
  console.log(`    redirect_uri: "http://localhost:3000/api/auth/lichess/callback"`);
  console.log(`  }`);
  console.log(`\n  Step 4 — Use token for puzzle activity:`);
  console.log(`  GET ${BASE}/api/puzzle/activity?max=500`);
  console.log(`  Authorization: Bearer <access_token>`);
  console.log(`  Accept: application/x-ndjson  (streaming NDJSON format)`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  LICHESS PUZZLE ACTIVITY API — TEST REPORT               ║');
  console.log(`║  User: ${LICHESS_USERNAME.padEnd(51)}║`);
  console.log(`║  Period: Aug 2026                                        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await test1_publicActivity();
  await test2_puzzleActivityAuthenticated();
  await test3_showOAuthURL();

  separator('SUMMARY');
  console.log(`
  Method                │ Auth Required │ Data Coverage    │ Per-Puzzle Detail
  ──────────────────────┼───────────────┼──────────────────┼───────────────────
  /activity (current)   │ ❌ None       │ ~last 7-40 days  │ ❌ Daily aggregates only
  /api/puzzle/activity  │ ✅ puzzle:read│ Full history      │ ✅ Each puzzle individually
  
  VERDICT:
  ─────────────────────────────────────────────────────────────────────────────
  • Current system shows 169 solved because activity API only gave last 7 days.
  • Trijal's Lichess dashboard shows 394 played (21 days) — more data available.
  • To fix: implement OAuth puzzle:read flow so students link Lichess account.
  • Then use /api/puzzle/activity to get EXACT per-puzzle data per month.
  `);
}

main().catch(console.error);
