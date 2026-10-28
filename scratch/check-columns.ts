import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const tables = ['class_instances', 'batches', 'class_logs'];
  for (const t of tables) {
    const cols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = '${t}'
      ORDER BY ordinal_position;
    `);
    console.log(`\n=== Table: ${t} ===`);
    for (const c of cols) {
      console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
    }
  }
}

main().finally(() => prisma.$disconnect());
