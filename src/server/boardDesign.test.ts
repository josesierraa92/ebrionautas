import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayout } from "@/editor/layout";
import { checkAdmin, loadDesign, saveDesign } from "./boardDesign";
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
});
