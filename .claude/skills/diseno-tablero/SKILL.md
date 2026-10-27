---
name: diseno-tablero
description: Reglas de diseño de nivel y dirección de arte del tablero 3D de Muertos de Sed. Úsala SIEMPRE antes de tocar la decoración, el tablero, las fichas o el render (src/game/decor.ts, scripts/board3d/scene.ts).
---

# Diseño del tablero de Muertos de Sed

El tablero es una "pieza de juego de mesa" vista en isométrico en una TV, a 3 metros. Todo lo que se
coloca tiene que leerse a esa distancia, no tapar el juego y verse **puesto a propósito**, nunca al azar.

## 1. Jerarquía visual (en este orden)
1. **El camino de 62 casillas**: siempre visible entero. Nada lo tapa, nada lo pisa.
2. **Las fichas** (zombis): son lo más llamativo que se mueve.
3. **La meta** (Tu Tumba, casilla 62) y **la salida** (Medianoche, casilla 1): los dos hitos.
4. **El marco**: los árboles muertos, los muros y la reja que encierran el panteón.
5. **El relleno**: tumbas, velas, ataúdes, escombros… dan ambiente pero no compiten.

## 2. Recorrido y zonas (referencia: tableros de Mario Party)
El camino **no es una cuadrícula**: son casillas **redondas** sobre un sendero que serpentea por el
panteón rodeando lugares con tema, como en Mario Party (`ROUTE` en `src/game/isoPath.ts`, curva suave con las
62 casillas a la misma distancia). Las zonas que deja el recorrido:
- **Delante** (entre el primer y el segundo tramo): la hoguera de los supervivientes.
- **Centro**: la fosa común.
- **Entre el tercer tramo y el último**: la hilera de tumbas.
- **Marco**: detrás y a la izquierda lo alto (árboles muertos, muros en ruinas, cripta, braseros);
  a la derecha solo cosas bajas; **delante nada** (taparía el primer tramo).
- **Fuera de la isla**: nada. Todo objeto, con su copa y su sombra, cabe dentro del borde de la isla.
Las reglas se comprueban solas en `src/game/decor.test.ts`: nada encima del camino, **nada que tape una
casilla desde la cámara** (usa la tabla `HEIGHT`), nada solapado, todo dentro de la isla.

## 3. Composición: orden, no azar
- **Alineado**: los objetos se colocan en filas o en grupos simétricos alrededor de un centro, no sueltos.
  Rotaciones de 0° o 90° (la vegetación, los escombros y las rocas pueden variar).
- **Ritmo**: repeticiones a intervalo fijo (p. ej. una lápida cada 2 casillas, un árbol cada 1,5).
- **Simetría por zona**: cada zona es una composición con centro (hoguera, fosa, cripta) y
  elementos que se repiten a los dos lados.
- **Agrupar, no esparcir**: 3–5 objetos juntos forman un grupo legible; 20 objetos sueltos son ruido.
- **Sin solapes**: `decor.test.ts` valida que no haya dos cosas en el mismo sitio ni encima del camino.
- **Nada ambiguo**: si un objeto no se reconoce a 3 metros (círculos en el suelo, puntitos, manchas), se quita.

## 4. Escala (referencia: 1 casilla = 1 unidad)
| Objeto | Alto |
|---|---|
| Ficha (zombi) | ~0,85 |
| Lápida / cruz / velas | 0,35–0,55 |
| Rocas, escombros, ataúdes | 0,2–0,45 |
| Farol | 1,2 |
| Árbol muerto | **2,2–2,8** (un árbol es más alto que una persona, nunca como una ficha) |
| Cripta | 1,4 |

## 5. Estilo: terror / postapocalíptico (decisión del usuario)
- **Nada de Día de Muertos ni Halloween** (sin cempasúchil, papel picado, calabazas, colores alegres) y
  **nada de lagos rosados**. Un panteón abandonado de noche: árboles muertos, muros en ruinas, rejas rotas,
  ataúdes, escombros, braseros con fuego, niebla.
- Un solo estilo: **low poly del Graveyard Kit de Kenney** (CC0) + piezas propias en el mismo low poly
  (`flatShading`, pocas caras). Nada de esferas lisas sueltas. El usuario rechazó los pinos del kit.
- La textura del kit (`models/graveyard/Textures/colormap.png`) está **desaturada y enfriada** a propósito para
  que todo el kit tenga el tono de terror.
- Luz: luna fría azulada, niebla (`scene.fog`); el calor solo viene del fuego y las velas; la meta brilla verde.
- Las casillas sí van en color (son el juego y deben leerse), con un poco de brillo propio.
- Antes de dar por bueno un cambio: **renderizar** (`node scripts/board3d/render.mjs`), mirar la imagen entera
  y una captura de la TV con zoom, y revisar esta lista: ¿se ve todo el camino?, ¿algo se sale de la isla?,
  ¿algo se solapa?, ¿hay algo que no se entienda?, ¿los árboles parecen árboles?

## 6. Fichas
Base única: el zombi del kit de Kenney (piezas rígidas: `torso`, `head`, `arm-left/right`, piernas), así todas
tienen la misma silueta. Cada jugador se distingue por **la camisa de su color + un accesorio en la cabeza**
(casco militar, gorra, velo de novia, casco de obra, vaquero, máscara de gas, cono, chistera); todos con los
brazos hacia delante y una botella. Los accesorios cuelgan del nodo `head` (`headgear()` en `scene.ts`).
