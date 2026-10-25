import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export interface SceneNodeDef {
  id: string;
  kind: 'star' | 'planet' | 'moon';
  // Id del cuerpo alrededor del que orbita (los planetas, de la estrella).
  parent?: string;
  size: number;
  orbit: number;
  // Velocidad angular en radianes por segundo.
  speed: number;
  phase: number;
  tilt: number;
  color: string;
  ring?: boolean;
}

export interface SolarSceneOptions {
  reducedMotion: boolean;
  onSelect: (id: string | null) => void;
}

interface Body {
  def: SceneNodeDef;
  orbitPivot: Object3D;
  anchor: Object3D;
  mesh: Mesh;
  orbitLine?: LineLoop;
  label: HTMLButtonElement;
}

const OVERVIEW_CAMERA = new Vector3(0, 30, 58);
const OVERVIEW_TARGET = new Vector3(0, 0, 0);
const ORBIT_COLOR = new Color('#3a4a6b');
const ORBIT_ACTIVE_COLOR = new Color('#7bb4ff');
// Constante de suavizado del vuelo de la cámara (más alto = más rápido).
const FLY_SPEED = 2.8;

// Pseudoaleatorio determinista para que las texturas no cambien entre visitas.
function seeded(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Textura de bandas con ruido, para que cada planeta tenga algo de relieve.
function planetTexture(color: string, seed: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = new Color(color);
  const rand = seeded(seed);
  for (let y = 0; y < canvas.height; y++) {
    const band = Math.sin(y * 0.11 + rand() * 0.6) * 0.5 + Math.sin(y * 0.37) * 0.25;
    const shade = base.clone().offsetHSL(0, -0.05, band * 0.12);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.fillRect(0, y, canvas.width, 1);
  }
  for (let i = 0; i < 900; i++) {
    const shade = base.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.3);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(rand() * canvas.width, rand() * canvas.height, rand() * 3 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function glowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 190, 100, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

function orbitLine(radius: number): LineLoop {
  const points: number[] = [];
  const segments = 128;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const material = new LineBasicMaterial({ color: ORBIT_COLOR, transparent: true, opacity: 0.45 });
  return new LineLoop(geometry, material);
}

function starfield(): Points {
  const rand = seeded(42);
  const positions: number[] = [];
  const colors: number[] = [];
  const palette = [new Color('#ffffff'), new Color('#cfe0ff'), new Color('#ffe9c7'), new Color('#d9c8ff')];
  for (let i = 0; i < 2500; i++) {
    const r = 260 + rand() * 260;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    const c = palette[Math.floor(rand() * palette.length)];
    colors.push(c.r, c.g, c.b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 });
  return new Points(geometry, material);
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Escena del sistema solar del portfolio: una estrella central, planetas por
// sección y lunas por proyecto. Independiente de Angular.
export class SolarScene {
  private readonly renderer: WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly bodies = new Map<string, Body>();
  private readonly resizeObserver: ResizeObserver;
  private readonly disposables: { dispose(): void }[] = [];

  private selected: Body | null = null;
  // Mientras vuela, la cámara se acerca al objetivo; después solo lo sigue.
  private flying = false;
  private readonly lastFocus = new Vector3();
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private pointerDown = new Vector2();

  constructor(
    private readonly container: HTMLElement,
    defs: SceneNodeDef[],
    private readonly options: SolarSceneOptions,
  ) {
    const { clientWidth: width, clientHeight: height } = container;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('#05070d');
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = 'solar-labels';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new PerspectiveCamera(50, width / height, 0.1, 2000);
    this.camera.position.copy(OVERVIEW_CAMERA);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 140;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.copy(OVERVIEW_TARGET);

    this.scene.fog = new FogExp2('#05070d', 0.0035);
    this.scene.add(new AmbientLight('#8899bb', 0.35));
    this.scene.add(starfield());

    this.build(defs);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  setLabels(labels: Record<string, string>): void {
    for (const [id, body] of this.bodies) {
      body.label.textContent = labels[id] ?? id;
    }
  }

  select(id: string | null): void {
    const body = id ? this.bodies.get(id) ?? null : null;
    if (this.selected?.orbitLine) {
      (this.selected.orbitLine.material as LineBasicMaterial).color.copy(ORBIT_COLOR);
      (this.selected.orbitLine.material as LineBasicMaterial).opacity = 0.45;
    }
    this.bodies.forEach((b) => b.label.classList.toggle('is-active', b === body));
    this.selected = body;
    if (body?.orbitLine) {
      (body.orbitLine.material as LineBasicMaterial).color.copy(ORBIT_ACTIVE_COLOR);
      (body.orbitLine.material as LineBasicMaterial).opacity = 0.9;
    }
    if (body) {
      body.mesh.getWorldPosition(this.lastFocus);
    }
    this.flying = true;
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
      (Array.isArray(material) ? material : material ? [material] : []).forEach((m) => {
        (m as MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }

  private build(defs: SceneNodeDef[]): void {
    defs.forEach((def, index) => {
      const parent = def.parent ? this.bodies.get(def.parent) : undefined;
      const host = parent ? parent.anchor : this.scene;

      // La inclinación va en un grupo propio para que la órbita y su línea
      // compartan plano.
      const tilt = new Group();
      tilt.rotation.x = def.tilt;
      host.add(tilt);

      const orbitPivot = new Object3D();
      orbitPivot.rotation.y = def.phase;
      tilt.add(orbitPivot);

      const anchor = new Object3D();
      anchor.position.x = def.orbit;
      orbitPivot.add(anchor);

      const mesh = def.kind === 'star' ? this.buildStar(def) : this.buildPlanet(def, index);
      mesh.userData['id'] = def.id;
      anchor.add(mesh);

      let line: LineLoop | undefined;
      if (def.orbit > 0) {
        line = orbitLine(def.orbit);
        tilt.add(line);
      }

      const label = document.createElement('button');
      label.type = 'button';
      label.className = `solar-label solar-label-${def.kind}`;
      label.addEventListener('click', (event) => {
        event.stopPropagation();
        this.options.onSelect(def.id);
      });
      const labelObject = new CSS2DObject(label);
      labelObject.position.set(0, def.size + (def.kind === 'moon' ? 0.45 : 0.9), 0);
      anchor.add(labelObject);

      this.bodies.set(def.id, { def, orbitPivot, anchor, mesh, orbitLine: line, label });
    });
  }

  private buildStar(def: SceneNodeDef): Mesh {
    const star = new Mesh(new SphereGeometry(def.size, 48, 32), new MeshBasicMaterial({ color: def.color }));
    const glowMap = glowTexture();
    this.disposables.push(glowMap);
    const glow = new Sprite(
      new SpriteMaterial({ map: glowMap, color: '#ffc979', transparent: true, blending: AdditiveBlending, depthWrite: false }),
    );
    glow.scale.setScalar(def.size * 6);
    star.add(glow);
    const light = new PointLight('#fff1d6', 2.6, 0, 0);
    star.add(light);
    return star;
  }

  private buildPlanet(def: SceneNodeDef, seed: number): Mesh {
    const material = new MeshStandardMaterial({
      map: planetTexture(def.color, seed + 7),
      roughness: 0.85,
      metalness: 0.05,
      emissive: new Color(def.color),
      emissiveIntensity: 0.08,
    });
    const mesh = new Mesh(new SphereGeometry(def.size, 40, 28), material);
    mesh.rotation.z = 0.35;
    if (def.ring) {
      const ring = new Mesh(
        new RingGeometry(def.size * 1.45, def.size * 2.2, 64),
        new MeshBasicMaterial({ color: def.color, side: DoubleSide, transparent: true, opacity: 0.35 }),
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }
    return mesh;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    if (!this.options.reducedMotion) {
      this.elapsed += dt;
    }

    for (const body of this.bodies.values()) {
      body.orbitPivot.rotation.y = body.def.phase + this.elapsed * body.def.speed;
      body.mesh.rotation.y = this.elapsed * 0.25;
    }

    this.updateCamera(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private updateCamera(dt: number): void {
    const focus = new Vector3();
    let cameraGoal: Vector3;
    if (this.selected) {
      this.selected.mesh.getWorldPosition(focus);
      // Sigue al cuerpo en su órbita sin quitarle al usuario el control.
      const delta = focus.clone().sub(this.lastFocus);
      this.lastFocus.copy(focus);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
      // En pantallas estrechas el panel tapa la parte baja: se aleja la cámara.
      const narrow = this.camera.aspect < 0.8 ? 1.8 : 1;
      const distance = (this.selected.def.size * (this.selected.def.kind === 'star' ? 6 : 7) + 3) * narrow;
      const direction = this.camera.position.clone().sub(focus).normalize();
      if (direction.lengthSq() === 0) {
        direction.set(0, 0.4, 1).normalize();
      }
      cameraGoal = focus.clone().add(direction.multiplyScalar(distance));
    } else {
      focus.copy(OVERVIEW_TARGET);
      cameraGoal = OVERVIEW_CAMERA;
    }

    if (!this.flying) {
      return;
    }
    const t = this.options.reducedMotion ? 1 : 1 - Math.exp(-dt * FLY_SPEED);
    this.controls.target.lerp(focus, t);
    this.camera.position.lerp(cameraGoal, t);
    if (this.controls.target.distanceTo(focus) < 0.02 && this.camera.position.distanceTo(cameraGoal) < 0.05) {
      this.flying = false;
    }
  }

  private pick(event: PointerEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.bodies.values()].map((b) => b.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return (hit?.object.userData['id'] as string | undefined) ?? null;
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
    const id = this.pick(event);
    if (id) {
      this.options.onSelect(id);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons) {
      return;
    }
    this.renderer.domElement.style.cursor = this.pick(event) ? 'pointer' : 'grab';
  };

  private readonly onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (!document.hidden) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) {
      return;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
}
