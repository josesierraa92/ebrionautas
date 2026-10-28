import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayout } from "@/editor/layout";
import { loadCardTexts, saveCardTexts, checkAdmin, loadDesign, loadDevImage, loadDevToken, loadPublished, loadPublishedLayout, publishBoard, saveDesign, unpublishBoard } from "./boardDesign";
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

  it("guarda solo los textos de tarjetas que cambian y descarta lo que no existe", async () => {
    expect(await loadCardTexts()).toEqual({});
    const saved = await saveCardTexts({
      A_BEBER: { title: "¡Ronda!", text: "{nombre} reparte {vasos}." },
      "RETO:Cómicos": { text: "Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos." }, // igual que el de serie: no se guarda
      NOEXISTE: { title: "x" },
    });
    expect(saved).toEqual({ A_BEBER: { title: "¡Ronda!", text: "{nombre} reparte {vasos}." } });
    expect(await loadCardTexts()).toEqual(saved);
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
    // mosaicos en alta resolución: solo con la imagen y todos los trozos en Blob, y que cuadren con el tamaño
    const tile = (i: number) => `https://abc123.public.blob.vercel-storage.com/tablero/mosaico-1-${i}.webp`;
    const hd = { ...shot, image: blobUrl, width: 5000, height: 3000, chunks: { size: 2048, cols: 3, rows: 2, urls: [0, 1, 2, 3, 4, 5].map(tile) } };
    expect((await publishBoard(hd)).chunks?.urls).toHaveLength(6);
    expect((await publishBoard({ ...hd, chunks: { ...hd.chunks, cols: 2 } })).chunks).toBeUndefined();
    expect((await publishBoard({ ...hd, chunks: { ...hd.chunks, urls: [...hd.chunks.urls.slice(1), "https://malo.com/x.webp"] } })).chunks).toBeUndefined();
    expect((await publishBoard({ ...shot, chunks: hd.chunks })).chunks).toBeUndefined();
    // con el diseño, la TV puede dibujarlo en 3D en vivo
    expect((await publishBoard(shot)).live).toBeUndefined();
    const layout = { ...newLayout(12, 10), tiles: Array.from({ length: 62 }, () => ({ x: 0, y: 0 })) };
    expect((await publishBoard({ ...shot, layout })).live).toBe(true);
    expect((await loadPublishedLayout())?.w).toBe(12);
    await unpublishBoard();
    expect(await loadPublishedLayout()).toBeNull();
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
