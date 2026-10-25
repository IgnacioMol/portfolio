import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PROFILE } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { Content } from '../../i18n/content';
import { I18nService } from '../../i18n/i18n.service';
import { TECH_ICONS, techIconColor } from '../tech-icon/tech-icons';
import { ThemeService } from '../theme/theme.service';
import { MapNodeDef, MapNodeLabel, PortfolioMapScene, readMapPalette, webglAvailable } from './map-scene';
import { ViewerNavigation } from './viewer-navigation';

type SectionId = keyof Content['viewer']['nodes'];

interface NodeContent {
  label: MapNodeLabel;
  description: string;
  action: string;
  navigation: ViewerNavigation;
}

// Iconos de trazo para las secciones (24×24).
const SECTION_ICONS: Partial<Record<SectionId, string>> = {
  'sobre-mi': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  experiencia: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  formacion: 'M2 9l10-5 10 5-10 5-10-5Zm4 2v5c3 2 9 2 12 0v-5',
  habilidades: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
  proyectos: 'M3 6h6l2 2h10v11H3z',
  contacto: 'M3 6h18v12H3zM3 7l9 6 9-6',
};

// Página (y sección) a la que lleva cada rama.
const SECTION_PAGES: Record<SectionId, ViewerNavigation> = {
  inicio: { commands: ['/'] },
  'sobre-mi': { commands: ['/sobre-mi'] },
  experiencia: { commands: ['/sobre-mi'], fragment: 'experiencia' },
  formacion: { commands: ['/sobre-mi'], fragment: 'formacion' },
  habilidades: { commands: ['/sobre-mi'], fragment: 'habilidades' },
  proyectos: { commands: ['/proyectos'] },
  contacto: { commands: ['/contacto'] },
};

// Tecnologías que aparecen como nodos: una muestra variada del perfil.
const MAP_SKILLS = ['Angular', 'TypeScript', 'React', 'p5.js', 'Unity', 'Laravel'];

