import { prisma } from '../src/lib/prisma';
import { fetchChessComStats } from '../src/services/chess/chesscom';
import { fetchLichessActivity } from '../src/services/chess/lichess';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Helper to canonically sort object keys for stable JSON hashing
function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sortedKeys = Object.keys(obj).sort();
  const res: Record<string, any> = {};
  for (const k of sortedKeys) {
    res[k] = canonicalize(obj[k]);
  }
  return res;
}

function hashJson(obj: any): string {
  const str = JSON.stringify(canonicalize(obj));
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function run() {
  const accounts = await prisma.chessAccount.findMany({
    where: {
      OR: [
        { chessComUsername: { not: null } },
        { lichessUsername: { not: null } }
      ]
    }
  });

  console.log(`Found ${accounts.length} linked chess accounts.`);
  
  const logFile = 'test-consistency-log.jsonl';
  const dataLogFile = 'test-consistency-responses.jsonl';
  fs.writeFileSync(logFile, ''); // Clear old logs
  fs.writeFileSync(dataLogFile, ''); // Clear old data logs

  for (const acc of accounts) {
    console.log(`\nTesting studentProfileId: ${acc.studentProfileId}`);

    // --- Chess.com Test ---
    if (acc.chessComUsername) {
      console.log(`  -> Chess.com (${acc.chessComUsername})`);
      let previousHash: string | null = null;
      for (let run = 1; run <= 5; run++) {
        const res = await fetchChessComStats(acc.chessComUsername);
        
        // Chess.com stats returns an object when successful, not an array.
        const isValidData = res.ok && res.data !== null && typeof res.data === 'object';
        const recordCount = isValidData ? Object.keys(res.data).length : null;
        const genuineZero = isValidData && Object.keys(res.data).length === 0;
        
        const responseHash = isValidData ? hashJson(res.data) : null;
        
        let sameAsPrevious = false;
        if (run > 1 && previousHash !== null && responseHash !== null && responseHash === previousHash) {
          sameAsPrevious = true;
        }
        if (responseHash !== null) {
           previousHash = responseHash;
        }

        const logEntry = {
          studentId: acc.studentProfileId,
          provider: 'Chess.com',
          username: acc.chessComUsername,
          run,
          ok: res.ok,
          status: res.status,
          attempts: res.attempts,
          responseHash,
          recordCount,
          genuineZero,
          sameAsPrevious,
          error: res.ok ? null : res.error
        };

        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        
        const dataLogEntry = {
          studentId: acc.studentProfileId,
          provider: 'Chess.com',
          username: acc.chessComUsername,
          run,
          data: res.ok ? res.data : null
        };
        fs.appendFileSync(dataLogFile, JSON.stringify(dataLogEntry) + '\n');

        console.log(
          `     Run ${run}: ` +
          `OK=${res.ok}, ` +
          `attempts=${logEntry.attempts}, ` +
          `records=${recordCount ?? "N/A"}, ` +
          `genuineZero=${genuineZero}, ` +
          `sameAsPrev=${sameAsPrevious}, ` +
          `HTTP=${res.status}`
        );
      }
    }

    // --- Lichess Test ---
    if (acc.lichessUsername) {
      console.log(`  -> Lichess (${acc.lichessUsername})`);
      let previousHash: string | null = null;
      
      for (let run = 1; run <= 5; run++) {
        const res = await fetchLichessActivity(acc.lichessUsername);

        // Only successful array responses get a record count.
        // API failure is represented as null, NOT 0.
        const isValidData = res.ok && Array.isArray(res.data);

        const recordCount = isValidData ? res.data.length : null;

        // Genuine zero means:
        // API call succeeded AND API explicitly returned an empty array.
        const genuineZero = isValidData && res.data.length === 0;

        // Hash only successful responses.
        const responseHash = isValidData ? hashJson(res.data) : null;

        let sameAsPrevious = false;

        if (
          run > 1 &&
          previousHash !== null &&
          responseHash !== null &&
          responseHash === previousHash
        ) {
          sameAsPrevious = true;
        }

        // Only update previousHash when we received a successful response.
        if (responseHash !== null) {
          previousHash = responseHash;
        }

        const logEntry = {
          studentId: acc.studentProfileId,
          provider: "Lichess",
          username: acc.lichessUsername,
          run,

          // API result
          ok: res.ok,
          status: res.status,
          attempts: res.attempts,

          // Response consistency
          responseHash,
          recordCount,
          genuineZero,
          sameAsPrevious,

          // Error information
          error: res.ok ? null : res.error,
        };

        fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
        
        const dataLogEntry = {
          studentId: acc.studentProfileId,
          provider: 'Lichess',
          username: acc.lichessUsername,
          run,
          data: res.ok ? res.data : null
        };
        fs.appendFileSync(dataLogFile, JSON.stringify(dataLogEntry) + '\n');

        console.log(
          `     Run ${run}: ` +
          `OK=${res.ok}, ` +
          `attempts=${logEntry.attempts}, ` +
          `records=${recordCount ?? "N/A"}, ` +
          `genuineZero=${genuineZero}, ` +
          `sameAsPrev=${sameAsPrevious}, ` +
          `HTTP=${res.status}`
        );

        // Small delay to avoid aggressively hitting Lichess API.
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.log(`\nTest complete. Results saved to ${logFile} and ${dataLogFile}`);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
