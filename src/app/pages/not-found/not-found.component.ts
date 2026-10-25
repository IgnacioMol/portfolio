import { Component, OnDestroy, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="container page-section not-found">
      <p class="not-found-code" aria-hidden="true">404</p>
      <h1>{{ t.notFound.title }}</h1>
      <p class="section-subtitle">{{ t.notFound.text }}</p>
      <a class="btn btn-primary" routerLink="/">{{ t.notFound.back }}</a>
    </section>
  `,
  styles: `
    .not-found {
      min-height: calc(100vh - 220px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
    }

    .not-found-code {
      margin: 0;
      font-size: clamp(5rem, 18vw, 9rem);
      font-weight: 800;
      line-height: 1;
      color: transparent;
      -webkit-text-stroke: 2px var(--accent);
      letter-spacing: -0.04em;
    }

    h1 {
      font-size: clamp(2rem, 5vw, 3.25rem);
      margin: 0.5rem 0 1rem;
    }

    .section-subtitle {
      margin: 0 0 2rem;
    }
  `,
})
export class NotFoundComponent implements OnDestroy {
  readonly i18n = inject(I18nService);

  constructor() {
    effect(() => this.i18n.pageTitle.set(this.i18n.t().notFound.title));
  }

  get t() {
    return this.i18n.t();
  }

  ngOnDestroy(): void {
    this.i18n.pageTitle.set(null);
  }
}
