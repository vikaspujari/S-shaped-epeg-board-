/**
 * ═══════════════════════════════════════════════════════════════
 *  JUNGLE COMMANDO — CINEMATIC SILHOUETTE ENGINE
 *  
 *  Art direction: Clean silhouette style (Limbo / Alto's Odyssey)
 *  - Beautiful gradient atmosphere with moon
 *  - All foreground elements are rich dark silhouettes
 *  - Character with subtle rim-light edge
 *  - Restrained, tasteful effects
 *  - NO bloom blobs, NO overdone particles
 * ═══════════════════════════════════════════════════════════════
 */

const TAU = Math.PI * 2;
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

function createNoopContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 0 });
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function get2d(canvas) {
  try {
    return canvas.getContext('2d') || createNoopContext();
  } catch {
    return createNoopContext();
  }
}

function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h; return c;
}

/* ═══ PARTICLE (simple, capped) ═══ */
const MAX_P = 200;

class Particle {
  constructor(x, y, vx, vy, life, size, color, grav, type, customData) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.ml = life; this.size = size;
    this.color = color; this.grav = grav || 0;
    this.type = type || 'circle';
    this.rot = rand(0, TAU); this.rotV = rand(-3, 3);
    this.customData = customData || null;
    this.alive = true;
  }
  update(dt) {
    const m = dt * 60;
    this.x += this.vx * m; this.y += this.vy * m;
    this.vy += this.grav * m;
    this.rot += this.rotV * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
}

