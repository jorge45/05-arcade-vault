import { createClient } from "@/lib/supabase/server";
import type { Game, GameWithBest, ScoreRow } from "@/lib/types";

export async function getGames(): Promise<GameWithBest[]> {
  const supabase = createClient();

  const [
    { data: games, error: gamesError },
    { data: scores, error: scoresError },
  ] = await Promise.all([
    supabase.from("games").select("*"),
    supabase.from("scores").select("game_id, score"),
  ]);

  if (gamesError) throw gamesError;
  if (scoresError) throw scoresError;

  const bestByGame = new Map<string, number>();
  for (const row of scores ?? []) {
    const current = bestByGame.get(row.game_id);
    if (current === undefined || row.score > current) {
      bestByGame.set(row.game_id, row.score);
    }
  }

  return (games ?? []).map((game: Game) => ({
    ...game,
    best: bestByGame.get(game.id) ?? null,
  }));
}

export async function getGame(id: string): Promise<GameWithBest | null> {
  const supabase = createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) return null;

  const { data: bestRow, error: bestError } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bestError) throw bestError;

  return { ...game, best: bestRow?.score ?? null };
}

export async function getLeaderboard(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    name: row.name,
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
}
