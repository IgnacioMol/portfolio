import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

// Tema claro u oscuro. El valor inicial lo deja en <html data-theme> el script
// de index.html; aquí solo se lee, se cambia y se recuerda.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  constructor() {
    effect(() => this.document.documentElement.setAttribute('data-theme', this.theme()));
  }

  // Solo se guarda al elegirlo a mano: si no, se sigue el tema del sistema.
  toggle(): void {
    this.theme.update((theme) => (theme === 'light' ? 'dark' : 'light'));
    try {
      localStorage.setItem(STORAGE_KEY, this.theme());
    } catch {
      // Sin acceso a localStorage: el tema no se recuerda entre visitas.
    }
  }
}
