/**
 * particles.ts — 粒子系统模块
 *
 * 模块间调用关系与数据流向:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ editor.ts (主编辑器)                                             │
 * │   │                                                              │
 * │   ├── 触发粒子生成 (根据物理事件):                                │
 * │   │   ├── 跳跃时: particles.spawnJumpDust(x, y)                  │
 * │   │   │     数据流: editor检测到跳跃输入 → 调用spawnJumpDust      │
 * │   │   │     生成: 10-30个褐色尘埃粒子(#8b6914)                    │
 * │   │   │                                                          │
 * │   │   ├── 着陆时: particles.spawnLandingDust(x, y, width)        │
 * │   │   │     数据流: CollisionResult.landed=true → 调用            │
 * │   │   │     生成: 15-30个灰色灰尘云粒子(#a0826d)                  │
 * │   │   │                                                          │
 * │   │   └── 终点时: particles.spawnGoldExplosion(x, y)             │
 * │   │         数据流: CollisionResult.reachedFlag=true → 调用       │
 * │   │         生成: 60个金色放射粒子(#ffd700/#ffec8b)               │
 * │   │                                                              │
 * │   ├── 每帧更新: particles.update(dt)                             │
 * │   │     接收: 时间步长dt                                         │
 * │   │     处理: 更新粒子位置(vx/vy+重力+阻力) + 线性衰减透明度      │
 * │   │     清理: life<=0 的粒子从数组中彻底移除                       │
 * │   │     硬限制: 同时存在粒子数 ≤ MAX_PARTICLES(100)               │
 * │   │                                                              │
 * │   └── 每帧渲染: particles.draw(ctx, scale)                       │
 * │         接收: Canvas2D上下文 + 缩放比例                           │
 * │         渲染: 按life/maxLife计算globalAlpha，线性衰减到0           │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * 验证方法:
 *   粒子数量上限: 在浏览器控制台输入 editor.particles.particles.length
 *   透明度衰减: 观察粒子从出现到消失是否平滑过渡，无突然消失
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'dust' | 'landing' | 'gold';
}

const MAX_PARTICLES = 100;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class ParticleSystem {
  particles: Particle[] = [];

  spawnJumpDust(x: number, y: number): void {
    const count = Math.floor(rand(10, 31));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: x + rand(-2, 6),
        y: y + rand(0, 4),
        vx: rand(-1.5, 1.5),
        vy: rand(-1.5, -0.3),
        life: rand(20, 40),
        maxLife: 40,
        size: rand(2, 4),
        color: '#8b6914',
        type: 'dust'
      });
    }
  }

  spawnLandingDust(x: number, y: number, width: number): void {
    const count = Math.floor(rand(15, 31));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: x + rand(0, width),
        y: y + rand(-1, 2),
        vx: rand(-3, 3),
        vy: rand(-2.5, -0.5),
        life: rand(25, 50),
        maxLife: 50,
        size: rand(3, 7),
        color: '#a0826d',
        type: 'landing'
      });
    }
  }

  spawnGoldExplosion(x: number, y: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
      const speed = rand(2, 6);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(40, 80),
        maxLife: 80,
        size: rand(3, 6),
        color: Math.random() > 0.5 ? '#ffd700' : '#ffec8b',
        type: 'gold'
      });
    }
  }

  update(dt: number): void {
    const gravity = 0.15 * dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'gold') {
        p.vy += gravity * 0.8;
      } else {
        p.vy += gravity * 0.4;
      }
      p.vx *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = p.size * scale;
      ctx.fillRect(
        Math.floor(p.x * scale - s / 2),
        Math.floor(p.y * scale - s / 2),
        Math.ceil(s),
        Math.ceil(s)
      );
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles.length = 0;
  }
}
