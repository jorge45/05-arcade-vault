export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS del fondo, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  plays: string;
}

export interface GameWithBest extends Game {
  best: number | null; // MAX(score) real desde `scores`; null si el juego no tiene partidas
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface User {
  name: string;
}

export interface SavedScore {
  game: string; // Game.id
  score: number;
  name: string;
}
