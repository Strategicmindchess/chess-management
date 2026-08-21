import { fetchChessComStats } from '../src/services/chess/chesscom';

async function checkFlora() {
  const stats = await fetchChessComStats('Floraaheree');
  console.log(JSON.stringify(stats, null, 2));
}

checkFlora();
