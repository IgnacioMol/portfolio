import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CV_FILES, PROFILE, SOCIAL_LINKS } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { ProjectRowComponent } from '../../shared/project-row/project-row.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SpotlightDirective } from '../../shared/spotlight.directive';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProjectRowComponent, RevealDirective, SpotlightDirective, TechIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly i18n = inject(I18nService);

  readonly profile = PROFILE;
  readonly cv = CV_FILES[0];
  readonly socialLinks = SOCIAL_LINKS;
  readonly featuredProjects = PROJECTS.filter((project) => project.featured);


  get t() {
    return this.i18n.t();
  }

  isList(value: string | string[] | boolean): value is string[] {
    return Array.isArray(value);
  }

  isBool(value: string | string[] | boolean): value is boolean {
    return typeof value === 'boolean';
  }
}
