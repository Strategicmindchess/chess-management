import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  const res = await prisma.$queryRawUnsafe('SELECT column_name FROM information_schema.columns WHERE table_name = \'batches\'');
  console.log(res);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
