import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

let envArgs = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const splitIndex = trimmed.indexOf('=');
    const key = trimmed.substring(0, splitIndex).trim();
    let val = trimmed.substring(splitIndex + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    
    // Skip dev seeds
    if (key !== 'ADMIN_NAME' && key !== 'ADMIN_EMAIL' && key !== 'ADMIN_PASSWORD') {
      envArgs += ` -e ${key}="${val}"`;
      if (key === 'DATABASE_URL') {
        envArgs += ` -b ${key}="${val}"`;
      }
    }
  }
}

console.log('Running Vercel Deploy...');
try {
  const cmd = `npx vercel deploy --prod --yes ${envArgs}`;
  console.log('Executing:', cmd.replace(/"[^"]+"/g, '"***"')); // hide secrets in logs
  execSync(cmd, { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (e) {
  console.error('Deployment failed:', e.message);
  process.exit(1);
}
