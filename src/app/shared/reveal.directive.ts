import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

// Hace aparecer el elemento con un fundido suave la primera vez que entra en
// pantalla. Con umbral 0 basta con que asome un píxel: con uno mayor, un bloque
// que solo asoma por el borde se quedaría invisible.
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const el = this.element.nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.classList.add('is-visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