class Particles {
  constructor() { this.p = []; }
  emit(pt) {
    if (this.p.length >= MAX_P) {
      const i = this.p.findIndex(x => !x.alive);
      if (i !== -1) this.p.splice(i, 1); else this.p.shift();
    }
    this.p.push(pt);
  }
  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      this.p[i].update(dt);
      if (!this.p[i].alive) this.p.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.p) {
      const a = clamp(p.life / p.ml, 0, 1);
      ctx.globalAlpha = a;
      switch (p.type) {
        case 'leaf': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(0, 0, p.size * 2, p.size * 0.7, 0, 0, TAU); ctx.fill();
          ctx.restore(); break;
        }
        case 'shard': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.customData && p.customData.length) {
            ctx.beginPath();
            ctx.moveTo(p.customData[0].x * p.size, p.customData[0].y * p.size);
            for(let i=1; i<p.customData.length; i++) ctx.lineTo(p.customData[i].x * p.size, p.customData[i].y * p.size);
            ctx.closePath(); ctx.fill();
            // Optional rim light on shards
            if (p.customData[0].rim) {
                ctx.strokeStyle = p.customData[0].rim; ctx.lineWidth = 1; ctx.stroke();
            }
          } else {
            ctx.fillRect(-p.size * a / 2, -p.size * a / 2, p.size * a, p.size * a);
          }
          ctx.restore(); break;
        }
        case 'rain': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
          break;
        }
        case 'trail': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.customData, 0, TAU); ctx.stroke();
          p.customData += 0.8; // expand ring
          break;
        }
        default: {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

/* ═══ MOONLIT COMMANDO SPRITE CACHE ═══ */
const FW = 80, FH = 104;

// Moonlit color palette (visible but dark — lit from right)
const MC = {
  // Shadowed side (left-facing)
  legSh:   '#162018',  legSh2:  '#1a2a1c',
  torsoSh: '#18261a',  torsoSh2:'#1c2e1e',
  armSh:   '#3a2820',  armShFg: '#30201a',
  headSh:  '#3a2a1e',  neckSh:  '#342418',
  // Moonlit side (right-facing, brighter)
  legLit:  '#2a4428',  legLit2: '#325230',
  torsoLit:'#2e4a2a',  torsoLit2:'#386234',
  armLit:  '#6a5040',  armLitFg:'#5a4030',
  headLit: '#6a5040',
  // Details
  camoSpot:'#1e3818',  camoSpot2:'#243e20',
  boot:    '#121410',  bootSole:'#080a06',  bootHi: '#1e2218',
  belt:    '#1a1e14',  buckle:  '#6a5828',
  skinMid: '#4a3828',  skinHi:  '#7a5a40',
  headband:'#6a1e18',  headbandLit:'#8a2a22', headbandDk:'#3a1210',
  hair:    '#0c0a06',
  machBlade:'#4a5a68', machBladeHi:'#6a7a88', machHilt:'#2a1e14',
  eye:     '#dde8d8',  pupil:'#0a0a08', iris:'#2a4a28',
  rimColor:'rgba(100, 230, 180, ',
};

function drawMoonlitCommando(frame, state, breath) {
  const oc = offscreen(FW, FH);
  const c = get2d(oc);
  const cx = FW / 2, base = FH - 8;
  const legL = 26, torH = 28, torW = 26, headR = 13;

  let lg1 = 0, lg2 = 0, ar1 = 0, ar2 = 0, bob = 0, lean = 0;
  if (state === 'run') {
    const t = (frame / 8) * TAU;
    lg1 = Math.sin(t) * 0.75; lg2 = Math.sin(t + Math.PI) * 0.75;
    ar1 = Math.sin(t + Math.PI) * 0.6; ar2 = Math.sin(t) * 0.6;
    bob = Math.abs(Math.sin(t)) * 5; lean = 0.1;
  } else if (state === 'jump') {
    lg1 = -0.5; lg2 = -0.3; ar1 = -1.0; ar2 = -0.8; bob = 0; lean = -0.08;
  } else {
    bob = Math.sin(breath) * 2.5;
    lg1 = 0.05; lg2 = -0.05;
    ar1 = 0.12 + Math.sin(breath) * 0.07;
    ar2 = -0.12 - Math.sin(breath) * 0.07;
  }

  const hip = base - legL;
  const tY = hip - torH - bob;
  const shY = tY + 5;

  c.save();
  c.translate(cx, 0); c.rotate(lean); c.translate(-cx, 0);

  // ── SHADOW on ground ──
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(cx, base + 3, 24, 6, 0, 0, TAU); c.fill();

  // ── LEGS (camo pants, moonlit right side) ──
  const drawLeg = (ox, ang, isRight) => {
    const sx = cx + ox;
    const footX = sx + Math.sin(ang) * legL;
    const shCol = isRight ? MC.legLit : MC.legSh;
    const shCol2 = isRight ? MC.legLit2 : MC.legSh2;
    // Thigh
    c.lineWidth = 11; c.strokeStyle = shCol; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, hip - bob); c.lineTo(footX, base - 5); c.stroke();
    // Camo spots on thigh
    const mx = (sx + footX) / 2, my = (hip - bob + base - 5) / 2;
    c.fillStyle = MC.camoSpot;
    c.beginPath(); c.arc(mx, my, 3.5, 0, TAU); c.fill();
    c.fillStyle = MC.camoSpot2;
    c.beginPath(); c.arc(mx + 3, my + 5, 2.5, 0, TAU); c.fill();
    // Shin
    c.lineWidth = 9; c.strokeStyle = shCol2;
    c.beginPath(); c.moveTo(footX, base - 7); c.lineTo(footX, base); c.stroke();
    // Boot
    c.fillStyle = MC.boot;
    c.beginPath(); c.roundRect(footX - 9, base - 5, 18, 9, 3); c.fill();
    c.fillStyle = MC.bootHi; c.fillRect(footX - 7, base - 5, 14, 2);
    c.fillStyle = MC.bootSole; c.fillRect(footX - 9, base + 2, 18, 3);
  };
  drawLeg(-6, lg1, false);
  drawLeg(6, lg2, true);

  // ── TORSO (camo shirt, lit from right) ──
  const tX = cx - torW / 2;
  // Left half (shadow side)
  c.fillStyle = MC.torsoSh;
  c.beginPath(); c.roundRect(tX, tY, torW, torH, 6); c.fill();
  // Right half gradient (moonlit)
  const tGrad = c.createLinearGradient(tX, 0, tX + torW, 0);
  tGrad.addColorStop(0, 'transparent');
  tGrad.addColorStop(0.4, 'transparent');
  tGrad.addColorStop(1, MC.torsoLit2);
  c.fillStyle = tGrad;
  c.beginPath(); c.roundRect(tX, tY, torW, torH, 6); c.fill();
  // Camo pattern
  c.fillStyle = MC.camoSpot;
  c.fillRect(tX + 3, tY + 4, 7, 5);
  c.fillRect(tX + 14, tY + 12, 6, 6);
  c.fillStyle = MC.camoSpot2;
  c.fillRect(tX + 2, tY + 13, 8, 4);
  c.fillRect(tX + 12, tY + 3, 7, 5);
  // Chest line
  c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx, tY + 3); c.lineTo(cx, tY + torH * 0.6); c.stroke();
  // Ammo strap
  c.strokeStyle = '#2a2218'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(tX + torW + 1, tY + 2); c.lineTo(tX - 1, tY + torH - 6); c.stroke();
  // Ammo rounds
  for (let i = 0; i < 4; i++) {
    const t2 = i / 4;
    c.fillStyle = MC.buckle;
    c.beginPath(); c.arc(tX + torW + 1 - (torW + 2) * t2, tY + 2 + (torH - 8) * t2, 1.5, 0, TAU); c.fill();
  }
  // Belt
  c.fillStyle = MC.belt; c.fillRect(tX - 2, tY + torH - 5, torW + 4, 5);
  c.fillStyle = MC.buckle; c.fillRect(cx - 3, tY + torH - 5, 6, 5);

  // ── ARMS (skin, moonlit) ──
  const drawArm = (sx, sy, ang, isRight) => {
    const dir = isRight ? 1 : -1;
    const ex = sx + dir * (12 + Math.sin(ang) * 8);
    const ey = sy + 16;
    const hx = ex + dir * (5 + Math.sin(ang) * 5);
    const hy = ey + 14;
    const skinC = isRight ? MC.armLit : MC.armSh;
    const fgC = isRight ? MC.armLitFg : MC.armShFg;
    // Upper arm
    c.lineWidth = 11; c.strokeStyle = skinC; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    // Muscle highlight (moon side)
    if (isRight) {
      c.lineWidth = 4; c.strokeStyle = MC.skinHi; c.globalAlpha = 0.3;
      c.beginPath(); c.moveTo(sx + 2, sy); c.lineTo((sx + ex) / 2 + 2, (sy + ey) / 2); c.stroke();
      c.globalAlpha = 1;
    }
    // Forearm
    c.lineWidth = 9; c.strokeStyle = fgC;
    c.beginPath(); c.moveTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    // Fist
    c.fillStyle = skinC;
    c.beginPath(); c.arc(hx, hy, 5, 0, TAU); c.fill();
  };
  drawArm(tX - 2, shY, ar1, false);
  drawArm(tX + torW + 2, shY, ar2, true);

  // Shoulder pads
  c.fillStyle = MC.torsoSh; c.beginPath(); c.arc(tX - 1, shY, 5.5, 0, TAU); c.fill();
  c.fillStyle = MC.torsoLit; c.beginPath(); c.arc(tX + torW + 1, shY, 5.5, 0, TAU); c.fill();

  // ── MACHETE on back ──
  c.save(); c.translate(tX - 5, tY); c.rotate(0.3);
  c.fillStyle = MC.machHilt;
  c.beginPath(); c.roundRect(-2, -3, 5, 12, 2); c.fill();
  c.fillStyle = MC.machBlade;
  c.beginPath(); c.moveTo(0, -3); c.lineTo(3, -3); c.lineTo(4, -28); c.lineTo(1, -30); c.lineTo(-1, -3); c.closePath(); c.fill();
  // Blade edge shine
  c.fillStyle = MC.machBladeHi; c.globalAlpha = 0.5;
  c.beginPath(); c.moveTo(3, -3); c.lineTo(4, -28); c.lineTo(3, -26); c.lineTo(2, -3); c.closePath(); c.fill();
  c.globalAlpha = 1;
  c.restore();

  // ── NECK ──
  c.fillStyle = MC.neckSh; c.fillRect(cx - 5, tY - 5, 10, 7);
  // Moon-side highlight
  c.fillStyle = MC.skinMid; c.globalAlpha = 0.4; c.fillRect(cx + 1, tY - 5, 4, 7); c.globalAlpha = 1;

  // ── HEAD ──
  const hY = tY - headR + 1;
  // Shadow side
  c.fillStyle = MC.headSh;
  c.beginPath(); c.arc(cx, hY, headR, 0, TAU); c.fill();
  // Moonlit right side gradient
  const hGrad = c.createLinearGradient(cx - headR, 0, cx + headR, 0);
  hGrad.addColorStop(0, 'transparent');
  hGrad.addColorStop(0.5, 'transparent');
  hGrad.addColorStop(1, MC.headLit);
  c.fillStyle = hGrad;
  c.beginPath(); c.arc(cx, hY, headR, 0, TAU); c.fill();
  // Hair
  c.fillStyle = MC.hair;
  c.beginPath(); c.arc(cx, hY - 2, headR + 0.5, Math.PI + 0.5, -0.5); c.fill();

  // ── HEADBAND ──
  const hbY = hY - 3;
  c.fillStyle = MC.headband; c.fillRect(cx - headR - 3, hbY, headR * 2 + 6, 5);
  // Lit stripe
  c.fillStyle = MC.headbandLit; c.fillRect(cx + 4, hbY, headR - 1, 5);
  // Shine
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(cx - headR - 2, hbY, headR * 2 + 4, 1.5);
  // Tails
  const tb = cx - headR - 3;
  c.fillStyle = MC.headbandDk;
  c.beginPath(); c.moveTo(tb, hbY + 1);
  c.quadraticCurveTo(tb - 12, hbY + 4 + Math.sin(frame * 0.6) * 3, tb - 20, hbY + 6);
  c.quadraticCurveTo(tb - 13, hbY + 6, tb, hbY + 5); c.fill();
  c.beginPath(); c.moveTo(tb, hbY + 3);
  c.quadraticCurveTo(tb - 14, hbY + 8 + Math.sin(frame * 0.6 + 0.5) * 3, tb - 24, hbY + 11);
  c.quadraticCurveTo(tb - 15, hbY + 10, tb, hbY + 6); c.fill();

  // ── EYE ──
  c.fillStyle = MC.eye; c.beginPath(); c.ellipse(cx + 5, hY - 1, 3, 2.5, 0, 0, TAU); c.fill();
  c.fillStyle = MC.iris; c.beginPath(); c.arc(cx + 6, hY - 1, 1.8, 0, TAU); c.fill();
  c.fillStyle = MC.pupil; c.beginPath(); c.arc(cx + 6.3, hY - 0.8, 1, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + 5, hY - 2, 0.7, 0, TAU); c.fill();
  // Brow
  c.strokeStyle = MC.hair; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(cx + 1, hY - 5); c.lineTo(cx + 8, hY - 5.5); c.stroke();

  c.restore();

  // ── RIM LIGHT (strong edge glow on right side from moonlight) ──
  const rimOc = offscreen(FW, FH);
  const rc = get2d(rimOc);
  // Shifted right + slightly down
  rc.drawImage(oc, 2, 0);
  rc.globalCompositeOperation = 'destination-out';
  rc.drawImage(oc, 0, 0);
  rc.globalCompositeOperation = 'source-in';
  rc.fillStyle = MC.rimColor + '0.6)';
  rc.fillRect(0, 0, FW, FH);
  rc.globalCompositeOperation = 'source-over';
  // Also a top rim
  const rimOc2 = offscreen(FW, FH);
  const rc2 = get2d(rimOc2);
  rc2.drawImage(oc, 0, -1);
  rc2.globalCompositeOperation = 'destination-out';
  rc2.drawImage(oc, 0, 0);
  rc2.globalCompositeOperation = 'source-in';
  rc2.fillStyle = MC.rimColor + '0.3)';
  rc2.fillRect(0, 0, FW, FH);
  rc2.globalCompositeOperation = 'source-over';

  const finalCtx = get2d(oc);
  finalCtx.drawImage(rimOc, 0, 0);
  finalCtx.drawImage(rimOc2, 0, 0);

  return oc;
}