@Component({
  selector: 'app-portfolio-map',
  standalone: true,
  templateUrl: './portfolio-map.component.html',
  styleUrl: './portfolio-map.component.scss',
  // Las etiquetas las crea three.js fuera de la plantilla, así que los estilos
  // no pueden ir encapsulados.
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class PortfolioMapComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);

  readonly closed = output<void>();
  readonly navigate = output<ViewerNavigation>();

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly exitButton = viewChild.required<ElementRef<HTMLButtonElement>>('exitButton');

  readonly supported = webglAvailable();
  readonly touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  // Estructura del mapa: no depende del idioma.
  private readonly defs: MapNodeDef[] = this.buildDefs();
  private readonly parents = new Map(this.defs.map((def) => [def.id, def.parent]));
  readonly activeId = signal(this.defs[0].id);

  readonly content = computed(() => this.buildContent(this.i18n.t()));
  readonly active = computed(() => this.content()[this.activeId()]);
  readonly path = computed(() => {
    const path: string[] = [];
    for (let id: string | undefined = this.activeId(); id; id = this.parents.get(id)) {
      path.unshift(id);
    }
    return path;
  });
  readonly children = computed(() => this.defs.filter((def) => def.parent === this.activeId()).map((def) => def.id));

  private scene: PortfolioMapScene | null = null;
  private readonly previousOverflow: string;

  constructor() {
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';

    afterNextRender(() => {
      this.exitButton().nativeElement.focus();
      if (!this.supported) {
        return;
      }
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // La animación corre fuera de Angular para no disparar la detección de
      // cambios en cada fotograma.
      this.zone.runOutsideAngular(() => {
        this.scene = new PortfolioMapScene(this.stage().nativeElement, this.defs, readMapPalette(), {
          reducedMotion,
          onSelect: (id) => this.zone.run(() => this.select(id)),
        });
      });
      this.updateLabels();
    });

    // Idioma o tema nuevos: etiquetas y colores del mapa.
    effect(() => {
      this.content();
      this.theme.theme();
      requestAnimationFrame(() => {
        this.scene?.setPalette(readMapPalette());
        this.updateLabels();
      });
    });
  }

  get t() {
    return this.i18n.t();
  }

  label(id: string): string {
    return this.content()[id]?.label.text ?? id;
  }

  select(id: string): void {
    this.activeId.set(id);
    this.scene?.select(id);
  }

  back(): void {
    const parent = this.parents.get(this.activeId());
    if (parent) {
      this.select(parent);
    }
  }

  go(navigation: ViewerNavigation): void {
    this.navigate.emit(navigation);
  }

  onEscape(event: Event): void {
    event.stopPropagation();
    if (this.parents.get(this.activeId())) {
      this.back();
    } else {
      this.closed.emit();
    }
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
    this.document.body.style.overflow = this.previousOverflow;
  }

  private updateLabels(): void {
    if (!this.scene) {
      return;
    }
    const labels: Record<string, MapNodeLabel> = {};
    for (const [id, entry] of Object.entries(this.content())) {
      labels[id] = entry.label;
    }
    this.scene.setLabels(labels);
  }

  private buildDefs(): MapNodeDef[] {
    const t = this.i18n.t();
    return [
      { id: 'inicio', kind: 'root' },
      { id: 'sobre-mi', parent: 'inicio', kind: 'section' },
      { id: 'proyectos', parent: 'inicio', kind: 'section' },
      { id: 'contacto', parent: 'inicio', kind: 'section' },
      { id: 'experiencia', parent: 'sobre-mi', kind: 'section' },
      { id: 'formacion', parent: 'sobre-mi', kind: 'section' },
      { id: 'habilidades', parent: 'sobre-mi', kind: 'section' },
      ...t.experience.entries.map((_, i): MapNodeDef => ({ id: `exp-${i}`, parent: 'experiencia', kind: 'item' })),
      ...t.education.entries.map((_, i): MapNodeDef => ({ id: `edu-${i}`, parent: 'formacion', kind: 'item' })),
      ...MAP_SKILLS.map((name): MapNodeDef => ({ id: `skill-${name}`, parent: 'habilidades', kind: 'item' })),
      ...PROJECTS.map(
        (project): MapNodeDef => ({ id: `project-${project.slug}`, parent: 'proyectos', kind: 'item', image: project.cover?.src }),
      ),
    ];
  }

  private buildContent(t: Content): Record<string, NodeContent> {
    const viewer = t.viewer;
    const theme = this.theme.theme();
    const content: Record<string, NodeContent> = {};

    for (const id of Object.keys(SECTION_PAGES) as SectionId[]) {
      const node = viewer.nodes[id];
      const icon = SECTION_ICONS[id];
      content[id] = {
        label: {
          text: id === 'inicio' ? `${PROFILE.firstName} ${PROFILE.lastName.split(' ')[0]}` : node.label,
          icon: icon ? { path: icon, style: 'stroke' } : undefined,
        },
        description: node.description,
        action: viewer.goTo,
        navigation: SECTION_PAGES[id],
      };
    }

    t.experience.entries.forEach((job, i) => {
      content[`exp-${i}`] = {
        label: { text: job.org.split(' · ')[0] },
        description: `${job.title} · ${job.period}. ${job.highlights[0] ?? ''}`,
        action: viewer.goTo,
        navigation: SECTION_PAGES.experiencia,
      };
    });

    t.education.entries.forEach((entry, i) => {
      content[`edu-${i}`] = {
        label: { text: entry.title },
        description: `${entry.org} · ${entry.period}.`,
        action: viewer.goTo,
        navigation: SECTION_PAGES.formacion,
      };
    });

    for (const name of MAP_SKILLS) {
      const brand = TECH_ICONS[name];
      const group = t.skills.groups.find((g) => g.items.includes(name));
      content[`skill-${name}`] = {
        label: {
          text: name,
          icon: brand ? { path: brand.path, style: 'fill', color: techIconColor(brand.hex, theme) } : undefined,
        },
        description: group ? `${group.title}: ${group.items.join(', ')}.` : viewer.nodes.habilidades.description,
        action: viewer.goTo,
        navigation: SECTION_PAGES.habilidades,
      };
    }

    for (const project of PROJECTS) {
      content[`project-${project.slug}`] = {
        label: { text: this.i18n.localize(project.shortTitle) },
        description: this.i18n.localize(project.summary),
        action: viewer.viewProject,
        navigation: { commands: ['/proyectos', project.slug] },
      };
    }
    return content;
  }
}
