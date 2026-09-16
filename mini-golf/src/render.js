const COLORS = {
  bg: "#0b1410",
  fairway: "#12211a",
  fairwayLine: "rgba(46, 204, 156, 0.10)",
  wall: "#2ecc9c",
  cors: "#ff6b6b",
  bumper: "#ffd166",
  bumperCore: "#3a2f0a",
  portal: "#7dd3fc",
  rebase: "#c084fc",
  rollback: "#ff6b6b",
  cache: "#93c5fd",
  main: "#0b0f14",
  mainRing: "#2ecc9c",
  ball: "#e8f3ee",
  ballShadow: "rgba(0,0,0,0.35)",
  label: "rgba(232, 243, 238, 0.55)",
  club: "#c9a876",
  clubHead: "#e8f3ee",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hole = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.particles = [];
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  setHole(hole) {
    this.hole = hole;
    this.trail = [];
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.viewW = rect.width;
    this.viewH = rect.height;

    if (this.hole) {
      const pad = 24;
      const scaleX = (rect.width - pad * 2) / this.hole.width;
      const scaleY = (rect.height - pad * 2) / this.hole.height;
      this.scale = Math.min(scaleX, scaleY);
      this.offsetX = (rect.width - this.hole.width * this.scale) / 2;
      this.offsetY = (rect.height - this.hole.height * this.scale) / 2;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  worldToScreen(p) {
    return { x: this.offsetX + p.x * this.scale, y: this.offsetY + p.y * this.scale };
  }

  spawnParticles(worldPos, color, count = 10) {
    if (this.reducedMotion) return;
    const p = this.worldToScreen(worldPos);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 90;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        age: 0,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  updateParticles(dt) {
    this._lastDt = dt;
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  draw(hole, ball, mechState, aimScreen) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Fairway
    ctx.fillStyle = COLORS.fairway;
    ctx.fillRect(0, 0, hole.width, hole.height);
    ctx.strokeStyle = COLORS.fairwayLine;
    ctx.lineWidth = 1 / this.scale;
    for (let x = 0; x < hole.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hole.height);
      ctx.stroke();
    }

    this._drawMain(hole.main);
    this._drawMechanics(hole, mechState);
    this._drawWalls(hole, mechState);
    this._updateTrail(ball);
    this._drawTrail();
    this._drawClub(ball, aimScreen);
    this._drawBall(ball);
    this._drawDecorations(hole.decorations);

    ctx.restore();

    this._drawParticles();
  }

  _drawWalls(hole, mechState) {
    const { ctx } = this;
    const walls = hole.movable
      ? hole.walls.concat(mechState.rebased ? hole.movable.altWalls : hole.movable.defaultWalls)
      : hole.walls;
    for (const w of walls) {
      ctx.strokeStyle = w.cors ? COLORS.cors : COLORS.wall;
      ctx.lineWidth = 5 / this.scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    }
    if (hole.movable) {
      const t = hole.movable.trigger;
      ctx.fillStyle = COLORS.rebase;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMechanics(hole, mechState) {
    const { ctx } = this;
    for (const b of hole.bumpers) {
      ctx.fillStyle = COLORS.bumperCore;
      ctx.strokeStyle = COLORS.bumper;
      ctx.lineWidth = 3 / this.scale;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    for (const p of hole.portals || []) {
      ctx.strokeStyle = COLORS.portal;
      ctx.lineWidth = 3 / this.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.portal;
      ctx.fill();
    }
    for (const rb of hole.rollbacks || []) {
      ctx.strokeStyle = COLORS.rollback;
      ctx.lineWidth = 3 / this.scale;
      ctx.setLineDash([4 / this.scale, 4 / this.scale]);
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, rb.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const c of hole.caches || []) {
      ctx.strokeStyle = COLORS.cache;
      ctx.lineWidth = 3 / this.scale;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawMain(main) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.main;
    ctx.strokeStyle = COLORS.mainRing;
    ctx.lineWidth = 3 / this.scale;
    ctx.beginPath();
    ctx.arc(main.x, main.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawBall(ball) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.ballShadow;
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius * 0.6, ball.radius * 0.9, ball.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Called once per shot (from main.js on the "shot" event) to kick off the swing animation. */
  startSwing(dirX, dirY, power) {
    this.swing = { dirX, dirY, power, t: 0, duration: 0.16 };
  }

  /**
   * The club: pulled back opposite the aim direction while charging
   * (further back for more power), then swings through to the ball in a
   * quick animation right after the shot is taken — the actual moment of
   * impact, not just an abstract arrow.
   */
  _drawClub(ball, aim) {
    const { ctx } = this;
    const pullBackWorld = 22; // distance behind the ball at rest/full pull
    let dirX, dirY, reach;

    if (this.swing && this.swing.t < this.swing.duration) {
      const s = this.swing;
      s.t += this._lastDt || 0;
      // Ease from fully pulled back, through the ball, to a short
      // follow-through — this is the "hit" itself, not a preview.
      const progress = Math.min(1, s.t / s.duration);
      const eased = progress * progress; // accelerate into the ball, like a real swing
      const pull = pullBackWorld * (1 + s.power * 0.5);
      reach = pull - (pull + 14) * eased;
      dirX = s.dirX;
      dirY = s.dirY;
      if (progress >= 1) this.swing = null;
    } else if (aim) {
      const pull = pullBackWorld * (1 + Math.min(aim.power, 1.6) * 0.7);
      reach = pull;
      dirX = aim.dirX;
      dirY = aim.dirY;
    } else {
      return;
    }

    // Head end sits `reach` behind the ball along -dir; shaft trails further back.
    const headX = ball.x + dirX * reach;
    const headY = ball.y + dirY * reach;
    const shaftX = ball.x + dirX * (reach + 30);
    const shaftY = ball.y + dirY * (reach + 30);

    ctx.strokeStyle = COLORS.club;
    ctx.lineWidth = 3 / this.scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shaftX, shaftY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    // Clubhead: a short perpendicular cap.
    const perpX = -dirY;
    const perpY = dirX;
    ctx.strokeStyle = COLORS.clubHead;
    ctx.lineWidth = 5 / this.scale;
    ctx.beginPath();
    ctx.moveTo(headX + perpX * 6, headY + perpY * 6);
    ctx.lineTo(headX - perpX * 6, headY - perpY * 6);
    ctx.stroke();
  }

  _updateTrail(ball) {
    this.trail ||= [];
    if (ball.speed > 120) {
      this.trail.push({ x: ball.x, y: ball.y });
      if (this.trail.length > 10) this.trail.shift();
    } else {
      this.trail.length = 0;
    }
  }

  _drawTrail() {
    if (!this.trail || this.trail.length < 2) return;
    const { ctx } = this;
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t = i / this.trail.length;
      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle = COLORS.ball;
      const p = this.trail[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawDecorations(decorations) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.label;
    ctx.font = `${12 / this.scale}px 'SF Mono', Menlo, monospace`;
    ctx.textAlign = "center";
    for (const d of decorations || []) {
      if (d.type === "label") ctx.fillText(d.text, d.x, d.y);
    }
  }

  _drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
