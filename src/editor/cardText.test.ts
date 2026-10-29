import { describe, expect, it } from "vitest";
import { toDisplay, toRaw } from "./cardText";

const sample = { nombre: "Ana", casilla: 12, lista: ": Beto." };

describe("texto de las tarjetas en el editor", () => {
  it("enseña el texto con los datos de ejemplo", () => {
    expect(toDisplay("{nombre} rueda hasta la casilla {casilla}.", sample)).toBe("Ana rueda hasta la casilla 12.");
  });

  it("al guardar, los datos de ejemplo vuelven a ser huecos", () => {
    const dyn = ["nombre", "casilla", "lista"];
    expect(toRaw("Ana rueda hasta la casilla 12.", sample, dyn)).toBe("{nombre} rueda hasta la casilla {casilla}.");
    // lo escrito a mano se respeta
    expect(toRaw("¡Ay! Ana se cae y va a la casilla 12, qué pena.", sample, dyn)).toBe("¡Ay! {nombre} se cae y va a la casilla {casilla}, qué pena.");
    // no toca palabras o números que solo contienen el dato
    expect(toRaw("Banana 112 Anais", sample, dyn)).toBe("Banana 112 Anais");
    // valores que empiezan con signos
    expect(toRaw("Beben todos de Ana: Beto.", sample, dyn)).toBe("Beben todos de {nombre}{lista}");
  });

  it("ida y vuelta: no cambia el texto", () => {
    const raw = "{nombre} rueda hasta la casilla {casilla}.";
    expect(toRaw(toDisplay(raw, sample), sample, ["nombre", "casilla"])).toBe(raw);
  });
});
