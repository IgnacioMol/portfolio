import { Injectable, signal } from '@angular/core';

// Estado del visor 3D, para poder abrirlo desde cualquier página.
@Injectable({ providedIn: 'root' })
export class ViewerService {
  readonly open = signal(false);
}
