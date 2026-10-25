import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PROFILE } from '../../data/profile';
import { I18nService } from '../../i18n/i18n.service';

// Envío del formulario con EmailJS (https://www.emailjs.com). Los tres
// identificadores son públicos por diseño.
const EMAILJS = {
  endpoint: 'https://api.emailjs.com/api/v1.0/email/send',
  serviceId: 'service_7qjteeb',
  templateId: 'template_f87lran',
  publicKey: 'hm78MTytyud08Syrx',
};
// Nadie rellena nombre, email y mensaje en menos tiempo: un envío más rápido
// es de un bot.
const MIN_FILL_TIME_MS = 3000;

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  readonly i18n = inject(I18nService);
  readonly profile = PROFILE;

  // "website" es un campo trampa oculto: si llega relleno, lo ha escrito un bot.
  contactForm = { name: '', email: '', subject: '', message: '', website: '' };
  submitting = false;
  submitStatus: 'idle' | 'success' | 'error' = 'idle';
  private readonly createdAt = Date.now();

  get t() {
    return this.i18n.t();
  }

  async onSubmit(): Promise<void> {
    if (this.submitting) {
      return;
    }
    this.submitStatus = 'idle';

    // Antispam: campo trampa relleno o envío demasiado rápido. Se finge éxito
    // para que el bot no sepa que lo hemos detectado.
    if (this.contactForm.website || Date.now() - this.createdAt < MIN_FILL_TIME_MS) {
      this.submitStatus = 'success';
      this.reset();
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
        this.reset();
      } else {
        this.submitStatus = 'error';
      }
    } catch {
      this.submitStatus = 'error';
    } finally {
      this.submitting = false;
    }
  }

  private reset(): void {
    this.contactForm = { name: '', email: '', subject: '', message: '', website: '' };
  }
}
