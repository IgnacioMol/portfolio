import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  afterNextRender,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  glow: number;
}

interface Nebula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorIndex: number;
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

// Colores del tema activo, leídos de las variables CSS (canales "r, g, b").
interface Palette {
  dot: string;
  link: string;
  glow: string;
  nebulae: string[];
  nebulaAlpha: number;
  intensity: number;
}

const LINK_DISTANCE = 140;
const MOUSE_RADIUS = 90;
const ATTRACTION_STRENGTH = 0.012;
const GLOW_EASE = 0.06;
const NORMAL_SPEED = 0.18;
const MAX_SPEED = 0.6;
const MIN_SPEED = 0.06;
const BRAKE_STRENGTH = 0.02;
const PARTICLE_AREA = 14000;
const MIN_PARTICLES = 30;
const MAX_PARTICLES = 110;

const STAR_AREA = 9000;
const MIN_STARS = 40;
const MAX_STARS = 140;
const STAR_RADIUS_MIN = 0.4;
const STAR_RADIUS_MAX = 1;
const STAR_BASE_ALPHA_MIN = 0.1;
const STAR_BASE_ALPHA_MAX = 0.4;
const STAR_TWINKLE_SPEED_MIN = 0.004;
const STAR_TWINKLE_SPEED_MAX = 0.015;

const NEBULA_COUNT_MIN = 2;
const NEBULA_COUNT_MAX = 4;
const NEBULA_RADIUS_MIN_FACTOR = 0.3; // relative to min(width, height)
const NEBULA_RADIUS_MAX_FACTOR = 0.55;
const NEBULA_SPEED_MIN = 0.01;
const NEBULA_SPEED_MAX = 0.03;
const NEBULA_ALPHA_MIN = 0.05;
const NEBULA_ALPHA_MAX = 0.1;

@Component({
  selector: 'app-particle-background',
  standalone: true,
  templateUrl: './particle-background.component.html',
  styleUrl: './particle-background.component.scss',
})
export class ParticleBackgroundComponent implements OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private nebulae: Nebula[] = [];
  private palette!: Palette;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private mouse: { x: number; y: number } | null = null;
  private rafId: number | null = null;
  private reducedMotion = false;
  private isVisible = true;
  private frameCount = 0;
  private themeObserver?: MutationObserver;

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

  constructor(private readonly zone: NgZone) {
    // Solo en el navegador: al prerenderizar no hay canvas ni ventana.
    afterNextRender(() => this.init());
  }

  private init(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    this.ctx = ctx;

    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    this.palette = this.readPalette();
    this.resize();
    this.particles = Array.from({ length: this.targetParticleCount() }, () =>
      this.createParticle()
    );

    // Al cambiar de tema se vuelven a leer los colores, sin reiniciar el fondo.
    this.themeObserver = new MutationObserver(() => {
      this.palette = this.readPalette();
      if (this.reducedMotion) {
        this.tick();
      }
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

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
    if (!this.ctx) {
      return;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.themeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseout', this.onMouseLeave);
    window.removeEventListener('blur', this.onMouseLeave);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readPalette(): Palette {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
      dot: read('--bg-dot-rgb', '190, 210, 245'),
      link: read('--bg-link-rgb', '120, 170, 255'),
      glow: read('--bg-glow-rgb', '140, 230, 170'),
      nebulae: [read('--bg-nebula-1', '99, 91, 255'), read('--bg-nebula-2', '80, 200, 220'), read('--bg-nebula-3', '255, 99, 200')],
      nebulaAlpha: parseFloat(read('--bg-nebula-alpha', '1')),
      intensity: parseFloat(read('--bg-intensity', '1')),
    };
  }

  private startLoop(): void {
    if (this.rafId !== null) {
      return;
    }
    // Con movimiento reducido se pinta un único fotograma estático.
    if (this.reducedMotion) {
      this.tick();
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

    const target = this.targetParticleCount();
    if (this.particles.length > target) {
      this.particles.length = target;
    } else if (this.particles.length > 0) {
      while (this.particles.length < target) {
        this.particles.push(this.createParticle());
      }
    }
    this.stars = this.createStars();
    this.nebulae = this.createNebulae();
    if (this.reducedMotion) {
      this.tick();
    }
  }

  private targetParticleCount(): number {
    const desired = Math.round((this.width * this.height) / PARTICLE_AREA);
    return Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, desired));
  }

  private createParticle(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * 0.12;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 1.1,
      glow: 0,
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

  private createNebulae(): Nebula[] {
    const count =
      NEBULA_COUNT_MIN + Math.floor(Math.random() * (NEBULA_COUNT_MAX - NEBULA_COUNT_MIN + 1));
    const minDimension = Math.min(this.width, this.height);
    return Array.from({ length: count }, (_, index) => {
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
        colorIndex: index % 3,
        alpha: NEBULA_ALPHA_MIN + Math.random() * (NEBULA_ALPHA_MAX - NEBULA_ALPHA_MIN),
      };
    });
  }

  private tick(): void {
    const { ctx, width, height, particles } = this;
    if (!ctx || width === 0 || height === 0) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    this.drawNebulae();
    this.drawStars();

    if (!this.reducedMotion) {
      for (const p of particles) {
        this.applyMouseAttraction(p);
        this.applyBraking(p);
        p.x += p.vx;
        p.y += p.vy;
        this.wrap(p);
      }
      for (const n of this.nebulae) {
        n.x += n.vx;
        n.y += n.vy;
        this.wrap(n);
      }
      this.frameCount++;
    }

    this.drawLinks();
    this.drawParticles();
  }

  // Atracción muy suave hacia el puntero; sobre todo hace brillar los puntos.
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

    p.glow += (proximity - p.glow) * GLOW_EASE;
  }

  private applyBraking(p: Particle): void {
    const speed = Math.hypot(p.vx, p.vy);
    if (speed === 0) {
      return;
    }
    // Hard safety ceiling first, then a small proportional brake pulls
    // anything above cruising speed back down gradually, frame by frame.
    const cappedSpeed = Math.min(speed, MAX_SPEED);
    let targetSpeed = cappedSpeed;
    if (cappedSpeed > NORMAL_SPEED) {
      targetSpeed = cappedSpeed - (cappedSpeed - NORMAL_SPEED) * BRAKE_STRENGTH;
    } else if (cappedSpeed < MIN_SPEED) {
      targetSpeed = MIN_SPEED;
    }
    const scale = targetSpeed / speed;
    p.vx *= scale;
    p.vy *= scale;
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

  private drawNebulae(): void {
    const { ctx, nebulae, palette } = this;
    for (const n of nebulae) {
      const rgb = palette.nebulae[n.colorIndex];
      const alpha = n.alpha * palette.nebulaAlpha;
      const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      gradient.addColorStop(0, `rgba(${rgb}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStars(): void {
    const { ctx, stars, frameCount, palette } = this;
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(frameCount * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.baseAlpha * (0.5 + 0.5 * twinkle) * palette.intensity;
      ctx.fillStyle = `rgba(${palette.dot}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLinks(): void {
    const { ctx, particles, palette } = this;
    const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
    ctx.lineWidth = 1;
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
        const alpha = (1 - Math.sqrt(distSq) / LINK_DISTANCE) * 0.22 * palette.intensity;
        ctx.strokeStyle = `rgba(${palette.link}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  private drawParticles(): void {
    const { ctx, particles, palette } = this;
    for (const p of particles) {
      const alpha = (0.55 + 0.35 * p.glow) * palette.intensity;
      ctx.fillStyle = p.glow > 0.05 ? `rgba(${palette.glow}, ${alpha})` : `rgba(${palette.dot}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