function buildSprites() {
  const s = { run: [], jump: null, idle: [] };
  for (let f = 0; f < 8; f++) s.run.push(drawMoonlitCommando(f, 'run', 0));
  s.jump = drawMoonlitCommando(0, 'jump', 0);
  for (let f = 0; f < 12; f++) s.idle.push(drawMoonlitCommando(f, 'idle', (f / 12) * TAU));
  return s;
}

/* ═══ TREE SILHOUETTE GENERATOR ═══ */

function drawTreeSilhouette(ctx, x, groundY, height, width, detail, fillColor) {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  // Trunk
  const trunkW = width * 0.08;
  ctx.moveTo(x - trunkW, groundY);
  ctx.lineTo(x - trunkW, groundY - height * 0.45);
  // Crown (organic bezier shape)
  const crownBase = groundY - height * 0.4;
  const crownTop = groundY - height;
  const cw = width * 0.5;

  // Left side of crown
  ctx.bezierCurveTo(
    x - cw * 1.2, crownBase,
    x - cw * 1.4, crownBase - height * 0.25,
    x - cw * 0.8, crownTop + height * 0.15
  );
  // Top bumps (makes it look organic)
  if (detail > 0) {
    ctx.bezierCurveTo(
      x - cw * 0.5, crownTop - height * 0.05,
      x - cw * 0.2, crownTop + height * 0.02,
      x, crownTop
    );
    ctx.bezierCurveTo(
      x + cw * 0.2, crownTop - height * 0.03,
      x + cw * 0.5, crownTop + height * 0.05,
      x + cw * 0.8, crownTop + height * 0.15
    );
  } else {
    ctx.quadraticCurveTo(x, crownTop - height * 0.05, x + cw * 0.8, crownTop + height * 0.15);
  }
  // Right side
  ctx.bezierCurveTo(
    x + cw * 1.4, crownBase - height * 0.2,
    x + cw * 1.2, crownBase,
    x + trunkW, groundY - height * 0.45
  );
  ctx.lineTo(x + trunkW, groundY);
  ctx.closePath();
  ctx.fill();
}

