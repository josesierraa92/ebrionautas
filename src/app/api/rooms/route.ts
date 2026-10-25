import { handle } from "@/server/http";
import { createRoom } from "@/server/rooms";

export const dynamic = "force-dynamic";

export function POST() {
  return handle(() => createRoom());
}
