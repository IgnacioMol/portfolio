import { Component, OnDestroy, effect, inject } from '@angular/core';
import { PROJECTS } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { ProjectCardComponent } from '../../shared/project-card/project-card.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ProjectCardComponent],
  template: `
    <section class="page-section">
      <header class="page-header">
        <h1>{{ t.projects.title }}</h1>
        <p class="section-subtitle">{{ t.projects.subtitle }}</p>
      </header>
      <div class="cards projects">
        @for (project of projects; track project.slug) {
          <app-project-card [project]="project" />
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