/* ═══ FIREFLY (restrained — small dots, not blobs) ═══ */
class Firefly {
  constructor(w, groundY) { this.reset(w, groundY); }
  reset(w, groundY) {
    this.x = rand(0, w); this.y = rand(groundY - 220, groundY - 30);
    this.vx = rand(-0.12, 0.12); this.vy = rand(-0.25, -0.04);
    this.life = rand(5, 12); this.maxLife = this.life;
    this.phase = rand(0, TAU); this.size = rand(1, 2.2);
  }
}

/* ═══ MAIN ENGINE ═══ */
export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = get2d(canvas);
    this.raf = null;
    this.time = 0;
    this.scrollX = 0;
    this.w = 0; this.h = 0; this.groundY = 0;

    this.sprites = buildSprites();

    this.guy = {
      x: 0, y: 0, w: FW, h: FH,
      vy: 0, frame: 0, ft: 0,
      bf: 0, bt: 0, dustT: 0,
    };

    this.rock = null;
    this.rockSpeed = 3;
    this.state = 'running'; // running | waiting | jumping | done

    this.fx = new Particles();
    this.fireflies = [];

    this.shakeAmt = 0; this.shakeDur = 0;
    this.flashAlpha = 0; this.flashDur = 0;
    this.glowPhase = 0;
    this.glintPhase = 0;

    // Pre-generate tree positions for each layer
    this.treesL1 = [];
    this.treesL2 = [];
    this.treesL3 = [];
    this.treesL4 = [];
    this.layer0Leaves = [];

    this.resize();
    this._genTrees();
    this._initFireflies();
    this.spawnRock();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.groundY = Math.floor(this.h * 0.75);
    this.guy.x = Math.floor(this.w * 0.16);
    this.guy.y = this.groundY - this.guy.h;
    this._genTrees();
  }

  _genTrees() {
    const w = this.w * 2; // double width for seamless scroll
    // Layer 1 — furthest, tallest, sparse
    this.treesL1 = [];
    for (let i = 0; i < 6; i++) {
      this.treesL1.push({
        x: i * (w / 5.5) + rand(10, 60),
        h: rand(200, 320), w: rand(100, 180),
      });
    }
    // Layer 2
    this.treesL2 = [];
    for (let i = 0; i < 8; i++) {
      this.treesL2.push({
        x: i * (w / 7.5) + rand(10, 50),
        h: rand(140, 240), w: rand(70, 130),
      });
    }
    // Layer 3
    this.treesL3 = [];
    for (let i = 0; i < 10; i++) {
      this.treesL3.push({
        x: i * (w / 9.5) + rand(5, 40),
        h: rand(90, 170), w: rand(50, 100),
      });
    }
    // Layer 4 — closest, small bushes
    this.treesL4 = [];
    for (let i = 0; i < 14; i++) {
      this.treesL4.push({
        x: i * (w / 13) + rand(5, 30),
        h: rand(30, 70), w: rand(30, 60),
      });
    }
    
    // Layer 0 — extreme foreground occluding leaves
    // Reduced to 2 so they only appear occasionally
    this.layer0Leaves = [];
    for (let i = 0; i < 2; i++) {
      this.layer0Leaves.push({
        x: rand(w, w * 3), // Start them off-screen initially
        y: rand(this.h * -0.2, this.h * 1.2),
        s: rand(1, 2.5),
        spd: rand(2.5, 4.0),
        r: rand(0, TAU)
      });
    }
  }

  _initFireflies() {
    this.fireflies = [];
    const n = Math.floor(this.w / 100);
    for (let i = 0; i < n; i++) this.fireflies.push(new Firefly(this.w, this.groundY));
  }

  spawnRock() {
    if (this.state === 'done') return;
    const sz = rand(50, 70); // Increased rock size
    this.rock = { x: this.w + 100, y: this.groundY - sz * 0.55, size: sz, active: true };
    this.state = 'running';
  }

  setRockSpeed(s) { this.rockSpeed = s; }

  triggerJump() {
    if (this.state !== 'waiting') return;
    this.state = 'jumping';
    this.guy.vy = -12;
    this.flashAlpha = 0.15; this.flashDur = 0.06;
    this.glintPhase = 1.0; // Trigger machete glint
    
    // Jump trail ring
    this.fx.emit(new Particle(
      this.guy.x + this.guy.w / 2, this.groundY - 10,
      0, 0, 0.4, 2, 'rgba(100, 230, 180, 0.8)', 0, 'trail', 10
    ));
  }

  setDone() { this.state = 'done'; this.rock = null; }

  _shake(a, d) { this.shakeAmt = a; this.shakeDur = d; }

  _dustBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.fx.emit(new Particle(
        x + rand(-6, 6), y,
        rand(-1.5, 1.5), rand(-2, -0.3),
        rand(0.4, 1), rand(2, 4),
        'rgba(160,140,100,' + rand(0.3, 0.6) + ')', 0.05, 'circle'
      ));
    }
  }

  _boulderShatter(x, y) {
    // Large heavy rocky shards
    for (let i = 0; i < 6; i++) {
      // Create random polygonal shard shape
      const pts = [];
      const numPts = Math.floor(rand(4, 7));
      for (let j=0; j<numPts; j++) {
        const ang = (j/numPts)*TAU;
        pts.push({x: Math.cos(ang)*(0.5+rand(0,0.5)), y: Math.sin(ang)*(0.5+rand(0,0.5)), rim: j<2?'rgba(120, 210, 180, 0.4)':null});
      }
      this.fx.emit(new Particle(
        x + rand(-20, 20), y + rand(-20, 20),
        rand(-4, 0), rand(-9, -3), // Throw left and up
        rand(0.6, 1.2), rand(12, 28),
        '#080c0a', 0.18, 'shard', pts
      ));
    }
    // Small dark debris
    for (let i = 0; i < 15; i++) {
      this.fx.emit(new Particle(
        x + rand(-25, 25), y + rand(-20, 20),
        rand(-5, 2), rand(-8, -1),
        rand(0.4, 0.8), rand(2, 6),
        '#0c1810', 0.15, 'shard'
      ));
    }
    // Deep green energy sparks
    for (let i = 0; i < 12; i++) {
        this.fx.emit(new Particle(
            x + rand(-15, 15), y + rand(-15, 15),
            rand(-4, 4), rand(-7, -2),
            rand(0.2, 0.6), rand(1, 2.5),
            'rgba(80,210,160,' + rand(0.6, 1) + ')', 0.06, 'circle'
        ));
    }
    // Impact ring
    this.fx.emit(new Particle(
      x, y, 0, 0, 0.3, 4, 'rgba(100, 230, 180, 0.6)', 0, 'trail', 20
    ));
  }

  /* ═══ UPDATE ═══ */
  update(dt) {
    this.time += dt;
    this.glowPhase += dt * 3.5;
    const g = this.guy;

    // Scrolling
    if (this.state === 'running') {
      this.scrollX += this.rockSpeed * 1.5 * dt * 60;
      g.ft += dt;
      if (g.ft > 0.075) { g.frame = (g.frame + 1) % 8; g.ft = 0; }
      g.dustT += dt;
      if (g.dustT > 0.2) { g.dustT = 0; this._dustBurst(g.x + g.w * 0.35, this.groundY, 3); }
    } else if (this.state === 'waiting') {
      g.bt += dt;
      if (g.bt > 0.1) { g.bf = (g.bf + 1) % 12; g.bt = 0; }
    }

    // Rock
    if (this.rock && this.rock.active && this.state === 'running') {
      this.rock.x -= this.rockSpeed * dt * 60;
      if (this.rock.x <= g.x + g.w + 26) { this.state = 'waiting'; this.rock.x = g.x + g.w + 26; }
    }

    // Jump
    if (this.state === 'jumping') {
      g.vy += 0.48 * dt * 60;
      g.y += g.vy * dt * 60;
      if (g.vy > 0 && this.rock) { this._boulderShatter(this.rock.x, this.rock.y); this.rock = null; }
      if (g.y >= this.groundY - g.h) {
        g.y = this.groundY - g.h; g.vy = 0;
        this._shake(3, 0.1);
        this._dustBurst(g.x + g.w * 0.5, this.groundY, 8);
        setTimeout(() => this.spawnRock(), 500);
      }
    }

    // Effects timers
    if (this.shakeDur > 0) { this.shakeDur -= dt; if (this.shakeDur <= 0) this.shakeAmt = 0; }
    if (this.flashDur > 0) { this.flashDur -= dt; if (this.flashDur <= 0) this.flashAlpha = 0; }
    if (this.glintPhase > 0) { this.glintPhase -= dt * 3; }

    this.fx.update(dt);
    
    // Layer 0 movement
    if (this.state === 'running') {
      for (const lf of this.layer0Leaves) {
        lf.x -= (this.rockSpeed * lf.spd * 2) * dt * 60;
        if (lf.x < -400) {
            // Respawn very far away so it creates a long delay
            lf.x = this.w + rand(800, 2500); 
            lf.y = rand(this.h * -0.2, this.h * 1.2);
            lf.s = rand(1, 2.5); // Randomize size on respawn
        }
      }
    }

    // Falling leaves (sparse)
    if (Math.random() < 0.008) {
      this.fx.emit(new Particle(
        rand(0, this.w), rand(-10, 30),
        rand(-0.2, 0.2), rand(0.25, 0.5),
        rand(5, 12), rand(2.5, 4.5),
        '#0a1810', 0.002, 'leaf'
      ));
    }

    // Fireflies
    for (const ff of this.fireflies) {
      ff.x += (ff.vx + Math.sin(this.time * 0.3 + ff.phase) * 0.08) * dt * 60;
      ff.y += ff.vy * dt * 60;
      ff.life -= dt;
      if (ff.life <= 0 || ff.y < -20 || ff.x < -30 || ff.x > this.w + 30) {
        ff.reset(this.w, this.groundY);
      }
    }

    // Dynamic thin rain (only visible in lit areas occasionally)
    if (Math.random() < 0.2) {
      // If it spawns near the right side (moon) or in a light pool, trace it
      const spawnX = rand(0, this.w);
      this.fx.emit(new Particle(
          spawnX, rand(-50, 0),
          -1.5, rand(6, 9), // fast down-left
          rand(0.6, 1.2), 0,
          'rgba(200, 240, 220, 0.4)', // silver thread
          0, 'rain'
      ));
    }
  }

  /* ═══ DRAW ═══ */
  draw() {
    const c = this.ctx, w = this.w, h = this.h;
    c.save();

    // Screen shake
    if (this.shakeAmt > 0) {
      c.translate((Math.random() - 0.5) * this.shakeAmt * 2, (Math.random() - 0.5) * this.shakeAmt * 2);
    }

    // ── 1. SKY ──
    this._drawSky(c, w, h);

    // ── 2. MOON ──
    this._drawMoon(c, w);

    // ── 3. GOD RAYS (very subtle) ──
    this._drawGodRays(c, w);

    // ── 4. TREE LAYER 1 (furthest — lightest silhouette) ──
    this._drawTreeLayer(c, w, this.treesL1, 0.05, '#0c1a12', 1);

    // ── 5. TREE LAYER 2 ──
    this._drawTreeLayer(c, w, this.treesL2, 0.15, '#0a1510', 1);

    // ── 6. Subtle mist between layers ──
    this._drawMist(c, w, this.groundY - 60, 0.04);

    // ── 7. TREE LAYER 3 ──
    this._drawTreeLayer(c, w, this.treesL3, 0.35, '#08100c', 0);

    // ── 8. TREE LAYER 4 — near bushes ──
    this._drawTreeLayer(c, w, this.treesL4, 0.6, '#060c08', 0);

    // ── 9. VINES (between mid and near) ──
    this._drawVines(c, w);

    // ── 10. GROUND ──
    this._drawGround(c, w, h);

    // ── 10b. LIGHT POOLS on ground ──
    this._drawLightPools(c, w);

    // ── 11. GRASS SILHOUETTES ──
    this._drawGrass(c, w);

    // ── 12. FIREFLIES ──
    this._drawFireflies(c);

    // ── 13. PARTICLES ──
    this.fx.draw(c);

    // ── 14. BOULDER ──
    if (this.rock && this.rock.active) this._drawBoulder(c);

    // ── 15. COMMANDO ──
    this._drawGuy(c);

    // ── 16. FOREGROUND FOG (very subtle) ──
    this._drawMist(c, w, this.groundY - 15, 0.03);

    // ── 16b. LAYER 0 EXTREME FOREGROUND OCCLUSION ──
    this._drawLayer0Leaves(c);

    // ── 17. POST-PROCESSING ──
    this._postProcess(c, w, h);

    c.restore();
  }

  /* ── SKY: beautiful gradient with depth ── */
  _drawSky(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, this.groundY + 20);
    g.addColorStop(0,    '#020508');
    g.addColorStop(0.15, '#040a10');
    g.addColorStop(0.35, '#081a1c');
    g.addColorStop(0.55, '#0c2a28');
    g.addColorStop(0.75, '#103830');
    g.addColorStop(0.90, '#144838');
    g.addColorStop(1,    '#185840');
    c.fillStyle = g;
    c.fillRect(0, 0, w, this.groundY + 20);

    // Stars (tiny, subtle)
    c.fillStyle = '#c0d0c8';
    for (let i = 0; i < 40; i++) {
      // Deterministic positions based on index
      const sx = (i * 37.7 + 13) % w;
      const sy = (i * 23.3 + 7) % (this.groundY * 0.5);
      const ss = 0.5 + (i % 3) * 0.4;
      const twinkle = 0.3 + 0.7 * Math.sin(this.time * (0.5 + i * 0.1) + i);
      c.globalAlpha = twinkle * 0.6;
      c.beginPath(); c.arc(sx, sy, ss, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  /* ── MOON (bright, with warm halo) ── */
  _drawMoon(c, w) {
    const mx = w * 0.78, my = this.groundY * 0.18, mr = 32;

    // Wide atmospheric halo
    c.globalAlpha = 0.1;
    const g2 = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 8);
    g2.addColorStop(0, 'rgba(140,210,170,0.3)');
    g2.addColorStop(0.2, 'rgba(120,190,150,0.12)');
    g2.addColorStop(0.5, 'rgba(80,150,120,0.04)');
    g2.addColorStop(1, 'transparent');
    c.fillStyle = g2;
    c.fillRect(mx - mr * 8, my - mr * 8, mr * 16, mr * 16);
    c.globalAlpha = 1;

    // Tight inner glow
    c.globalAlpha = 0.2;
    const g = c.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3);
    g.addColorStop(0, 'rgba(180,240,200,0.5)');
    g.addColorStop(0.5, 'rgba(140,200,170,0.15)');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
    c.globalAlpha = 1;

    // Moon disc (visible)
    c.fillStyle = '#d0eee0';
    c.globalAlpha = 0.35;
    c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    // Brighter inner disc
    c.fillStyle = '#e0f8ea';
    c.globalAlpha = 0.2;
    c.beginPath(); c.arc(mx, my, mr * 0.8, 0, TAU); c.fill();
    c.globalAlpha = 1;

    // Craters
    c.fillStyle = '#b0d8c0';
    c.globalAlpha = 0.1;
    c.beginPath(); c.arc(mx - 7, my - 5, 7, 0, TAU); c.fill();
    c.beginPath(); c.arc(mx + 9, my + 7, 5, 0, TAU); c.fill();
    c.beginPath(); c.arc(mx - 3, my + 9, 4, 0, TAU); c.fill();
    c.beginPath(); c.arc(mx + 3, my - 8, 3, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }

  /* ── GOD RAYS (soft light shafts from moon) ── */
  _drawGodRays(c, w) {
    const mx = w * 0.78, my = this.groundY * 0.18;
    for (let i = 0; i < 4; i++) {
      const rx = mx - 80 + i * 55;
      const rw = 20 + i * 8;
      const alpha = 0.025 + Math.sin(this.time * 0.2 + i * 1.3) * 0.01;
      c.globalAlpha = alpha;
      c.save();
      c.translate(rx, my);
      c.rotate(-0.05 + i * 0.04);
      const g = c.createLinearGradient(0, 0, 0, this.groundY * 0.75);
      g.addColorStop(0, 'rgba(160,230,190,0.2)');
      g.addColorStop(0.3, 'rgba(130,200,160,0.08)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-rw / 2, 0); c.lineTo(rw / 2, 0);
      c.lineTo(rw * 2, this.groundY * 0.75);
      c.lineTo(-rw * 2, this.groundY * 0.75);
      c.closePath(); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  /* ── TREE LAYERS ── */
  _drawTreeLayer(c, w, trees, speed, color, detail) {
    const totalW = w * 2;
    const off = (this.scrollX * speed) % totalW;

    for (let pass = -1; pass <= 1; pass++) {
      for (const t of trees) {
        const tx = t.x - off + pass * totalW;
        if (tx > -t.w && tx < w + t.w) {
          drawTreeSilhouette(c, tx, this.groundY, t.h, t.w, detail, color);
        }
      }
    }
  }

  /* ── VINES ── */
  _drawVines(c, w) {
    const off = (this.scrollX * 0.3) % w;
    c.strokeStyle = '#0a140e';
    c.lineWidth = 2;

    for (let i = 0; i < 6; i++) {
      const vx = ((i * (w / 5.5) + 40 - off) % w + w) % w;
      const vLen = 50 + Math.sin(i * 2.3) * 25;
      const sway = Math.sin(this.time * 0.4 + i) * 5;

      c.beginPath();
      c.moveTo(vx, 10 + i * 6);
      c.bezierCurveTo(
        vx + sway * 0.3, 10 + i * 6 + vLen * 0.3,
        vx + sway * 0.7, 10 + i * 6 + vLen * 0.6,
        vx + sway * 0.5, 10 + i * 6 + vLen
      );
      c.stroke();

      // Small leaf at tip
      c.fillStyle = '#0c1810';
      c.beginPath();
      c.ellipse(vx + sway * 0.5, 10 + i * 6 + vLen + 4, 3, 6, sway * 0.03, 0, TAU);
      c.fill();
    }
  }

  /* ── MIST ── */
  _drawMist(c, w, y, alpha) {
    c.globalAlpha = alpha + Math.sin(this.time * 0.15) * 0.01;
    const g = c.createLinearGradient(0, y - 25, 0, y + 35);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.4, 'rgba(20,60,45,0.3)');
    g.addColorStop(0.7, 'rgba(15,50,35,0.15)');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(0, y - 25, w, 60);
    c.globalAlpha = 1;
  }

  /* ── GROUND ── */
  _drawGround(c, w, h) {
    // Gradient ground
    const g = c.createLinearGradient(0, this.groundY, 0, h);
    g.addColorStop(0, '#0a0e08');
    g.addColorStop(0.2, '#080c06');
    g.addColorStop(0.5, '#060a04');
    g.addColorStop(1, '#040602');
    c.fillStyle = g;
    c.fillRect(0, this.groundY, w, h - this.groundY);

    // Ground edge detail (jagged top)
    c.fillStyle = '#0c1008';
    c.beginPath(); c.moveTo(0, this.groundY);
    for (let x = 0; x <= w; x += 3) {
      const j = Math.sin(x * 0.2 + this.scrollX * 0.03) * 2 + Math.sin(x * 0.08) * 1.5;
      c.lineTo(x, this.groundY + j);
    }
    c.lineTo(w, this.groundY + 10); c.lineTo(0, this.groundY + 10);
    c.closePath(); c.fill();

    // Root silhouettes
    c.fillStyle = '#0a0e08';
    const rOff = (this.scrollX * 0.6) % w;
    for (let i = 0; i < 8; i++) {
      const rx = ((i * (w / 7) + 15 - rOff) % w + w) % w;
      const rh = 4 + Math.sin(i * 2.7) * 2;
      c.beginPath();
      c.moveTo(rx, this.groundY + 2);
      c.quadraticCurveTo(rx + 12, this.groundY - rh, rx + 28, this.groundY + 1);
      c.lineTo(rx + 28, this.groundY + 4); c.lineTo(rx, this.groundY + 4);
      c.closePath(); c.fill();
    }
  }

  /* ── LIGHT POOLS ── */
  _drawLightPools(c, w) {
    const off = (this.scrollX * 0.6) % w;
    for (let i = 0; i < 5; i++) {
      const lx = ((i * (w / 4.5) + 80 - off) % w + w) % w;
      const lw = 40 + Math.sin(i * 2.1) * 15;
      const a = 0.04 + Math.sin(this.time * 0.3 + i) * 0.015;
      
      c.globalAlpha = a;
      const g = c.createRadialGradient(lx, this.groundY, 0, lx, this.groundY, lw);
      g.addColorStop(0, 'rgba(160,230,190,0.4)');
      g.addColorStop(0.5, 'rgba(120,200,160,0.15)');
      g.addColorStop(1, 'transparent');
      
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(lx, this.groundY + 2, lw, lw * 0.2, 0, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  /* ── GRASS SILHOUETTES ── */
  _drawGrass(c, w) {
    const off = (this.scrollX * 0.6) % 5;
    const sway = Math.sin(this.time * 1.0) * 2;
    c.strokeStyle = '#0c1208';
    c.lineWidth = 1.5;

    for (let x = -off; x < w; x += 5) {
      const gh = 7 + Math.sin(x * 0.35) * 4;
      const ts = sway + Math.sin(x * 0.5 + this.time * 0.8) * 1.5;
      c.beginPath();
      c.moveTo(x, this.groundY);
      c.quadraticCurveTo(x + ts * 0.5, this.groundY - gh * 0.6, x + ts, this.groundY - gh);
      c.stroke();
    }
  }

  /* ── FIREFLIES (restrained) ── */
  _drawFireflies(c) {
    for (const ff of this.fireflies) {
      const a = clamp(ff.life / ff.maxLife, 0, 1);
      const flk = 0.3 + 0.7 * Math.sin(this.time * 3 + ff.phase);
      const fa = a * flk;

      // Tiny glow halo
      c.globalAlpha = fa * 0.12;
      const gr = ff.size * 6;
      const g = c.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, gr);
      g.addColorStop(0, 'rgba(180,230,100,0.4)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.fillRect(ff.x - gr, ff.y - gr, gr * 2, gr * 2);

      // Tiny bright core
      c.globalAlpha = fa * 0.7;
      c.fillStyle = '#d0e860';
      c.beginPath(); c.arc(ff.x, ff.y, ff.size * 0.6, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  /* ── BOULDER (moonlit) ── */
  _drawBoulder(c) {
    const r = this.rock, s = r.size;
    const isGlowing = this.state === 'waiting';

    c.save(); c.translate(r.x, r.y);

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(0, s * 0.45, s * 0.55, s * 0.1, 0, 0, TAU); c.fill();

    // Glow aura (subtle, not a blob)
    if (isGlowing) {
      const ga = 0.08 + Math.sin(this.glowPhase) * 0.05;
      c.globalAlpha = ga;
      c.shadowColor = '#2ecc71';
      c.shadowBlur = 20;
      // Draw the rock shape for shadow only
      c.fillStyle = 'transparent';
      c.beginPath();
      c.moveTo(-s * 0.5, s * 0.08); c.lineTo(-s * 0.35, -s * 0.38);
      c.lineTo(-s * 0.05, -s * 0.48); c.lineTo(s * 0.22, -s * 0.45);
      c.lineTo(s * 0.48, -s * 0.18); c.lineTo(s * 0.42, s * 0.32);
      c.lineTo(s * 0.08, s * 0.38); c.lineTo(-s * 0.28, s * 0.28);
      c.closePath();
      // Use a visible fill for shadowBlur to work
      c.fillStyle = '#2ecc71';
      c.fill();
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }

    // Rock body — dark base
    c.fillStyle = '#080c0a';
    c.beginPath();
    c.moveTo(-s * 0.5, s * 0.08); c.lineTo(-s * 0.35, -s * 0.38);
    c.lineTo(-s * 0.05, -s * 0.48); c.lineTo(s * 0.22, -s * 0.45);
    c.lineTo(s * 0.48, -s * 0.18); c.lineTo(s * 0.42, s * 0.32);
    c.lineTo(s * 0.08, s * 0.38); c.lineTo(-s * 0.28, s * 0.28);
    c.closePath(); c.fill();

    // Moonlit faces (right and top-right)
    c.fillStyle = '#1c2e24';
    c.beginPath();
    c.moveTo(-s * 0.05, -s * 0.48); c.lineTo(s * 0.22, -s * 0.45);
    c.lineTo(s * 0.48, -s * 0.18); c.lineTo(s * 0.1, -s * 0.12);
    c.closePath(); c.fill();
    
    // Front lit face
    c.fillStyle = '#121e16';
    c.beginPath();
    c.moveTo(s * 0.48, -s * 0.18); c.lineTo(s * 0.42, s * 0.32);
    c.lineTo(s * 0.08, s * 0.38); c.lineTo(s * 0.1, -s * 0.12);
    c.closePath(); c.fill();

    // Cracks
    c.strokeStyle = '#040806';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-s * 0.15, -s * 0.2); c.lineTo(s * 0.05, s * 0.05); c.stroke();
    c.beginPath(); c.moveTo(s * 0.05, s * 0.05); c.lineTo(s * 0.22, -s * 0.05); c.stroke();

    // Moss patches (lit)
    c.fillStyle = '#1e3a24';
    c.beginPath(); c.arc(s * 0.2, -s * 0.1, s * 0.15, 0, TAU); c.fill();
    c.fillStyle = '#122416';
    c.beginPath(); c.arc(-s * 0.15, s * 0.1, s * 0.12, 0, TAU); c.fill();

    // Glowing rim when waiting
    if (isGlowing) {
      const gA = 0.3 + Math.sin(this.glowPhase) * 0.2;
      c.strokeStyle = '#2ecc71';
      c.lineWidth = 1.5;
      c.globalAlpha = gA;
      c.beginPath();
      c.moveTo(-s * 0.5, s * 0.08); c.lineTo(-s * 0.35, -s * 0.38);
      c.lineTo(-s * 0.05, -s * 0.48); c.lineTo(s * 0.22, -s * 0.45);
      c.lineTo(s * 0.48, -s * 0.18); c.lineTo(s * 0.42, s * 0.32);
      c.lineTo(s * 0.08, s * 0.38); c.lineTo(-s * 0.28, s * 0.28);
      c.closePath(); c.stroke();
      c.globalAlpha = 1;
    }
    
    // Moonlit rim (on right edge)
    c.strokeStyle = 'rgba(120, 210, 180, 0.4)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(s * 0.22, -s * 0.45);
    c.lineTo(s * 0.48, -s * 0.18);
    c.lineTo(s * 0.42, s * 0.32);
    c.stroke();

    c.restore();
  }

  /* ── COMMANDO ── */
  _drawGuy(c) {
    const g = this.guy;
    let sp;
    if (this.state === 'jumping') sp = this.sprites.jump;
    else if (this.state === 'waiting') sp = this.sprites.idle[g.bf % this.sprites.idle.length];
    else sp = this.sprites.run[g.frame % this.sprites.run.length];
    if (!sp) return;

    // Ground shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(g.x + g.w / 2, this.groundY + 3, 22, 5, 0, 0, TAU);
    c.fill();

    c.drawImage(sp, g.x, g.y, g.w, g.h);
    
    // Machete glint
    if (this.glintPhase > 0) {
        c.save();
        c.globalCompositeOperation = 'screen';
        c.globalAlpha = this.glintPhase;
        const glintX = g.x + g.w/2 - 10;
        const glintY = g.y + g.h/2 - 10;
        const gg = c.createRadialGradient(glintX, glintY, 0, glintX, glintY, 20);
        gg.addColorStop(0, 'rgba(255,255,255,1)');
        gg.addColorStop(0.2, 'rgba(120,230,180,0.8)');
        gg.addColorStop(1, 'transparent');
        c.fillStyle = gg;
        c.beginPath(); c.arc(glintX, glintY, 20, 0, TAU); c.fill();
        c.lineWidth = 1.5; c.strokeStyle= 'rgba(255,255,255,0.8)';
        c.beginPath(); c.moveTo(glintX-15, glintY-15); c.lineTo(glintX+15, glintY+15); c.stroke();
        c.beginPath(); c.moveTo(glintX-15, glintY+15); c.lineTo(glintX+15, glintY-15); c.stroke();
        c.restore();
    }
  }
  
  /* ── LAYER 0 EXTREME FOREGROUND ── */
  _drawLayer0Leaves(c) {
    c.save();
    c.fillStyle = '#020302'; // Pure darkness
    // Standard blur can kill perf, so we just use a slight shadow blur + alpha trick
    c.shadowColor = '#020302';
    c.shadowBlur = 10;
    
    for (const lf of this.layer0Leaves) {
      c.save();
      c.translate(lf.x, lf.y);
      c.rotate(lf.r + Math.sin(this.time * lf.spd * 0.2) * 0.1);
      c.scale(lf.s, lf.s);
      
      // Draw big out of focus fern/palm leaf silhouette
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(40, -30, 80, -30, 120, 0);
      c.bezierCurveTo(80, 20, 40, 20, 0, 0);
      c.fill();
      
      c.beginPath();
      c.moveTo(20, -10); c.bezierCurveTo(40,-50, 60,-50, 80,-20); c.fill();
      c.beginPath();
      c.moveTo(30, 5); c.bezierCurveTo(50, 40, 70, 40, 90, 15); c.fill();
      
      c.restore();
    }
    c.restore();
  }

  /* ── POST-PROCESSING (restrained) ── */
  _postProcess(c, w, h) {
    // Vignette
    const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);

    // Very subtle film grain
    c.globalAlpha = 0.02;
    for (let i = 0; i < 60; i++) {
      const gv = Math.random() * 150 + 50;
      c.fillStyle = `rgb(${gv},${gv},${gv})`;
      c.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    c.globalAlpha = 1;

    // Flash
    if (this.flashAlpha > 0) {
      c.globalAlpha = this.flashAlpha;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;
    }
  }

  /* ═══ LOOP ═══ */
  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }
}
