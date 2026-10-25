import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectData } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { TechIconComponent } from '../tech-icon/tech-icon.component';

// Número de tecnologías que caben en la tarjeta; el resto se resume con "+N".
const MAX_TECHS = 4;

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [RouterLink, TechIconComponent],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss',
})
export class ProjectCardComponent {
  readonly i18n = inject(I18nService);
  readonly project = input.required<ProjectData>();

  readonly visibleTechs = computed(() => this.project().techs.slice(0, MAX_TECHS));
  readonly hiddenTechs = computed(() => Math.max(0, this.project().techs.length - MAX_TECHS));

  get t() {
    return this.i18n.t();
  }
}
