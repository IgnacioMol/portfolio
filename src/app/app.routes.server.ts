import { RenderMode, ServerRoute } from '@angular/ssr';
import { PROJECTS } from './data/projects';

// Todas las páginas conocidas se generan como HTML estático al compilar, para
// que GitHub Pages las sirva directamente (con código 200 y su contenido).
// Las rutas desconocidas se resuelven en el navegador, que muestra la 404.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'sobre-mi', renderMode: RenderMode.Prerender },
  { path: 'proyectos', renderMode: RenderMode.Prerender },
  {
    path: 'proyectos/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PROJECTS.map((project) => ({ slug: project.slug })),
  },
  { path: 'contacto', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
