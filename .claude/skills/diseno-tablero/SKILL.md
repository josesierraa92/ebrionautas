---
name: diseno-tablero
description: Reglas de diseño de nivel y dirección de arte del tablero 3D de Muertos de Sed. Úsala SIEMPRE antes de tocar la decoración, el tablero, las fichas o el render (src/game/decor.ts, scripts/board3d/scene.ts).
---

# Diseño del tablero de Muertos de Sed

El tablero es una "pieza de juego de mesa" vista en isométrico en una TV, a 3 metros. Todo lo que se
coloca tiene que leerse a esa distancia, no tapar el juego y verse **puesto a propósito**, nunca al azar.

## 1. Jerarquía visual (en este orden)
1. **El camino de 62 casillas**: siempre visible entero. Nada lo tapa, nada lo pisa.
2. **Las fichas** (calaveritas): son lo más llamativo que se mueve.
3. **La meta** (Tu Tumba, casilla 62) y **la salida** (Medianoche, casilla 1): los dos hitos.
4. **El marco**: el bosque y la reja que encierran el panteón.
5. **El relleno**: tumbas, velas, ofrenda… dan ambiente pero no compiten.

## 2. Zonas (no se coloca nada fuera de su zona)
El recorrido son 4 tramos horizontales (gy = 9, 6, 3, 0) de 14 casillas (gx 0–13) unidos por conectores.
- **Camino**: las casillas. Prohibido poner objetos encima.
- **Franjas interiores** (gy 7–8, 4–5, 1–2): entre tramos. Solo objetos **bajos** (alto ≤ 0,55 casillas),
  porque lo alto tapa las casillas del tramo de detrás. Cada franja tiene **un tema** y una composición
  ordenada (ver §3).
- **Margen de atrás y laterales** (fuera del camino, dentro de la isla): el **marco**. Aquí van lo alto:
  árboles grandes, cripta, faroles, reja de hierro.
- **Margen de delante** (gy > 9.5): solo cosas muy bajas (arbustos, flores, reja baja). Nada alto: taparía el
  primer tramo.
- **Fuera de la isla**: nada. Todo objeto, con su copa y su sombra, cabe dentro del borde de la isla.

## 3. Composición: orden, no azar
- **Alineado a la cuadrícula**: los objetos se colocan en centros de celda (o mitades exactas), no en
  coordenadas sueltas. Rotaciones solo de 0° o 90° (salvo variación mínima ≤ 10° en vegetación).
- **Ritmo**: repeticiones a intervalo fijo (p. ej. una lápida cada 2 casillas, un árbol cada 1,5).
- **Simetría por franja**: cada franja interior es una composición con centro (ofrenda, cripta, fuente) y
  elementos que se repiten a los dos lados.
- **Agrupar, no esparcir**: 3–5 objetos juntos forman un grupo legible; 20 objetos sueltos son ruido.
- **Un solo objeto por celda**: `decor.ts` valida que no haya dos cosas en la misma celda ni encima del camino.
- **Nada ambiguo**: si un objeto no se reconoce a 3 metros (círculos en el suelo, puntitos, manchas), se quita.

## 4. Escala (referencia: 1 casilla = 1 unidad)
| Objeto | Alto |
|---|---|
| Ficha (calaverita) | ~0,8 |
| Lápida / cruz / velas | 0,35–0,55 |
| Arbusto, cempasúchil | 0,3–0,4 |
| Farol | 1,2 |
| Árbol (pino) | **2–2,6** (un árbol es más alto que una persona, nunca como una ficha) |
| Cripta | 1,4 |

## 5. Estilo
- Un solo estilo: **low poly del Graveyard Kit de Kenney** (CC0) + piezas propias hechas en el mismo low poly
  (`flatShading`, pocas caras). Nada de esferas lisas sueltas.
- Paleta: morado noche, naranja cempasúchil, rosa mexicano, hueso; acentos dorados. Luz de luna lila + velas.
- Antes de dar por bueno un cambio: **renderizar** (`node scripts/board3d/render.mjs`), mirar la imagen entera
  y una captura de la TV con zoom, y revisar esta lista: ¿se ve todo el camino?, ¿algo se sale de la isla?,
  ¿algo se solapa?, ¿hay algo que no se entienda?, ¿los árboles parecen árboles?

## 6. Fichas
Base única (el zombi del kit de Kenney, con esqueleto y cabeza separada) para que todas tengan la misma
silueta; cada jugador se distingue por **color de la ropa + accesorio en la cabeza** (y algo en la mano).
Los accesorios se enganchan al hueso/nodo `head` del modelo.
