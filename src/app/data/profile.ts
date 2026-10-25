import { siGithub } from 'simple-icons';

// Simple Icons ya no incluye LinkedIn, así que su logo se define aquí.
const LINKEDIN_PATH =
  'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';
const MAIL_PATH =
  'M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.51l10 6.25 10-6.25V6H2zm20 2.87-9.47 5.92a1 1 0 0 1-1.06 0L2 8.87V18h20V8.87z';

export interface SocialLink {
  label: string;
  href: string;
  path: string;
  external: boolean;
}

export interface CvFile {
  lang: string;
  label: string;
  href: string;
}

export const PROFILE = {
  firstName: 'Ignacio',
  lastName: 'Molina Gutiérrez',
  email: 'igmogu03@gmail.com',
  githubUrl: 'https://github.com/IgnacioMol',
  linkedinUrl: 'https://www.linkedin.com/in/ignacio-molina-ba7334370',
};

// Los PDF se sirven desde public/cv/. Con un único fichero el botón descarga
// directamente; con varios, muestra un menú para elegir el idioma.
export const CV_FILES: CvFile[] = [
  { lang: 'es', label: 'Español', href: 'cv/CV_Ignacio_Molina_Gutierrez_ES.pdf' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', href: PROFILE.githubUrl, path: siGithub.path, external: true },
  { label: 'LinkedIn', href: PROFILE.linkedinUrl, path: LINKEDIN_PATH, external: true },
  { label: 'Email', href: 'mailto:' + PROFILE.email, path: MAIL_PATH, external: false },
];
