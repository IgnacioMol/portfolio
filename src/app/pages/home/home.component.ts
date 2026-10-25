import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CV_FILES, PROFILE, SOCIAL_LINKS } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { RevealDirective } from '../../shared/reveal.directive';
import { ThemeService } from '../../shared/theme/theme.service';
import { SpotlightDirective } from '../../shared/spotlight.directive';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealDirective, SpotlightDirective, TechIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly i18n = inject(I18nService);

  readonly profile = PROFILE;
  readonly cv = CV_FILES[0];
  readonly socialLinks = SOCIAL_LINKS;
  readonly featuredProjects = PROJECTS.filter((project) => project.featured);
  readonly theme = inject(ThemeService);
  // Proyecto que se enseña enmarcado en el hero: uno distinto de los destacados
  // para no repetir imagen justo debajo.
  readonly showcase = PROJECTS.find((project) => project.slug === 'portfolio-3d') ?? this.featuredProjects[0];

  get t() {
    return this.i18n.t();
  }
}
