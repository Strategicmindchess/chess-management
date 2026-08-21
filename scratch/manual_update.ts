import { prisma } from '../src/lib/prisma';

async function main() {
  const updates = [
    {
      id: 'cmsglzjss001dggiacbwvempd',
      url: 'https://lichess.org/practice/checkmates/checkmate-patterns-ii/8yadFPpU',
    },
    {
      id: 'cmsglzjss001eggia4jxckr06',
      url: 'https://lichess.org/practice/checkmates/checkmate-patterns-iii/PDkQDt6u',
    },
    {
      id: 'cmsglzjss001gggia8owjs7o1',
      url: 'https://lichess.org/practice/fundamental-tactics/overloaded-pieces/o734CNqp',
    },
    {
      id: 'cmsglzjss002qggiafai8oqbp', // Rook endgame (Vancura) - Not actually L19 of Core 1 in text, but let's give it the Vancura link if we can find it, or leave it. Wait, actually I will find the Vancura link first. Let me leave this out for a moment.
      url: 'SKIP'
    }
  ];

  for (const u of updates) {
      if (u.url === 'SKIP') continue;
      await prisma.resource.update({
          where: { id: u.id },
          data: { url: u.url }
      });
      console.log(`Updated ${u.id} -> ${u.url}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
