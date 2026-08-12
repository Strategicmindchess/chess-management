import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import * as fs from 'fs';

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const text = fs.readFileSync('src/actions/syllbuss/assinment.txt', 'utf8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentLevel: string | null = null;
  let currentLectureNum: number | null = null;
  let currentTitle: string = '';
  
  const resourcesToCreate: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.toLowerCase().startsWith('core level 3')) {
      currentLevel = 'CORE_3';
      continue;
    } else if (line.toLowerCase().startsWith('core level 4')) {
      currentLevel = 'CORE_4';
      continue;
    }

    if (!currentLevel) continue;

    // e.g. "Lecture 1: Revision Of core Level-2"
    if (line.toLowerCase().startsWith('lecture ')) {
      const match = line.match(/lecture\s+(\d+)\s*:\s*(.*)/i);
      if (match) {
        currentLectureNum = parseInt(match[1]);
        currentTitle = match[2];
      }
    } 
    // e.g. "Assignment 1- https://lichess..."
    else if (line.toLowerCase().startsWith('assignment') || line.toLowerCase().startsWith('assignments')) {
      if (currentLevel && currentLectureNum) {
        let url = '';
        let desc = line;
        
        // Extract URL
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          url = urlMatch[1];
        } else {
          // Sometimes the URL is on the next line
          if (i + 1 < lines.length && lines[i+1].startsWith('http')) {
            url = lines[i+1].split(' ')[0];
            desc += ' ' + lines[i+1];
            i++; // skip next line
          }
        }
        
        resourcesToCreate.push({
          title: currentTitle || `Lecture ${currentLectureNum} Assignment`,
          description: desc,
          url: url || 'N/A',
          type: url.includes('pdf') ? 'PDF' : (url.includes('lichess.org') || url.includes('chess.com') ? 'HOMEWORK' : 'OTHER'),
          level: currentLevel,
          lectureNumber: currentLectureNum
        });
      }
    }
  }

  console.log(`Found ${resourcesToCreate.length} resources to create.`);
  
  for (const res of resourcesToCreate) {
    await prisma.resource.create({
      data: {
        title: res.title,
        description: res.description,
        url: res.url,
        type: res.type,
        level: res.level as any,
        lectureNumber: res.lectureNumber
      }
    });
  }

  console.log('Successfully inserted Core 3 and Core 4 resources into the database.');
}

main().catch(console.error).finally(async () => {
  const { prisma } = await import('./src/lib/prisma');
  await prisma.$disconnect();
});
