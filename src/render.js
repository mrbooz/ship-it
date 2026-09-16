import { WORLD_W, WORLD_H, GROUND_Y } from "./constants.js";

const COLORS = {
  bg: "#0b0f14",
  grid: "rgba(120, 200, 170, 0.08)",
  ground: "#1c2530",
  groundLine: "#2ecc9c",
  player: "#2ecc9c",
  playerGlow: "rgba(46, 204, 156, 0.35)",
  obstacle: "#1a2028",
  obstacleBorder: "#ff6b6b",
  obstacleText: "#ffd1d1",
  jokeBorder: "#5aa9ff",
  jokeText: "#cfe6ff",
  flowBorder: "#ffd166",
  particlePerfect: "#ffd166",
  particleDeploy: "#2ecc9c",
  particleCollision: "#ff6b6b",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.scale = this.canvas.width / WORLD_W;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  spawnParticles(x, y, color, count = 10, spread = 140) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * spread;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.5 + Math.random() * 0.4,
        age: 0,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  drawBackground(scrollX, flowState) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Subtle scrolling pipeline grid.
    ctx.strokeStyle = flowState ? "rgba(255, 209, 102, 0.10)" : COLORS.grid;
    ctx.lineWidth = 1;
    const spacing = 48;
    const offset = ((scrollX * 0.4) % spacing) * -1;
    for (let x = offset; x < WORLD_W; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
    ctx.strokeStyle = flowState ? COLORS.flowBorder : COLORS.groundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(WORLD_W, GROUND_Y);
    ctx.stroke();
  }

  drawPlayer(player, flowState) {
    const { ctx } = this;
    const { x, y, w, h, state, runPhase } = player;

    let squashX = 1;
    let squashY = 1;
    let rot = 0;
    if (state === "run") {
      squashY = 1 + Math.sin(runPhase) * 0.03;
      squashX = 1 - Math.sin(runPhase) * 0.03;
    } else if (state === "jump") {
      squashY = 1.08;
      squashX = 0.94;
      rot = -0.05;
    } else if (state === "fall") {
      squashY = 0.96;
      squashX = 1.04;
    } else if (state === "land") {
      squashY = 0.82;
      squashX = 1.16;
    }

    const cx = x + w / 2;
    const cy = y + h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(squashX, squashY);

    if (flowState) {
      ctx.shadowColor = COLORS.flowBorder;
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = COLORS.playerGlow;
      ctx.shadowBlur = 10;
    }

    const rw = w;
    const rh = h;
    ctx.fillStyle = flowState ? "#1c1608" : "#0e1a16";
    ctx.strokeStyle = flowState ? COLORS.flowBorder : COLORS.player;
    ctx.lineWidth = 2.5;
    roundRect(ctx, -rw / 2, -rh, rw, rh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = flowState ? COLORS.flowBorder : COLORS.player;
    ctx.font = "bold 18px 'SF Mono', 'Menlo', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", 0, -rh / 2 + 1);

    ctx.restore();
  }

  drawObstacle(o) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = COLORS.obstacle;
    ctx.strokeStyle = o._joke ? COLORS.jokeBorder : COLORS.obstacleBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, o.left, o.top, o.w, o.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = o._joke ? COLORS.jokeText : COLORS.obstacleText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxTextWidth = o.w - 8;
    const lines = wrapLabel(ctx, o.label, maxTextWidth);
    const fontSize = lines.length > 1 ? 8.5 : 9.5;
    ctx.font = `bold ${fontSize}px 'SF Mono', 'Menlo', monospace`;
    const cx = o.left + o.w / 2;
    const lineHeight = fontSize + 2;
    const startY = o.top + o.h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));

    ctx.restore();
  }

  drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const alpha = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawImpactFlash(alpha) {
    if (alpha <= 0) return;
    const { ctx } = this;
    ctx.fillStyle = `rgba(255, 90, 90, ${alpha})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
}

/** Greedy word-wrap so obstacle labels stay horizontal and readable. */
function wrapLabel(ctx, label, maxWidth, maxLines = 3) {
  const words = label.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
    if (lines.length === maxLines - 1) break;
  }
  if (current) lines.push(current);
  // Whatever words didn't fit get folded into the last line rather than
  // silently dropped — a slightly cramped final line beats losing text.
  const consumed = lines.join(" ").split(" ").length;
  if (consumed < words.length) {
    lines[lines.length - 1] += " " + words.slice(consumed).join(" ");
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
