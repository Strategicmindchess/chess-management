import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../src/actions/syllbuss/assinment.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim());

  let currentLevel = null;
  let currentLectureNumber = null;
  const extractedAssignments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^Beginner Level/i)) currentLevel = 'BEGINNER';
    else if (line.match(/^Core Level 1/i)) currentLevel = 'CORE_1';
    else if (line.match(/^Core Level 2/i)) currentLevel = 'CORE_2';
    else if (line.match(/^Core Level 3/i)) currentLevel = 'CORE_3';
    else if (line.match(/^Core Level 4/i)) currentLevel = 'CORE_4';
    else if (line.match(/^Bridge Level/i)) currentLevel = 'BRIDGE';
    else if (line.match(/^Intermediate Level 1/i)) currentLevel = 'INTERMEDIATE_1';
    else if (line.match(/^Intermediate Level 2/i)) currentLevel = 'INTERMEDIATE_2';
    else if (line.match(/^Intermediate Level 3/i)) currentLevel = 'INTERMEDIATE_3';
    else if (line.match(/^Advance Level 1/i)) currentLevel = 'ADVANCE_1';

    const lecMatch = line.match(/^Lecture\s*(\d+):/i);
    if (lecMatch) {
      currentLectureNumber = parseInt(lecMatch[1]);
    }

    if (line.match(/^Assignment/i) || line.match(/^Assignments/i)) {
      let url = null;
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
      }

      if (url && currentLevel && currentLectureNumber) {
        extractedAssignments.push({
          level: currentLevel,
          lecture: currentLectureNumber,
          url
        });
      }
    }
  }

  const brokenResources = await prisma.resource.findMany({
    where: { url: '#' }
  });

  const allResources = await prisma.resource.findMany();

  const operations = [];
  const updatedLogs = [];

  // Group broken resources properly without string splitting
  const brokenGroups = []; // Array of { level, lecture, resources: [] }
  for (const broken of brokenResources) {
    if (!broken.level || !broken.lectureNumber) continue;
    if (broken.title.toLowerCase().includes('play')) continue;

    let group = brokenGroups.find(g => g.level === broken.level && g.lecture === broken.lectureNumber);
    if (!group) {
      group = { level: broken.level, lecture: broken.lectureNumber, resources: [] };
      brokenGroups.push(group);
    }
    group.resources.push(broken);
  }

  for (const group of brokenGroups) {
    const { level, lecture, resources } = group;

    const fileUrls = extractedAssignments
      .filter(a => a.level === level && a.lecture === lecture)
      .map(a => a.url);

    const dbUrls = allResources
      .filter(r => r.level === level && r.lectureNumber === lecture && r.url !== '#')
      .map(r => r.url);

    const missingUrls = fileUrls.filter(u => !dbUrls.includes(u));

    // STRICT SAFETY CHECK: only auto update if exactly 1 broken resource and 1 missing URL
    if (resources.length === 1 && missingUrls.length === 1) {
      const broken = resources[0];
      const newUrl = missingUrls[0];
      
      operations.push(
        prisma.resource.update({
          where: { id: broken.id },
          data: { url: newUrl }
        })
      );
      updatedLogs.push(`- ID: ${broken.id} | Level: ${level} | Lecture: ${lecture} -> ${newUrl}`);
    } else {
      console.log(`[MANUAL REVIEW REQUIRED] Level: ${level}, Lecture: ${lecture}`);
      console.log(`  Broken resources in DB: ${resources.length} (${resources.map(r => r.id).join(', ')})`);
      console.log(`  Missing URLs in file: ${missingUrls.length} (${missingUrls.join(', ')})`);
    }
  }

  if (operations.length > 0) {
    console.log(`\nExecuting transaction to update ${operations.length} resources safely...`);
    await prisma.$transaction(operations);
    console.log(`Successfully updated the following records:`);
    updatedLogs.forEach(log => console.log(log));
  } else {
    console.log("\nNo more safe 1-to-1 matches found to update.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
