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
  private asteroids: Particle[] = [];
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
  }

  private targetParticleCount(): number {
    const desired = Math.round((this.width * this.height) / PARTICLE_AREA);
    return Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, desired));
  }

  private targetAsteroidCount(): number {
    const desired = Math.round((this.width * this.height) / ASTEROID_AREA);
    return Math.max(MIN_ASTEROIDS, Math.min(MAX_ASTEROIDS, desired));
  }

  private resizeGroup(
    group: Particle[],
    targetCount: number,
    factory: () => Particle
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

  private createAsteroid(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = ASTEROID_MIN_SPEED + Math.random() * 0.2;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius:
        ASTEROID_RADIUS_MIN +
        Math.random() * (ASTEROID_RADIUS_MAX - ASTEROID_RADIUS_MIN),
      glow: 0,
    };
  }

  private tick(): void {
    const { ctx, width, height, particles, asteroids } = this;
    if (!ctx || width === 0 || height === 0) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (!this.reducedMotion) {
      for (const p of particles) {
        this.applyMouseAttraction(p);
        this.applyAsteroidAttraction(p);
        this.applyBraking(p, NORMAL_SPEED);
        p.x += p.vx;
        p.y += p.vy;
        this.wrap(p);
      }
      for (const a of asteroids) {
        this.applyMouseAttraction(a);
        this.applyBraking(a, ASTEROID_NORMAL_SPEED);
        a.x += a.vx;
        a.y += a.vy;
        this.wrap(a);
      }
      this.resolveAsteroidCollisions();
      this.frameCount++;
    }

    const pairs = this.buildNeighborGraph();
    this.drawLinks(pairs);
    this.drawParticles();
    this.drawAsteroids();

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

  private wrap(p: Particle): void {
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
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
