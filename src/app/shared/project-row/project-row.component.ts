import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectData, responsiveSrcset } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { TechIconComponent } from '../tech-icon/tech-icon.component';

// Fila grande de proyecto: imagen a un lado y texto al otro (portada y listado).
@Component({
  selector: 'app-project-row',
  standalone: true,
  imports: [RouterLink, TechIconComponent],
  templateUrl: './project-row.component.html',
  styleUrl: './project-row.component.scss',
})
export class ProjectRowComponent {
  readonly i18n = inject(I18nService);
  readonly srcset = responsiveSrcset;
  readonly project = input.required<ProjectData>();
  // Imagen a la derecha en lugar de a la izquierda (para alternar filas).
  readonly reverse = input(false);
  // Nivel del título según la jerarquía de la página (h2 bajo el h1 del listado).
  readonly headingLevel = input<2 | 3>(3);

  get t() {
    return this.i18n.t();
  }
}
