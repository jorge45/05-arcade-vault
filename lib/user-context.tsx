"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./supabase/client";
import type { SavedScore, User } from "./types";

interface UserContextValue {
  user: User | null;
  login: (user: User | null) => void;
  signOut: () => void;
  saveScore: (entry: SavedScore) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Lectura post-montaje intencional de localStorage (external system) para
    // evitar mismatch de hidratación entre SSR (siempre null) y el cliente.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const login = (u: User | null) => {
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("av_user");
  };

  const saveScore = async (entry: SavedScore) => {
    const supabase = createClient();
    const { error } = await supabase.from("scores").insert({
      game_id: entry.game,
      name: entry.name,
      score: entry.score,
    });
    if (error) throw error;
  };

  return (
    <UserContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
