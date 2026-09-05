import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  glow: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorRgb: string;
}

interface AsteroidBody extends Particle {
  rotation: number;
  rotationSpeed: number;
  // Radius multiplier for each vertex around the body, giving it a
  // jagged, rocky silhouette instead of a perfect circle.
  shapePoints: number[];
}

interface Nebula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorRgb: string;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  strength: number;
  colorRgb: string;
  lineWidth: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
}

const LINK_DISTANCE = 140;
const MOUSE_RADIUS = 50;
const ATTRACTION_STRENGTH = 0.1;
const GLOW_EASE = 0.12;
const NORMAL_SPEED = 0.5;
const MAX_SPEED = 3;
const MIN_SPEED = 0.15;
const BRAKE_STRENGTH = 0.02;
const PARTICLE_AREA = 9000;
const MIN_PARTICLES = 40;
const MAX_PARTICLES = 160;
const CLUSTER_MIN_SIZE = 3;
const CLUSTER_NUDGE_INTERVAL_FRAMES = 90;
const CLUSTER_NUDGE_PROBABILITY = 0.35;
const CLUSTER_NUDGE_STRENGTH = 0.35;
const CLUSTER_NUDGE_MEMBER_PROBABILITY = 0.5;

const ASTEROID_AREA = 220000;
const MIN_ASTEROIDS = 3;
const MAX_ASTEROIDS = 8;
const ASTEROID_RADIUS_MIN = 4;
const ASTEROID_RADIUS_MAX = 6.5;
const ASTEROID_NORMAL_SPEED = 0.3;
const ASTEROID_MIN_SPEED = 0.08;
const ASTEROID_ATTRACTION_RADIUS = 170;
const ASTEROID_ATTRACTION_STRENGTH = 0.0025;
const ASTEROID_ROTATION_SPEED_MAX = 0.02;
const ASTEROID_SHAPE_VERTICES_MIN = 7;
const ASTEROID_SHAPE_VERTICES_MAX = 9;
const ASTEROID_SHAPE_JAGGEDNESS = 0.3; // +/- fraction of radius per vertex

const METEOR_MAX_CONCURRENT = 2;
const METEOR_SPEED_MIN = 7;
const METEOR_SPEED_MAX = 12;
const METEOR_SPAWN_INTERVAL_MIN_FRAMES = 120; // ~2s at 60fps
const METEOR_SPAWN_INTERVAL_MAX_FRAMES = 420; // ~7s at 60fps
const METEOR_DIAGONAL_JITTER_DEG = 20;
const METEOR_TRAIL_LENGTH = 90;
const METEOR_HEAD_RADIUS = 1.8;
const METEOR_BOUNDS_MARGIN = 200;
const METEOR_COLOR_PALETTE = [
  '255, 255, 255', // white
  '190, 220, 255', // icy blue
  '255, 230, 180', // warm gold
  '200, 255, 210', // pale green
];

const STAR_AREA = 5500;
const MIN_STARS = 60;
const MAX_STARS = 220;
const STAR_RADIUS_MIN = 0.4;
const STAR_RADIUS_MAX = 1.1;
const STAR_BASE_ALPHA_MIN = 0.15;
const STAR_BASE_ALPHA_MAX = 0.6;
const STAR_TWINKLE_SPEED_MIN = 0.01;
const STAR_TWINKLE_SPEED_MAX = 0.04;

const RIPPLE_MAX_RADIUS = 260;
const RIPPLE_SPEED = 6;
const RIPPLE_BAND_WIDTH = 18;
const RIPPLE_STRENGTH = 1.4;
const RIPPLE_MAX_CONCURRENT = 6;
const RIPPLE_COLOR_RGB = '150, 210, 255';

