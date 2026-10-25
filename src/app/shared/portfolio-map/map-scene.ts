import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Texture,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type MapNodeKind = 'root' | 'section' | 'item';

export interface MapNodeDef {
  id: string;
  parent?: string;
  kind: MapNodeKind;
  // Captura que se muestra como panel flotante junto al nodo (proyectos).
  image?: string;
}

export interface MapNodeLabel {
  text: string;
  icon?: { path: string; style: 'fill' | 'stroke'; color?: string | null };
}

// Colores del tema activo, leídos de las variables CSS.
export interface MapPalette {
  bg: string;
  surface: string;
  border: string;
  borderStrong: string;
  accent: string;
  text: string;
  muted: string;
}

export interface MapSceneOptions {
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

interface MapNode {
  def: MapNodeDef;
  depth: number;
  children: MapNode[];
  parent: MapNode | null;
  position: Vector3;
  group: Group;
  mesh: Mesh;
  outline: LineSegments;
  label: HTMLButtonElement;
  board?: Mesh;
  boardMaterial?: MeshBasicMaterial;
  // Opacidad actual (se anima hacia 1 si está visible o hacia FADED si no).
  opacity: number;
  hover: number;
}

interface Edge {
  a: MapNode;
  b: MapNode;
  line: LineSegments;
}

// Radio de cada anillo del árbol, por profundidad.
const RING_RADIUS = [0, 12, 22, 31];
const NODE_SIZE: Record<MapNodeKind, number> = { root: 2, section: 1.25, item: 0.8 };
// Distancia de la cámara al nodo enfocado, por tipo.
const FOCUS_DISTANCE: Record<MapNodeKind, number> = { root: 58, section: 30, item: 17 };
const FADED = 0.12;
const FLY_SPEED = 2.6;
const BOARD_WIDTH = 6.4;

function leafCount(node: MapNode): number {
  return node.children.length ? node.children.reduce((sum, child) => sum + leafCount(child), 0) : 1;
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function readMapPalette(): MapPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#0b1120'),
    surface: read('--surface', '#111a2c'),
    border: read('--border', '#1f2a3f'),
    borderStrong: read('--border-strong', '#2c3a55'),
    accent: read('--accent', '#6aa5ff'),
    text: read('--text', '#e7ecf4'),
    muted: read('--text-muted', '#9aa6b9'),
  };
}

// Mapa 3D del portfolio: un árbol radial sobre una cuadrícula en el que solo
// se despliegan el nodo activo y sus vecinos. Independiente de Angular.
export class PortfolioMapScene {
  private readonly renderer: WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly nodes = new Map<string, MapNode>();
  private readonly edges: Edge[] = [];
  private grid: GridHelper | null = null;
  private readonly orbit: Group;
  private readonly orbitRing: Mesh;
  private readonly orbitMoon: Mesh;
  private readonly textures: Texture[] = [];
  private readonly resizeObserver: ResizeObserver;
  private palette: MapPalette;

  private active!: MapNode;
  private revealed = new Set<MapNode>();
  private hovered: MapNode | null = null;
  private flying = true;
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private readonly pointerDown = new Vector2();

