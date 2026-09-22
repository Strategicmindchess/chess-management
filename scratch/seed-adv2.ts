import { prisma } from '../src/lib/prisma';

const rawSyllabus = `
Lecture 1: Static Pawn Structures Revision (Carlsbad, IQP, Hanging Pawns)
Assignment- https://lichess.org/training/middlegame - 30 puzzles
Lecture 2: Dynamic Pawn Structures Revision (Benoni, Benko, Scheveningen)
Assignment- https://lichess.org/training/Benoni_Defense puzzles
Lecture 3: Maróczy Bind – Complete Plans for Both White & Black
Assignments- https://lichess.org/training/Sicilian_Defense_Scheveningen_Variation 30 puzzzles
Lecture 4: Hedgehog Pawn Structure – Complete Strategic Ideas
Assignments- https://lichess.org/training/Sicilian_Defense_Scheveningen_Variation
Lecture 5: Prophylaxis – Part 3 (Deep Preventive Thinking)
Assignments - https://lichess.org/study/b3GCwEAT - Revise
Lecture 6: Restriction vs Domination
Assignments- https://lichess.org/study/6JoxqjMu - Revise by Game Analysis
Lecture 7: Quiet Moves (Advanced)
Assignments- https://lichess.org/training/quietMove - 30 puzzles
Lecture 8: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 9: Catalan Pawn Structures & Typical Middlegame Plans
Assignment- https://lichess.org/training/Catalan_Opening - 30 Puzzles
Lecture 10: Revision – Grünfeld & Stonewall Attack (Structure Comparison & Plans)
Assignments- https://lichess.org/training/Grunfeld_Defense - 30 puzzles
Lecture 11: Sicilian Najdorf – Posioned Pawn b2
Assignments- https://lichess.org/training/Sicilian_Defense_Najdorf_Variation - 30 puzzles
Lecture 12: Test 1
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 13: Rook Endgames – Cutting Off the King & Active Rook Technique
Assignment - https://lichess.org/training/queenRookEndgame - 30 puzzles
Lecture 14: Practical Queen Endgames (Advanced)
Assignments- https://lichess.org/training/queenEndgame - 30 puzzles
Lecture 15: Minor Piece Endgame – Advanced Practical Positions
Assignment- https://lichess.org/training/knightEndgame - 30 puzzles
Lecture 16: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 17: Positional Sacrifice
Assignment - https://lichess.org/study/cs5QOCbW - Analyse games
Lecture 18: Advanced Rook & Bishop Endgames
Assignment - https://lichess.org/training/rookEndgame 30 puzzles
Lecture 19: Magnus Carlsen Endgame Technique – Part 2
Assignment - https://lichess.org/study/1ctm9TTz - Analyse games
Lecture 20: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 21: Anatoly Karpov – Restriction & Positional Pressure
Assignment - https://lichess.org/study/FI7TA57Y - Analyse Game
Lecture 22: Magnus Carlsen – Endgame Squeezing Technique
Assignment - https://lichess.org/training/endgame - 30 puzzles
Lecture 23: h3–h6 Weakness (Advanced Strategic Ideas)
Assignment - https://lichess.org/training/attackingF2F7 30 puzzles
Lecture 24: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 25: Caro-Kann – Tournament Preparation & Practical Ideas
Assignment - https://lichess.org/training/Caro-Kann_Defense 30 puzzles
Lecture 26: Nimzo Indian – Model Games & Strategic Plans
Assignment - https://lichess.org/training/Nimzo-Indian_Defense 30 puzzles
Lecture 27: English Opening – Model Games & Transition to Middlegame
Assignment - https://lichess.org/training/English_Opening 30 puzzles
Lecture 28: Test 2
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 29: Bishop Pair Endgames
Asssignment - https://lichess.org/study/lI7oh9p6 - Revise
Lecture 30: Full Bishop Endgame
Assignment - https://lichess.org/training/bishopEndgame 30 puzzles
Lecture 31: Opposite Color Bishops in Middle Game
Assignment - https://lichess.org/training/bishopEndgame 30 puzzles
Lecture 32: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 33: Exchange Sacrifice for Initiative
Assignment - https://lichess.org/study/4Con93XE Analyse Games
Lecture 34: Dynamic Play and Initiative
Assignment - https://lichess.org/training/English_Opening_Anglo-Grunfeld_Defense 30 puzzles
Lecture 35: Initiative – Attack Pratice Positions
Assignment - https://lichess.org/training/Kings_Gambit_Accepted 30 puzzles
Lecture 36: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 37: Rxc3 In sicilian Najdrof( Petrosian Technique)
Assignment - https://lichess.org/training/Sicilian_Defense_Najdorf_Variation 30 puzzles
Lecture 38: Akiba Rubinstein – Rook Endgame Masterclass
Assignment - https://lichess.org/training/rookEndgame 30 puzzles
Lecture 39: Garry Kasparov – Dynamic Attack & Initiative
Assignment - https://lichess.org/study/v0wB8n7F Analyse games
Lecture 40: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 41: Pawn Break Timing in Complex Positions
Assignment - https://lichess.org/study/RLDcQivj 30 puzzles
Lecture 42: Piece Coordination & Advanced Manoeuvring
Assignments - https://lichess.org/study/DyGaT8wr - solve
Lecture 43: Fabiano Caruana – Calculation & Precision in Complex Positions
Assignment - https://lichess.org/training/middlegame - 30 puzzles
Lecture 44: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 45: Complex Mixed Positions – Long Calculation Trainning
Assignment - https://lichess.org/training/veryLong 30 puzzles
Lecture 46: Decision Making Workshop
Assignment - https://lichess.org/training/master - 30 puzzles
Lecture 47: Student Game Analysis
Assignments- https://www.chess.com/play - Play 5 games 10+0
Lecture 48: Final Test 3
Assignments- https://www.chess.com/play - Play 5 games 10+0
`;

