import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayout } from "@/editor/layout";
import { checkAdmin, loadDesign, loadDevImage, loadDevToken, loadPublished, publishBoard, saveDesign, unpublishBoard } from "./boardDesign";
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
    expect((await loadPublished())?.zoom).toBeUndefined();
    expect((await publishBoard({ ...shot, zoom: 3.5, width: 9000, height: 5063 })).zoom).toBe(3.5);
    // la hoja de personajes solo si viene de Vercel Blob
    const sheet = { cw: 192, ch: 288, feet: 0.8, span: 1.7 };
    const blobUrl = "https://abc123.public.blob.vercel-storage.com/tablero/personajes-1-xyz.webp";
    expect((await publishBoard({ ...shot, characters: { ...sheet, image: blobUrl } })).characters).toEqual({ ...sheet, image: blobUrl });
    expect((await publishBoard({ ...shot, characters: { ...sheet, image: "javascript:alert(1)" } })).characters).toBeUndefined();
    expect((await loadDevImage())?.toString("ascii", 0, 4)).toBe("RIFF");
    await unpublishBoard();
    expect(await loadPublished()).toBeNull();
  });

  it("publica las fichas propias y deja null las que no se cambiaron", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const tiles = Array.from({ length: 62 }, (_, i) => ({ x: i * 10, y: 50 }));
    const webp = "data:image/webp;base64,UklGRg==";
    const shot = { image: webp, width: 1000, height: 800, cell: 40, bg: "#112233", tiles, tokens: [null, webp, ...Array(14).fill(null)], tokenScale: [1, 9, ...Array(14).fill(1)] };
    const b = await publishBoard(shot);
    expect(b.tokens?.[0]).toBeNull();
    expect(b.tokens?.[1]).toMatch(/^\/api\/board\/token\/1\?v=/);
    expect((await loadDevToken(1))?.toString("ascii", 0, 4)).toBe("RIFF");
    expect(b.tokenScale?.[1]).toBe(2.5);
    expect(await loadDevToken(0)).toBeNull();
    // sin fichas propias no se guarda la lista
    expect((await publishBoard({ ...shot, tokens: undefined })).tokens).toBeUndefined();
    await expect(publishBoard({ ...shot, tokens: ["javascript:1"] })).rejects.toThrow("ficha 1");
  });

  it("no publica sin las 62 casillas ni con una imagen rara", async () => {
    const tiles = Array.from({ length: 61 }, () => ({ x: 1, y: 1 }));
    const shot = { image: "data:image/webp;base64,UklGRg==", width: 1000, height: 800, cell: 40, bg: "#112233", tiles };
    await expect(publishBoard(shot)).rejects.toThrow("62");
    await expect(publishBoard({ ...shot, tiles: [...tiles, { x: 1, y: 1 }], image: "javascript:alert(1)" })).rejects.toThrow("imagen");
  });
});
