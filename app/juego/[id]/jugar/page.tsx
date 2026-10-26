import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import { getGame } from "@/lib/games";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juego/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
