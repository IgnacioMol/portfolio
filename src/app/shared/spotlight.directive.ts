import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';

// Brillo suave que sigue al puntero dentro del elemento (estilos en
// _components.scss, clase .spotlight). Solo con ratón; en táctil no aparece.
@Directive({
  selector: '[appSpotlight]',
  standalone: true,
  host: { class: 'spotlight' },
})
export class SpotlightDirective implements OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') {
      return;
    }
    const el = this.element.nativeElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  };

  constructor() {
    // Fuera de Angular: mover el ratón no debe disparar la detección de cambios.
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => this.element.nativeElement.addEventListener('pointermove', this.onMove));
    });
  }

  ngOnDestroy(): void {
    this.element.nativeElement.removeEventListener('pointermove', this.onMove);
  }
}
