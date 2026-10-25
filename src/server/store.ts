// Almacén clave-valor para las salas. En producción usa Upstash Redis (REST,
// sin dependencias); en desarrollo, si no hay credenciales, usa memoria.

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** SET NX con expiración: true si se adquirió. */
  setNx(key: string, value: string, ttlMs: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis respondió ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`Redis: ${body.error}`);
    return body.result;
  }

  async get(key: string) {
    return (await this.command(["GET", key])) as string | null;
  }
  async set(key: string, value: string, ttlSeconds: number) {
    await this.command(["SET", key, value, "EX", ttlSeconds]);
  }
  async setNx(key: string, value: string, ttlMs: number) {
    return (await this.command(["SET", key, value, "NX", "PX", ttlMs])) === "OK";
  }
  async del(key: string) {
    await this.command(["DEL", key]);
  }
}

class MemoryStore implements Store {
  private data = new Map<string, { value: string; expires: number }>();

  private read(key: string) {
    const e = this.data.get(key);
    if (e && e.expires < Date.now()) this.data.delete(key);
    return this.data.get(key) ?? null;
  }
  async get(key: string) {
    return this.read(key)?.value ?? null;
  }
  async set(key: string, value: string, ttlSeconds: number) {
    this.data.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
  async setNx(key: string, value: string, ttlMs: number) {
    if (this.read(key)) return false;
    this.data.set(key, { value, expires: Date.now() + ttlMs });
    return true;
  }
  async del(key: string) {
    this.data.delete(key);
  }
}

export class StoreNotConfiguredError extends Error {
  constructor() {
    super("Falta conectar la base de datos Redis (Upstash) al proyecto de Vercel.");
  }
}

const globalForStore = globalThis as unknown as { __ebrioStore?: Store };

export function getStore(): Store {
  if (globalForStore.__ebrioStore) return globalForStore.__ebrioStore;
  // La integración de Vercel puede exponer cualquiera de estos dos pares.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    globalForStore.__ebrioStore = new UpstashStore(url, token);
  } else if (process.env.NODE_ENV !== "production") {
    globalForStore.__ebrioStore = new MemoryStore();
  } else {
    throw new StoreNotConfiguredError();
  }
  return globalForStore.__ebrioStore;
}

/** Solo para tests. */
export function resetMemoryStore(): Store {
  globalForStore.__ebrioStore = new MemoryStore();
  return globalForStore.__ebrioStore;
}
