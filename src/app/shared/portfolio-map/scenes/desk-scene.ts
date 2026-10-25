import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BaseScene, SceneContext, canvasTexture, drawCard, loadImage } from './base-scene';

// Objetos del escritorio que llevan a una parte del portfolio.
const HOTSPOTS: { id: string; anchor: [number, number, number] }[] = [
  { id: 'project-generador-patrones-orbitales', anchor: [0, 7.1, -4.3] },
  { id: 'project-plataforma-fsupv', anchor: [3.1, 5, -2.6] },
  { id: 'habilidades', anchor: [-3.1, 4.6, -3.5] },
  { id: 'formacion', anchor: [-5.4, 8.6, -1.2] },
  { id: 'experiencia', anchor: [3.6, 8.6, -5.8] },
  { id: 'sobre-mi', anchor: [-4.4, 8.6, -5.8] },
  { id: 'contacto', anchor: [1.5, 4, -1.7] },
];

const OVERVIEW_CAMERA = new Vector3(13, 11.5, 12);
const OVERVIEW_TARGET = new Vector3(-0.5, 4.2, -2.6);

interface Hotspot {
  id: string;
  group: Group;
  materials: MeshStandardMaterial[];
  label: CSS2DObject;
  anchor: Vector3;
  glow: number;
}

// Opción A: un diorama de mi escritorio en el que cada objeto es una sección.
export class DeskScene extends BaseScene {
  private readonly controls: OrbitControls;
  private readonly hotspots = new Map<string, Hotspot>();
  private readonly structure: MeshStandardMaterial[] = [];
  private readonly screenCanvas = document.createElement('canvas');
  private readonly laptopCanvas = document.createElement('canvas');
  private readonly frameCanvas = document.createElement('canvas');
  private screenImage?: HTMLImageElement;
  private readonly cameraGoal = new Vector3();
  private readonly targetGoal = OVERVIEW_TARGET.clone();
  private flying = true;
  private sun!: DirectionalLight;

  constructor(container: HTMLElement, context: SceneContext) {
    super(container, context, 35);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.camera.position.copy(this.overviewCamera());
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(OVERVIEW_TARGET);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 45;
    this.controls.minPolarAngle = 0.5;
    this.controls.maxPolarAngle = 1.35;
    this.controls.minAzimuthAngle = -0.15;
    this.controls.maxAzimuthAngle = 1.45;
    this.controls.addEventListener('start', () => (this.flying = false));

    this.cameraGoal.copy(this.overviewCamera());
    this.buildLights();
    this.buildRoom();
    this.buildDesk();
    this.buildHotspots();
    this.start();

    loadImage('images/projects/epicycloid/mandala.webp').then((image) => {
      this.screenImage = image;
      this.refresh();
    });
  }

  override select(id: string | null): void {
    super.select(id);
    const hotspot = id ? this.hotspots.get(id) : undefined;
    if (hotspot) {
      // Se acerca al objeto manteniendo el ángulo de la vista general.
      const direction = OVERVIEW_CAMERA.clone().sub(OVERVIEW_TARGET).normalize();
      this.targetGoal.copy(hotspot.anchor).add(new Vector3(0, -1, 0));
      this.cameraGoal.copy(this.targetGoal).add(direction.multiplyScalar(11 * this.distanceScale));
    } else {
      this.targetGoal.copy(OVERVIEW_TARGET);
      this.cameraGoal.copy(this.overviewCamera());
    }
    this.flying = true;
  }

  private overviewCamera(): Vector3 {
    return OVERVIEW_TARGET.clone().add(OVERVIEW_CAMERA.clone().sub(OVERVIEW_TARGET).multiplyScalar(this.distanceScale));
  }

  override dispose(): void {
    this.controls.dispose();
    super.dispose();
  }

  protected pickables(): Object3D[] {
    return [...this.hotspots.values()].map((h) => h.group);
  }

