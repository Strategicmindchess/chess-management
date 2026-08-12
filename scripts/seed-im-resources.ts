import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { ResourceType, BatchLevel } from '../src/generated/prisma/client';

const intermediate2Data = [
  { lecture: 1, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Panov_Attack', desc: '20 puzzles' },
  { lecture: 2, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Main_Line', desc: '20 puzzles' },
  { lecture: 3, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Najdorf_Variation', desc: '20 puzzles' },
  { lecture: 4, title: 'Assignment 1', url: 'https://lichess.org/training/sacrifice', desc: '20 puzzles' },
  { lecture: 5, title: 'Assignment 1', url: 'https://lichess.org/training/Ruy_Lopez', desc: '20 puzzles' },
  { lecture: 6, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Karpov_Variation', desc: '' },
  { lecture: 7, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 8, title: 'Assignment 1', url: 'https://lichess.org/training/middlegame', desc: '20 puzzles' },
  { lecture: 9, title: 'Assignment 1', url: 'https://lichess.org/training/rookEndgame', desc: '20 puzzles' },
  { lecture: 10, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Maroczy_Variation', desc: '20 puzzles' },
  { lecture: 11, title: 'Assignment 1', url: 'https://lichess.org/training/Queens_Gambit_Declined', desc: '20 puzzles' },
  { lecture: 12, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 13, title: 'Assignment 1', url: 'https://lichess.org/training/Benoni_Defense', desc: '20 puzzles' },
  { lecture: 14, title: 'Assignment 1', url: 'https://lichess.org/training/Benko_Gambit_Accepted', desc: '20 puzzles' },
  { lecture: 15, title: 'Assignment 1', url: 'https://lichess.org/training/trappedPiece', desc: '20 puzzles' },
  { lecture: 16, title: 'Assignment 1', url: 'https://lichess.org/training/knightEndgame', desc: '20 puzzles' },
  { lecture: 17, title: 'Assignment 1', url: 'https://lichess.org/practice/checkmates/knight-bishop-mate/ByhlXnmM', desc: '' },
  { lecture: 18, title: 'Assignment 1', url: 'https://lichess.org/training/knightEndgame', desc: '20 puzzles' },
  { lecture: 19, title: 'Assignment 1', url: 'https://lichess.org/training/bishopEndgame', desc: '20 puzzles' },
  { lecture: 20, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 21, title: 'Assignment 1', url: 'https://lichess.org/training/advancedPawn', desc: '20 puzzles' },
  { lecture: 22, title: 'Assignment 1', url: 'http://lichess.org/study/w3u83Bmi', desc: 'Solve puzzles' },
  { lecture: 23, title: 'Assignment 1', url: 'https://lichess.org/study/C56q6Skj', desc: 'Solve puzzles' },
  { lecture: 24, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 25, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Dragon_Variation', desc: '20 puzzles' },
  { lecture: 26, title: 'Assignment 1', url: 'https://lichess.org/training/kingsideAttack', desc: '20 puzzles' },
  { lecture: 27, title: 'Assignment 1', url: 'https://lichess.org/study/hwb8NOb3', desc: 'Revise and solve' },
  { lecture: 28, title: 'Assignment 1', url: 'https://lichess.org/training/Scotch_Game', desc: '20 puzzles' },
  { lecture: 29, title: 'Assignment 1', url: 'https://lichess.org/training/mateIn4', desc: '20 puzzles' },
  { lecture: 30, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Alapin_Variation', desc: '20 puzzles' },
  { lecture: 31, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense', desc: '20 puzzles' },
  { lecture: 32, title: 'Assignment 1', url: 'https://lichess.org/training/queensideAttack', desc: '20 puzzles' },
  { lecture: 33, title: 'Assignment 1', url: 'https://lichess.org/training/zugzwang', desc: '20 puzzles' },
  { lecture: 34, title: 'Assignment 1', url: 'https://lichess.org/training/queenRookEndgame', desc: '20 puzzles' },
  { lecture: 35, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 36, title: 'Assignment 1', url: 'https://chess.com', desc: 'Test-3' },
];

const intermediate3Data = [
  { lecture: 1, title: 'Assignment 1', url: 'https://lichess.org/training/Benko_Gambit', desc: '20 puzzles' },
  { lecture: 1, title: 'Assignment 2', url: 'https://lichess.org/training/Benoni_Defense', desc: '20 puzzles' },
  { lecture: 2, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Panov_Attack', desc: '20 puzzles' },
  { lecture: 3, title: 'Assignment 1', url: 'https://lichess.org/training/mateIn5', desc: '20 puzzles' },
  { lecture: 4, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Nimzowitsch_Variation', desc: '20 puzzles' },
  { lecture: 5, title: 'Assignment 1', url: 'https://lichess.org/training/French_Defense', desc: '20 puzzles' },
  { lecture: 6, title: 'Assignment 1', url: 'https://lichess.org/training/endgame', desc: '20 puzzles' },
  { lecture: 7, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 8, title: 'Assignment 1', url: 'https://lichess.org/training/quietMove', desc: '20 puzzles' },
  { lecture: 9, title: 'Assignment 1', url: 'https://lichess.org/training/rookEndgame', desc: '20 puzzles' },
  { lecture: 10, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Taimanov_Variation', desc: '20 puzzles' },
  { lecture: 11, title: 'Assignment 1', url: 'https://lichess.org/training/Zukertort_Opening_Queens_Gambit_Invitation', desc: '20 puzzles' },
  { lecture: 12, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 13, title: 'Assignment 1', url: 'https://lichess.org/training/Sicilian_Defense_Nimzowitsch_Variation', desc: '20 puzzles' },
  { lecture: 14, title: 'Assignment 1', url: 'https://lichess.org/study/rDIyncJ5', desc: '20 puzzles' },
  { lecture: 15, title: 'Assignment 1', url: 'https://lichess.org/training/crushing', desc: '20 puzzles' },
  { lecture: 16, title: 'Assignment 1', url: 'https://lichess.org/training/knightEndgame', desc: '20 puzzles' },
  { lecture: 17, title: 'Assignment 1', url: 'https://lichess.org/training/attackingF2F7', desc: '20 puzzles' },
  { lecture: 18, title: 'Assignment 1', url: 'https://lichess.org/training/rookEndgame', desc: '20 puzzles' },
  { lecture: 19, title: 'Assignment 1', url: 'https://lichess.org/training/pawnEndgame', desc: '20 puzzles' },
  { lecture: 20, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 21, title: 'Assignment 1', url: 'https://lichess.org/training/bishopEndgame', desc: '20 puzzles' },
  { lecture: 22, title: 'Assignment 1', url: 'https://lichess.org/training/Caro-Kann_Defense_Endgame_Offer', desc: '20 puzzles' },
  { lecture: 23, title: 'Assignment 1', url: 'https://lichess.org/study/TVwH9esF', desc: '20 puzzles' },
  { lecture: 24, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 25, title: 'Assignment 1', url: 'https://lichess.org/training/Hungarian_Opening_Catalan_Formation', desc: '20 puzzles' },
  { lecture: 26, title: 'Assignment 1', url: 'https://lichess.org/training/Hungarian_Opening_Catalan_Formation', desc: '20 puzzles' },
  { lecture: 27, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 28, title: 'Assignment 1', url: 'https://lichess.org/training/Catalan_Opening', desc: '20 puzzles' },
  { lecture: 29, title: 'Assignment 1', url: 'https://lichess.org/study/ME8aHtka', desc: '20 puzzles' },
  { lecture: 30, title: 'Assignment 1', url: 'https://lichess.org/training/veryLong', desc: '20 puzzles' },
  { lecture: 31, title: 'Assignment 1', url: 'https://lichess.org/training/attraction', desc: '20 puzzles' },
  { lecture: 32, title: 'Assignment 1', url: 'https://lichess.org/training/exposedKing', desc: '20 puzzles' },
  { lecture: 33, title: 'Assignment 1', url: 'https://lichess.org/training/zugzwang', desc: '20 puzzles' },
  { lecture: 34, title: 'Assignment 1', url: 'https://lichess.org/study/DNulewqC', desc: 'Revise Bhar’s Rule' },
  { lecture: 35, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 36, title: 'Assignment 1', url: 'https://lichess.org/training/veryLong', desc: '20 puzzles' },
  { lecture: 37, title: 'Assignment 1', url: 'https://lichess.org/training/collinearMove', desc: '20 puzzles' },
  { lecture: 38, title: 'Assignment 1', url: 'https://chess.com', desc: 'Play 5 games on chess.com' },
  { lecture: 39, title: 'Assignment 1', url: 'https://lichess.org/training/kingsideAttack', desc: '20 puzzles' },
  { lecture: 40, title: 'Assignment 1', url: 'https://chess.com', desc: 'Test-3' },
];

async function main() {
  const { prisma } = await import('../src/lib/prisma');
  console.log('Seeding Intermediate 2 and 3 resources...');
  
  // Clean up any existing ones to avoid duplicates
  await prisma.resource.deleteMany({
    where: {
      level: {
        in: ['INTERMEDIATE_2', 'INTERMEDIATE_3']
      }
    }
  });

  const i2inserts = intermediate2Data.map(r => ({
    title: r.title,
    description: r.desc,
    url: r.url,
    type: ResourceType.HOMEWORK,
    level: BatchLevel.INTERMEDIATE_2,
    lectureNumber: r.lecture,
  }));

  const i3inserts = intermediate3Data.map(r => ({
    title: r.title,
    description: r.desc,
    url: r.url,
    type: ResourceType.HOMEWORK,
    level: BatchLevel.INTERMEDIATE_3,
    lectureNumber: r.lecture,
  }));

  await prisma.resource.createMany({
    data: [...i2inserts, ...i3inserts]
  });

  console.log(`Inserted ${i2inserts.length} resources for INTERMEDIATE_2`);
  console.log(`Inserted ${i3inserts.length} resources for INTERMEDIATE_3`);
  
  await prisma.$disconnect();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
