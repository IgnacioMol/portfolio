import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ApplicationRef, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Content, Lang, Localized } from './content';
import en from './en.json';
import es from './es.json';

const TRANSLATIONS: Record<Lang, Content> = { es, en };
const SPANISH_LOCALES = ['es', 'ca', 'gl', 'eu'];
// Solo se guarda la elección manual. La clave cambió de 'lang' a 'lang-choice' para
// ignorar los valores que se guardaban automáticamente en versiones anteriores.
const STORAGE_KEY = 'lang-choice';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Arranca en español, igual que el HTML prerenderizado, para que la
  // hidratación coincida; después se aplica el idioma del visitante.
  readonly lang = signal<Lang>('es');
  readonly t = computed(() => TRANSLATIONS[this.lang()]);
  // Título propio de la página actual; null en la portada.
  readonly pageTitle = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      inject(ApplicationRef)
        .whenStable()
        .then(() => this.lang.set(this.initialLang()));
    }

    // Mantiene <html lang>, el título y la descripción sincronizados con el idioma.
    effect(() => {
      const lang = this.lang();
      const content = this.t();
      const pageTitle = this.pageTitle();
      this.document.documentElement.lang = lang;
      this.title.setTitle(pageTitle ? `${pageTitle} · Ignacio Molina Gutierrez` : content.meta.title);
      this.meta.updateTag({ name: 'description', content: content.meta.description });
    });
  }

  localize<T>(value: Localized<T>): T {
    return value[this.lang()];
  }

  // Elegido a mano: se recuerda. Si no, se sigue el idioma del navegador.
  toggle(): void {
    this.lang.update((lang) => (lang === 'es' ? 'en' : 'es'));
    try {
      localStorage.setItem(STORAGE_KEY, this.lang());
    } catch {
      // Sin acceso a localStorage (modo privado, etc.): no se recuerda el idioma.
    }
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
    // Español si el navegador está en español (es, es-ES, es-MX...) o en otra
    // lengua de España (catalán/valenciano, gallego, euskera); si no, inglés.
    const primary = (navigator.language ?? '').toLowerCase().split('-')[0];
    return SPANISH_LOCALES.includes(primary) ? 'es' : 'en';
  }
}
