import { Component, OnDestroy, effect, inject } from '@angular/core';
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

  constructor() {
    effect(() => this.i18n.pageTitle.set(this.i18n.t().contact.title));
  }

  get t() {
    return this.i18n.t();
  }

  ngOnDestroy(): void {
    this.i18n.pageTitle.set(null);
  }
}
