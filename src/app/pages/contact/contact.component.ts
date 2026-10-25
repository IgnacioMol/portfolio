import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { PROFILE, SOCIAL_LINKS } from '../../data/profile';
import { I18nService } from '../../i18n/i18n.service';
import { ContactFormComponent } from '../../shared/contact-form/contact-form.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SpotlightDirective } from '../../shared/spotlight.directive';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ContactFormComponent, RevealDirective, SpotlightDirective],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  readonly profile = PROFILE;
  readonly socialLinks = SOCIAL_LINKS;
  readonly copied = signal(false);
  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => this.i18n.pageTitle.set(this.i18n.t().contact.title));
  }

  get t() {
    return this.i18n.t();
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.profile.email);
    } catch {
      // Sin permiso de portapapeles: queda el enlace mailto como alternativa.
      return;
    }
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.copiedTimer);
    this.i18n.pageTitle.set(null);
  }
}
