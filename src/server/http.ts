import { NextResponse } from "next/server";
import { RoomError } from "./rooms";
import { StoreNotConfiguredError } from "./store";

/** Ejecuta un handler y convierte los errores conocidos en JSON { error }. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json((await fn()) ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof RoomError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof StoreNotConfiguredError) return NextResponse.json({ error: e.message }, { status: 503 });
    console.error(e);
    return NextResponse.json({ error: "Error inesperado en el servidor." }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
