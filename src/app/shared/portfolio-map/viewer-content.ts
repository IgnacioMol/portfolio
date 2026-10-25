import { PROFILE } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { Content, Lang } from '../../i18n/content';
import { ViewerNavigation } from './viewer-navigation';

// Un elemento que puede mostrar cualquiera de las escenas 3D.
export interface ViewerItem {
  id: string;
  // Línea pequeña sobre el título (fecha, contexto...).
  eyebrow: string;
  label: string;
  // Nombre breve para etiquetas y cabeceras dentro de las escenas.
  short: string;
  description: string;
  action: string;
  navigation: ViewerNavigation;
  image?: string;
}

const ABOUT: ViewerNavigation = { commands: ['/sobre-mi'] };
const EXPERIENCE: ViewerNavigation = { commands: ['/sobre-mi'], fragment: 'experiencia' };
const EDUCATION: ViewerNavigation = { commands: ['/sobre-mi'], fragment: 'formacion' };
const SKILLS: ViewerNavigation = { commands: ['/sobre-mi'], fragment: 'habilidades' };

// Todo lo que las escenas pueden enseñar, con los textos del idioma activo.
export function buildViewerItems(t: Content, lang: Lang): Record<string, ViewerItem> {
  const v = t.viewer;
  const items: ViewerItem[] = [
    {
      id: 'sobre-mi',
      short: v.nodes['sobre-mi'].label,
      eyebrow: t.hero.role,
      label: `${PROFILE.firstName} ${PROFILE.lastName}`,
      description: t.about.lead,
      action: v.goTo,
      navigation: ABOUT,
    },
    {
      id: 'experiencia',
      short: v.nodes['experiencia'].label,
      eyebrow: v.nodes.experiencia.label,
      label: t.experience.entries.map((job) => job.org.split(' · ')[0]).join(' · '),
      description: v.nodes.experiencia.description,
      action: v.goTo,
      navigation: EXPERIENCE,
    },
    {
      id: 'formacion',
      short: v.nodes['formacion'].label,
      eyebrow: v.nodes.formacion.label,
      label: t.education.entries.map((entry) => entry.title).join(' · '),
      description: v.nodes.formacion.description,
      action: v.goTo,
      navigation: EDUCATION,
    },
    {
      id: 'habilidades',
      short: v.nodes['habilidades'].label,
      eyebrow: v.nodes.habilidades.label,
      label: t.skills.featured.slice(0, 6).join(' · '),
      description: v.nodes.habilidades.description,
      action: v.goTo,
      navigation: SKILLS,
    },
    {
      id: 'proyectos',
      short: v.nodes['proyectos'].label,
      eyebrow: v.nodes.proyectos.label,
      label: PROJECTS.map((project) => project.shortTitle[lang]).join(' · '),
      description: v.nodes.proyectos.description,
      action: v.goTo,
      navigation: { commands: ['/proyectos'] },
    },
    {
      id: 'contacto',
      short: v.nodes['contacto'].label,
      eyebrow: v.nodes.contacto.label,
      label: PROFILE.email,
      description: v.nodes.contacto.description,
      action: v.goTo,
      navigation: { commands: ['/contacto'] },
    },
    ...t.experience.entries.map(
      (job, i): ViewerItem => ({
        id: `exp-${i}`,
        short: job.org.split(' · ')[0],
        eyebrow: job.period,
        label: job.title,
        description: `${job.org}. ${job.highlights[0] ?? ''}`,
        action: v.goTo,
        navigation: EXPERIENCE,
      }),
    ),
    ...t.education.entries.map(
      (entry, i): ViewerItem => ({
        id: `edu-${i}`,
        short: entry.title,
        eyebrow: entry.period,
        label: entry.title,
        description: entry.org,
        action: v.goTo,
        navigation: EDUCATION,
      }),
    ),
    {
      id: 'erasmus',
      short: 'Erasmus',
      eyebrow: 'Erasmus',
      label: lang === 'es' ? 'República Checa' : 'Czech Republic',
      description: t.about.paragraphs[1] ?? '',
      action: v.goTo,
      navigation: ABOUT,
    },
    ...PROJECTS.map(
      (project): ViewerItem => ({
        id: `project-${project.slug}`,
        short: project.shortTitle[lang],
        eyebrow: project.context[lang],
        label: project.title[lang],
        description: project.summary[lang],
        action: v.viewProject,
        navigation: { commands: ['/proyectos', project.slug] },
        image: project.cover?.src,
      }),
    ),
    ...PROJECTS.flatMap((project) =>
      project.gallery.map(
        (image, i): ViewerItem => ({
          id: `shot-${project.slug}-${i}`,
          eyebrow: project.shortTitle[lang],
          label: image.title?.[lang] ?? project.shortTitle[lang],
          short: image.title?.[lang] ?? project.shortTitle[lang],
          description: image.alt[lang],
          action: v.viewProject,
          navigation: { commands: ['/proyectos', project.slug] },
          image: image.src,
        }),
      ),
    ),
  ];
  return Object.fromEntries(items.map((item) => [item.id, item]));
}
