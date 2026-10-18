import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const diff = execSync('git log -n 5 --stat', { encoding: 'utf-8' });
console.log('Recent git commits:');
console.log(diff);

const lastClientCommit = execSync('git log -n 3 -p src/services/whatsapp/client.ts', { encoding: 'utf-8' });
console.log('Recent changes to client.ts:');
console.log(lastClientCommit);
