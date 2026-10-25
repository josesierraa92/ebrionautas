import Marciano from "@/components/Marciano";
import type { AvatarConfig } from "@/game/avatar";

type Member = { id: string; name: string; color: string; avatar: AvatarConfig };

/** Los Ebrionautas a bordo en la sala de espera. */
export default function MemberChips({ members, size = 56 }: { members: Member[]; size?: number }) {
  return (
    <ul className="flex flex-wrap justify-center gap-3">
      {members.map((m) => (
        <li key={m.id} className="flex flex-col items-center gap-1">
          <Marciano avatar={m.avatar} expression="feliz" size={size} />
          <span className="rounded-full border-[3px] border-ink px-2.5 font-display text-sm text-ink" style={{ background: m.color }}>
            {m.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
