import { notFound } from "next/navigation";
import GameDetail from "@/components/GameDetail";
import { getGame, getLeaderboard } from "@/lib/games";

export default async function GameDetailPage({
  params,
}: PageProps<"/juego/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores = await getLeaderboard(id, 10);

  return <GameDetail game={game} scores={scores} />;
}
