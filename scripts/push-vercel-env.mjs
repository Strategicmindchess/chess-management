import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const envs = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const splitIndex = trimmed.indexOf('=');
      const key = trimmed.substring(0, splitIndex).trim();
      let val = trimmed.substring(splitIndex + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (key && !['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'].includes(key)) {
        envs[key] = val;
      }
    }
  }
  return envs;
}

const localEnvs = parseEnv(path.resolve(process.cwd(), '.env'));
const prodEnvs = parseEnv(path.resolve(process.cwd(), '.env.production'));

// Merge variables
const finalEnvs = {
  ...localEnvs,
  ...prodEnvs,
};

// Guardrails: Vercel Production must point to production URLs, not localhost
if (!finalEnvs.APP_URL || finalEnvs.APP_URL.includes('localhost')) {
  finalEnvs.APP_URL = 'https://smchess-production.vercel.app';
}
if (!finalEnvs.REDIS_URL || finalEnvs.REDIS_URL.includes('localhost')) {
  finalEnvs.REDIS_URL = 'redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936';
}

function runVercelEnvAdd(key, value, env = 'production') {
  return new Promise((resolve) => {
    const child = exec(`npx vercel env add ${key} ${env} --force --yes`, {
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, key, error: (stderr || stdout || error.message).trim() });
      } else {
        resolve({ success: true, key });
      }
    });

    if (child.stdin) {
      child.stdin.write(value || '');
      child.stdin.end();
    }
  });
}

// Concurrency pool helper
async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function main() {
  console.log('========================================================');
  console.log('🚀 PUSHING ENVIRONMENT VARIABLES TO VERCEL (PRODUCTION)');
  console.log('========================================================');

  const entries = Object.entries(finalEnvs);
  console.log(`Pushing ${entries.length} variables with concurrency 3...\n`);

  const results = await mapConcurrent(entries, 3, async ([key, val]) => {
    const masked = val.length > 8
      ? `${val.substring(0, 3)}...${val.substring(val.length - 3)}`
      : '***';
    console.log(`Setting ${key} (${masked})...`);
    const res = await runVercelEnvAdd(key, val, 'production');
    if (res.success) {
      console.log(`  ✅ Successfully updated ${key}`);
    } else {
      console.error(`  ❌ Failed ${key}:`, res.error);
    }
    return res;
  });

  const successful = results.filter(r => r.success).length;
  console.log('\n========================================================');
  console.log(`🎉 Finished pushing env vars to Vercel!`);
  console.log(`   Successful: ${successful} / ${results.length}`);
  console.log('========================================================\n');
}

main().catch(console.error);
