import { DOCUMENT, ViewportScroller } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PROFILE, SOCIAL_LINKS } from './data/profile';
import { I18nService } from './i18n/i18n.service';
import { ActiveSectionService } from './shared/active-section.service';
import { ParticleBackgroundComponent } from './shared/particle-background/particle-background.component';
import { SolarViewerComponent } from './shared/solar-viewer/solar-viewer.component';
import { ViewerNavigation } from './shared/solar-viewer/viewer-navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ParticleBackgroundComponent, SolarViewerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly sections = inject(ActiveSectionService);
  readonly i18n = inject(I18nService);

  title = 'portfolio';
  readonly profile = PROFILE;
  readonly socialLinks = SOCIAL_LINKS;
  readonly currentYear = new Date().getFullYear();

  menuOpen = false;
  readonly viewerOpen = signal(false);
  private readonly viewerButton = viewChild.required<ElementRef<HTMLButtonElement>>('viewerButton');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  // En las páginas de proyectos se resalta "Proyectos"; en la portada, la
  // sección que está en pantalla.
  readonly activeSection = computed(() =>
    this.url().startsWith('/proyectos') ? 'proyectos' : this.sections.id(),
  );

  constructor() {
    // Al bajar a una sección, deja hueco para la barra de navegación fija.
    inject(ViewportScroller).setOffset([0, 72]);
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
  // portada recargarían la página: se gestionan a mano.
  skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('contenido')?.focus();
  }

  backToTop(event: Event): void {
    event.preventDefault();
    this.document.defaultView?.scrollTo({ top: 0 });
    this.document.querySelector<HTMLElement>('.nav-brand')?.focus({ preventScroll: true });
  }

  openViewer(): void {
    this.menuOpen = false;
    this.viewerOpen.set(true);
  }

  closeViewer(): void {
    this.viewerOpen.set(false);
    this.viewerButton().nativeElement.focus();
  }

  navigateFromViewer({ commands, fragment }: ViewerNavigation): void {
    this.viewerOpen.set(false);
    this.router.navigate(commands, { fragment });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }
}
