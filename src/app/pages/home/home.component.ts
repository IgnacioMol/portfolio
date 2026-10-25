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
import { ViewerService } from '../../shared/solar-viewer/viewer.service';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';

// Envío del formulario con EmailJS (https://www.emailjs.com). Los tres
// identificadores son públicos por diseño: EmailJS limita el uso por dominio.
const EMAILJS = {
  endpoint: 'https://api.emailjs.com/api/v1.0/email/send',
  serviceId: 'service_7qjteeb',
  templateId: 'template_f87lran',
  publicKey: 'hm78MTytyud08Syrx',
};
const EMAILJS_CONFIGURED = !EMAILJS.templateId.startsWith('TU_') && !EMAILJS.publicKey.startsWith('TU_');
// Nadie rellena nombre, email y mensaje en menos tiempo: un envío más rápido
// es de un bot.
const MIN_FILL_TIME_MS = 3000;

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
  readonly viewer = inject(ViewerService);

  readonly profile = PROFILE;
  readonly cvFiles = CV_FILES;
  readonly socialLinks = SOCIAL_LINKS;
  readonly featuredProjects = PROJECTS.filter((project) => project.featured);

  // "website" es un campo trampa oculto: si llega relleno, lo ha escrito un bot.
  contactForm = { name: '', email: '', subject: '', message: '', website: '' };
  submitting = false;
  submitStatus: 'idle' | 'success' | 'error' = 'idle';

  cvMenuOpen = false;
  private readonly createdAt = Date.now();

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
      // Con un umbral mayor, un bloque que solo asoma por el borde se quedaría
      // invisible para siempre.
      { threshold: 0 },
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
    this.submitStatus = 'idle';

    // Antispam: campo trampa relleno o envío demasiado rápido. Se finge éxito
    // para que el bot no sepa que lo hemos detectado.
    if (this.contactForm.website || Date.now() - this.createdAt < MIN_FILL_TIME_MS) {
      this.submitStatus = 'success';
      this.resetContactForm();
      return;
    }
    if (!EMAILJS_CONFIGURED) {
      console.warn('EmailJS no está configurado: faltan templateId y publicKey en home.component.ts.');
      this.submitStatus = 'error';
      return;
    }

    this.submitting = true;
    try {
      const { name, email, message } = this.contactForm;
      const subject = this.contactForm.subject.trim();
      const response = await fetch(EMAILJS.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS.serviceId,
          template_id: EMAILJS.templateId,
          user_id: EMAILJS.publicKey,
          template_params: {
            name,
            email,
            message,
            subject,
            // Asunto del correo. Va siempre en español porque es para mi bandeja
            // de entrada, no para el visitante.
            title: subject ? `Portfolio: ${subject}` : `Contacto desde el portfolio — ${name}`,
            time: new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }),
          },
        }),
      });

      if (response.ok) {
        this.submitStatus = 'success';
        this.resetContactForm();
      } else {
        this.submitStatus = 'error';
      }
    } catch {
      this.submitStatus = 'error';
    } finally {
      this.submitting = false;
    }
  }

  private resetContactForm(): void {
    this.contactForm = { name: '', email: '', subject: '', message: '', website: '' };
  }
}
