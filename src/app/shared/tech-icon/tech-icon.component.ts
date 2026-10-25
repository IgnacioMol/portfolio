import { Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '../theme/theme.service';
import { TECH_ICONS, techIconColor } from './tech-icons';

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
    return techIconColor(icon.hex, this.theme.theme());
  });
}

