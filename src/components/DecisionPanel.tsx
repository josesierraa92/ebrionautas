"use client";

import { useState } from "react";
import type { Action, Decision, Player } from "@/game/engine";

type Props = {
  decision: Decision;
  me: Player;
  players: Player[];
  onAction: (a: Action) => void;
  compact?: boolean;
};

/** UI de cada decisión pendiente. Se monta con key distinta por decisión para reiniciar su estado. */
export default function DecisionPanel({ decision, me, players, onAction, compact = false }: Props) {
  const others = players.filter((p) => p.id !== me.id);

  switch (decision.kind) {
    case "DISTRIBUTE":
      return <Distribute amount={decision.amount} players={players} onDone={(drinks) => onAction({ type: "DISTRIBUTE", drinks })} />;

    case "DUEL":
      return (
        <PickPlayers
          title={`Reta hasta a ${decision.amount}`}
          text="Cada duelo se tira automáticamente: quien saque menos, bebe 1."
          players={others}
          max={decision.amount}
          min={1}
          confirm="¡A DUELO!"
          onDone={(ids) => onAction({ type: "DUEL", opponents: ids })}
        />
      );

    case "SELECT_DRINKERS":
      return (
        <PickPlayers
          title={compact ? "¿Quién bebe?" : decision.title}
          text={compact ? `Marca quiénes beben ${decision.drinks} ${decision.drinks === 1 ? "vaso" : "vasos"}:` : `${decision.text} Marca quiénes beben ${decision.drinks}.`}
          players={players}
          max={players.length}
          min={0}
          confirm="CONFIRMAR"
          onDone={(ids) => onAction({ type: "SELECT_DRINKERS", ids })}
        />
      );

    case "PATINAZO":
      return (
        <Card title="¡Tropiezo con la lápida!" text="Para no caerte:">
          <button onClick={() => onAction({ type: "PATINAZO", choice: "drink" })} className="btn-game bg-btn-green py-3 text-lg text-white">
            BEBER {decision.drinks} DE GOLPE
          </button>
          <button onClick={() => onAction({ type: "PATINAZO", choice: "back" })} className="btn-game bg-btn-yellow py-3 text-lg text-white">
            RODAR HASTA LA {decision.backTo}
          </button>
        </Card>
      );

    case "RULE":
      return <RuleInput onDone={() => onAction({ type: "SET_RULE" })} />;

    case "SLAVE":
      return (
        <Card title="Pacto de Sangre" text="Elige con quién haces el pacto: beberá cada vez que tú bebas.">
          {others.map((p) => (
            <button key={p.id} onClick={() => onAction({ type: "CHOOSE_SLAVE", id: p.id })} className="btn-game py-2 text-lg text-white" style={{ background: p.color }}>
              {p.name}
            </button>
          ))}
        </Card>
      );
  }
}

function Card({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-2xl text-btn-yellow">{title}</h3>
      <p className="text-white/85">{text}</p>
      {children}
    </div>
  );
}

function Distribute({ amount, players, onDone }: { amount: number; players: Player[]; onDone: (d: Record<string, number>) => void }) {
  const [drinks, setDrinks] = useState<Record<string, number>>({});
  const used = Object.values(drinks).reduce((a, n) => a + n, 0);
  const left = amount - used;
  const change = (id: string, delta: number) => setDrinks({ ...drinks, [id]: Math.max(0, (drinks[id] ?? 0) + delta) });

  return (
    <Card title="Ronda de mezcal" text={`Reparte ${amount} ${amount === 1 ? "vaso" : "vasos"}. Te quedan ${left}.`}>
      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="size-4 rounded-full border-2 border-ink" style={{ background: p.color }} />
          <span className="flex-1 truncate">{p.name}</span>
          <button aria-label={`Quitar a ${p.name}`} onClick={() => change(p.id, -1)} disabled={!drinks[p.id]} className="btn-game size-9 bg-btn-red text-white disabled:bg-btn-grey">
            −
          </button>
          <span className="w-6 text-center font-display text-xl">{drinks[p.id] ?? 0}</span>
          <button aria-label={`Dar a ${p.name}`} onClick={() => change(p.id, 1)} disabled={left === 0} className="btn-game size-9 bg-btn-green text-white disabled:bg-btn-grey">
            +
          </button>
        </div>
      ))}
      <button disabled={left !== 0} onClick={() => onDone(drinks)} className="btn-game bg-btn-green py-3 text-lg text-white disabled:bg-btn-grey">
        REPARTIR
      </button>
    </Card>
  );
}

function PickPlayers(props: {
  title: string;
  text: string;
  players: Player[];
  min: number;
  max: number;
  confirm: string;
  onDone: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < props.max ? [...picked, id] : picked);

  return (
    <Card title={props.title} text={props.text}>
      <div className="grid grid-cols-2 gap-2">
        {props.players.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button
              key={p.id}
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={`btn-game truncate px-2 py-2 text-base text-white ${on ? "" : "opacity-50"}`}
              style={{ background: p.color }}
            >
              {on ? "🍷 " : ""}
              {p.name}
            </button>
          );
        })}
      </div>
      <button disabled={picked.length < props.min} onClick={() => props.onDone(picked)} className="btn-game bg-btn-green py-3 text-lg text-white disabled:bg-btn-grey">
        {picked.length === 0 && props.min === 0 ? "NADIE BEBE" : props.confirm}
      </button>
    </Card>
  );
}

function RuleInput({ onDone }: { onDone: () => void }) {
  return (
    <Card title="Ley del Más Allá" text="Dicta tu ley en voz alta para todos. Dura hasta que alguien dicte otra. Quien la rompa, bebe.">
      <button onClick={onDone} className="btn-game bg-btn-green py-3 text-lg text-white">
        YA LA DICTÉ
      </button>
    </Card>
  );
}
