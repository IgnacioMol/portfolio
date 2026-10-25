import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CV_FILES, PROFILE, SOCIAL_LINKS } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { ActiveSectionService } from '../../shared/active-section.service';
import { ProjectCardComponent } from '../../shared/project-card/project-card.component';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';

// TODO: crea un formulario gratuito en https://formspree.io con tu email
// y sustituye este endpoint por el que te den, con el formato
// "https://formspree.io/f/xxxxxxxx".
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/TU_FORM_ID';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, ProjectCardComponent, TechIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly activeSection = inject(ActiveSectionService);
  readonly i18n = inject(I18nService);

  readonly profile = PROFILE;
  readonly cvFiles = CV_FILES;
  readonly socialLinks = SOCIAL_LINKS;
  readonly featuredProjects = PROJECTS.filter((project) => project.featured);

  contactForm = { name: '', email: '', message: '' };
  submitting = false;
  submitStatus: 'idle' | 'success' | 'error' = 'idle';

  cvMenuOpen = false;

  private observers: IntersectionObserver[] = [];

  get t() {
    return this.i18n.t();
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      root.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Resalta en la barra de navegación la sección que está en pantalla.
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.zone.run(() => this.activeSection.id.set(entry.target.id));
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    root.querySelectorAll('header[id], section[id]').forEach((el) => sectionObserver.observe(el));

    // Aparición suave de los bloques al hacer scroll.
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    this.observers.push(sectionObserver, revealObserver);
  }

  ngOnDestroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.activeSection.id.set(null);
  }

  toggleCvMenu(): void {
    this.cvMenuOpen = !this.cvMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.cvMenuOpen && !target?.closest('.cv-menu')) {
      this.cvMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cvMenuOpen = false;
  }

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
