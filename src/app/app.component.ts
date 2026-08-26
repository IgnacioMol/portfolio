import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ParticleBackgroundComponent } from './shared/particle-background/particle-background.component';

// TODO: crea un formulario gratuito en https://formspree.io con tu email
// (ignacio.molina.gutierrez.2003@gmail.com) y sustituye este endpoint por
// el que te den, con el formato "https://formspree.io/f/xxxxxxxx".
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/TU_FORM_ID';

interface TechGroup {
  title: string;
  items: string[];
}

interface Project {
  icon: string;
  name: string;
  tag?: string;
  description: string;
  role?: string;
  techs: string[];
  link?: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  location: string;
  period: string;
  description: string;
}

interface EducationEntry {
  title: string;
  place: string;
  description: string;
  items: string[];
}

interface SkillArea {
  title: string;
  description: string;
}

interface Achievement {
  icon: string;
  title: string;
  description: string;
}

interface NavLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ParticleBackgroundComponent, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'portfolio';
  readonly contactEmail = 'ignacio.molina.gutierrez.2003@gmail.com';

  contactForm = { name: '', email: '', message: '' };
  submitting = false;
  submitStatus: 'idle' | 'success' | 'error' = 'idle';

  readonly navLinks: NavLink[] = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Sobre mí', href: '#sobre-mi' },
    { label: 'Proyectos', href: '#proyectos' },
    { label: 'Experiencia', href: '#experiencia' },
    { label: 'Tecnologías', href: '#tecnologias' },
    { label: 'Formación', href: '#formacion' },
    { label: 'Contacto', href: '#contacto' },
  ];

  readonly techGroups: TechGroup[] = [
    {
      title: 'Desarrollo web',
      items: [
        'Angular',
        'React',
        'TypeScript',
        'JavaScript',
        'PHP',
        'Laravel',
        'Filament',
        'WordPress',
        'HTML / CSS',
        'Bootstrap',
      ],
    },
    {
      title: 'Aplicaciones interactivas y visualización',
      items: [
        'p5.js',
        'D3.js',
        'Visualización de datos',
        'Gráficos interactivos',
        'Arte generativo',
      ],
    },
    {
      title: 'Programación',
      items: [
        'C++',
        'Programación orientada a objetos',
        'OpenGL',
        'Programación gráfica',
      ],
    },
    {
      title: 'Herramientas y entornos',
      items: ['Git / GitHub', 'Docker', 'Composer', 'MySQL', 'MariaDB', 'WSL'],
    },
  ];

  readonly projects: Project[] = [
    {
      icon: '🌀',
      name: 'Epicycloid Generator',
      tag: 'Proyecto de Fin de Grado',
      description:
        'Aplicación web interactiva para la generación de arte generativo basada en patrones orbitales. Permite modificar diferentes parámetros y visualizar los resultados en tiempo real, con distintos modos de representación, animación y exportación de los patrones generados.',
      role: 'Diseño e implementación de la aplicación, desarrollo de la interfaz e integración del sistema de visualización interactiva.',
      techs: ['Angular', 'TypeScript', 'p5.js', 'RxJS', 'Bootstrap'],
      link: '', // TODO: añadir enlace al proyecto
    },
    {
      icon: '🌐',
      name: 'Desarrollo web',
      description:
        'Próximamente: proyectos de desarrollo web realizados durante la carrera o por cuenta propia.',
      techs: [],
      link: '',
    },
  ];

  readonly experience: ExperienceEntry[] = [
    {
      company: 'MIP Informática',
      role: 'Prácticas de empresa',
      location: 'Paterna',
      period: 'Octubre – Diciembre 2025',
      description:
        'Durante el último año del Grado en Ingeniería Multimedia realicé mis prácticas en MIP Informática, participando en proyectos de desarrollo web tanto para clientes como para la propia empresa. Trabajé principalmente con WordPress, Laravel y Filament, además de tener contacto con React y GitHub. Entre los trabajos realizados se encuentran la creación de páginas web, desarrollo y mejora de funcionalidades para la plataforma interna de la empresa y la actualización de Filament 3 a Filament 4.',
    },
  ];

  readonly education: EducationEntry[] = [
    {
      title: 'Grado en Ingeniería Multimedia',
      place: 'Universitat de València',
      description:
        'Formación multidisciplinar que combina programación, desarrollo de software, tecnologías web, visualización y gráficos por ordenador.',
      items: [
        'Desarrollo web',
        'Programación',
        'Visualización',
        'Programación gráfica',
        'Sistemas operativos',
        'Diseño de videojuegos',
        'Tecnologías web semánticas',
      ],
    },
    {
      title: 'Erasmus',
      place: 'Brno, República Checa',
      description:
        'Experiencia académica internacional realizada durante el grado. (Pendiente: universidad, fechas y qué estudié allí)',
      items: [],
    },
  ];

  readonly skills: SkillArea[] = [
    {
      title: 'Desarrollo de aplicaciones',
      description:
        'Creación de aplicaciones web e interfaces interactivas, desde la planificación hasta la implementación.',
    },
    {
      title: 'Desarrollo frontend',
      description:
        'Experiencia con Angular, React, TypeScript y JavaScript, creando interfaces dinámicas e interactivas.',
    },
    {
      title: 'Desarrollo backend',
      description:
        'Experiencia con PHP, Laravel y Filament, trabajando tanto en nuevas funcionalidades como en mantenimiento y evolución de aplicaciones existentes.',
    },
    {
      title: 'Visualización y gráficos',
      description:
        'Experiencia desarrollando visualizaciones interactivas y aplicaciones gráficas mediante tecnologías como p5.js, D3.js y OpenGL.',
    },
    {
      title: 'Resolución de problemas',
      description:
        'Capacidad para investigar y resolver problemas técnicos, adaptarme a nuevas tecnologías y trabajar con proyectos existentes.',
    },
    {
      title: 'Trabajo en equipo',
      description:
        'Experiencia trabajando de forma autónoma y colaborando con otras personas, utilizando herramientas como Git y GitHub.',
    },
  ];

  readonly achievements: Achievement[] = [
    {
      icon: '🎓',
      title: 'TFG — 9/10',
      description: 'Proyecto de Fin de Grado: Epicycloid Generator',
    },
    {
      icon: '💼',
      title: 'Experiencia profesional',
      description: 'Prácticas de desarrollo web en MIP Informática',
    },
    {
      icon: '🌍',
      title: 'Experiencia internacional',
      description: 'Estancia Erasmus durante el Grado en Ingeniería Multimedia',
    },
  ];

  async onSubmitContact(): Promise<void> {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.submitStatus = 'idle';

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.contactForm),
      });

      if (response.ok) {
        this.submitStatus = 'success';
        this.contactForm = { name: '', email: '', message: '' };
      } else {
        this.submitStatus = 'error';
      }
    } catch {
      this.submitStatus = 'error';
    } finally {
      this.submitting = false;
    }
  }
}
