import { Component, computed, input } from '@angular/core';
import { TECH_ICONS } from './tech-icons';

// Por debajo de esta luminancia el color de marca no se distingue sobre el
// fondo oscuro, así que se usa el color del texto.
const MIN_LUMINANCE = 0.12;

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
  readonly name = input.required<string>();

  readonly icon = computed(() => TECH_ICONS[this.name()]);
  readonly color = computed(() => {
    const icon = this.icon();
    if (!icon) {
      return null;
    }
    return luminance(icon.hex) < MIN_LUMINANCE ? 'var(--text)' : '#' + icon.hex;
  });
}

