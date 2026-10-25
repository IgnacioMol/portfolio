import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
      this.title.setTitle(pageTitle ? `${pageTitle} · Ignacio Molina Gutierrez` : content.meta.title);
      this.meta.updateTag({ name: 'description', content: content.meta.description });
      if (!this.isBrowser) {
        return;
      }
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
    // Las páginas se prerenderizan en español; el navegador aplica después el
    // idioma guardado o el suyo.
    if (!this.isBrowser) {
      return 'es';
    }
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
