import CardPanel, { GREEN, GREEN_LIGHT } from "@/components/CardPanel";
import MaskIcon from "@/components/MaskIcon";
import type { IconName } from "@/editor/icons";
import type { LogEntry } from "@/game/engine";

// El motor escribe cada línea con un emoji delante; aquí se cambia por el icono vectorial del juego (o una viñeta verde).
const ICON_OF: [string, IconName][] = [
  ["🔥", "flame"], ["🩸", "drop"], ["👻", "ghost"], ["🦇", "bat"], ["💀", "skull"], ["⚖️", "scales"], ["📜", "scales"],
  ["🤚", "hand"], ["⏳", "hourglass"], ["⏱️", "stopwatch"], ["⛪", "chapel"], ["🥃", "bottle"], ["🔮", "planchette"], ["🕛", "moon"], ["🪦", "tomb"],
];
const LEADING = /^(?:[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]+\s*)+/u;

function parse(text: string): { icon: IconName | null; text: string } {
  const icon = ICON_OF.find(([e]) => text.startsWith(e))?.[1] ?? null;
  return { icon, text: text.replace(LEADING, "") || text };
}

/** Historial de la partida con el diseño de las tarjetas. */
export default function GameLog({ log, max = 60, big = false }: { log: LogEntry[]; max?: number; big?: boolean }) {
  const u = (k: number) => `calc(var(--u) * ${k})`;
  return (
    <CardPanel inline kicker="Historial" unit={big ? "20px" : "17px"} width={big ? 34 : 30} maxH="none">
      <ul className="flex flex-col game-scroll overflow-y-auto" style={{ gap: u(0.7), maxHeight: u(22) }}>
        {log.slice(0, max).map((e) => {
          const { icon, text } = parse(e.text);
          return (
            <li key={e.id} className="flex items-start" style={{ gap: u(0.7), fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700, fontSize: u(1.1), lineHeight: 1.35, color: "#d8d4f6" }}>
              {icon ? (
                <MaskIcon name={icon} color={GREEN_LIGHT} size={u(1.5)} className="mt-[0.1em]" />
              ) : (
                <span aria-hidden style={{ flex: "none", marginTop: u(0.45), width: u(0.55), height: u(0.55), borderRadius: u(0.2), background: GREEN }} />
              )}
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
    </CardPanel>
  );
}