async function main() {
  // Split lines and filter out empty lines and "Block X" headers
  const lines = rawSyllabus.trim().split('\n').filter(l => {
    const trimmed = l.trim();
    return trimmed !== '' && !trimmed.toLowerCase().startsWith('block');
  });
  
  const resourcesData = [];
  
  for (let i = 0; i < lines.length; i += 2) {
    const lectureLine = lines[i];
    const assignmentLine = lines[i+1];
    
    if (!lectureLine || !assignmentLine) continue;

    const lectureMatch = lectureLine.match(/Lecture (\d+):\s*(.+)/);
    if (!lectureMatch) continue;
    
    const lectureNumber = parseInt(lectureMatch[1]);
    const title = lectureMatch[0]; 

    const urlMatch = assignmentLine.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : '';
    let description = assignmentLine.replace(/^Assi?gnments?[\-\s:]*/i, '').trim();

    resourcesData.push({
      title: title,
      description: description,
      url: url || 'https://www.chess.com/play',
      type: title.toLowerCase().includes('test') ? 'TEST_LINK' : 'HOMEWORK',
      lectureNumber: lectureNumber,
      level: 'ADVANCE_2',
      source: 'SYLLABUS_ADV2'
    });
  }

  console.log(`Parsed ${resourcesData.length} resources from syllabus.`);

  // 1. Delete old ADVANCE_2 resources (BatchAssignments will Cascade delete!)
  const deleted = await prisma.resource.deleteMany({
    where: { level: 'ADVANCE_2' }
  });
  console.log(`Deleted ${deleted.count} old ADVANCE_2 resources (and their linked batch assignments).`);

  // 2. Insert the new 48 resources and keep their records
  console.log("Inserting new 48 resources...");
  const createdResources = [];
  for (const data of resourcesData) {
    const res = await prisma.resource.create({ data });
    createdResources.push(res);
  }

  // 3. Find all ADVANCE_2 Batches
  const adv2Batches = await prisma.batch.findMany({
    where: { level: 'ADVANCE_2' }
  });
  console.log(`Found ${adv2Batches.length} active ADVANCE_2 batches.`);

  // 4. Link the new resources to all ADVANCE_2 batches
  let assignmentsCreated = 0;
  for (const batch of adv2Batches) {
    for (const res of createdResources) {
      await prisma.batchAssignment.create({
        data: {
          batchId: batch.id,
          resourceId: res.id,
          lectureNumber: res.lectureNumber
        }
      });
      assignmentsCreated++;
    }
  }

  console.log(`Successfully created ${assignmentsCreated} BatchAssignment links!`);
  console.log("Replacement completely finished!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
