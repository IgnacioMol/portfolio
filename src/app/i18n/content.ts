export type Lang = 'es' | 'en';

// Valor con una variante por idioma, para datos que no viven en es.json/en.json.
export type Localized<T> = Record<Lang, T>;

export interface NavLink {
  label: string;
  href: string;
}

export interface Highlight {
  value: string;
  label: string;
}

export interface Language {
  name: string;
  level: string;
  detail?: string;
}

export interface TimelineEntry {
  title: string;
  org: string;
  location: string;
  period: string;
  current?: boolean;
  highlights: string[];
  techs?: string[];
}

export interface ViewerNode {
  label: string;
  description: string;
}

export interface SkillGroup {
  title: string;
  icon: string;
  items: string[];
}

// Todos los textos visibles de la página para un idioma.
export interface Content {
  meta: { title: string; description: string };
  nav: {
    links: NavLink[];
    mainNav: string;
    openMenu: string;
    closeMenu: string;
    switchLang: string;
    skipToContent: string;
  };
  hero: {
    greeting: string;
    role: string;
    intro: string;
    ctaProjects: string;
    ctaCv: string;
    cvMenu: string;
    ctaContact: string;
    explore3d: string;
  };
  about: {
    title: string;
    paragraphs: string[];
    highlights: Highlight[];
    languagesTitle: string;
    languages: Language[];
  };
  experience: { title: string; currentLabel: string; entries: TimelineEntry[] };
  projects: {
    title: string;
    subtitle: string;
    featuredTitle: string;
    featuredSubtitle: string;
    seeAll: string;
    viewProject: string;
    links: { demo: string; repo: string };
    detail: {
      breadcrumb: string;
      home: string;
      back: string;
      about: string;
      features: string;
      technologies: string;
      gallery: string;
      enlarge: string;
      close: string;
      projectLinks: string;
      next: string;
    };
  };
  notFound: { title: string; text: string; back: string };
  skills: {
    title: string;
    subtitle: string;
    featuredTitle: string;
    featured: string[];
    allTitle: string;
    groups: SkillGroup[];
  };
  education: { title: string; currentLabel: string; entries: TimelineEntry[] };
  contact: {
    title: string;
    text: string;
    locationLabel: string;
    location: string;
    form: {
      name: string;
      email: string;
      message: string;
      submit: string;
      sending: string;
      subject: string;
      optional: string;
      success: string;
      error: string;
    };
  };
  viewer: {
    open: string;
    title: string;
    hint: string;
    hintTouch: string;
    exit: string;
    loading: string;
    overview: string;
    goTo: string;
    viewProject: string;
    nodesLabel: string;
    unsupported: string;
    nodes: Record<'inicio' | 'sobre-mi' | 'experiencia' | 'proyectos' | 'habilidades' | 'formacion' | 'contacto', ViewerNode>;
  };
  footer: { builtWith: string; backToTop: string };
  a11y: { opensNewTab: string; emailLabel: string };
}
