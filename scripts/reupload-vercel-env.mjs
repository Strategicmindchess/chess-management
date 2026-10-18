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
      if (key && !['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'].includes(key) && val !== '') {
        envs[key] = val;
      }
    }
  }
  return envs;
}

const localEnvs = parseEnv(path.resolve(process.cwd(), '.env'));
const prodEnvs = parseEnv(path.resolve(process.cwd(), '.env.production'));

const finalEnvs = {
  ...localEnvs,
  ...prodEnvs,
};

// Ensure production safe endpoints
if (!finalEnvs.APP_URL || finalEnvs.APP_URL.includes('localhost')) {
  finalEnvs.APP_URL = 'https://smchess-production.vercel.app';
}
if (!finalEnvs.REDIS_URL || finalEnvs.REDIS_URL.includes('localhost')) {
  finalEnvs.REDIS_URL = 'redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936';
}
if (!finalEnvs.WHATSAPP_VERIFY_TOKEN) {
  finalEnvs.WHATSAPP_VERIFY_TOKEN = 'smc_secret_webhook_verify_token_2026';
}

function runCommand(cmd, input = null) {
  return new Promise((resolve) => {
    const child = exec(cmd, { encoding: 'utf-8' }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        error: error ? error.message : null,
      });
    });
    if (input !== null && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

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
  console.log('🗑️  STEP 1: DELETING ALL PREVIOUS VERCEL ENV VARIABLES');
  console.log('========================================================');

  // List existing env keys
  const keysToDelete = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_API_VERSION',
    'WHATSAPP_VERIFY_TOKEN',
    'FEES_PAGE_PIN',
    'REDIS_URL',
    'REDISUSER',
    'REDISPORT',
    'REDISPASSWORD',
    'REDISHOST',
    'REDIS_PASSWORD',
    'S3_SECRET_ACCESS_KEY',
    'S3_ACCESS_KEY_ID',
    'S3_BUCKET_NAME',
    'S3_REGION',
    'S3_ENDPOINT_URL',
    'EMAIL_FROM',
    'SMTP_PASSWORD',
    'SMTP_USER',
    'SMTP_PORT',
    'SMTP_HOST',
    'APP_URL',
    'SESSION_SECRET',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];

  console.log(`Removing ${keysToDelete.length} variables from production and preview...`);
  await mapConcurrent(keysToDelete, 4, async (key) => {
    await runCommand(`npx vercel env rm ${key} production --yes`);
    await runCommand(`npx vercel env rm ${key} preview --yes`);
    console.log(`  🗑️ Removed ${key}`);
  });

  console.log('\n========================================================');
  console.log('✨ STEP 2: FRESH RE-UPLOAD OF ALL ENVIRONMENT VARIABLES');
  console.log('========================================================');

  const entries = Object.entries(finalEnvs);
  console.log(`Re-uploading ${entries.length} variables to production...`);

  const uploadResults = await mapConcurrent(entries, 3, async ([key, val]) => {
    const masked = val.length > 8
      ? `${val.substring(0, 3)}...${val.substring(val.length - 3)}`
      : '***';
    console.log(`Setting ${key} (${masked})...`);
    const res = await runCommand(`npx vercel env add ${key} production --force --yes`, val);
    if (res.success) {
      console.log(`  ✅ Successfully set ${key}`);
      return { key, success: true };
    } else {
      console.error(`  ❌ Failed ${key}:`, res.stderr || res.stdout);
      return { key, success: false };
    }
  });

  const successCount = uploadResults.filter(r => r.success).length;
  console.log('\n========================================================');
  console.log(`🎉 Finished! Successfully uploaded ${successCount} / ${entries.length} variables.`);
  console.log('========================================================\n');
}

main().catch(console.error);
