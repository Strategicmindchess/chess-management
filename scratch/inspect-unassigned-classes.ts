import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { fromZonedTime } from 'date-fns-tz';

async function main() {
  const cutoff = fromZonedTime('2026-10-28 00:00:00', 'Asia/Kolkata');

  const rows: any[] = await prisma.$queryRaw`
    SELECT 
      b."code" as batch_code,
      b."name" as batch_name,
      b."isActive" as batch_is_active,
      b."coachProfileId" as batch_coach_profile_id,
      u."name" as coach_name,
      COUNT(ci."id") as instances_count,
      MIN(ci."date") as min_date,
      MAX(ci."date") as max_date
    FROM "class_instances" ci
    JOIN "batches" b ON ci."batchId" = b."id"
    LEFT JOIN "coach_profiles" cp ON b."coachProfileId" = cp."id"
    LEFT JOIN "users" u ON cp."userId" = u."id"
    WHERE ci."date" >= ${cutoff}
      AND ci."class_instance_coach" IS NULL
    GROUP BY b."code", b."name", b."isActive", b."coachProfileId", u."name"
    ORDER BY instances_count DESC;
  `;

  console.log(`\n=== 89 UNASSIGNED FUTURE CLASSES BREAKDOWN ===\n`);
  let total = 0;
  for (const r of rows) {
    total += Number(r.instances_count);
    console.log(`• Batch: ${r.batch_code} ("${r.batch_name}")`);
    console.log(`  - Active: ${r.batch_is_active ? 'YES' : 'NO (Inactive/Archived)'}`);
    console.log(`  - Batch Coach in DB: ${r.coach_name || 'NONE / NULL'}`);
    console.log(`  - Unassigned Instances: ${r.instances_count}`);
    console.log(`  - Date Range: ${r.min_date?.toISOString().split('T')[0]} to ${r.max_date?.toISOString().split('T')[0]}`);
    console.log('──────────────────────────────────────────────────────');
  }
  console.log(`\nTotal Unassigned Classes: ${total}`);
}

main().finally(() => prisma.$disconnect());
