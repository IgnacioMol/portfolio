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
import { PROJECTS } from '../../data/projects';
import { ViewerNode } from '../../i18n/content';
import { I18nService } from '../../i18n/i18n.service';
import { SceneNodeDef, SolarScene, webglAvailable } from './solar-scene';
import { ViewerNavigation } from './viewer-navigation';

type SectionId = 'inicio' | 'sobre-mi' | 'experiencia' | 'proyectos' | 'habilidades' | 'formacion' | 'contacto';

const PROJECT_PREFIX = 'proyecto:';
const MOON_COLORS = ['#ffd36b', '#ff6b7d', '#8be9fd', '#c3f584'];

// Cada sección es un planeta; la distancia a la estrella sigue el orden de la
// página.
const SECTION_BODIES: SceneNodeDef[] = [
  { id: 'inicio', kind: 'star', size: 3.2, orbit: 0, speed: 0, phase: 0, tilt: 0, color: '#ffcf70' },
  { id: 'sobre-mi', kind: 'planet', size: 1.05, orbit: 9, speed: 0.16, phase: 0.4, tilt: 0.04, color: '#6fb3ff' },
  { id: 'experiencia', kind: 'planet', size: 1.3, orbit: 13.5, speed: 0.11, phase: 2.1, tilt: -0.05, color: '#ff8a5c' },
  { id: 'proyectos', kind: 'planet', size: 1.7, orbit: 19.5, speed: 0.075, phase: 4.2, tilt: 0.06, color: '#b88cff' },
  { id: 'habilidades', kind: 'planet', size: 1.45, orbit: 26, speed: 0.055, phase: 1.1, tilt: -0.04, color: '#4fd1c5', ring: true },
  { id: 'formacion', kind: 'planet', size: 1.2, orbit: 32, speed: 0.042, phase: 3.3, tilt: 0.05, color: '#9be15d' },
  { id: 'contacto', kind: 'planet', size: 0.95, orbit: 37.5, speed: 0.034, phase: 5.4, tilt: -0.06, color: '#ff7ac6' },
];

function sceneBodies(): SceneNodeDef[] {
  const moons: SceneNodeDef[] = PROJECTS.map((project, index) => ({
    id: PROJECT_PREFIX + project.slug,
    kind: 'moon',
    parent: 'proyectos',
    size: 0.42,
    orbit: 3 + index * 1.35,
    speed: 0.5 - index * 0.12,
    phase: index * 2.4,
    tilt: 0.25 - index * 0.2,
    color: MOON_COLORS[index % MOON_COLORS.length],
  }));
  return [...SECTION_BODIES, ...moons];
}

@Component({
  selector: 'app-solar-viewer',
  standalone: true,
  templateUrl: './solar-viewer.component.html',
  styleUrl: './solar-viewer.component.scss',
  // Las etiquetas las crea three.js fuera de la plantilla, así que los estilos
  // no pueden ir encapsulados.
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class SolarViewerComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  readonly i18n = inject(I18nService);

  readonly closed = output<void>();
  readonly navigate = output<ViewerNavigation>();

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly exitButton = viewChild.required<ElementRef<HTMLButtonElement>>('exitButton');

  readonly supported = webglAvailable();
  readonly touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  readonly selectedId = signal<string | null>(null);
  readonly sections = SECTION_BODIES.map((body) => body.id as SectionId);
  readonly projects = PROJECTS;

  // Contenido del panel lateral para el cuerpo seleccionado.
  readonly selected = computed(() => {
    const id = this.selectedId();
    const t = this.i18n.t().viewer;
    if (!id) {
      return null;
    }
    if (id.startsWith(PROJECT_PREFIX)) {
      const project = PROJECTS.find((p) => PROJECT_PREFIX + p.slug === id);
      if (!project) {
        return null;
      }
      return {
        label: this.i18n.localize(project.title),
        description: this.i18n.localize(project.summary),
        action: t.viewProject,
        navigation: { commands: ['/proyectos', project.slug] } as ViewerNavigation,
      };
    }
    const node: ViewerNode = t.nodes[id as SectionId];
    return {
      label: node.label,
      description: node.description,
      action: t.goTo,
      navigation: { commands: ['/'], fragment: id } as ViewerNavigation,
    };
  });

  private scene: SolarScene | null = null;
  private previousOverflow = '';

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
        this.scene = new SolarScene(this.stage().nativeElement, sceneBodies(), {
          reducedMotion,
          onSelect: (id) => this.zone.run(() => this.select(id)),
        });
      });
      this.updateLabels();
    });

    effect(() => {
      this.i18n.lang();
      this.updateLabels();
    });
  }

  get t() {
    return this.i18n.t();
  }

  projectId(slug: string): string {
    return PROJECT_PREFIX + slug;
  }

  select(id: string | null): void {
    this.selectedId.set(id);
    this.scene?.select(id);
  }

  go(navigation: ViewerNavigation): void {
    this.navigate.emit(navigation);
  }

  onEscape(event: Event): void {
    event.stopPropagation();
    if (this.selectedId()) {
      this.select(null);
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
    const nodes = this.i18n.t().viewer.nodes;
    const labels: Record<string, string> = {};
    for (const id of this.sections) {
      labels[id] = nodes[id].label;
    }
    for (const project of PROJECTS) {
      labels[PROJECT_PREFIX + project.slug] = this.i18n.localize(project.shortTitle);
    }
    this.scene.setLabels(labels);
  }
}