const SUPERNOVA_INTERVAL_MIN_FRAMES = 20 * 60; // ~20s at 60fps
const SUPERNOVA_INTERVAL_MAX_FRAMES = 50 * 60; // ~50s at 60fps
const SUPERNOVA_RIPPLE_MAX_RADIUS = 520;
const SUPERNOVA_RIPPLE_SPEED = 9;
const SUPERNOVA_RIPPLE_STRENGTH = 6;
const SUPERNOVA_RIPPLE_COLOR_RGB = '255, 200, 140';
const SUPERNOVA_RIPPLE_LINE_WIDTH = 3;

const EMBER_COUNT_MIN = 26;
const EMBER_COUNT_MAX = 42;
const EMBER_SPEED_MIN = 1.5;
const EMBER_SPEED_MAX = 5.5;
const EMBER_LIFETIME_MIN_FRAMES = 40;
const EMBER_LIFETIME_MAX_FRAMES = 85;
const EMBER_RADIUS_MIN = 1;
const EMBER_RADIUS_MAX = 2.4;
const EMBER_DRAG = 0.94;

const NEBULA_COUNT_MIN = 2;
const NEBULA_COUNT_MAX = 4;
const NEBULA_RADIUS_MIN_FACTOR = 0.3; // relative to min(width, height)
const NEBULA_RADIUS_MAX_FACTOR = 0.55;
const NEBULA_SPEED_MIN = 0.015;
const NEBULA_SPEED_MAX = 0.045;
const NEBULA_ALPHA_MIN = 0.05;
const NEBULA_ALPHA_MAX = 0.11;
const NEBULA_COLOR_PALETTE = [
  '99, 91, 255', // indigo
  '255, 99, 200', // magenta
  '80, 200, 220', // teal
];

