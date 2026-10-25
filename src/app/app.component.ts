import { DOCUMENT, ViewportScroller } from '@angular/common';
import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet, Scroll } from '@angular/router';
import { CV_FILES, PROFILE, SOCIAL_LINKS } from './data/profile';
import { I18nService } from './i18n/i18n.service';
import { ParticleBackgroundComponent } from './shared/particle-background/particle-background.component';
import { SolarViewerComponent } from './shared/solar-viewer/solar-viewer.component';
import { ViewerNavigation } from './shared/solar-viewer/viewer-navigation';
import { ViewerService } from './shared/solar-viewer/viewer.service';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ParticleBackgroundComponent, SolarViewerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);

  title = 'portfolio';
  readonly profile = PROFILE;
  readonly socialLinks = SOCIAL_LINKS;
  // El CV principal; si hubiera más idiomas, la página "Sobre mí" los ofrece.
  readonly cv = CV_FILES[0];
  readonly currentYear = new Date().getFullYear();

  menuOpen = false;
  readonly viewerOpen = inject(ViewerService).open;
  private readonly viewerButton = viewChild.required<ElementRef<HTMLButtonElement>>('viewerButton');
  // Elemento que abrió el visor, para devolverle el foco al cerrarlo.
  private viewerOpener: HTMLElement | null = null;
  private instantJump = false;

  constructor() {
    // Al bajar a una sección, deja hueco para la barra de navegación fija.
    inject(ViewportScroller).setOffset([0, 80]);

    // Al llegar a una sección desde otra página, el scroll suave recorrería
    // toda la página con los bloques a medio aparecer: se salta directamente.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart && this.pathOf(event.url) !== this.pathOf(this.router.url)) {
        this.startInstantJump();
      } else if (event instanceof Scroll) {
        this.endInstantJump();
      }
    });

    effect(() => {
      if (this.viewerOpen()) {
        this.menuOpen = false;
        this.viewerOpener = this.document.activeElement as HTMLElement | null;
      }
    });
  }

  get t() {
    return this.i18n.t();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  // Los enlaces "#..." se resuelven contra <base href>, así que fuera de la
  // portada recargarían la página: se gestiona a mano.
  skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('contenido')?.focus();
  }

  openViewer(): void {
    this.viewerOpen.set(true);
  }

  closeViewer(): void {
    this.viewerOpen.set(false);
    (this.viewerOpener ?? this.viewerButton().nativeElement).focus();
  }

  navigateFromViewer({ commands, fragment }: ViewerNavigation): void {
    // Detrás del visor no se ve el recorrido, así que se salta sin animación.
    this.startInstantJump();
    this.viewerOpen.set(false);
    this.router.navigate(commands, { fragment });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }

  private startInstantJump(): void {
    const html = this.document.documentElement;
    html.style.scrollBehavior = 'auto';
    html.classList.add('instant-reveal');
    this.instantJump = true;
  }

  // El router hace el scroll justo al emitir el evento Scroll; se espera un
  // poco para que los bloques del destino aparezcan ya sin fundido.
  private endInstantJump(): void {
    if (!this.instantJump) {
      return;
    }
    this.instantJump = false;
    setTimeout(() => {
      const html = this.document.documentElement;
      html.style.scrollBehavior = '';
      html.classList.remove('instant-reveal');
    }, 200);
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0];
  }
}
