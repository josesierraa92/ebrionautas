"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_AVATAR, SKINS, sanitizeAvatar, type AvatarConfig } from "@/game/avatar";
import type { Trait } from "@/game/board";
import type { GameState } from "@/game/engine";
import { saved } from "./room-client";

const KEY = "ebrionautas:perfil";

/** Respuestas opcionales del perfil; undefined = no contestado (el celular no vota solo). */
export type ProfileTraits = {
  genero?: "hombre" | "mujer" | "otro";
  anioNacimiento?: number;
  gafas?: boolean;
  melena_gomina?: boolean;
  tatuaje_piercing?: boolean;
  mascota?: boolean;
  deportista?: boolean;
};

export type ProfileStats = { partidas: number; victorias: number; vasos: number };

export type Profile = {
  name: string;
  avatar: AvatarConfig;
  traits: ProfileTraits;
  stats: ProfileStats;
  /** Mesas ya contadas en las estadísticas, para no sumar dos veces la misma partida. */
  counted: string[];
};

export function emptyProfile(): Profile {
  return {
    name: "",
    avatar: { ...DEFAULT_AVATAR, skin: SKINS[Math.floor(Math.random() * SKINS.length)] },
    traits: {},
    stats: { partidas: 0, victorias: 0, vasos: 0 },
    counted: [],
  };
}

export function loadProfile(): Profile | null {
  const p = saved.get<Profile>(KEY);
  if (!p) return null;
  const base = emptyProfile();
  return {
    name: typeof p.name === "string" ? p.name : "",
    avatar: sanitizeAvatar(p.avatar),
    traits: p.traits ?? {},
    stats: { ...base.stats, ...p.stats },
    counted: Array.isArray(p.counted) ? p.counted : [],
  };
}

export function saveProfile(p: Profile) {
  saved.set(KEY, p);
}

/** ¿Este rasgo describe al jugador? undefined si el perfil no lo contestó. */
export function traitAnswer(traits: ProfileTraits, trait: Trait): boolean | undefined {
  switch (trait) {
    case "hombre":
      return traits.genero ? traits.genero === "hombre" : undefined;
    case "mujer":
      return traits.genero ? traits.genero === "mujer" : undefined;
    case "anio_par":
      return traits.anioNacimiento ? traits.anioNacimiento % 2 === 0 : undefined;
    case "anio_impar":
      return traits.anioNacimiento ? traits.anioNacimiento % 2 === 1 : undefined;
    default:
      return traits[trait];
  }
}

/** Suma una partida terminada a las estadísticas (una sola vez por mesa). */
export function recordGame(profile: Profile, roomCode: string, game: GameState, playerId: string): Profile | null {
  if (!game.winner || profile.counted.includes(roomCode)) return null;
  const me = game.players.find((p) => p.id === playerId);
  if (!me) return null;
  return {
    ...profile,
    stats: {
      partidas: profile.stats.partidas + 1,
      victorias: profile.stats.victorias + (game.winner === playerId ? 1 : 0),
      vasos: profile.stats.vasos + me.drunk,
    },
    counted: [roomCode, ...profile.counted].slice(0, 50),
  };
}

export function titleFor(stats: ProfileStats): string {
  if (stats.victorias >= 10) return "Leyenda Fiestera de la Galaxia";
  if (stats.victorias >= 3) return "Capitán del Calimocho";
  if (stats.vasos >= 50) return "Esponja Intergaláctica";
  if (stats.partidas >= 5) return "Ebrionauta Veterano";
  if (stats.partidas >= 1) return "Cadete Etílico";
  return "Novato del Calimocho";
}

/** Perfil del dispositivo con carga diferida (localStorage solo existe en el navegador). */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const update = useCallback((p: Profile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  return { profile, loaded, update };
}
