import fs from 'fs';

const filePath = 'src/workers/chess-fetch.worker.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Move ccState and liState declarations to the top of processJob and add startedAt
content = content.replace(
  /export default async function \(job: Job\) \{/,
  `export default async function (job: Job) {\n  const startedAt = new Date();\n  let ccState: ProviderState = 'SKIPPED';\n  let liState: ProviderState = 'SKIPPED';\n  let runError: string | null = null;\n  try {`
);

// 2. Adjust chessComUsername check
content = content.replace(
  /let ccState: ProviderState = chessComUsername \? 'FULL' : 'SKIPPED';/g,
  `ccState = chessComUsername ? 'FULL' : 'SKIPPED';`
);

// 3. Adjust lichessUsername check
content = content.replace(
  /let liState: ProviderState = lichessUsername \? 'FULL' : 'SKIPPED';/g,
  `liState = lichessUsername ? 'FULL' : 'SKIPPED';`
);

// 4. Change the throw behavior and close try/catch
// Locate the end of the function.
content = content.replace(
  /  return snapshot;\n\}/g,
  `
    await prisma.studentSyncRun.create({
      data: {
        studentProfileId,
        periodType,
        periodStart,
        status: 'UPDATED',
        chessComState: ccState,
        lichessState: liState,
        startedAt,
        completedAt: new Date(),
      }
    });

    return snapshot;
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    const isPreserved = errorMsg.includes('Data Fetch Failed: CC=') || ccState === 'FAILED' || liState === 'FAILED';
    const finalStatus = isPreserved ? 'PRESERVED' : 'FAILED';
    
    await prisma.studentSyncRun.create({
      data: {
        studentProfileId,
        periodType,
        periodStart,
        status: finalStatus,
        chessComState: ccState,
        lichessState: liState,
        error: errorMsg,
        startedAt,
        completedAt: new Date(),
      }
    });

    throw err;
  }
}`
);

fs.writeFileSync(filePath, content);
console.log('Worker updated.');