  protected update(dt: number): void {
    for (const hotspot of this.hotspots.values()) {
      const on = hotspot.id === this.hoveredId || hotspot.id === this.selectedId;
      hotspot.glow += ((on ? 1 : 0) - hotspot.glow) * this.ease(10, dt);
      const accent = new Color(this.palette.accent);
      for (const material of hotspot.materials) {
        material.emissive.copy(accent);
        material.emissiveIntensity = hotspot.glow * 0.18;
      }
      hotspot.label.element.classList.toggle('is-active', on);
    }
    if (this.flying) {
      const t = this.ease(2.5, dt);
      this.controls.target.lerp(this.targetGoal, t);
      this.camera.position.lerp(this.cameraGoal, t);
      if (this.camera.position.distanceTo(this.cameraGoal) < 0.02) {
        this.flying = false;
      }
    }
    this.controls.update();
  }

  protected override applyPalette(): void {
    super.applyPalette();
    const p = this.palette;
    const [floor, wallBack, wallLeft] = this.structure;
    floor?.color.set(p.dark ? '#121b2e' : '#e6e9ee');
    wallBack?.color.set(p.dark ? '#18223a' : '#f4f5f8');
    wallLeft?.color.set(p.dark ? '#141d32' : '#eceef2');
    if (this.sun) {
      this.sun.intensity = p.dark ? 1.6 : 2.2;
    }
  }

  protected refresh(): void {
    const p = this.palette;
    drawCard(this.screenCanvas, { width: 840, height: 520, palette: { ...p, surface: '#0b0f1a', borderStrong: '#0b0f1a' }, title: '', image: this.screenImage, imageRatio: 0.92 });
    const fsupv = this.items['project-plataforma-fsupv'];
    drawCard(this.laptopCanvas, { width: 640, height: 400, palette: p, eyebrow: fsupv?.eyebrow, title: fsupv?.label ?? '' });
    const about = this.items['sobre-mi'];
    drawCard(this.frameCanvas, { width: 600, height: 420, palette: p, eyebrow: about?.eyebrow, title: about?.label ?? '' });
    this.textures.forEach((texture) => (texture.needsUpdate = true));
    for (const hotspot of this.hotspots.values()) {
      const item = this.items[hotspot.id];
      hotspot.label.element.textContent = item?.short ?? hotspot.id;
    }
  }

  // Construcción

  private material(color: string, roughness = 0.75): MeshStandardMaterial {
    return new MeshStandardMaterial({ color, roughness, metalness: 0.05 });
  }

