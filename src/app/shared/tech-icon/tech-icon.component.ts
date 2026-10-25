import { Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '../theme/theme.service';
import { TECH_ICONS } from './tech-icons';

// Fuera de estos márgenes el color de marca no se distingue sobre el fondo
// (casi negro en tema oscuro, casi blanco en tema claro): se usa el del texto.
const MIN_LUMINANCE_DARK = 0.12;
const MAX_LUMINANCE_LIGHT = 0.75;

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

@Component({
  selector: 'app-tech-icon',
  standalone: true,
  template: `
    @if (icon(); as icon) {
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" [style.color]="color()">
        <path [attr.d]="icon.path" fill="currentColor" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    :host:empty {
      display: none;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class TechIconComponent {
  private readonly theme = inject(ThemeService);
  readonly name = input.required<string>();

  readonly icon = computed(() => TECH_ICONS[this.name()]);
  readonly color = computed(() => {
    const icon = this.icon();
    if (!icon) {
      return null;
    }
    const value = luminance(icon.hex);
    const unreadable =
      this.theme.theme() === 'dark' ? value < MIN_LUMINANCE_DARK : value > MAX_LUMINANCE_LIGHT;
    return unreadable ? 'var(--text)' : '#' + icon.hex;
  });
}

