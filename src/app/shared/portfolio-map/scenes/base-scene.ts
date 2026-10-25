import {
  CanvasTexture,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Texture,
  Vector2,
  WebGLRenderer,
} from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ViewerItem } from '../viewer-content';

// Colores del tema activo, leídos de las variables CSS.
export interface ScenePalette {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  borderStrong: string;
  accent: string;
  text: string;
  muted: string;
  dark: boolean;
}

export interface SceneContext {
  items: Record<string, ViewerItem>;
  palette: ScenePalette;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

export function readScenePalette(): ScenePalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#0b1120'),
    surface: read('--surface', '#111a2c'),
    surface2: read('--surface-2', '#162036'),
    border: read('--border', '#1f2a3f'),
    borderStrong: read('--border-strong', '#2c3a55'),
    accent: read('--accent', '#6aa5ff'),
    text: read('--text', '#e7ecf4'),
    muted: read('--text-muted', '#9aa6b9'),
    dark: document.documentElement.getAttribute('data-theme') === 'dark',
  };
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      }),
    );
  }
  return imageCache.get(src)!;
}

export interface CardOptions {
  width: number;
  height: number;
  palette: ScenePalette;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: HTMLImageElement;
  // Sin imagen: cabecera de color con este texto grande en su lugar.
  placeholder?: string;
  // Fracción de la altura que ocupa la imagen o la cabecera.
  imageRatio?: number;
  active?: boolean;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
  }
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

