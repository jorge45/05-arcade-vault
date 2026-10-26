import Home from "@/components/Home";
import { getGames } from "@/lib/games";

export default async function Page() {
  const games = await getGames();
  return <Home games={games} />;
}
