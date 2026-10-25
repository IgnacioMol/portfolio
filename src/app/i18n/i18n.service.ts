import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Content, Lang, Localized } from './content';
import en from './en.json';
import es from './es.json';

const TRANSLATIONS: Record<Lang, Content> = { es, en };
const STORAGE_KEY = 'lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly lang = signal<Lang>(this.initialLang());
  readonly t = computed(() => TRANSLATIONS[this.lang()]);
  // Título propio de la página actual; null en la portada.
  readonly pageTitle = signal<string | null>(null);

  constructor() {
    // Mantiene <html lang>, el título y la descripción sincronizados con el idioma.
    effect(() => {
      const lang = this.lang();
      const content = this.t();
      const pageTitle = this.pageTitle();
      this.document.documentElement.lang = lang;
      this.title.setTitle(pageTitle ? `${pageTitle} · Ignacio Molina Gutiérrez` : content.meta.title);
      this.meta.updateTag({ name: 'description', content: content.meta.description });
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Sin acceso a localStorage (modo privado, etc.): no se recuerda el idioma.
      }
    });
  }

  localize<T>(value: Localized<T>): T {
    return value[this.lang()];
  }

  toggle(): void {
    this.lang.update((lang) => (lang === 'es' ? 'en' : 'es'));
  }

  private initialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'es' || stored === 'en') {
        return stored;
      }
    } catch {
      // Ignorado: se usa el idioma del navegador.
    }
    return navigator.language?.toLowerCase().startsWith('es') === false ? 'en' : 'es';
  }
}
