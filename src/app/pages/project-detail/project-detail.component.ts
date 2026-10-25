import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECTS, ProjectImage, findProject } from '../../data/projects';
import { I18nService } from '../../i18n/i18n.service';
import { TechIconComponent } from '../../shared/tech-icon/tech-icon.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, TechIconComponent, NotFoundComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetailComponent implements OnDestroy {
  readonly i18n = inject(I18nService);

  // Viene del parámetro :slug de la ruta (withComponentInputBinding).
  readonly slug = input<string>();

  readonly project = computed(() => findProject(this.slug()));
  readonly next = computed(() => this.neighbour(1));

  readonly lightboxImage = signal<ProjectImage | null>(null);
  private readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');

  constructor() {
    effect(() => {
      const project = this.project();
      this.i18n.pageTitle.set(project ? this.i18n.localize(project.title) : this.i18n.t().notFound.title);
    });
  }

  get t() {
    return this.i18n.t();
  }

  ngOnDestroy(): void {
    this.i18n.pageTitle.set(null);
  }

  openImage(image: ProjectImage): void {
    this.lightboxImage.set(image);
    this.lightbox()?.nativeElement.showModal();
  }

  closeImage(): void {
    this.lightbox()?.nativeElement.close();
  }

  onLightboxClosed(): void {
    this.lightboxImage.set(null);
  }

  // Al pulsar fuera de la imagen (sobre el fondo del diálogo) se cierra.
  onLightboxClick(event: MouseEvent): void {
    if (event.target === this.lightbox()?.nativeElement) {
      this.closeImage();
    }
  }

  private neighbour(step: number) {
    const index = PROJECTS.findIndex((project) => project.slug === this.slug());
    if (index === -1 || PROJECTS.length < 2) {
      return undefined;
    }
    return PROJECTS[(index + step + PROJECTS.length) % PROJECTS.length];
  }
}
