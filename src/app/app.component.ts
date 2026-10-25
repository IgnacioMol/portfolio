import { DOCUMENT, ViewportScroller } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet, Scroll } from '@angular/router';
import { PROFILE, SOCIAL_LINKS, cvFor } from './data/profile';
import { I18nService } from './i18n/i18n.service';
import { ParticleBackgroundComponent } from './shared/particle-background/particle-background.component';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ParticleBackgroundComponent],
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
  // CV en el idioma activo de la web.
  get cv() {
    return cvFor(this.i18n.lang());
  }
  readonly currentYear = new Date().getFullYear();

  menuOpen = false;
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

  // Tocar fuera de la barra cierra el menú móvil.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen && !(event.target as HTMLElement | null)?.closest('.nav')) {
      this.menuOpen = false;
    }
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
