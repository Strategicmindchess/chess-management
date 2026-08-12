import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  const snapshots = await prisma.chessActivitySnapshot.findMany({ 
    where: { 
      periodType: 'MONTHLY',
      student: { chessAccount: { isNot: null } }
    } 
  });
  console.log('Filtered Snapshots:', snapshots.length);
}

main().finally(() => process.exit(0));
