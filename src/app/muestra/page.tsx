import { BlackHoleIcon, DiceIcon, GameLogo, GooseIcon, RocketIcon, SaturnIcon, SirenIcon, WineIcon } from "@/components/GameIcons";

const items = [
  ["Despegue", RocketIcon, ["#5aa0ff", "#1f5fd6"]],
  ["¡A beber!", WineIcon, ["#ffe066", "#f5b400"]],
  ["Duelo", DiceIcon, ["#ffffff", "#d8deea"]],
  ["Oca", GooseIcon, ["#bfeaff", "#5cc4f5"]],
  ["Calabozo", SirenIcon, ["#8a99b0", "#465468"]],
  ["Agujero negro", BlackHoleIcon, ["#3a2a5a", "#05030f"]],
  ["Resbalón", SaturnIcon, ["#ffb35c", "#e86a00"]],
] as const;

export default function Muestra() {
  return (
    <main className="flex flex-col items-center gap-6 p-6">
      <GameLogo className="w-[420px]" />
      <div className="flex flex-wrap justify-center gap-4">
        {items.map(([label, Icon, bg]) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="relative grid size-32 place-items-center rounded-3xl border-4 border-ink" style={{ background: `linear-gradient(160deg, ${bg[0]}, ${bg[1]})`, boxShadow: "inset 0 -8px 0 rgba(0,0,0,.2), 0 5px 0 #1b1f4b" }}>
              <Icon className="size-24" />
            </div>
            <span className="font-display">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {items.map(([label, Icon]) => <Icon key={label} className="size-12" />)}
      </div>
    </main>
  );
}
