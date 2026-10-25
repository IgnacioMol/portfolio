import {
  siAndroidstudio,
  siAngular,
  siBootstrap,
  siCplusplus,
  siCss,
  siDocker,
  siFigma,
  siFilament,
  siFirebase,
  siGit,
  siGithub,
  siHtml5,
  siJavascript,
  siJira,
  siKotlin,
  siLaravel,
  siMeta,
  siMongodb,
  siMysql,
  siNetlify,
  siOpenjdk,
  siP5dotjs,
  siPhp,
  siPython,
  siReact,
  siReactivex,
  siSass,
  siThreedotjs,
  siTypescript,
  siUnity,
  siVite,
  siVitest,
  siWordpress,
} from 'simple-icons';

export interface TechIcon {
  path: string;
  hex: string;
}

// Logos de Simple Icons por nombre de tecnología, tal y como aparece en los
// JSON de i18n. Las tecnologías sin entrada se muestran sin logo.
export const TECH_ICONS: Record<string, TechIcon> = {
  HTML: siHtml5,
  CSS: siCss,
  JavaScript: siJavascript,
  TypeScript: siTypescript,
  Angular: siAngular,
  React: siReact,
  'React Native': siReact,
  Bootstrap: siBootstrap,
  SCSS: siSass,
  RxJS: siReactivex,
  Vite: siVite,
  Vitest: siVitest,
  PHP: siPhp,
  Laravel: siLaravel,
  Java: siOpenjdk,
  MySQL: siMysql,
  MongoDB: siMongodb,
  Firebase: siFirebase,
  'Android Studio': siAndroidstudio,
  Kotlin: siKotlin,
  Figma: siFigma,
  WordPress: siWordpress,
  Filament: siFilament,
  Unity: siUnity,
  'Meta SDK': siMeta,
  'p5.js': siP5dotjs,
  'Three.js': siThreedotjs,
  'C++': siCplusplus,
  Python: siPython,
  Git: siGit,
  GitHub: siGithub,
  Docker: siDocker,
  Netlify: siNetlify,
  Jira: siJira,
};

// Fuera de estos márgenes el color de marca no se distingue sobre el fondo
// (casi negro en tema oscuro, casi blanco en tema claro): se usa el del texto.
const MIN_LUMINANCE_DARK = 0.12;
const MAX_LUMINANCE_LIGHT = 0.75;

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function techIconColor(hex: string, theme: 'light' | 'dark'): string {
  const value = luminance(hex);
  const unreadable = theme === 'dark' ? value < MIN_LUMINANCE_DARK : value > MAX_LUMINANCE_LIGHT;
  return unreadable ? 'var(--text)' : '#' + hex;
}