  private box(w: number, h: number, d: number, material: MeshStandardMaterial, x: number, y: number, z: number, parent: Object3D = this.scene): Mesh {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildLights(): void {
    this.scene.add(new AmbientLight('#ffffff', 1.1));
    this.sun = new DirectionalLight('#ffffff', 2);
    this.sun.position.set(9, 16, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -12;
    this.sun.shadow.camera.right = 12;
    this.sun.shadow.camera.top = 12;
    this.sun.shadow.camera.bottom = -12;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun);
  }

  private buildRoom(): void {
    const floor = this.material('#e6e9ee', 0.95);
    const wallBack = this.material('#f4f5f8', 0.95);
    const wallLeft = this.material('#eceef2', 0.95);
    this.structure.push(floor, wallBack, wallLeft);
    this.box(14, 0.3, 12, floor, 0, -0.15, 0);
    this.box(14, 10, 0.3, wallBack, 0, 5, -6.15);
    this.box(0.3, 10, 12, wallLeft, -7.15, 5, 0);
  }

  private buildDesk(): void {
    const wood = this.material('#b98b62', 0.6);
    const metal = this.material('#3f4654', 0.4);
    this.box(9, 0.3, 4, wood, 0, 3.35, -3.6);
    for (const [x, z] of [[-4.2, -5.3], [4.2, -5.3], [-4.2, -1.9], [4.2, -1.9]]) {
      this.box(0.25, 3.2, 0.25, metal, x, 1.6, z);
    }
    // Teclado, taza, lámpara y planta (decorativos).
    this.box(2.8, 0.12, 0.9, this.material('#d7dbe2'), -0.2, 3.56, -2.5);
    const mug = new Mesh(new CylinderGeometry(0.32, 0.28, 0.7, 24), this.material('#1d4ed8', 0.5));
    mug.position.set(-1.9, 3.85, -2.1);
    mug.castShadow = true;
    this.scene.add(mug);
    const lampBase = new Mesh(new CylinderGeometry(0.4, 0.45, 0.15, 24), metal);
    lampBase.position.set(3.8, 3.57, -4.9);
    const lampArm = this.box(0.12, 2.2, 0.12, metal, 3.8, 4.7, -4.9);
    const lampHead = new Mesh(new ConeGeometry(0.55, 0.8, 24, 1, true), this.material('#3f4654', 0.4));
    lampHead.position.set(3.5, 5.75, -4.6);
    lampHead.rotation.z = 0.6;
    lampHead.castShadow = true;
    this.scene.add(lampBase, lampArm, lampHead);
    const pot = new Mesh(new CylinderGeometry(0.7, 0.55, 1.2, 24), this.material('#d7dbe2'));
    pot.position.set(5.6, 0.6, -4.9);
    pot.castShadow = true;
    this.scene.add(pot);
    const leaves = this.material('#3f9b63', 0.8);
    for (const [x, y, z, r] of [[5.6, 1.9, -4.9, 0.85], [5.2, 2.5, -4.7, 0.6], [6, 2.4, -5.1, 0.55]]) {
      const leaf = new Mesh(new SphereGeometry(r, 16, 12), leaves);
      leaf.position.set(x, y, z);
      leaf.castShadow = true;
      this.scene.add(leaf);
    }
    // Silla.
    const seat = this.material('#3f4654', 0.7);
    this.box(2.4, 0.3, 2.2, seat, 0, 2.2, 0.2);
    this.box(2.4, 2.4, 0.3, seat, 0, 3.5, 1.3);
    this.box(0.2, 2, 0.2, metal, 0, 1.05, 0.2);
    this.box(1.8, 0.12, 0.2, metal, 0, 0.1, 0.2);
    this.box(0.2, 0.12, 1.8, metal, 0, 0.1, 0.2);
  }

  private hotspot(id: string): Hotspot {
    const group = new Group();
    group.userData['id'] = id;
    this.scene.add(group);
    const spec = HOTSPOTS.find((h) => h.id === id)!;
    const anchor = new Vector3(...spec.anchor);
    const label = this.label('', 'viewer-label-hotspot', () => this.context.onSelect(id));
    label.position.copy(anchor);
    this.scene.add(label);
    const hotspot: Hotspot = { id, group, materials: [], label, anchor, glow: 0 };
    this.hotspots.set(id, hotspot);
    return hotspot;
  }

  private part(h: Hotspot, color: string, w: number, ht: number, d: number, x: number, y: number, z: number): Mesh {
    const material = this.material(color, 0.55);
    h.materials.push(material);
    return this.box(w, ht, d, material, x, y, z, h.group);
  }

  private buildHotspots(): void {
    // Monitor con el TFG en pantalla.
    const monitor = this.hotspot('project-generador-patrones-orbitales');
    this.part(monitor, '#1f2430', 0.9, 0.12, 0.7, 0, 3.56, -4.6);
    this.part(monitor, '#1f2430', 0.2, 1.1, 0.2, 0, 4.15, -4.75);
    this.part(monitor, '#1f2430', 4.4, 2.75, 0.2, 0, 5.55, -4.6);
    const screenTexture = canvasTexture(this.screenCanvas);
    this.textures.push(screenTexture);
    const screen = new Mesh(new PlaneGeometry(4.15, 2.55), new MeshBasicMaterial({ map: screenTexture }));
    screen.position.set(0, 5.55, -4.49);
    monitor.group.add(screen);

    // Portátil con la web de FSUPV.
    const laptop = this.hotspot('project-plataforma-fsupv');
    const laptopGroup = new Group();
    laptopGroup.position.set(3, 3.55, -2.7);
    laptopGroup.rotation.y = -0.45;
    laptop.group.add(laptopGroup);
    const base = this.part(laptop, '#9aa3b2', 2.4, 0.1, 1.6, 0, 0, 0);
    laptopGroup.add(base);
    const lid = new Group();
    lid.position.set(0, 0.05, -0.8);
    lid.rotation.x = -0.25;
    laptopGroup.add(lid);
    lid.add(this.part(laptop, '#9aa3b2', 2.4, 1.6, 0.08, 0, 0.8, 0));
    const laptopTexture = canvasTexture(this.laptopCanvas);
    this.textures.push(laptopTexture);
    const laptopScreen = new Mesh(new PlaneGeometry(2.2, 1.4), new MeshBasicMaterial({ map: laptopTexture }));
    laptopScreen.position.set(0, 0.8, 0.045);
    lid.add(laptopScreen);

    // Gafas de realidad virtual y mando: habilidades.
    const skills = this.hotspot('habilidades');
    this.part(skills, '#262b36', 1.4, 0.7, 0.8, -3.1, 3.85, -3.6).rotation.y = 0.5;
    const lensMaterial = this.material('#3b82f6', 0.2);
    skills.materials.push(lensMaterial);
    for (const dx of [-0.32, 0.32]) {
      const lens = new Mesh(new CylinderGeometry(0.2, 0.2, 0.1, 20), lensMaterial);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(-3.1 + dx * Math.cos(0.5), 3.85, -3.6 + 0.42 + dx * -Math.sin(0.5) * 0.2);
      skills.group.add(lens);
    }
    const strapMaterial = this.material('#1b1f27', 0.8);
    skills.materials.push(strapMaterial);
    const strap = new Mesh(new TorusGeometry(0.62, 0.07, 10, 32), strapMaterial);
    strap.rotation.set(Math.PI / 2, 0, 0.5);
    strap.position.set(-3.1, 3.85, -3.9);
    skills.group.add(strap);
    const pad = this.part(skills, '#2d3340', 1.1, 0.22, 0.6, -2.9, 3.62, -2.3);
    pad.rotation.y = -0.3;
    for (const dx of [-0.42, 0.42]) {
      this.part(skills, '#2d3340', 0.42, 0.22, 0.55, -2.9 + dx, 3.62, -2.15).rotation.y = -0.3;
    }

    // Estantería con libros: formación.
    const shelf = this.hotspot('formacion');
    const books = ['#1d4ed8', '#0ea5e9', '#64748b', '#7c3aed', '#f59e0b', '#16a34a', '#e11d48'];
    for (const [i, y] of [6.4, 8].entries()) {
      this.part(shelf, '#b98b62', 1.4, 0.15, 3.6, -6.3, y, -1.2);
      let z = -2.75;
      for (let b = 0; b < 6; b++) {
        const h = 0.9 + ((b * 7 + i * 3) % 4) * 0.12;
        const w = 0.32 + ((b + i) % 3) * 0.06;
        this.part(shelf, books[(b + i * 2) % books.length], 1, h, w, -6.35, y + 0.08 + h / 2, z + w / 2);
        z += w + 0.07;
      }
    }

    // Corcho con notas: experiencia.
    const board = this.hotspot('experiencia');
    this.part(board, '#c49a6c', 4.2, 2.6, 0.12, 3.6, 7.2, -5.95);
    const notes = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fbcfe8'];
    for (const [i, [x, y, r]] of [[2.4, 7.6, 0.08], [3.6, 7.8, -0.06], [4.8, 7.5, 0.1], [3, 6.6, -0.12], [4.3, 6.5, 0.05]].entries()) {
      this.part(board, notes[i % notes.length], 0.85, 0.85, 0.03, x, y, -5.86).rotation.z = r;
    }

    // Cuadro con mi nombre: sobre mí.
    const frame = this.hotspot('sobre-mi');
    this.part(frame, '#1f2430', 3.4, 2.5, 0.12, -4.4, 7.2, -5.95);
    const frameTexture = canvasTexture(this.frameCanvas);
    this.textures.push(frameTexture);
    const picture = new Mesh(new PlaneGeometry(3.1, 2.2), new MeshBasicMaterial({ map: frameTexture }));
    picture.position.set(-4.4, 7.2, -5.88);
    frame.group.add(picture);

    // Sobre sobre la mesa: contacto.
    const envelope = this.hotspot('contacto');
    const paper = this.part(envelope, '#f8fafc', 1.4, 0.06, 0.95, 1.5, 3.53, -2.1);
    paper.rotation.y = 0.25;
    const seal = new Mesh(new CylinderGeometry(0.14, 0.14, 0.04, 20), this.material('#e11d48', 0.5));
    seal.position.set(1.5, 3.58, -2.1);
    envelope.materials.push(seal.material as MeshStandardMaterial);
    envelope.group.add(seal);
  }
}
