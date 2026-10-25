import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // Pasa :slug como input del componente de la ruta.
      withComponentInputBinding(),
      // Vuelve arriba al cambiar de página y baja a la sección de los enlaces "/#seccion".
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Permite volver a bajar a una sección aunque ya sea la de la URL actual.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      // Fundido entre páginas en los navegadores que lo soportan.
      withViewTransitions({ skipInitialTransition: true }),
    ),
  ],
};
