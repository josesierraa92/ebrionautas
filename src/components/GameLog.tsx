import type { LogEntry } from "@/game/engine";

export default function GameLog({ log, max = 60 }: { log: LogEntry[]; max?: number }) {
  return (
    <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
      <h3 className="mb-2 font-display text-lg">Bitácora de vuelo</h3>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-white/85">
        {log.slice(0, max).map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ul>
    </div>
  );
}
