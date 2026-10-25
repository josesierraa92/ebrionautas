"use client";

import type { Action, Decision, Player } from "@/game/engine";

type Props = {
  decision: Extract<Decision, { kind: "SELECT_DRINKERS" }>;
  players: Player[];
  myId: string;
  isMyTurn: boolean;
  busy: boolean;
  onAction: (a: Action) => void;
};

/** Votación online: cada jugador declara en su celular si le toca beber. */
export default function VotePanel({ decision, players, myId, isMyTurn, busy, onAction }: Props) {
  const mine = decision.votes[myId];
  const answered = players.filter((p) => p.id in decision.votes).length;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-2xl text-btn-yellow">{decision.title}</h3>
      <p className="text-white/85">{decision.text}</p>

      {mine === undefined ? (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => onAction({ type: "VOTE", id: myId, yes: true })} className="btn-game bg-btn-red py-4 text-xl text-white">
            🍷 ME TOCA
          </button>
          <button disabled={busy} onClick={() => onAction({ type: "VOTE", id: myId, yes: false })} className="btn-game bg-btn-blue py-4 text-xl text-white">
            🙅 ME LIBRO
          </button>
        </div>
      ) : (
        <p className="font-display text-lg">{mine ? "🍷 Dijiste que te toca beber." : "🙅 Te libraste."}</p>
      )}

      <ul className="flex flex-wrap gap-1.5 text-sm">
        {players.map((p) => (
          <li key={p.id} className={`rounded-full border-2 border-ink px-2 py-0.5 text-ink ${p.id in decision.votes ? "" : "opacity-40"}`} style={{ background: p.color }}>
            {p.id in decision.votes ? "✓ " : "… "}
            {p.name}
          </li>
        ))}
      </ul>
      <p className="text-sm text-white/60">
        Han respondido {answered} de {players.length}.
      </p>

      {isMyTurn && (
        <button
          disabled={busy}
          onClick={() => onAction({ type: "SELECT_DRINKERS", ids: Object.keys(decision.votes).filter((id) => decision.votes[id]) })}
          className="btn-game bg-btn-yellow py-2 text-white"
        >
          CERRAR VOTACIÓN YA
        </button>
      )}
    </div>
  );
}
