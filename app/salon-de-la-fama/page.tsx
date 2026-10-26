import HallOfFame from "@/components/HallOfFame";
import { getGames } from "@/lib/games";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <HallOfFame games={games} />;
}
