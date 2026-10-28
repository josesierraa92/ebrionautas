import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addModel, listModels, loadDevFile, removeModel, saveDevFile } from "./customModels";
import { resetMemoryStore } from "./store";

const thumb = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
const glb = Buffer.concat([Buffer.from("glTF"), Buffer.alloc(40)]);

describe("modelos propios", () => {
  beforeEach(() => {
    resetMemoryStore();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sube un modelo, lo lista y lo borra", async () => {
    const url = await saveDevFile(glb);
    expect(url).toMatch(/^\/api\/models\/file\/\w+$/);
    expect((await loadDevFile(url.split("/").pop()!))?.length).toBe(glb.length);
    const m = await addModel({ name: "Robot Cañón!", url, thumb, scale: 2.5 });
    expect(m.id).toMatch(/^mios\/robot-canon-\w{4}$/);
    expect(await listModels()).toEqual([m]);
    await removeModel(m.id);
    expect(await listModels()).toEqual([]);
    expect(await loadDevFile(url.split("/").pop()!)).toBeNull();
  });

  it("rechaza datos raros", async () => {
    const url = await saveDevFile(glb);
    await expect(addModel({ name: "", url, thumb })).rejects.toThrow("nombre");
    await expect(addModel({ name: "x", url: "https://malo.com/a.glb", thumb })).rejects.toThrow("dirección");
    await expect(addModel({ name: "x", url, thumb: "javascript:1" })).rejects.toThrow("miniatura");
    await expect(saveDevFile(Buffer.from("no soy un glb"))).rejects.toThrow("glb");
    await expect(removeModel("mios/no-existe")).rejects.toThrow("no existe");
  });

  it("no deja subir al almacén si hay Blob o es producción", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token");
    await expect(saveDevFile(glb)).rejects.toThrow("desarrollo");
  });
});
