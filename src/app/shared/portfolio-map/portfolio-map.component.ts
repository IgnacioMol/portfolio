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
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { readScenePalette, webglAvailable } from './scenes/base-scene';
import { DeskScene } from './scenes/desk-scene';
import { buildViewerItems } from './viewer-content';
import { ViewerNavigation } from './viewer-navigation';

// Demo 3D del portfolio: un escritorio en el que cada objeto es una sección.
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
  readonly activeId = signal<string | null>(null);
  readonly items = computed(() => buildViewerItems(this.i18n.t(), this.i18n.lang()));
  readonly active = computed(() => {
    const id = this.activeId();
    return id ? this.items()[id] ?? null : null;
  });

  private scene: DeskScene | null = null;
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
        this.scene = new DeskScene(this.stage().nativeElement, {
          items: untracked(this.items),
          palette: readScenePalette(),
          reducedMotion,
          onSelect: (id) => this.zone.run(() => this.select(id)),
        });
      });
    });

    // Idioma o tema nuevos: textos y colores de la escena.
    effect(() => {
      const items = this.items();
      this.theme.theme();
      requestAnimationFrame(() => {
        this.scene?.setPalette(readScenePalette());
        this.scene?.setItems(items);
      });
    });
  }

  get t() {
    return this.i18n.t();
  }

  select(id: string | null): void {
    this.activeId.set(id);
    this.scene?.select(id);
  }

  go(navigation: ViewerNavigation): void {
    this.navigate.emit(navigation);
  }

  // Escape vuelve a la vista general y, desde ella, cierra la demo.
  onEscape(event: Event): void {
    event.stopPropagation();
    if (this.activeId()) {
      this.select(null);
    } else {
      this.closed.emit();
    }
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
    this.document.body.style.overflow = this.previousOverflow;
  }
}