// Dibuja una tarjeta (imagen opcional, antetítulo, título y texto) en un canvas.
export function drawCard(canvas: HTMLCanvasElement, o: CardOptions): void {
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext('2d')!;
  const p = o.palette;
  const r = o.width * 0.035;
  const pad = o.width * 0.06;

  ctx.clearRect(0, 0, o.width, o.height);
  ctx.beginPath();
  ctx.roundRect(2, 2, o.width - 4, o.height - 4, r);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.lineWidth = o.active ? 6 : 3;
  ctx.strokeStyle = o.active ? p.accent : p.borderStrong;
  ctx.stroke();

  let y = pad;
  if (o.image) {
    const h = o.height * (o.imageRatio ?? 0.55);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad * 0.5, pad * 0.5, o.width - pad, h, r * 0.7);
    ctx.clip();
    // Recorte tipo "cover", centrado algo a la izquierda (lienzo de las capturas).
    const scale = Math.max((o.width - pad) / o.image.width, h / o.image.height);
    const w = o.image.width * scale;
    ctx.drawImage(o.image, pad * 0.5 - (w - (o.width - pad)) * 0.2, pad * 0.5, w, o.image.height * scale);
    ctx.restore();
    y = pad * 0.5 + h + pad * 0.7;
  } else if (o.placeholder) {
    const h = o.height * (o.imageRatio ?? 0.4);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad * 0.5, pad * 0.5, o.width - pad, h, r * 0.7);
    ctx.clip();
    const gradient = ctx.createLinearGradient(0, 0, o.width, h);
    gradient.addColorStop(0, p.accent);
    gradient.addColorStop(1, p.dark ? '#1e293b' : '#93c5fd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, o.width, h + pad);
    // Anillos orbitales de fondo, como guiño al TFG.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    for (const k of [0.35, 0.6, 0.85]) {
      ctx.beginPath();
      ctx.ellipse(o.width * 0.78, h * 0.55, o.width * 0.3 * k, h * 0.5 * k, -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${o.width / 11}px Inter, system-ui, sans-serif`;
    ctx.fillText(o.placeholder, pad * 1.2, pad * 0.5 + h - pad * 0.9);
    ctx.restore();
    y = pad * 0.5 + h + pad * 0.7;
  }

  const font = (weight: number, size: number) => `${weight} ${size}px Inter, system-ui, sans-serif`;
  const base = o.width / 22;
  if (o.eyebrow) {
    ctx.font = font(600, base * 0.72);
    ctx.fillStyle = p.accent;
    ctx.fillText(wrap(ctx, o.eyebrow.toUpperCase(), o.width - pad * 2, 1)[0] ?? '', pad, y + base * 0.72);
    y += base * 1.35;
  }
  ctx.font = font(700, base * 1.15);
  ctx.fillStyle = p.text;
  for (const line of wrap(ctx, o.title, o.width - pad * 2, 2)) {
    ctx.fillText(line, pad, y + base * 1.1);
    y += base * 1.45;
  }
  if (o.subtitle) {
    y += base * 0.25;
    ctx.font = font(400, base * 0.78);
    ctx.fillStyle = p.muted;
    const lines = Math.max(1, Math.floor((o.height - y - pad * 0.5) / (base * 1.15)));
    for (const line of wrap(ctx, o.subtitle, o.width - pad * 2, lines)) {
      ctx.fillText(line, pad, y + base * 0.8);
      y += base * 1.15;
    }
  }
}

export function canvasTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Base de una escena del visor: renderizado, etiquetas, selección con el
// ratón, bucle de animación y limpieza. La escena concreta construye el contenido.
export abstract class BaseScene {
  protected readonly renderer: WebGLRenderer;
  protected readonly labelRenderer: CSS2DRenderer;
  protected readonly scene = new Scene();
  protected readonly camera: PerspectiveCamera;
  protected readonly textures: Texture[] = [];
  protected items: Record<string, ViewerItem>;
  protected palette: ScenePalette;
  protected readonly reducedMotion: boolean;
  protected hoveredId: string | null = null;
  protected selectedId: string | null = null;
  protected elapsed = 0;

  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly pointerDown = new Vector2();
  private readonly resizeObserver: ResizeObserver;
  private frame = 0;
  private lastTime = 0;
  private disposed = false;

  constructor(
    protected readonly container: HTMLElement,
    protected readonly context: SceneContext,
    fov = 45,
  ) {
    this.items = context.items;
    this.palette = context.palette;
    this.reducedMotion = context.reducedMotion;
    const { clientWidth: width, clientHeight: height } = container;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = 'viewer-labels';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new PerspectiveCamera(fov, width / height, 0.1, 500);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  // Las subclases llaman a start() al final de su constructor.
  protected start(): void {
    this.resize();
    this.applyPalette();
    this.refresh();
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  // Objetos que se pueden pulsar (con userData.id).
  protected abstract pickables(): Object3D[];
  protected abstract update(dt: number): void;
  // Vuelve a pintar textos y texturas (idioma o tema nuevos).
  protected abstract refresh(): void;
  protected applyPalette(): void {
    this.renderer.setClearColor(this.palette.bg);
  }

  setItems(items: Record<string, ViewerItem>): void {
    this.items = items;
    this.refresh();
  }

  setPalette(palette: ScenePalette): void {
    this.palette = palette;
    this.applyPalette();
    this.refresh();
  }

  select(id: string | null): void {
    this.selectedId = id;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as Material | Material[] | undefined;
      (Array.isArray(material) ? material : material ? [material] : []).forEach((m) => m.dispose());
    });
    this.textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    canvas.remove();
    this.labelRenderer.domElement.remove();
  }

  protected get isDisposed(): boolean {
    return this.disposed;
  }

  protected label(text: string, className: string, onClick?: () => void): CSS2DObject {
    const element = document.createElement(onClick ? 'button' : 'div');
    element.className = `viewer-label ${className}`;
    element.textContent = text;
    if (onClick && element instanceof HTMLButtonElement) {
      element.type = 'button';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onClick();
      });
    }
    return new CSS2DObject(element);
  }

  // En pantallas estrechas (móvil en vertical) la cámara se aleja para que la
  // escena quepa a lo ancho.
  protected get distanceScale(): number {
    const aspect = this.camera.aspect;
    return aspect < 1 ? Math.min(2.3, 1.15 / aspect) : 1;
  }

  protected ease(speed: number, dt: number): number {
    return this.reducedMotion ? 1 : 1 - Math.exp(-dt * speed);
  }

  private readonly tick = (now: number): void => {
    if (this.disposed) {
      return;
    }
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    if (!this.reducedMotion) {
      this.elapsed += dt;
    }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private pick(event: PointerEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables(), true).find((h) => this.idOf(h.object));
    return hit ? this.idOf(hit.object) : null;
  }

  private idOf(object: Object3D | null): string | null {
    for (let o: Object3D | null = object; o; o = o.parent) {
      if (o.userData['id']) {
        return o.userData['id'] as string;
      }
    }
    return null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDown.set(event.clientX, event.clientY);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    // Solo cuenta como clic si apenas se ha movido el puntero.
    if (this.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY)) > 5) {
      return;
    }
    const id = this.pick(event);
    if (id) {
      this.context.onSelect(id);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons) {
      return;
    }
    this.hoveredId = this.pick(event);
    this.renderer.domElement.style.cursor = this.hoveredId ? 'pointer' : 'grab';
  };

  private readonly onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (!document.hidden && !this.disposed) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  protected resize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) {
      return;
    }
    this.camera.aspect = width / height;
    // En pantallas estrechas el panel ocupa la parte baja: se sube el encuadre.
    if (width / height < 0.8) {
      this.camera.setViewOffset(width, height, 0, height * 0.18, width, height);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
}
