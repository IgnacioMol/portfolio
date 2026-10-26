import { Localized } from '../i18n/content';
import data from './projects.json';

export interface ProjectImage {
  src: string;
  // Título breve (galerías); el texto alternativo describe la imagen.
  title?: Localized<string>;
  alt: Localized<string>;
}

export interface ProjectLink {
  kind: 'demo' | 'repo';
  url: string;
}

export interface ProjectData {
  slug: string;
  icon: string;
  featured: boolean;
  title: Localized<string>;
  // Nombre breve para espacios reducidos (portadas sin captura).
  shortTitle: Localized<string>;
  context: Localized<string>;
  role: Localized<string>;
  period: Localized<string>;
  summary: Localized<string>;
  description: Localized<string[]>;
  features: Localized<string[]>;
  techs: string[];
  cover?: ProjectImage;
  gallery: ProjectImage[];
  links: ProjectLink[];
}

// El orden del JSON es el orden en que se muestran los proyectos.
export const PROJECTS = data as ProjectData[];

export function findProject(slug: string | undefined): ProjectData | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}

// Las capturas tienen una versión de 720 px ("-720.webp") para pantallas pequeñas.
export function responsiveSrcset(src: string): string {
  return `${src.replace(/\.webp$/, '-720.webp')} 720w, ${src} 1440w`;
}
