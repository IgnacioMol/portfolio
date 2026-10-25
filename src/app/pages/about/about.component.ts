import { Component, OnDestroy, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CV_FILES } from '../../data/profile';
import { I18nService } from '../../i18n/i18n.service';
import { RevealDirective } from '../../shared/reveal.directive';
import { SpotlightDirective } from '../../shared/spotlight.directive';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, RevealDirective, SpotlightDirective, TechIconComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  readonly cvFiles = CV_FILES;

  constructor() {
    effect(() => this.i18n.pageTitle.set(this.i18n.t().about.title));
  }

  get t() {
    return this.i18n.t();
  }

  ngOnDestroy(): void {
    this.i18n.pageTitle.set(null);
  }
}
