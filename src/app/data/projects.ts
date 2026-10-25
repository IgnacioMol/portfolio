import { Localized } from '../i18n/content';
import data from './projects.json';

export interface ProjectImage {
  src: string;
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
  context: Localized<string>;
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