@Component({
  selector: 'app-particle-background',
  standalone: true,
  templateUrl: './particle-background.component.html',
  styleUrl: './particle-background.component.scss',
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private asteroids: AsteroidBody[] = [];
  private meteors: Meteor[] = [];
  private meteorSpawnTimer = 0;
  private stars: Star[] = [];
  private nebulae: Nebula[] = [];
  private ripples: Ripple[] = [];
  private embers: Ember[] = [];
  private supernovaTimer = 0;
  private adjacency: number[][] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private mouse: { x: number; y: number } | null = null;
  private rafId: number | null = null;
  private reducedMotion = false;
  private isVisible = true;
  private frameCount = 0;

  private readonly onResize = () => this.resize();
  private readonly onMouseMove = (e: MouseEvent) => {
    this.mouse = { x: e.clientX, y: e.clientY };
  };
  private readonly onMouseLeave = () => {
    this.mouse = null;
  };
  private readonly onClick = (e: MouseEvent) => {
    if (this.reducedMotion || this.ripples.length >= RIPPLE_MAX_CONCURRENT) {
      return;
    }
    this.ripples.push(this.createRipple(e.clientX, e.clientY));
  };
  private readonly onVisibilityChange = () => {
    this.isVisible = !document.hidden;
    if (this.isVisible) {
      this.startLoop();
    }
  };

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    this.ctx = ctx;

    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    this.resize();
    this.spawnParticles();

    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.onResize);
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('mouseout', this.onMouseLeave);
      window.addEventListener('blur', this.onMouseLeave);
      window.addEventListener('click', this.onClick);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.startLoop();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseout', this.onMouseLeave);
    window.removeEventListener('blur', this.onMouseLeave);
    window.removeEventListener('click', this.onClick);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private startLoop(): void {
    if (this.rafId !== null) {
      return;
    }
    const step = () => {
      this.tick();
      if (this.isVisible) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.resizeGroup(this.particles, this.targetParticleCount(), () =>
      this.createParticle()
    );
    this.resizeGroup(this.asteroids, this.targetAsteroidCount(), () =>
      this.createAsteroid()
    );
    this.stars = this.createStars();
    this.nebulae = this.createNebulae();
  }

  private targetParticleCount(): number {
    const desired = Math.round((this.width * this.height) / PARTICLE_AREA);
    return Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, desired));
  }

  private targetAsteroidCount(): number {
    const desired = Math.round((this.width * this.height) / ASTEROID_AREA);
    return Math.max(MIN_ASTEROIDS, Math.min(MAX_ASTEROIDS, desired));
  }

  private resizeGroup<T extends Particle>(
    group: T[],
    targetCount: number,
    factory: () => T
  ): void {
    if (group.length === 0) {
      return;
    }
    if (group.length > targetCount) {
      group.length = targetCount;
    } else {
      while (group.length < targetCount) {
        group.push(factory());
      }
    }
  }

  private spawnParticles(): void {
    this.particles = Array.from({ length: this.targetParticleCount() }, () =>
      this.createParticle()
    );
    this.asteroids = Array.from({ length: this.targetAsteroidCount() }, () =>
      this.createAsteroid()
    );
    this.meteorSpawnTimer = this.randomMeteorSpawnInterval();
    this.supernovaTimer = this.randomSupernovaInterval();
  }

  private createParticle(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * 0.4;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.2 + Math.random() * 1.3,
      glow: 0,
    };
  }

  private createAsteroid(): AsteroidBody {
    const angle = Math.random() * Math.PI * 2;
    const speed = ASTEROID_MIN_SPEED + Math.random() * 0.2;
    const vertexCount =
      ASTEROID_SHAPE_VERTICES_MIN +
      Math.floor(Math.random() * (ASTEROID_SHAPE_VERTICES_MAX - ASTEROID_SHAPE_VERTICES_MIN + 1));
    const shapePoints = Array.from(
      { length: vertexCount },
      () => 1 - ASTEROID_SHAPE_JAGGEDNESS / 2 + Math.random() * ASTEROID_SHAPE_JAGGEDNESS
    );
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius:
        ASTEROID_RADIUS_MIN +
        Math.random() * (ASTEROID_RADIUS_MAX - ASTEROID_RADIUS_MIN),
      glow: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 2 - 1) * ASTEROID_ROTATION_SPEED_MAX,
      shapePoints,
    };
  }

  private createStars(): Star[] {
    const desired = Math.round((this.width * this.height) / STAR_AREA);
    const count = Math.max(MIN_STARS, Math.min(MAX_STARS, desired));
    return Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: STAR_RADIUS_MIN + Math.random() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN),
      baseAlpha:
        STAR_BASE_ALPHA_MIN + Math.random() * (STAR_BASE_ALPHA_MAX - STAR_BASE_ALPHA_MIN),
      twinkleSpeed:
        STAR_TWINKLE_SPEED_MIN +
        Math.random() * (STAR_TWINKLE_SPEED_MAX - STAR_TWINKLE_SPEED_MIN),
      twinklePhase: Math.random() * Math.PI * 2,
    }));
  }

  private tick(): void {
    const { ctx, width, height, particles, asteroids } = this;
    if (!ctx || width === 0 || height === 0) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    this.drawNebulae();
    this.drawStars();

    if (!this.reducedMotion) {
      for (const p of particles) {
        this.applyMouseAttraction(p);
        this.applyAsteroidAttraction(p);
        this.applyRippleForce(p);
        this.applyBraking(p, NORMAL_SPEED);
        p.x += p.vx;
        p.y += p.vy;
        this.wrap(p);
      }
      for (const a of asteroids) {
        this.applyMouseAttraction(a);
        this.applyRippleForce(a);
        this.applyBraking(a, ASTEROID_NORMAL_SPEED);
        a.x += a.vx;
        a.y += a.vy;
        a.rotation += a.rotationSpeed;
        this.wrap(a);
      }
      this.resolveAsteroidCollisions();
      this.updateMeteors();
      this.updateNebulae();
      this.advanceRipples();
      this.updateEmbers();
      this.updateSupernova();
      this.frameCount++;
    }

    const pairs = this.buildNeighborGraph();
    this.drawLinks(pairs);
    this.drawParticles();
    this.drawAsteroids();
    this.drawRipples();
    this.drawEmbers();
    this.drawMeteors();

    if (!this.reducedMotion && this.frameCount % CLUSTER_NUDGE_INTERVAL_FRAMES === 0) {
      this.maybeNudgeClusters();
    }
  }

  private applyMouseAttraction(p: Particle): void {
    let proximity = 0;

    if (this.mouse) {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0 && distSq < MOUSE_RADIUS * MOUSE_RADIUS) {
        const dist = Math.sqrt(distSq);
        proximity = 1 - dist / MOUSE_RADIUS;
        const force = proximity * ATTRACTION_STRENGTH;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }

    // Ease the glow toward how strongly this particle is currently being
    // attracted, so the color fades in and back out smoothly.
    p.glow += (proximity - p.glow) * GLOW_EASE;
  }

  private applyAsteroidAttraction(p: Particle): void {
    for (const a of this.asteroids) {
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq === 0 || distSq >= ASTEROID_ATTRACTION_RADIUS * ASTEROID_ATTRACTION_RADIUS) {
        continue;
      }
      const dist = Math.sqrt(distSq);
      const force = (1 - dist / ASTEROID_ATTRACTION_RADIUS) * ASTEROID_ATTRACTION_STRENGTH;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }
  }

  private resolveAsteroidCollisions(): void {
    const { asteroids } = this;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      for (let j = i + 1; j < asteroids.length; j++) {
        const b = asteroids[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist === 0 || dist >= minDist) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;

        const overlap = minDist - dist;
        a.x -= (nx * overlap) / 2;
        a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2;
        b.y += (ny * overlap) / 2;

        // Equal-mass elastic collision: swap the velocity components
        // that lie along the collision normal.
        const avn = a.vx * nx + a.vy * ny;
        const bvn = b.vx * nx + b.vy * ny;
        a.vx += (bvn - avn) * nx;
        a.vy += (bvn - avn) * ny;
        b.vx += (avn - bvn) * nx;
        b.vy += (avn - bvn) * ny;
      }
    }
  }

  private applyBraking(p: Particle, normalSpeed: number): void {
    const speed = Math.hypot(p.vx, p.vy);
    if (speed === 0) {
      return;
    }
    // Hard safety ceiling first, then a small proportional brake pulls
    // anything above cruising speed back down gradually, frame by frame.
    const cappedSpeed = Math.min(speed, MAX_SPEED);
    let targetSpeed = cappedSpeed;
    if (cappedSpeed > normalSpeed) {
      targetSpeed = cappedSpeed - (cappedSpeed - normalSpeed) * BRAKE_STRENGTH;
    } else if (cappedSpeed < MIN_SPEED) {
      targetSpeed = MIN_SPEED;
    }
    const scale = targetSpeed / speed;
    p.vx *= scale;
    p.vy *= scale;
  }

  private maybeNudgeClusters(): void {
    const clusters = this.findClusters();
    for (const cluster of clusters) {
      if (cluster.length < CLUSTER_MIN_SIZE) {
        continue;
      }
      if (Math.random() > CLUSTER_NUDGE_PROBABILITY) {
        continue;
      }
      this.nudgeCluster(cluster);
    }
  }

  private findClusters(): number[][] {
    const { particles, adjacency } = this;
    const visited = new Array<boolean>(particles.length).fill(false);
    const clusters: number[][] = [];

    for (let start = 0; start < particles.length; start++) {
      if (visited[start]) {
        continue;
      }
      const cluster: number[] = [];
      const stack = [start];
      visited[start] = true;
      while (stack.length > 0) {
        const current = stack.pop()!;
        cluster.push(current);
        for (const neighbor of adjacency[current]) {
          if (!visited[neighbor]) {
            visited[neighbor] = true;
            stack.push(neighbor);
          }
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  private nudgeCluster(cluster: number[]): void {
    const { particles } = this;

    // Only a random subset of the cluster's points get pushed, each in its
    // own independently random direction, so no group-wide preferred
    // direction ever emerges.
    const guaranteed = cluster[Math.floor(Math.random() * cluster.length)];
    for (const idx of cluster) {
      if (idx !== guaranteed && Math.random() > CLUSTER_NUDGE_MEMBER_PROBABILITY) {
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      particles[idx].vx += Math.cos(angle) * CLUSTER_NUDGE_STRENGTH;
      particles[idx].vy += Math.sin(angle) * CLUSTER_NUDGE_STRENGTH;
    }
  }

  private createNebulae(): Nebula[] {
    const count =
      NEBULA_COUNT_MIN + Math.floor(Math.random() * (NEBULA_COUNT_MAX - NEBULA_COUNT_MIN + 1));
    const minDimension = Math.min(this.width, this.height);
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = NEBULA_SPEED_MIN + Math.random() * (NEBULA_SPEED_MAX - NEBULA_SPEED_MIN);
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius:
          minDimension *
          (NEBULA_RADIUS_MIN_FACTOR +
            Math.random() * (NEBULA_RADIUS_MAX_FACTOR - NEBULA_RADIUS_MIN_FACTOR)),
        colorRgb: NEBULA_COLOR_PALETTE[Math.floor(Math.random() * NEBULA_COLOR_PALETTE.length)],
        alpha: NEBULA_ALPHA_MIN + Math.random() * (NEBULA_ALPHA_MAX - NEBULA_ALPHA_MIN),
      };
    });
  }

  private updateNebulae(): void {
    for (const n of this.nebulae) {
      n.x += n.vx;
      n.y += n.vy;
      this.wrap(n);
    }
  }

  private drawNebulae(): void {
    const { ctx, nebulae } = this;
    for (const n of nebulae) {
      const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      gradient.addColorStop(0, `rgba(${n.colorRgb}, ${n.alpha})`);
      gradient.addColorStop(1, `rgba(${n.colorRgb}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private wrap(p: { x: number; y: number; radius: number }): void {
    const margin = p.radius * 2;
    if (p.x < -margin) {
      p.x = this.width + margin;
    } else if (p.x > this.width + margin) {
      p.x = -margin;
    }
    if (p.y < -margin) {
      p.y = this.height + margin;
    } else if (p.y > this.height + margin) {
      p.y = -margin;
    }
  }

  private buildNeighborGraph(): Array<[number, number, number]> {
    const { particles } = this;
    const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
    const pairs: Array<[number, number, number]> = [];
    this.adjacency = particles.map(() => []);

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= maxDistSq) {
          continue;
        }
        pairs.push([i, j, Math.sqrt(distSq)]);
        this.adjacency[i].push(j);
        this.adjacency[j].push(i);
      }
    }
    return pairs;
  }

  private drawLinks(pairs: Array<[number, number, number]>): void {
    const { ctx, particles } = this;
    for (const [i, j, dist] of pairs) {
      const alpha = (1 - dist / LINK_DISTANCE) * 0.35;
      ctx.strokeStyle = `rgba(120, 180, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(particles[i].x, particles[i].y);
      ctx.lineTo(particles[j].x, particles[j].y);
      ctx.stroke();
    }
  }

  private drawParticles(): void {
    const { ctx, particles } = this;
    for (const p of particles) {
      ctx.fillStyle = this.particleColor(p.glow);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private particleColor(glow: number): string {
    const r = Math.round(190 + (90 - 190) * glow);
    const g = Math.round(215 + (230 - 215) * glow);
    const b = Math.round(255 + (140 - 255) * glow);
    return `rgba(${r}, ${g}, ${b}, 0.9)`;
  }

  private drawAsteroids(): void {
    const { ctx, asteroids } = this;
    ctx.fillStyle = 'rgba(220, 215, 205, 0.9)';
    for (const a of asteroids) {
      const points = a.shapePoints;
      const n = points.length;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = a.rotation + (i / n) * Math.PI * 2;
        const r = a.radius * points[i];
        const px = a.x + Math.cos(angle) * r;
        const py = a.y + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private randomMeteorSpawnInterval(): number {
    return (
      METEOR_SPAWN_INTERVAL_MIN_FRAMES +
      Math.random() * (METEOR_SPAWN_INTERVAL_MAX_FRAMES - METEOR_SPAWN_INTERVAL_MIN_FRAMES)
    );
  }

  private createMeteor(): Meteor {
    // Always one of the four diagonals (with some jitter), never a
    // near-horizontal or near-vertical pass.
    const baseAnglesDeg = [45, 135, 225, 315];
    const baseAngleDeg = baseAnglesDeg[Math.floor(Math.random() * baseAnglesDeg.length)];
    const jitterDeg = (Math.random() * 2 - 1) * METEOR_DIAGONAL_JITTER_DEG;
    const angle = ((baseAngleDeg + jitterDeg) * Math.PI) / 180;

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const speed = METEOR_SPEED_MIN + Math.random() * (METEOR_SPEED_MAX - METEOR_SPEED_MIN);

    // Offset the crossing line perpendicular to its direction, so meteors
    // don't all cut through the exact center of the screen.
    const perpX = -dirY;
    const perpY = dirX;
    const spread = Math.min(this.width, this.height) * 0.3;
    const perpOffset = (Math.random() * 2 - 1) * spread;
    const centerX = this.width / 2 + perpX * perpOffset;
    const centerY = this.height / 2 + perpY * perpOffset;

    // Start well outside the screen, behind the direction of travel, so it
    // flies in, crosses the visible area, and keeps going straight out.
    const startX = centerX - dirX * METEOR_BOUNDS_MARGIN;
    const startY = centerY - dirY * METEOR_BOUNDS_MARGIN;

    const colorRgb =
      METEOR_COLOR_PALETTE[Math.floor(Math.random() * METEOR_COLOR_PALETTE.length)];

    return { x: startX, y: startY, vx: dirX * speed, vy: dirY * speed, colorRgb };
  }

  private updateMeteors(): void {
    this.meteorSpawnTimer--;
    if (this.meteorSpawnTimer <= 0) {
      if (this.meteors.length < METEOR_MAX_CONCURRENT) {
        this.meteors.push(this.createMeteor());
      }
      this.meteorSpawnTimer = this.randomMeteorSpawnInterval();
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      if (this.isMeteorOutOfBounds(m)) {
        // Meteors fly straight through and off the screen — no wrap-around.
        this.meteors.splice(i, 1);
      }
    }
  }

  private isMeteorOutOfBounds(m: Meteor): boolean {
    return (
      m.x < -METEOR_BOUNDS_MARGIN ||
      m.x > this.width + METEOR_BOUNDS_MARGIN ||
      m.y < -METEOR_BOUNDS_MARGIN ||
      m.y > this.height + METEOR_BOUNDS_MARGIN
    );
  }

  private drawMeteors(): void {
    const { ctx, meteors } = this;
    for (const m of meteors) {
      const speed = Math.hypot(m.vx, m.vy);
      if (speed === 0) {
        continue;
      }
      const dirX = m.vx / speed;
      const dirY = m.vy / speed;
      const tailX = m.x - dirX * METEOR_TRAIL_LENGTH;
      const tailY = m.y - dirY * METEOR_TRAIL_LENGTH;

      const gradient = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      gradient.addColorStop(0, `rgba(${m.colorRgb}, 0)`);
      gradient.addColorStop(1, `rgba(${m.colorRgb}, 0.9)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      ctx.fillStyle = `rgba(${m.colorRgb}, 0.95)`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, METEOR_HEAD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStars(): void {
    const { ctx, stars, frameCount } = this;
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(frameCount * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.baseAlpha * (0.4 + 0.6 * twinkle);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private createRipple(
    x: number,
    y: number,
    overrides?: Partial<Pick<Ripple, 'maxRadius' | 'speed' | 'strength' | 'colorRgb' | 'lineWidth'>>
  ): Ripple {
    return {
      x,
      y,
      radius: 0,
      maxRadius: overrides?.maxRadius ?? RIPPLE_MAX_RADIUS,
      speed: overrides?.speed ?? RIPPLE_SPEED,
      strength: overrides?.strength ?? RIPPLE_STRENGTH,
      colorRgb: overrides?.colorRgb ?? RIPPLE_COLOR_RGB,
      lineWidth: overrides?.lineWidth ?? 1.5,
    };
  }

  private applyRippleForce(p: Particle): void {
    for (const r of this.ripples) {
      const dx = p.x - r.x;
      const dy = p.y - r.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0 || Math.abs(dist - r.radius) > RIPPLE_BAND_WIDTH) {
        continue;
      }
      // The push weakens the further the ring has already expanded.
      const falloff = 1 - r.radius / r.maxRadius;
      const force = r.strength * falloff;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }
  }

  private advanceRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private drawRipples(): void {
    const { ctx, ripples } = this;
    for (const r of ripples) {
      const alpha = (1 - r.radius / r.maxRadius) * 0.5;
      if (alpha <= 0) {
        continue;
      }
      ctx.strokeStyle = `rgba(${r.colorRgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = r.lineWidth;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private randomSupernovaInterval(): number {
    return (
      SUPERNOVA_INTERVAL_MIN_FRAMES +
      Math.random() * (SUPERNOVA_INTERVAL_MAX_FRAMES - SUPERNOVA_INTERVAL_MIN_FRAMES)
    );
  }

  private updateSupernova(): void {
    this.supernovaTimer--;
    if (this.supernovaTimer <= 0) {
      this.triggerSupernova();
      this.supernovaTimer = this.randomSupernovaInterval();
    }
  }

  private triggerSupernova(): void {
    if (this.asteroids.length === 0) {
      return;
    }
    // Pick a random asteroid to go supernova: it's destroyed and replaced
    // by a fresh one elsewhere, leaving behind a big shockwave and a
    // shower of fading embers at its former position.
    const index = Math.floor(Math.random() * this.asteroids.length);
    const { x, y } = this.asteroids[index];
    this.asteroids.splice(index, 1);
    this.asteroids.push(this.createAsteroid());

    this.ripples.push(
      this.createRipple(x, y, {
        maxRadius: SUPERNOVA_RIPPLE_MAX_RADIUS,
        speed: SUPERNOVA_RIPPLE_SPEED,
        strength: SUPERNOVA_RIPPLE_STRENGTH,
        colorRgb: SUPERNOVA_RIPPLE_COLOR_RGB,
        lineWidth: SUPERNOVA_RIPPLE_LINE_WIDTH,
      })
    );
    this.spawnEmbers(x, y);
  }

  private spawnEmbers(x: number, y: number): void {
    const count =
      EMBER_COUNT_MIN + Math.floor(Math.random() * (EMBER_COUNT_MAX - EMBER_COUNT_MIN));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = EMBER_SPEED_MIN + Math.random() * (EMBER_SPEED_MAX - EMBER_SPEED_MIN);
      this.embers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife:
          EMBER_LIFETIME_MIN_FRAMES +
          Math.random() * (EMBER_LIFETIME_MAX_FRAMES - EMBER_LIFETIME_MIN_FRAMES),
        radius: EMBER_RADIUS_MIN + Math.random() * (EMBER_RADIUS_MAX - EMBER_RADIUS_MIN),
      });
    }
  }

  private updateEmbers(): void {
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life++;
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= EMBER_DRAG;
      e.vy *= EMBER_DRAG;
      if (e.life >= e.maxLife) {
        this.embers.splice(i, 1);
      }
    }
  }

  private drawEmbers(): void {
    const { ctx, embers } = this;
    for (const e of embers) {
      const t = e.life / e.maxLife;
      const alpha = 1 - t;
      // Cools from bright yellow-white down to a deep red-orange as it fades.
      const g = Math.max(0, Math.round(230 - 160 * t));
      const b = Math.max(0, Math.round(160 - 140 * t));
      ctx.fillStyle = `rgba(255, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
