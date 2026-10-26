"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/user-context";
import type { GameWithBest, ScoreRow } from "@/lib/types";

const TABLE_SIZE = 12;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function HallOfFame({ games }: { games: GameWithBest[] }) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0].id);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [yourBest, setYourBest] = useState<number | null>(null);
  const game = games.find((g) => g.id === tab)!;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("scores")
        .select("name, score, created_at")
        .eq("game_id", tab)
        .order("score", { ascending: false })
        .limit(TABLE_SIZE);

      if (cancelled) return;
      setRows(
        (data ?? []).map((r, i) => ({
          rank: i + 1,
          name: r.name,
          score: r.score,
          date: formatDate(r.created_at),
        })),
      );

      if (user) {
        const { data: best } = await supabase
          .from("scores")
          .select("score")
          .eq("game_id", tab)
          .eq("name", user.name)
          .order("score", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setYourBest(best?.score ?? null);
      } else {
        setYourBest(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, user]);

  const tableRows = useMemo(
    () => Array.from({ length: TABLE_SIZE }, (_, i) => rows[i] ?? null),
    [rows],
  );
  const podium = [rows[1] ?? null, rows[0] ?? null, rows[2] ?? null];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{podium[0]?.name ?? "—"}</div>
          <div className="score">
            {podium[0] ? podium[0].score.toLocaleString("es-ES") : "SIN DATOS"}
          </div>
          <div className="date">{podium[0]?.date ?? "—"}</div>
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{
              fontSize: 9,
              color: "var(--gold)",
              letterSpacing: "0.18em",
            }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{podium[1]?.name ?? "—"}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {podium[1] ? podium[1].score.toLocaleString("es-ES") : "SIN DATOS"}
          </div>
          <div className="date">{podium[1]?.date ?? "—"}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{podium[2]?.name ?? "—"}</div>
          <div className="score">
            {podium[2] ? podium[2].score.toLocaleString("es-ES") : "SIN DATOS"}
          </div>
          <div className="date">{podium[2]?.date ?? "—"}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {tableRows.map((r, i) => (
          <div
            key={i}
            className={
              "tr" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
            <div className="pl">{r?.name ?? "—"}</div>
            <div className="sc">
              {r ? r.score.toLocaleString("es-ES") : "SIN DATOS"}
            </div>
            <div className="dt">{r?.date ?? "—"}</div>
          </div>
        ))}
        {user && yourBest !== null && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div
              className="tr you"
              style={{ animationDelay: `${tableRows.length * 50 + 50}ms` }}
            >
              <div className="rk" style={{ color: "var(--yellow)" }}>
                —
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {user.name}
              </div>
              <div
                className="sc"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                {yourBest.toLocaleString("es-ES")}
              </div>
              <div className="dt">—</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