  constructor(
    private readonly container: HTMLElement,
    defs: MapNodeDef[],
    palette: MapPalette,
    private readonly options: MapSceneOptions,
  ) {
    this.palette = palette;
    const { clientWidth: width, clientHeight: height } = container;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = 'map-labels';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new PerspectiveCamera(45, width / height, 0.1, 500);
    this.camera.position.set(0, 42, 40);
    this.applyViewOffset(width, height);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 110;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.42;

    this.scene.add(new AmbientLight('#ffffff', 1.4));
    const sun = new DirectionalLight('#ffffff', 1.6);
    sun.position.set(8, 20, 10);
    this.scene.add(sun);

    // Anillo orbital con una pequeña luna alrededor del nodo activo.
    this.orbit = new Group();
    this.orbitRing = new Mesh(new TorusGeometry(1, 0.035, 8, 96), new MeshBasicMaterial({ transparent: true }));
    this.orbitRing.rotation.x = Math.PI / 2;
    this.orbitMoon = new Mesh(new SphereGeometry(0.16, 16, 12), new MeshBasicMaterial());
    this.orbit.add(this.orbitRing, this.orbitMoon);
    this.scene.add(this.orbit);

    this.build(defs);
    this.applyPalette();
    this.focus(this.nodes.get(defs[0].id)!);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  setLabels(labels: Record<string, MapNodeLabel>): void {
    for (const [id, node] of this.nodes) {
      const label = labels[id];
      node.label.replaceChildren();
      if (label?.icon) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add(label.icon.style === 'fill' ? 'icon-fill' : 'icon-stroke');
        if (label.icon.color) {
          svg.style.color = label.icon.color;
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', label.icon.path);
        svg.appendChild(path);
        node.label.appendChild(svg);
      }
      const text = document.createElement('span');
      text.textContent = label?.text ?? id;
      node.label.appendChild(text);
    }
  }

  setPalette(palette: MapPalette): void {
    this.palette = palette;
    this.applyPalette();
  }

  select(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      this.focus(node);
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      (Array.isArray(material) ? material : material ? [material] : []).forEach((m) => m.dispose());
    });
    this.textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }

  // Construcción

  private build(defs: MapNodeDef[]): void {
    const byId = new Map(defs.map((def) => [def.id, def]));
    const make = (def: MapNodeDef, parent: MapNode | null): MapNode => {
      const node = this.createNode(def, parent ? parent.depth + 1 : 0, parent);
      this.nodes.set(def.id, node);
      node.children = defs.filter((d) => d.parent === def.id).map((child) => make(child, node));
      return node;
    };
    const rootDef = defs.find((def) => !def.parent || !byId.has(def.parent))!;
    const root = make(rootDef, null);

    this.layout(root, 0, Math.PI * 2);
    for (const node of this.nodes.values()) {
      node.group.position.copy(node.position);
      if (node.parent) {
        this.edges.push({ a: node.parent, b: node, line: this.createEdge(node.parent.position, node.position) });
      }
      if (node.def.image) {
        this.createBoard(node);
      }
    }
  }

  // Árbol radial: cada rama recibe un sector proporcional a sus hojas.
  private layout(node: MapNode, start: number, end: number): void {
    const angle = (start + end) / 2;
    const radius = RING_RADIUS[Math.min(node.depth, RING_RADIUS.length - 1)];
    node.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const total = node.children.reduce((sum, child) => sum + Math.sqrt(leafCount(child)), 0);
    let cursor = start;
    for (const child of node.children) {
      const span = ((end - start) * Math.sqrt(leafCount(child))) / total;
      this.layout(child, cursor, cursor + span);
      cursor += span;
    }
  }

  private createNode(def: MapNodeDef, depth: number, parent: MapNode | null): MapNode {
    const size = NODE_SIZE[def.kind];
    const group = new Group();
    const geometry = new CylinderGeometry(size, size, 0.4, 48);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ roughness: 0.6, metalness: 0.05, transparent: true }));
    mesh.userData['id'] = def.id;
    const outline = new LineSegments(new EdgesGeometry(geometry, 30), new LineBasicMaterial({ transparent: true }));
    group.add(mesh, outline);
    this.scene.add(group);

    const label = document.createElement('button');
    label.type = 'button';
    label.className = `map-label map-label-${def.kind}`;
    label.addEventListener('click', (event) => {
      event.stopPropagation();
      this.options.onSelect(def.id);
    });
    const labelObject = new CSS2DObject(label);
    labelObject.position.set(0, 0.2, size + 0.9);
    labelObject.center.set(0.5, 0);
    group.add(labelObject);

    return { def, depth, children: [], parent, position: new Vector3(), group, mesh, outline, label, opacity: FADED, hover: 0 };
  }

  private createEdge(from: Vector3, to: Vector3): LineSegments {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([from.x, 0, from.z, to.x, 0, to.z], 3));
    const line = new LineSegments(geometry, new LineBasicMaterial({ transparent: true }));
    this.scene.add(line);
    return line;
  }

  // Panel con la captura del proyecto, flotando por fuera del nodo.
  private createBoard(node: MapNode): void {
    const material = new MeshBasicMaterial({ transparent: true, side: DoubleSide, opacity: 0 });
    const board = new Mesh(new PlaneGeometry(BOARD_WIDTH, BOARD_WIDTH * 0.625), material);
    const outward = node.position.clone().setY(0).normalize();
    board.position.copy(node.position).add(outward.multiplyScalar(4)).setY(2.6);
    board.userData['id'] = node.def.id;
    this.scene.add(board);
    node.board = board;
    node.boardMaterial = material;

    new TextureLoader().load(node.def.image!, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      this.textures.push(texture);
      material.map = texture;
      material.needsUpdate = true;
    });
  }

  private applyPalette(): void {
    const p = this.palette;
    this.renderer.setClearColor(p.bg);
    this.scene.fog = new Fog(p.bg, 30, 95);
    // La cuadrícula lleva sus colores en los vértices: se rehace con los del tema.
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as LineBasicMaterial).dispose();
    }
    this.grid = new GridHelper(240, 60, p.borderStrong, p.border);
    this.grid.position.y = -0.4;
    this.scene.add(this.grid);
    (this.orbitRing.material as MeshBasicMaterial).color = new Color(p.accent);
    (this.orbitMoon.material as MeshBasicMaterial).color = new Color(p.accent);
    for (const node of this.nodes.values()) {
      (node.mesh.material as MeshStandardMaterial).color = new Color(node.def.kind === 'root' ? p.accent : p.surface);
    }
    this.updateReveal();
  }

  // Interacción y estado

  private focus(node: MapNode): void {
    this.active = node;
    this.revealed = new Set([node, ...node.children]);
    if (node.parent) {
      this.revealed.add(node.parent);
    }
    // El centro se ve siempre, para no perder la orientación.
    for (const n of this.nodes.values()) {
      if (!n.parent) {
        this.revealed.add(n);
      }
    }
    this.updateReveal();
    this.flying = true;
  }

  private updateReveal(): void {
    for (const node of this.nodes.values()) {
      const visible = this.revealed.has(node);
      node.label.classList.toggle('is-hidden', !visible);
      node.label.classList.toggle('is-active', node === this.active);
      node.label.tabIndex = visible ? 0 : -1;
      node.label.setAttribute('aria-hidden', String(!visible));
      node.label.setAttribute('aria-pressed', String(node === this.active));
    }
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.elapsed += dt;
    const ease = (speed: number) => (this.options.reducedMotion ? 1 : 1 - Math.exp(-dt * speed));

    const p = this.palette;
    const accent = new Color(p.accent);
    const border = new Color(p.borderStrong);
    for (const node of this.nodes.values()) {
      const visible = this.revealed.has(node);
      node.opacity += ((visible ? 1 : FADED) - node.opacity) * ease(6);
      node.hover += ((node === this.hovered && visible ? 1 : 0) - node.hover) * ease(10);
      const material = node.mesh.material as MeshStandardMaterial;
      material.opacity = node.opacity;
      const outline = node.outline.material as LineBasicMaterial;
      outline.opacity = node.opacity;
      outline.color = node === this.active || node.hover > 0.5 ? accent : border;
      const scale = 1 + node.hover * 0.08 + (node === this.active ? 0.06 : 0);
      node.group.scale.setScalar(scale);
      // Flotación muy suave para que el mapa no se vea estático.
      if (!this.options.reducedMotion) {
        node.group.position.y = Math.sin(this.elapsed * 0.8 + node.position.x) * 0.12;
      }
      if (node.board && node.boardMaterial) {
        node.boardMaterial.opacity += ((visible ? 1 : 0) - node.boardMaterial.opacity) * ease(5);
        node.board.visible = node.boardMaterial.opacity > 0.02;
        // Los paneles miran siempre a la cámara.
        node.board.lookAt(this.camera.position);
      }
    }

    for (const edge of this.edges) {
      const lit = this.revealed.has(edge.a) && this.revealed.has(edge.b);
      const material = edge.line.material as LineBasicMaterial;
      material.color = lit ? accent : border;
      material.opacity += ((lit ? 0.9 : 0.18) - material.opacity) * ease(6);
    }

    // Órbita alrededor del nodo activo.
    const size = NODE_SIZE[this.active.def.kind];
    this.orbit.position.copy(this.active.group.position).add(new Vector3(0, 0.05, 0));
    this.orbitRing.scale.setScalar(size * 1.55);
    const angle = this.options.reducedMotion ? Math.PI / 4 : this.elapsed * 1.2;
    this.orbitMoon.position.set(Math.cos(angle) * size * 1.55, 0, Math.sin(angle) * size * 1.55);

    this.updateCamera(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private updateCamera(dt: number): void {
    if (!this.flying) {
      return;
    }
    const distance = FOCUS_DISTANCE[this.active.def.kind] * (this.camera.aspect < 0.8 ? 1.5 : 1);
    const target = this.active.position.clone();
    let goal: Vector3;
    if (this.active.parent) {
      // Se mira un poco por fuera del nodo (hacia sus hijos o su captura) y la
      // cámara se sitúa del lado del centro, alta: el centro queda fuera de plano.
      const outward = target.clone().setY(0).normalize();
      if (this.active.board) {
        target.add(outward.clone().multiplyScalar(2.4)).setY(1.6);
      } else {
        target.add(outward.clone().multiplyScalar(distance * 0.18));
      }
      goal = target.clone().sub(outward.multiplyScalar(distance * 0.28)).setY(target.y + distance * 0.9);
    } else {
      // Vista general: se conserva el rumbo horizontal actual de la cámara.
      const heading = this.camera.position.clone().sub(this.controls.target).setY(0);
      if (heading.lengthSq() < 0.01) {
        heading.set(0, 0, 1);
      }
      goal = target.clone().add(heading.normalize().multiplyScalar(distance * 0.72)).setY(distance * 0.7);
    }

    const t = this.options.reducedMotion ? 1 : 1 - Math.exp(-dt * FLY_SPEED);
    this.controls.target.lerp(target, t);
    this.camera.position.lerp(goal, t);
    if (this.controls.target.distanceTo(target) < 0.02 && this.camera.position.distanceTo(goal) < 0.05) {
      this.flying = false;
    }
  }

  private pick(event: PointerEvent): MapNode | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: Object3D[] = [];
    for (const node of this.nodes.values()) {
      if (this.revealed.has(node)) {
        targets.push(node.mesh);
        if (node.board?.visible) {
          targets.push(node.board);
        }
      }
    }
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const id = hit?.object.userData['id'] as string | undefined;
    return id ? this.nodes.get(id) ?? null : null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDown.set(event.clientX, event.clientY);
    // Si el usuario arrastra durante un vuelo, se le devuelve el control.
    this.flying = false;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    // Solo cuenta como clic si apenas se ha movido el puntero (no al orbitar).
    if (this.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY)) > 5) {
      return;
    }
    const node = this.pick(event);
    if (node) {
      this.options.onSelect(node.def.id);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons) {
      return;
    }
    this.hovered = this.pick(event);
    this.renderer.domElement.style.cursor = this.hovered ? 'pointer' : 'grab';
  };

  private readonly onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (!document.hidden) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  // En pantallas estrechas el panel ocupa la mitad inferior: se desplaza el
  // encuadre hacia arriba para que el nodo enfocado quede a la vista.
  private applyViewOffset(width: number, height: number): void {
    if (width / height < 0.8) {
      this.camera.setViewOffset(width, height, 0, height * 0.22, width, height);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) {
      return;
    }
    this.camera.aspect = width / height;
    this.applyViewOffset(width, height);
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
}
