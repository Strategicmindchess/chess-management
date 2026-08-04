/**
 * Demo Seed Script — fills the database with realistic demo data.
 *
 * Run with:  npm run db:seed:demo
 *
 * Creates:
 *   - 1 admin, 2 coaches, 4 students
 *   - 3 batches at different levels and startSession values
 *   - Class instances for all batches (fully syllabus-mapped with sessionNumber)
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma }  = await import('./src/lib/prisma');
  const bcrypt      = await import('bcryptjs');

  console.log('🌱 Seeding demo data...\n');

  const hashed = await bcrypt.hash('Demo@1234', 10);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@smc.dev' },
    update: {},
    create: {
      email: 'admin@smc.dev',
      name: 'SMC Admin',
      passwordHash: hashed,
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  // ── Coaches ───────────────────────────────────────────────────────────────
  const coachData = [
    { email: 'coach1@smc.dev', name: 'Rahul Sharma' },
    { email: 'coach2@smc.dev', name: 'Priya Singh' },
  ];

  const coaches = await Promise.all(
    coachData.map(({ email, name }) =>
      prisma.user.upsert({
        where:   { email },
        update:  {},
        create: {
          email,
          name,
          passwordHash: hashed,
          role: 'TEACHER',
          emailVerified: true,
          coachProfile: { create: {} },
        },
        include: { coachProfile: true },
      })
    )
  );
  console.log('✅ Coaches:', coaches.map(c => c.name).join(', '));

  // ── Students ──────────────────────────────────────────────────────────────
  const studentData = [
    { email: 'student1@smc.dev', name: 'Aarav Gupta',  city: 'Jhansi',  rating: 800 },
    { email: 'student2@smc.dev', name: 'Ishaan Mehta', city: 'Kanpur',  rating: 950 },
    { email: 'student3@smc.dev', name: 'Kavya Patel',  city: 'Lucknow', rating: 1100 },
    { email: 'student4@smc.dev', name: 'Riya Joshi',   city: 'Agra',    rating: 1250 },
  ];

  const students = await Promise.all(
    studentData.map(({ email, name, city, rating }) =>
      prisma.user.upsert({
        where:   { email },
        update:  {},
        create: {
          email,
          name,
          passwordHash: hashed,
          role: 'STUDENT',
          emailVerified: true,
          studentProfile: {
            create: {
              parentName:    `Parent of ${name}`,
              parentPhone:   `9876500000`,
              city,
              chessComId:    name.split(' ')[0].toLowerCase(),
              lichessId:     name.split(' ')[0].toLowerCase() + '_lc',
              chessComRating: rating,
            },
          },
        },
        include: { studentProfile: true },
      })
    )
  );
  console.log('✅ Students:', students.map(s => s.name).join(', '));

  const coach1 = coaches[0].coachProfile!;
  const coach2 = coaches[1].coachProfile!;
  const s1 = students[0].studentProfile!;
  const s2 = students[1].studentProfile!;
  const s3 = students[2].studentProfile!;
  const s4 = students[3].studentProfile!;

  // ── Batch 1: BEGINNER group, startSession = 1 ────────────────────────────
  const batch1 = await prisma.batch.create({
    data: {
      name:         'Beginners Group A',
      code:         'BG-DEMO-01',
      meetLink:     'https://meet.google.com/demo-bg-001',
      type:         'GROUP_SESSION',
      payoutRate:   300,
      level:        'BEGINNER',
      startSession: 1,
      startDate:    new Date(),
      coach:    { connect: { id: coach1.id } },
      schedules: {
        create: [
          { day: 'MONDAY',    startTime: '16:00', endTime: '17:00' },
          { day: 'WEDNESDAY', startTime: '16:00', endTime: '17:00' },
          { day: 'FRIDAY',    startTime: '16:00', endTime: '17:00' },
        ],
      },
      students: {
        create: [
          { studentProfileId: s1.id },
          { studentProfileId: s2.id },
        ],
      },
    },
  });
  console.log('✅ Batch 1:', batch1.name);

  // ── Batch 2: CORE_1 group, startSession = 4 ──────────────────────────────
  const batch2 = await prisma.batch.create({
    data: {
      name:         'Core Level 1 – Group B',
      code:         'CL1-DEMO-01',
      meetLink:     'https://meet.google.com/demo-cl1-001',
      type:         'GROUP_SESSION',
      payoutRate:   400,
      level:        'CORE_1',
      startSession: 4,
      startDate:    new Date(),
      coach:    { connect: { id: coach2.id } },
      schedules: {
        create: [
          { day: 'TUESDAY',  startTime: '17:00', endTime: '18:00' },
          { day: 'THURSDAY', startTime: '17:00', endTime: '18:00' },
          { day: 'SATURDAY', startTime: '10:00', endTime: '11:00' },
        ],
      },
      students: {
        create: [
          { studentProfileId: s3.id },
          { studentProfileId: s4.id },
        ],
      },
    },
  });
  console.log('✅ Batch 2:', batch2.name);

  // ── Batch 3: INTERMEDIATE_2 1-on-1, startSession = 6 ─────────────────────
  const batch3 = await prisma.batch.create({
    data: {
      name:         '1-on-1 Intermediate Session',
      code:         'IM2-DEMO-01',
      meetLink:     'https://meet.google.com/demo-im2-001',
      type:         'ONE_ON_ONE_SESSION',
      payoutRate:   700,
      level:        'INTERMEDIATE_2',
      startSession: 6,
      startDate:    new Date(),
      coach:    { connect: { id: coach1.id } },
      schedules: {
        create: [
          { day: 'SATURDAY', startTime: '14:00', endTime: '15:00' },
          { day: 'SUNDAY',   startTime: '14:00', endTime: '15:00' },
        ],
      },
      students: {
        create: [
          { studentProfileId: s1.id },
        ],
      },
    },
  });
  console.log('✅ Batch 3:', batch3.name);

  // ── Generate class instances for all batches ─────────────────────────────
  const { generateInstancesInternal } = await import('./src/lib/instance-generator');
  const { SYLLABUS_MAP } = await import('./src/lib/syllabus');

  for (const batch of [batch1, batch2, batch3]) {
    const level       = batch.level as keyof typeof SYLLABUS_MAP | null;
    // @ts-ignore — startSession is a valid field post db push
    const start       = (batch as any).startSession ?? 1;
    const info        = level ? SYLLABUS_MAP[level] : null;
    const count       = info ? info.lectures - start + 1 : 10;

    await generateInstancesInternal(
      batch.id,
      Math.max(count, 1),
      batch.startDate ? new Date(batch.startDate) : new Date(),
      start,
    );
    console.log(`   → Generated ${count} instances for "${batch.name}" (sessions ${start}–${info?.lectures ?? '?'})`);
  }

  console.log('\n🎉 Demo seed complete!');
  console.log('─────────────────────────────────');
  console.log('Login credentials (password: Demo@1234)');
  console.log('  Admin:     admin@smc.dev');
  console.log('  Coach 1:   coach1@smc.dev');
  console.log('  Coach 2:   coach2@smc.dev');
  console.log('  Student 1: student1@smc.dev');
  console.log('─────────────────────────────────');

  process.exit(0);
}

main().catch((e) => { console.error('\n❌ Seed failed:', e.message); process.exit(1); });
