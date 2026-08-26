# Portfolio

Portfolio personal construido con [Angular](https://angular.dev).

## Fondo animado

Detrás de todo el contenido hay un fondo de partículas interactivo
([`ParticleBackgroundComponent`](src/app/shared/particle-background/particle-background.component.ts))
dibujado en un `<canvas>` a pantalla completa:

- Nube de puntos que flotan libremente y se conectan con líneas según su
  proximidad (grafo dinámico).
- Los puntos hacen bucle en los bordes de la pantalla (si salen por la
  derecha reaparecen por la izquierda, y lo mismo arriba/abajo).
- Al pasar el ratón cerca, los puntos son atraídos hacia el cursor y
  mantienen ese impulso; además cambian gradualmente de color hacia el
  verde mientras están siendo atraídos.
- Los puntos que superan la velocidad de crucero se frenan poco a poco, y de
  vez en cuando algunos puntos de un mismo grupo reciben un pequeño empujón
  aleatorio para que el movimiento se sienta orgánico.
- Un pequeño número de puntos más grandes ("asteroides") ejercen una
  atracción muy sutil sobre el resto, no se conectan al grafo de líneas, y
  rebotan entre sí cuando colisionan.

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200` en el navegador.

## Build

```bash
npm run build
```

Los artefactos de producción se generan en `dist/`.
