import { Component, OnDestroy, effect, inject } from '@angular/core';
import { PROJECTS } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { ProjectRowComponent } from '../../shared/project-row/project-row.component';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectRowComponent, RevealDirective],
  template: `
    <section class="container page-section">
      <header class="page-header">
        <h1>{{ t.projects.title }}</h1>
        <p class="lead">{{ t.projects.subtitle }}</p>
      </header>
      <div class="featured">
        @for (project of projects; track project.slug; let odd = $odd) {
          <app-project-row [project]="project" [reverse]="odd" [headingLevel]="2" appReveal />
        }
      </div>
    </section>
  `,
})
export class ProjectsComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  readonly projects = PROJECTS;

  constructor() {
    effect(() => this.i18n.pageTitle.set(this.i18n.t().projects.title));
  }

  get t() {
    return this.i18n.t();
  }

  ngOnDestroy(): void {
    this.i18n.pageTitle.set(null);
  }
}
