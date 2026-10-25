import { Injectable, signal } from '@angular/core';

// Sección de la portada que está en pantalla, para resaltarla en la barra de
// navegación.
@Injectable({ providedIn: 'root' })
export class ActiveSectionService {
  readonly id = signal<string | null>(null);
}
