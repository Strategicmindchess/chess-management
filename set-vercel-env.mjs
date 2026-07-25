import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

const envs = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const splitIndex = trimmed.indexOf('=');
    const key = trimmed.substring(0, splitIndex).trim();
    let val = trimmed.substring(splitIndex + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    if (key !== 'ADMIN_NAME' && key !== 'ADMIN_EMAIL' && key !== 'ADMIN_PASSWORD') {
      envs[key] = val;
    }
  }
}

for (const [key, val] of Object.entries(envs)) {
  console.log(`Setting ${key}...`);
  try {
    // Vercel CLI reads from stdin for env values
    execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
  } catch(e) {} // ignore if it doesn't exist

  try {
    // We can pass value via stdin: echo "value" | vercel env add KEY production
    // But since child_process allows input, we can do:
    execSync(`npx vercel env add ${key} production`, { input: val });
    console.log(`Successfully set ${key}`);
  } catch (e) {
    console.error(`Failed to set ${key}:`, e.message);
  }
}

console.log('Finished setting environment variables. Redeploying...');
try {
  execSync('npx vercel deploy --prod --yes', { stdio: 'inherit' });
} catch (e) {
  console.error('Redeploy failed:', e.message);
}
