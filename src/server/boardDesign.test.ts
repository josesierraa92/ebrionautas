import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayout } from "@/editor/layout";
import { checkAdmin, loadDesign, loadDevImage, loadPublished, publishBoard, saveDesign, unpublishBoard } from "./boardDesign";
import { resetMemoryStore } from "./store";

describe("diseño del tablero en el servidor", () => {
  beforeEach(() => {
    resetMemoryStore();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("guarda y carga el diseño", async () => {
    expect(await loadDesign()).toBeNull();
    const l = newLayout(12, 10);
    await saveDesign(l);
    expect(await loadDesign()).toEqual(l);
  });

  it("rechaza diseños inválidos", async () => {
    await expect(saveDesign({ version: 1, w: 2 })).rejects.toThrow("no es válido");
  });

  it("pide la clave del admin", () => {
    vi.stubEnv("ADMIN_PASSWORD", "secreta");
    expect(() => checkAdmin("otra")).toThrow("incorrecta");
    expect(() => checkAdmin(null)).toThrow("incorrecta");
    expect(() => checkAdmin("secreta")).not.toThrow();
  });

  it("en producción sin clave configurada no deja guardar", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => checkAdmin("x")).toThrow("ADMIN_PASSWORD");
  });

  it("publica el tablero para la TV y se puede quitar", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const tiles = Array.from({ length: 62 }, (_, i) => ({ x: i * 10, y: 50 }));
    const shot = { image: "data:image/webp;base64,UklGRg==", width: 1000, height: 800, cell: 40, bg: "#112233", tiles };
    expect(await loadPublished()).toBeNull();
    const b = await publishBoard(shot);
    expect(b.image).toMatch(/^\/api\/board\/image\?v=/);
    expect((await loadPublished())?.tiles).toHaveLength(62);
    expect((await loadDevImage())?.toString("ascii", 0, 4)).toBe("RIFF");
    await unpublishBoard();
    expect(await loadPublished()).toBeNull();
  });

  it("no publica sin las 62 casillas ni con una imagen rara", async () => {
    const tiles = Array.from({ length: 61 }, () => ({ x: 1, y: 1 }));
    const shot = { image: "data:image/webp;base64,UklGRg==", width: 1000, height: 800, cell: 40, bg: "#112233", tiles };
    await expect(publishBoard(shot)).rejects.toThrow("62");
    await expect(publishBoard({ ...shot, tiles: [...tiles, { x: 1, y: 1 }], image: "javascript:alert(1)" })).rejects.toThrow("imagen");
  });
});
