/* ============================================================
   FABLEDEVIL — a clean little rage platformer ;)
   Canvas platformer. Every trap is perfectly planned.
   ============================================================ */
"use strict";

const W = 960, H = 540;
let cv = null;
let ctx = null;
const ETHIOPIAN_BACKGROUND_SOURCES = [
  "/backgrounds/axum-stela.png",
  "/backgrounds/lalibela-church.png",
  "/backgrounds/gojo-house.png",
  "/backgrounds/gondar-castle.png",
  "/backgrounds/harar-gate.png",
  "/backgrounds/simien-mountains.png",
  "/backgrounds/lake-tana-monastery.png",
  "/backgrounds/adwa-monument.png",
];
const ETHIOPIAN_LEVEL_BACKGROUNDS = ETHIOPIAN_BACKGROUND_SOURCES.map((src) => {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return image;
});

function ensureCanvas() {
  if (!cv) cv = document.getElementById("game");
  if (cv && !ctx) ctx = cv.getContext("2d");
  return ctx;
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const aabb = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const R = (x, y, w, h) => ({ x, y, w, h });
const FONT = "'Outfit', system-ui, -apple-system, sans-serif";

// Ge'ez Numeral Converter
function toGeezNumeral(n) {
  if (n <= 0) return "0";
  const ones = ["", "\u1369", "\u136A", "\u136B", "\u136C", "\u136D", "\u136E", "\u136F", "\u1370", "\u1371"];
  const tens = ["", "\u1372", "\u1373", "\u1374", "\u1375", "\u1376", "\u1377", "\u1378", "\u1379", "\u137A"];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + ones[o];
  }
  if (n < 10000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const hStr = (h === 1 ? "" : toGeezNumeral(h)) + "\u137B";
    const rStr = r > 0 ? toGeezNumeral(r) : "";
    return hStr + rStr;
  }
  return n.toString();
}

let showDeathCounter = true;
try {
  const saved = localStorage.getItem("fd_show_counter");
  if (saved !== null) showDeathCounter = saved === "true";
} catch {}

function toggleDeathCounter() {
  showDeathCounter = !showDeathCounter;
  try { localStorage.setItem("fd_show_counter", showDeathCounter ? "true" : "false"); } catch {}
  updateCounterIcon();
}

const COUNTER_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><text x="12" y="16" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">፩</text></svg>';

function updateCounterIcon() {
  const el = document.getElementById("ic-counter");
  const bt = document.getElementById("btn-counter");
  if (el) el.innerHTML = COUNTER_ICON;
  if (bt) bt.classList.toggle("active", showDeathCounter);
}

// ---------------------------------------------------------------- theme
const PALETTES = {
  dark: {
    paper: "#F4E7C5", paper2: "#DEC68C", ink: "#102F2A",
    grid: "rgba(0,0,0,0)", vignette: "rgba(0,0,0,0)",
    danger: "#D64335", accent: "#F4C542", door: "#F7F2E7",
    blood: "#B8322A", bloodDark: "#711E1A", dust: "#D6BC82",
    metal: "#173D37", crack: "rgba(7,31,28,0.34)", wipe: "#071F1C",
    shadow: "rgba(0,0,0,0.22)", groundTop: "#C96B45", ground: "#7A382B",
    groundEdge: "#F0A052", groundPattern: "#4B211C",
  },
  light: {
    paper: "#FFF9E9", paper2: "#EADDBE", ink: "#173D37",
    grid: "rgba(0,0,0,0)", vignette: "rgba(0,0,0,0)",
    danger: "#C9342C", accent: "#087F4A", door: "#FFFFFF",
    blood: "#B8322A", bloodDark: "#711E1A", dust: "#C7A96C",
    metal: "#315E55", crack: "rgba(23,61,55,0.28)", wipe: "#F4E8CB",
    shadow: "rgba(42,31,19,0.16)", groundTop: "#B95B3F", ground: "#78362B",
    groundEdge: "#E8954E", groundPattern: "#4B211C",
  },
};
let theme = PALETTES.dark;
let characterGender = "male"; // "male" or "female"

function applyCharacterGender(gender, save = true) {
  characterGender = gender;
  if (save) { try { localStorage.setItem("fd_char", gender); } catch {} }
  const tc = document.getElementById("ic-char");
  if (tc) tc.innerHTML = gender === "male" ? '🧑🏽' : '👩🏽';
  const ptc = document.getElementById("pic-char");
  if (ptc) ptc.innerHTML = gender === "male" ? '🧑🏽 Character' : '👩🏽 Character';
}

function toggleCharacter() { applyCharacterGender(characterGender === "male" ? "female" : "male"); }

function applyTheme(mode, save = true) {
  theme = PALETTES[mode] || PALETTES.dark;
  document.documentElement.setAttribute("data-theme", mode);
  if (save) { try { localStorage.setItem("fd_theme", mode); } catch {} }
  const t = document.getElementById("ic-theme");
  if (t) t.innerHTML = mode === "dark" ? SUN_PATH : MOON_PATH;
}
function currentMode() { return document.documentElement.getAttribute("data-theme") || "dark"; }
function toggleTheme() { applyTheme(currentMode() === "dark" ? "light" : "dark"); }

// ---------------------------------------------------------------- audio
const AudioFX = (() => {
  let ac = null, muted = false;
  const ensure = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  };
  function tone(freq, dur, type = "square", vol = 0.12, slide = 0) {
    if (muted) return;
    const a = ensure();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function noise(dur, vol = 0.25, lp = 900) {
    if (muted) return;
    const a = ensure();
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = lp;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  return {
    init: ensure,
    jump: () => tone(330, 0.12, "square", 0.08, 260),
    land: () => noise(0.06, 0.10, 500),
    death: () => { noise(0.25, 0.3, 700); tone(160, 0.3, "sawtooth", 0.14, -110); },
    pop: () => tone(700, 0.07, "square", 0.09, 300),
    rumble: () => noise(0.35, 0.22, 220),
    slam: () => { noise(0.18, 0.3, 350); tone(90, 0.18, "sine", 0.2, -40); },
    poof: () => tone(500, 0.16, "triangle", 0.1, -320),
    bounce: () => tone(300, 0.18, "sine", 0.12, 520),
    zap: () => { tone(1200, 0.12, "sawtooth", 0.07, -700); noise(0.07, 0.1, 1600); },
    beep: () => tone(900, 0.04, "square", 0.04),
    win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "square", 0.09), i * 90)); },
    laugh: () => { [300, 260, 300, 260, 220].forEach((f, i) => setTimeout(() => tone(f, 0.09, "sawtooth", 0.06), i * 110)); },
    toggleMute: () => { muted = !muted; return muted; },
    isMuted: () => muted,
  };
})();

// ---------------------------------------------------------------- input
const keys = {};
let jumpBuffered = 0;
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  if (!keys[e.code]) {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) jumpBuffered = 0.12;
  }
  keys[e.code] = true;
  if ((e.code === "Escape" || e.code === "KeyP") && (Game.state === "play" || Game.state === "paused")) Game.togglePause();
  if (e.code === "KeyR" && Game.state === "play") Game.restartLevel(true);
  if (e.code === "KeyM") setMuteIcon(AudioFX.toggleMute());
  if (e.code === "KeyT") toggleTheme();
  if (e.code === "KeyF") toggleFullscreen();
  AudioFX.init();
});
addEventListener("keyup", (e) => (keys[e.code] = false));

// touch input (mobile)
const touch = { left: false, right: false, jump: false };
const IS_TOUCH = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

const heldLeft = () => keys["ArrowLeft"] || keys["KeyA"] || touch.left;
const heldRight = () => keys["ArrowRight"] || keys["KeyD"] || touch.right;
const heldJump = () => keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || touch.jump;

// ---------------------------------------------------------------- particles
const particles = [];
function spawnBlood(x, y) {
  for (let i = 0; i < 26; i++) {
    const a = rand(-Math.PI, 0), s = rand(120, 420);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: rand(2.5, 6), life: rand(0.5, 1.1), t: 0,
      color: Math.random() < 0.8 ? theme.blood : theme.bloodDark, grav: true,
    });
  }
}
function spawnSpicyParticle(x, y) {
  for (let i = 0; i < 4; i++) {
    const a = rand(-Math.PI, Math.PI), s = rand(20, 80);
    particles.push({
      x: x + rand(-8, 8), y: y + rand(-8, 8),
      vx: Math.cos(a) * s - 120, vy: Math.sin(a) * s,
      r: rand(3, 5), life: rand(0.3, 0.6), t: 0,
      color: Math.random() < 0.65 ? "#FF3D00" : "#FFC107", grav: false,
    });
  }
}
function spawnDust(x, y, n = 6, color = null) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x + rand(-10, 10), y, vx: rand(-60, 60), vy: rand(-90, -20),
      r: rand(2, 4.5), life: rand(0.25, 0.5), t: 0, color: color || theme.dust, grav: false,
    });
  }
}
function spawnPoof(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), s = rand(40, 160);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: rand(3, 7), life: rand(0.3, 0.55), t: 0, color: theme.accent, grav: false,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t > p.life) { particles.splice(i, 1); continue; }
    if (p.grav) p.vy += 1300 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- blood stains (persist until respawn)
let stains = [];
function addStain(x, y) {
  for (let i = 0; i < 8; i++) stains.push({ x: x + rand(-26, 26), y: y + rand(-4, 4), r: rand(3, 9) });
}

// ================================================================ TRAPS
// Every trap implements: update(dt,g), solids() -> [rects], kills() -> [rects], draw()

function drawEarthRect(rect) {
  const topH = Math.min(10, rect.h);

  ctx.fillStyle = theme.groundTop;
  ctx.fillRect(rect.x, rect.y, rect.w, topH);

  if (rect.h > topH) {
    ctx.fillStyle = theme.ground;
    ctx.fillRect(rect.x, rect.y + topH, rect.w, rect.h - topH);
  }

  ctx.fillStyle = theme.groundEdge;
  ctx.fillRect(rect.x, rect.y, rect.w, 2);

  if (rect.h >= 24 && rect.w >= 12) {
    ctx.fillStyle = theme.groundPattern;
    const patternY = rect.y + topH;
    const triW = 12;
    const numTri = Math.floor(rect.w / triW);
    for (let i = 0; i < numTri; i++) {
      ctx.beginPath();
      ctx.moveTo(rect.x + i * triW, patternY);
      ctx.lineTo(rect.x + i * triW + triW / 2, patternY + 5);
      ctx.lineTo(rect.x + (i + 1) * triW, patternY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

class CollapseFloor {
  constructor(rect, trigger, opts = {}) {
    this.rect = { ...rect };
    this.trigger = trigger;
    this.shakeTime = opts.shakeTime ?? 0.18;
    this.delay = opts.delay ?? 0;
    this.reset();
  }
  reset() { this.state = "idle"; this.t = 0; this.dy = 0; this.vy = 0; }
  update(dt, g) {
    if (this.state === "idle" && aabb(g.player, this.trigger)) {
      this.state = "wait"; this.t = 0;
    } else if (this.state === "wait") {
      this.t += dt;
      if (this.t >= this.delay) { this.state = "shake"; this.t = 0; AudioFX.rumble(); g.shake(4, 0.18); }
    } else if (this.state === "shake") {
      this.t += dt;
      if (this.t >= this.shakeTime) { this.state = "fall"; AudioFX.pop(); }
    } else if (this.state === "fall") {
      this.vy += 2400 * dt;
      this.dy += this.vy * dt;
    }
  }
  solids() { return this.state === "fall" ? [] : [this.rect]; }
  kills() { return []; }
  draw() {
    if (this.dy > H) return;
    const r = this.rect;
    let ox = 0;
    if (this.state === "shake") ox = rand(-2.5, 2.5);
    if (this.state === "fall") {
      const n = Math.max(2, Math.floor(r.w / 46));
      const cw = r.w / n;
      for (let i = 0; i < n; i++) {
        const wob = Math.sin(i * 7.3) * this.dy * 0.18;
        drawEarthRect(R(r.x + i * cw + 1, r.y + this.dy + wob, cw - 2, r.h));
      }
    } else {
      drawEarthRect(R(r.x + ox, r.y, r.w, r.h));
    }
  }
}

function drawSpear(ctx, cx, cy, dir, h, sw) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(h) || !isFinite(sw)) return;
  const sign = dir === "up" ? -1 : 1;

  ctx.save();

  if (h < 3) {
    ctx.restore();
    return;
  }

  // Calculate relative sizes matching traditional spear proportions
  const bladeH = h * 0.48;
  const socketH = h * 0.10;
  const ropeH = h * 0.14;

  const Y_tip = cy + sign * h;
  const Y_base = Y_tip - sign * bladeH;
  const Y_socket_bottom = Y_base - sign * socketH;
  const Y_rope_bottom = Y_socket_bottom - sign * ropeH;

  const shaftW = Math.max(4.2, sw * 0.20);
  const neckW = Math.max(2.5, sw * 0.15);
  const midW = Math.max(7.2, sw * 0.42);
  const Y_mid = Y_base + sign * (bladeH * 0.28);

  // 2. Shaft (Wood)
  const shaftGrad = ctx.createLinearGradient(cx - shaftW / 2, 0, cx + shaftW / 2, 0);
  shaftGrad.addColorStop(0, "#4a2a1b");
  shaftGrad.addColorStop(0.3, "#824b2f");
  shaftGrad.addColorStop(0.7, "#653a23");
  shaftGrad.addColorStop(1.0, "#31180c");

  ctx.fillStyle = shaftGrad;
  const shaftTop = Math.min(Y_rope_bottom, cy);
  ctx.fillRect(cx - shaftW / 2, shaftTop, shaftW, Math.abs(cy - Y_rope_bottom));

  // 3. Twine/Rope Bindings
  const numWraps = 4;
  const wrapHeight = (Y_socket_bottom - Y_rope_bottom) / numWraps;
  for (let j = 0; j < numWraps; j++) {
    const wTop = Y_rope_bottom + j * wrapHeight;
    const ry = Math.min(wTop, wTop + wrapHeight);
    const rh = Math.abs(wrapHeight);

    ctx.fillStyle = j % 2 === 0 ? "#d4b281" : "#b08e5e";
    const rx = cx - (shaftW / 2 + 1.5);
    const rw = shaftW + 3;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // 4. Socket / Collar
  ctx.fillStyle = "#8a95a5";
  const socketTop = Math.min(Y_base, Y_socket_bottom);
  ctx.fillRect(cx - shaftW / 2 - 0.5, socketTop, shaftW + 1, Math.abs(socketH));

  // 5. Spearhead Blade (Forged Steel with center ridge)
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(cx, Y_base);
  ctx.lineTo(cx - neckW, Y_base);
  ctx.lineTo(cx - midW, Y_mid);
  ctx.lineTo(cx, Y_tip);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(cx, Y_base);
  ctx.lineTo(cx + neckW, Y_base);
  ctx.lineTo(cx + midW, Y_mid);
  ctx.lineTo(cx, Y_tip);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, Y_base);
  ctx.lineTo(cx - neckW, Y_base);
  ctx.lineTo(cx - midW, Y_mid);
  ctx.lineTo(cx, Y_tip);
  ctx.lineTo(cx + midW, Y_mid);
  ctx.lineTo(cx + neckW, Y_base);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, Y_base);
  ctx.lineTo(cx, Y_tip);
  ctx.stroke();

  ctx.restore();
}

// Draw Acacia Thorn Stalk (multi-branching wooden stalk with sharp side thorns)
function drawThornStalk(ctx, cx, cy, dir, h, sw) {
  const sign = dir === "up" ? -1 : 1;
  if (h < 2) return;

  ctx.save();

  const barkLight = "#7d5438";
  const barkDark = "#40291a";
  const thornColor = "#d6bd85";
  const thornDark = "#8a7042";
  const moundColor = "#8e3f2b";

  // 1. Soil Base Mound
  const growth = Math.min(1, h / 16);
  ctx.fillStyle = moundColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, sw * 0.48 * growth, 4 * growth, 0, 0, Math.PI * 2);
  ctx.fill();

  // Low bushy Acacia thorn stumps
  ctx.fillStyle = barkDark;
  ctx.beginPath();
  ctx.arc(cx - 8 * growth, cy - 2 * growth, 4 * growth, 0, Math.PI * 2);
  ctx.arc(cx + 8 * growth, cy - 2 * growth, 4 * growth, 0, Math.PI * 2);
  ctx.fill();

  // 2. Multi-Branching Acacia Stalk
  const tipY = cy + sign * h;
  const baseW = Math.max(7, sw * 0.38);

  ctx.fillStyle = barkLight;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, cy);
  ctx.lineTo(cx - baseW * 0.2, cy + sign * (h * 0.5));
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + baseW * 0.1, cy + sign * (h * 0.5));
  ctx.lineTo(cx + baseW / 2, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = barkDark;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + baseW * 0.1, cy + sign * (h * 0.5));
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + baseW / 2, cy);
  ctx.closePath();
  ctx.fill();

  if (h > 12) {
    ctx.fillStyle = barkLight;
    ctx.beginPath();
    ctx.moveTo(cx - baseW * 0.2, cy + sign * (h * 0.35));
    ctx.lineTo(cx - sw * 0.35, cy + sign * (h * 0.7));
    ctx.lineTo(cx - sw * 0.25, cy + sign * (h * 0.72));
    ctx.lineTo(cx - baseW * 0.05, cy + sign * (h * 0.42));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = barkDark;
    ctx.beginPath();
    ctx.moveTo(cx + baseW * 0.2, cy + sign * (h * 0.45));
    ctx.lineTo(cx + sw * 0.38, cy + sign * (h * 0.8));
    ctx.lineTo(cx + sw * 0.28, cy + sign * (h * 0.82));
    ctx.lineTo(cx + baseW * 0.05, cy + sign * (h * 0.52));
    ctx.closePath();
    ctx.fill();
  }

  // 3. Sharp Triangular Acacia Thorns
  const thorns = [
    { relY: 0.2, side: -1, len: Math.min(10, sw * 0.35) },
    { relY: 0.38, side: 1,  len: Math.min(11, sw * 0.38) },
    { relY: 0.55, side: -1, len: Math.min(12, sw * 0.42) },
    { relY: 0.7,  side: 1,  len: Math.min(10, sw * 0.35) },
    { relY: 0.85, side: -1, len: Math.min(8,  sw * 0.28) },
  ];

  for (const t of thorns) {
    const thornDist = h * t.relY;
    if (thornDist > h - 2) continue;

    const ty = cy + sign * thornDist;
    const sideSign = t.side;

    ctx.fillStyle = thornColor;
    ctx.beginPath();
    ctx.moveTo(cx + sideSign * 2, ty - sign * 3);
    ctx.lineTo(cx + sideSign * (t.len + 3), ty + sign * 2);
    ctx.lineTo(cx + sideSign * 2, ty + sign * 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = thornDark;
    ctx.beginPath();
    ctx.moveTo(cx + sideSign * 2, ty);
    ctx.lineTo(cx + sideSign * (t.len + 3), ty + sign * 2);
    ctx.lineTo(cx + sideSign * 2, ty + sign * 3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#2e1a0f";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, cy);
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + baseW / 2, cy);
  ctx.stroke();

  ctx.restore();
}

// Draw Coffee Brazier Trap (Clay Maneshkeshka fire bowl on 3 legs)
function drawCoffeeBrazier(ctx, cx, cy, w = 50, flameScale = 0.25, isWarning = false) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(w) || !isFinite(flameScale)) return;
  ctx.save();
  const potW = Math.max(38, w);
  const potH = 20;
  const potY = cy - potH - 6; // sitting on 3 legs above ground level

  // 1. Clay Brazier Legs (3 legs)
  ctx.fillStyle = "#3D2215";
  ctx.fillRect(cx - potW * 0.35, cy - 8, 5, 8);
  ctx.fillRect(cx - 2.5, cy - 7, 5, 7);
  ctx.fillRect(cx + potW * 0.35 - 5, cy - 8, 5, 8);

  // 2. Clay Fire Bowl (Maneshkeshka)
  ctx.fillStyle = "#5C331D";
  ctx.beginPath();
  ctx.moveTo(cx - potW / 2, potY);
  ctx.lineTo(cx + potW / 2, potY);
  ctx.lineTo(cx + potW * 0.38, potY + potH);
  ctx.lineTo(cx - potW * 0.38, potY + potH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#2E160A";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Decorative clay bowl rim highlight
  ctx.fillStyle = "#7A4528";
  ctx.fillRect(cx - potW / 2 - 3, potY, potW + 6, 4);
  ctx.strokeRect(cx - potW / 2 - 3, potY, potW + 6, 4);

  // Woven Ethiopian Tricolor band on clay bowl
  const stripeH = 2;
  ctx.fillStyle = "#009A44"; ctx.fillRect(cx - potW * 0.4, potY + 8, potW * 0.8, stripeH);
  ctx.fillStyle = "#FED100"; ctx.fillRect(cx - potW * 0.4, potY + 8 + stripeH, potW * 0.8, stripeH);
  ctx.fillStyle = "#E10600"; ctx.fillRect(cx - potW * 0.4, potY + 8 + stripeH * 2, potW * 0.8, stripeH);

  // 3. Hot Coals & Charcoal embers inside bowl
  ctx.fillStyle = "#1E1008";
  ctx.fillRect(cx - potW * 0.42, potY + 2, potW * 0.84, 8);

  const time = performance.now() / 1000;
  if (flameScale > 0.05 || isWarning) {
    // Glowing orange/red coals inside bowl
    ctx.fillStyle = `rgba(255, 80, 15, ${0.6 + 0.4 * Math.sin(time * 10)})`;
    for (let i = 0; i < 5; i++) {
      const rx = cx - potW * 0.35 + i * (potW * 0.7 / 4);
      ctx.beginPath();
      ctx.arc(rx, potY + 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Roaring Fire Flames blasting UP out of the Coffee Brazier Bowl!
  if (flameScale > 0.1) {
    const maxFlameH = 55;
    const curH = maxFlameH * flameScale;
    const flicker = Math.sin(time * 16) * 4 + Math.cos(time * 24) * 3;
    const fh = curH + flicker;

    // Outer Red Flame
    ctx.fillStyle = "#E84E1B";
    ctx.beginPath();
    ctx.moveTo(cx - potW * 0.4, potY + 3);
    ctx.quadraticCurveTo(cx - potW * 0.25, potY - fh * 0.4, cx - potW * 0.1, potY - fh * 0.85);
    ctx.quadraticCurveTo(cx, potY - fh, cx + potW * 0.1, potY - fh * 0.75);
    ctx.quadraticCurveTo(cx + potW * 0.25, potY - fh * 0.35, cx + potW * 0.4, potY + 3);
    ctx.closePath();
    ctx.fill();

    // Middle Orange Flame
    ctx.fillStyle = "#F5902B";
    ctx.beginPath();
    ctx.moveTo(cx - potW * 0.25, potY + 2);
    ctx.quadraticCurveTo(cx - potW * 0.1, potY - fh * 0.45, cx + Math.sin(time * 18) * 4, potY - fh * 0.78);
    ctx.quadraticCurveTo(cx + potW * 0.1, potY - fh * 0.35, cx + potW * 0.25, potY + 2);
    ctx.closePath();
    ctx.fill();

    // Inner Yellow Core
    ctx.fillStyle = "#FFE042";
    ctx.beginPath();
    ctx.moveTo(cx - potW * 0.12, potY + 1);
    ctx.quadraticCurveTo(cx, potY - fh * 0.35, cx + Math.cos(time * 22) * 3, potY - fh * 0.52);
    ctx.quadraticCurveTo(cx, potY - fh * 0.2, cx + potW * 0.12, potY + 1);
    ctx.closePath();
    ctx.fill();
  } else {
    // Gentle Smoke Wisps when coals are idle/warning
    ctx.fillStyle = "rgba(180, 160, 140, 0.35)";
    for (let i = 0; i < 3; i++) {
      const sx = cx - 10 + i * 10 + Math.sin(time * 3 + i) * 3;
      const sy = potY - 8 - ((time * 25 + i * 12) % 20);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 + i * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// Draw Axum Stela (Obelisk stone pillar with carved cross emblem and window story panels)
function drawAxumStela(ctx, cx, cy, dir, h, sw) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(h) || !isFinite(sw)) return;
  const sign = dir === "up" ? -1 : 1;

  ctx.save();

  if (h < 3) {
    ctx.restore();
    return;
  }

  const Y_tip = cy + sign * h;
  const stelaW = Math.max(14, sw * 0.7);

  const stoneGrad = ctx.createLinearGradient(cx - stelaW / 2, 0, cx + stelaW / 2, 0);
  stoneGrad.addColorStop(0, "#d8c3a3");
  stoneGrad.addColorStop(0.3, "#c8b393");
  stoneGrad.addColorStop(0.7, "#a89575");
  stoneGrad.addColorStop(1.0, "#7d6b4f");

  ctx.fillStyle = stoneGrad;

  const crownR = stelaW / 2;
  const shaftTopY = Y_tip - sign * crownR;

  ctx.beginPath();
  ctx.arc(cx, shaftTopY, crownR, Math.PI, 0, false);
  ctx.fillRect(cx - stelaW / 2, shaftTopY, stelaW, Math.abs(cy - shaftTopY));
  ctx.fill();

  ctx.strokeStyle = "#403222";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Carved Cross Emblem inside top arch
  ctx.strokeStyle = "#3e2e1c";
  ctx.lineWidth = 1.8;
  const crossY = shaftTopY - crownR * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - 5, crossY); ctx.lineTo(cx + 5, crossY);
  ctx.moveTo(cx, crossY - 5); ctx.lineTo(cx, crossY + 5);
  ctx.stroke();

  // Carved window panels
  const numStories = Math.max(1, Math.floor((h - crownR) / 16));
  ctx.fillStyle = "rgba(42, 28, 16, 0.45)";
  ctx.strokeStyle = "#382818";
  ctx.lineWidth = 0.8;

  for (let s = 0; s < numStories; s++) {
    const wy = Y_tip - sign * (crownR + 8 + s * 16);
    if (Math.abs(wy - cy) < 6) continue;

    const panelW = stelaW - 8;
    ctx.fillRect(cx - panelW / 2, wy, panelW, 10);
    ctx.strokeRect(cx - panelW / 2, wy, panelW, 10);

    ctx.beginPath();
    ctx.moveTo(cx, wy);
    ctx.lineTo(cx, wy + 10);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw Hyena Jaw Snap Trap
function drawHyenaJaw(ctx, cx, cy, dir, openFrac, sw) {
  ctx.save();

  const jawW = Math.max(48, sw * 1.2);
  const jawH = 22;

  const boneLight = "#d9cbb0";
  const boneDark = "#a69578";
  const mouthDark = "#2a1510";

  // Ground Base Anchor
  ctx.fillStyle = "#8e3f2b";
  ctx.fillRect(cx - jawW * 0.5, cy - 2, jawW, 4);

  // 1. Lower Jaw (Fixed to ground)
  ctx.fillStyle = boneDark;
  ctx.beginPath();
  ctx.moveTo(cx - jawW * 0.45, cy);
  ctx.lineTo(cx + jawW * 0.45, cy);
  ctx.lineTo(cx + jawW * 0.35, cy - jawH * 0.4);
  ctx.lineTo(cx - jawW * 0.35, cy - jawH * 0.3);
  ctx.closePath();
  ctx.fill();

  // Lower Teeth
  ctx.fillStyle = "#f4f0e6";
  const numTeeth = 5;
  for (let i = 0; i < numTeeth; i++) {
    const tx = cx - jawW * 0.3 + i * (jawW * 0.6 / numTeeth);
    const th = 5 + (i === 1 || i === numTeeth - 2 ? 4 : 0);
    ctx.beginPath();
    ctx.moveTo(tx - 2, cy - jawH * 0.3);
    ctx.lineTo(tx, cy - jawH * 0.3 - th);
    ctx.lineTo(tx + 2, cy - jawH * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Upper Jaw (Hinged at back right, rotates open)
  const hingeX = cx + jawW * 0.32;
  const hingeY = cy - jawH * 0.25;
  const maxOpenAngle = -Math.PI * 0.25;
  const openAngle = openFrac * maxOpenAngle;

  ctx.save();
  ctx.translate(hingeX, hingeY);
  ctx.rotate(openAngle);
  ctx.translate(-hingeX, -hingeY);

  ctx.fillStyle = boneLight;
  ctx.beginPath();
  ctx.moveTo(hingeX, hingeY);
  ctx.lineTo(cx - jawW * 0.42, cy - jawH * 0.35);
  ctx.lineTo(cx - jawW * 0.4, cy - jawH * 0.95);
  ctx.lineTo(cx - jawW * 0.1, cy - jawH * 1.1);
  ctx.lineTo(hingeX, cy - jawH * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#5a4a35";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eye Socket Cavity
  ctx.fillStyle = mouthDark;
  ctx.beginPath();
  ctx.ellipse(cx - jawW * 0.12, cy - jawH * 0.85, 4.5, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nasal Cavity
  ctx.beginPath();
  ctx.ellipse(cx - jawW * 0.35, cy - jawH * 0.55, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Upper Teeth
  ctx.fillStyle = "#f4f0e6";
  for (let i = 0; i < numTeeth; i++) {
    const tx = cx - jawW * 0.38 + i * (jawW * 0.65 / numTeeth);
    const th = 6 + (i === 1 || i === numTeeth - 2 ? 4 : 0);
    ctx.beginPath();
    ctx.moveTo(tx - 2, cy - jawH * 0.35);
    ctx.lineTo(tx, cy - jawH * 0.35 + th);
    ctx.lineTo(tx + 2, cy - jawH * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}

// Every spike cluster in a level shares one visual language. The removed
// hyena-jaw and thorn-mound variants can no longer appear anywhere.
function getTrapStyleForInstance() {
  const levelStyles = ["spear", "stela", "shield"];
  return levelStyles[Math.abs(Game.levelIndex || 0) % levelStyles.length];
}

// Draw Broken Shield Trap (Cracked/split Ethiopian battle shield with sharp thrusting spears)
function drawShieldSpear(ctx, cx, cy, dir, h, sw) {
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(h) || !isFinite(sw)) return;
  ctx.save();

  const sign = dir === "up" ? -1 : 1;

  // Never leave shield fragments on the floor before a hidden spear emerges.
  if (h <= 2) {
    ctx.restore();
    return;
  }
  drawSpear(ctx, cx, cy, dir, h, sw);

  // Broken & Split Ethiopian Battle Shield lying on the ground
  const shieldR = Math.max(14, sw * 0.52);
  const shieldY = cy - 6;

  // Left Broken Shield Half
  ctx.save();
  ctx.translate(cx - 3, shieldY);
  ctx.rotate(-0.25);
  ctx.fillStyle = "#6B3A23"; // Dark leather base
  ctx.beginPath();
  ctx.ellipse(-shieldR * 0.3, 0, shieldR * 0.5, shieldR * 0.32, 0, Math.PI * 0.4, Math.PI * 1.6);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#381C10";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Jagged crack lines on left piece
  ctx.strokeStyle = "#2A1208";
  ctx.beginPath();
  ctx.moveTo(-shieldR * 0.3, -shieldR * 0.2);
  ctx.lineTo(-shieldR * 0.1, 0);
  ctx.lineTo(-shieldR * 0.4, shieldR * 0.2);
  ctx.stroke();
  ctx.restore();

  // Right Broken Shield Half
  ctx.save();
  ctx.translate(cx + 4, shieldY + 1);
  ctx.rotate(0.3);
  ctx.fillStyle = "#8A4D2E"; // Warm leather half
  ctx.beginPath();
  ctx.ellipse(shieldR * 0.3, 0, shieldR * 0.5, shieldR * 0.32, 0, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#381C10";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Fractured Brass Boss Piece
  ctx.fillStyle = "#D1A85B";
  ctx.beginPath();
  ctx.arc(0, 0, shieldR * 0.22, 0, Math.PI * 1.5);
  ctx.fill();
  ctx.restore();

  // Sharp metal shield shards sticking up near ground
  ctx.fillStyle = "#94A3B8";
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx - 3, cy + sign * Math.min(12, h * 0.6));
  ctx.lineTo(cx - 1, cy);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 2, cy);
  ctx.lineTo(cx + 5, cy + sign * Math.min(10, h * 0.5));
  ctx.lineTo(cx + 7, cy);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

class ChasingThornVines {
  // Thorny climber plant wave completely removed
  constructor(x0, x1, opts = {}) {
    this.reset();
  }
  reset() {}
  update(dt, g) {}
  solids() { return []; }
  kills() { return []; }
  draw() {}
}

class ThornClimber {
  constructor(x, y, w, trigger, opts = {}) {
    this.x = x;
    this.y = y;
    this.w = w ?? 60;
    this.maxH = opts.maxH ?? 85;
    this.trigger = trigger;
    this.period = opts.period ?? 1.8;
    this.phase = opts.phase ?? 0;
    this.holdOut = opts.holdOut ?? 0.8;
    this.delay = opts.delay ?? 0;
    this.speed = opts.speed ?? 12;
    this.reset();
  }

  reset() {
    this.out = 0;
    this.state = this.trigger ? "idle" : "cycle";
    this.t = -this.delay;
    this.ct = this.phase;
  }

  update(dt, g) {
    if (this.state === "idle") {
      if (aabb(g.player, this.trigger)) {
        this.state = "popping";
        this.t = -this.delay;
      }
    } else if (this.state === "popping") {
      this.t += dt;
      if (this.t >= 0) {
        if (this.out === 0) {
          AudioFX.rumble();
          spawnDust(this.x, this.y, 5);
        }
        this.out = clamp(this.out + this.speed * dt, 0, 1);
      }
    } else if (this.state === "cycle") {
      this.ct += dt;
      const cyc = this.ct % this.period;
      if (cyc < this.holdOut) {
        if (this.out < 0.1) {
          AudioFX.rumble();
          spawnDust(this.x, this.y, 4);
        }
        this.out = clamp(this.out + this.speed * dt, 0, 1);
      } else {
        this.out = clamp(this.out - this.speed * 0.6 * dt, 0, 1);
      }
    }
  }

  solids() { return []; }

  kills() {
    if (this.out < 0.3) return [];
    const h = this.maxH * this.out;
    return [R(this.x - this.w / 2 + 5, this.y - h, this.w - 10, h)];
  }

  draw() {
    if (this.out <= 0.01) return;
    drawThornStalk(ctx, this.x, this.y, "up", this.maxH * this.out, this.w);
  }
}



class PopSpikes {
  constructor(x, y, w, trigger, opts = {}) {
    this.x = x; this.y = y; this.w = w;
    this.dir = opts.dir ?? "up";
    this.size = opts.size ?? 26;
    this.delay = opts.delay ?? 0;
    this.trigger = trigger; // null => periodic
    this.period = opts.period ?? 0;
    this.phase = opts.phase ?? 0;
    this.holdOut = opts.holdOut ?? 0.8;
    this.speed = opts.speed ?? 14;
    this.style = opts.style ?? "spear";
    this.reset();
  }
  reset() { this.out = 0; this.state = this.trigger ? "idle" : "cycle"; this.t = -this.delay; this.ct = this.phase; }
  update(dt, g) {
    if (this.state === "idle") {
      if (aabb(g.player, this.trigger)) { this.state = "popping"; this.t = -this.delay; }
    } else if (this.state === "popping") {
      this.t += dt;
      if (this.t >= 0) {
        if (this.out === 0) AudioFX.pop();
        this.out = clamp(this.out + this.speed * dt, 0, 1);
      }
    } else if (this.state === "cycle") {
      this.ct += dt;
      const cyc = this.ct % this.period;
      if (cyc < this.holdOut) {
        if (this.out < 0.1) AudioFX.pop();
        this.out = clamp(this.out + this.speed * dt, 0, 1);
      } else {
        this.out = clamp(this.out - this.speed * 0.6 * dt, 0, 1);
      }
    }
  }
  solids() { return []; }
  kills() {
    if (this.out < 0.35) return [];
    const h = this.size * this.out - 6;
    if (this.dir === "up") return [R(this.x + 4, this.y - h, this.w - 8, h)];
    return [R(this.x + 4, this.y, this.w - 8, h)];
  }
  draw() {
    // Hidden traps must be completely invisible: no shield pieces, sockets,
    // mounds, warning marks, smoke, or other placement clues.
    if (this.out <= 0.01) return;

    const h = this.size * this.out;
    const n = Math.max(2, Math.round(this.w / 18));
    const sw = this.w / n;
    const isWarning = (this.out > 0.02 && this.out < 0.45) || (this.state === "popping" && this.t < 0);
    const st = getTrapStyleForInstance(this.x, this.y, this.style);
    for (let i = 0; i < n; i++) {
      const cx = this.x + i * sw + sw / 2;
      if (st === "stela") {
        drawAxumStela(ctx, cx, this.y, this.dir, h, sw);
      } else if (st === "shield") {
        drawShieldSpear(ctx, cx, this.y, this.dir, h, sw);
      } else if (st === "brazier") {
        drawCoffeeBrazier(ctx, cx, this.y, sw, this.out, isWarning);
      } else {
        drawSpear(ctx, cx, this.y, this.dir, h, sw);
      }
    }
  }
}

class FallBlock {
  constructor(rect, trigger, opts = {}) {
    this.home = { ...rect };
    this.trigger = trigger;
    this.shakeT = opts.shakeTime ?? 0.12;
    this.floorY = opts.floorY ?? 480;
    this.reset();
  }
  reset() { this.rect = { ...this.home }; this.state = "idle"; this.t = 0; this.vy = 0; }
  update(dt, g) {
    if (this.state === "idle" && aabb(g.player, this.trigger)) {
      this.state = "shake"; this.t = 0; AudioFX.rumble();
    } else if (this.state === "shake") {
      this.t += dt;
      if (this.t > this.shakeT) this.state = "fall";
    } else if (this.state === "fall") {
      this.vy += 3000 * dt;
      this.rect.y += this.vy * dt;
      if (this.rect.y + this.rect.h >= this.floorY) {
        this.rect.y = this.floorY - this.rect.h;
        this.state = "landed";
        AudioFX.slam();
        g.shake(7, 0.22);
        spawnDust(this.rect.x + this.rect.w / 2, this.floorY, 12);
      }
    }
  }
  solids() { return this.state === "fall" ? [] : [this.rect]; }
  kills() { return this.state === "fall" ? [R(this.rect.x + 3, this.rect.y + 4, this.rect.w - 6, this.rect.h - 4)] : []; }
  draw() {
    const r = this.rect;
    let ox = this.state === "shake" ? rand(-2, 2) : 0;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(r.x + ox, r.y, r.w, r.h);
    ctx.strokeStyle = theme.crack;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * 0.3 + ox, r.y);
    ctx.lineTo(r.x + r.w * 0.45 + ox, r.y + r.h * 0.5);
    ctx.lineTo(r.x + r.w * 0.32 + ox, r.y + r.h);
    ctx.stroke();
  }
}

class Crusher {
  constructor(x, w, opts = {}) {
    this.x = x; this.w = w;
    this.topY = opts.topY ?? 0;
    this.headH = opts.headH ?? 46;
    this.floorY = opts.floorY ?? 480;
    this.period = opts.period ?? 0;
    this.phase = opts.phase ?? 0;
    this.trigger = opts.trigger ?? null;
    this.slamSpeed = opts.slamSpeed ?? 1500;
    this.upSpeed = opts.upSpeed ?? 240;
    this.holdT = opts.hold ?? 0.32;
    this.reset();
  }
  reset() {
    this.y = this.topY;
    this.state = this.trigger ? "armed" : "waiting";
    this.t = this.phase;
    this.slammed = false;
  }
  update(dt, g) {
    const maxY = this.floorY - this.headH;
    if (this.state === "armed") {
      if (aabb(g.player, this.trigger)) { this.state = "slam"; }
    } else if (this.state === "waiting") {
      this.t += dt;
      if (this.t >= this.period) { this.t = 0; this.state = "slam"; }
    } else if (this.state === "slam") {
      this.y += this.slamSpeed * dt;
      if (this.y >= maxY) {
        this.y = maxY;
        this.state = "hold"; this.t = 0;
        if (!this.slammed) { AudioFX.slam(); g.shake(6, 0.18); spawnDust(this.x + this.w / 2, this.floorY, 10); }
        this.slammed = true;
      }
    } else if (this.state === "hold") {
      this.t += dt;
      if (this.t >= this.holdT) this.state = "rise";
    } else if (this.state === "rise") {
      this.y -= this.upSpeed * dt;
      if (this.y <= this.topY) {
        this.y = this.topY;
        this.slammed = false;
        this.state = this.trigger ? "spent" : "waiting";
        this.t = 0;
      }
    }
  }
  headRect() { return R(this.x, this.y, this.w, this.headH); }
  solids() { return [this.headRect()]; }
  kills() {
    if (this.state === "slam") return [R(this.x + 2, this.y + this.headH - 14, this.w - 4, 16)];
    return [];
  }
  draw() {
    ctx.fillStyle = theme.metal;
    ctx.fillRect(this.x + this.w / 2 - 9, this.topY, 18, this.y - this.topY + 4);
    const h = this.headRect();
    ctx.fillStyle = theme.ink;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(h.x, h.y + h.h - 12, h.w, 12);
    ctx.clip();
    ctx.fillStyle = theme.accent;
    for (let i = -1; i < h.w / 16 + 1; i++) {
      ctx.beginPath();
      ctx.moveTo(h.x + i * 16, h.y + h.h);
      ctx.lineTo(h.x + i * 16 + 8, h.y + h.h - 12);
      ctx.lineTo(h.x + i * 16 + 16, h.y + h.h - 12);
      ctx.lineTo(h.x + i * 16 + 8, h.y + h.h);
      ctx.fill();
    }
    ctx.restore();
  }
}

class CrumblePlatform {
  constructor(rect, opts = {}) {
    this.home = { ...rect };
    this.delay = opts.delay ?? 0.35;
    this.reset();
  }
  reset() { this.rect = { ...this.home }; this.state = "idle"; this.t = 0; this.vy = 0; }
  update(dt, g) {
    if (this.state === "idle") {
      const p = g.player;
      const standing = p.grounded &&
        Math.abs(p.y + p.h - this.rect.y) < 3 &&
        p.x + p.w > this.rect.x && p.x < this.rect.x + this.rect.w;
      if (standing) { this.state = "shaking"; this.t = 0; AudioFX.rumble(); }
    } else if (this.state === "shaking") {
      this.t += dt;
      if (this.t >= this.delay) this.state = "fall";
    } else if (this.state === "fall") {
      this.vy += 2400 * dt;
      this.rect.y += this.vy * dt;
    }
  }
  solids() { return this.state === "fall" ? [] : [this.rect]; }
  kills() { return []; }
  draw() {
    if (this.rect.y > H + 40) return;
    const ox = this.state === "shaking" ? rand(-2, 2) : 0;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(this.rect.x + ox, this.rect.y, this.rect.w, this.rect.h);
    ctx.fillStyle = theme.crack;
    for (let i = 1; i < 3; i++)
      ctx.fillRect(this.rect.x + (this.rect.w / 3) * i - 1 + ox, this.rect.y + 2, 2, this.rect.h - 4);
  }
}

class SlidingHole {
  constructor(x0, x1, opts = {}) {
    this.x0 = x0; this.x1 = x1;
    this.y = opts.y ?? 480;
    this.h = opts.h ?? 60;
    this.gapW = opts.gapW ?? 92;
    this.startGap = opts.startGap ?? x1 - 100;
    this.speed = opts.speed ?? 130;
    this.trigger = opts.trigger ?? null;
    this.homing = opts.homing ?? true;
    this.reset();
  }
  reset() { this.gx = this.startGap; this.active = !this.trigger; }
  update(dt, g) {
    if (!this.active && this.trigger && aabb(g.player, this.trigger)) { this.active = true; AudioFX.rumble(); }
    if (!this.active) return;
    const target = clamp(g.player.x + g.player.w / 2, this.x0 + this.gapW / 2 + 4, this.x1 - this.gapW / 2 - 4);
    const d = target - this.gx;
    const step = clamp(d, -this.speed * dt, this.speed * dt);
    this.gx += step;
  }
  solids() {
    const gl = this.gx - this.gapW / 2, gr = this.gx + this.gapW / 2;
    const out = [];
    if (gl > this.x0 + 2) out.push(R(this.x0, this.y, gl - this.x0, this.h));
    if (gr < this.x1 - 2) out.push(R(gr, this.y, this.x1 - gr, this.h));
    return out;
  }
  kills() { return []; }
  draw() {
    ctx.fillStyle = theme.ink;
    for (const s of this.solids()) ctx.fillRect(s.x, s.y, s.w, s.h);
    const gl = this.gx - this.gapW / 2, gr = this.gx + this.gapW / 2;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(gl, this.y + i * 18);
      ctx.lineTo(gl + 7, this.y + i * 18 + 9);
      ctx.lineTo(gl, this.y + i * 18 + 18);
      ctx.moveTo(gr, this.y + i * 18);
      ctx.lineTo(gr - 7, this.y + i * 18 + 9);
      ctx.lineTo(gr, this.y + i * 18 + 18);
    }
    ctx.fill();
  }
}

class StaticSpikes {
  constructor(x, y, w, opts = {}) {
    this.x = x; this.y = y; this.w = w;
    this.size = opts.size ?? 26;
    this.dir = opts.dir ?? "up";
    this.style = opts.style ?? "spear";
  }
  reset() {}
  update() {}
  solids() { return []; }
  kills() {
    if (this.dir === "up") return [R(this.x + 4, this.y - this.size + 8, this.w - 8, this.size - 8)];
    return [R(this.x + 4, this.y, this.w - 8, this.size - 8)];
  }
  draw() {
    const n = Math.max(2, Math.round(this.w / 18)), sw = this.w / n;
    const st = getTrapStyleForInstance(this.x, this.y, this.style);
    for (let i = 0; i < n; i++) {
      const cx = this.x + i * sw + sw / 2;
      if (st === "stela") {
        drawAxumStela(ctx, cx, this.y, this.dir, this.size, sw);
      } else if (st === "shield") {
        drawShieldSpear(ctx, cx, this.y, this.dir, this.size, sw);
      } else {
        drawSpear(ctx, cx, this.y, this.dir, this.size, sw);
      }
    }
  }
}

class InvertZone {
  constructor(rect) { this.rect = rect; }
  reset() {}
  update(dt, g) { if (aabb(g.player, this.rect)) g.invertControls = true; }
  solids() { return []; }
  kills() { return []; }
  draw() {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = theme.accent;
    ctx.font = `900 30px ${FONT}`;
    ctx.textAlign = "center";
    ctx.translate(this.rect.x + this.rect.w / 2, this.rect.y + 60);
    ctx.rotate(Math.PI);
    ctx.fillText("?", 0, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- NEW TRAPS

class MovingPlatform {
  // ferries the player. Moves between (x,y) and (toX,toY) with easing + pause at ends.
  constructor(rect, opts = {}) {
    this.w = rect.w; this.h = rect.h;
    this.ax = rect.x; this.ay = rect.y;
    this.bx = opts.toX ?? rect.x; this.by = opts.toY ?? rect.y;
    this.speed = opts.speed ?? 80;
    this.phase = opts.phase ?? 0;
    this.pause = opts.pause ?? 0;
    this.reset();
  }
  reset() {
    const dist = Math.hypot(this.bx - this.ax, this.by - this.ay) || 1;
    this.travel = dist / this.speed;
    this.cycle = this.travel * 2 + this.pause * 2;
    this.t = this.phase * this.cycle;
    const p = this._posAt(this.t);
    this.px = p.x; this.py = p.y; this.dx = 0; this.dy = 0;
  }
  _posAt(t) {
    let u = ((t % this.cycle) + this.cycle) % this.cycle;
    let f;
    if (u < this.travel) f = u / this.travel;
    else if (u < this.travel + this.pause) f = 1;
    else if (u < this.travel * 2 + this.pause) f = 1 - (u - this.travel - this.pause) / this.travel;
    else f = 0;
    const e = easeInOut(f);
    return { x: lerp(this.ax, this.bx, e), y: lerp(this.ay, this.by, e) };
  }
  update(dt, g) {
    const prevx = this.px, prevy = this.py;
    this.t += dt;
    const p = this._posAt(this.t);
    this.px = p.x; this.py = p.y;
    this.dx = this.px - prevx; this.dy = this.py - prevy;
    const pl = g.player;
    const onTop = pl.vy >= -1 &&
      pl.x + pl.w > prevx + 2 && pl.x < prevx + this.w - 2 &&
      Math.abs((pl.y + pl.h) - prevy) <= 8;
    if (onTop) { pl.x += this.dx; pl.y += this.dy; }
  }
  solids() { return [R(this.px, this.py, this.w, this.h)]; }
  kills() { return []; }
  draw() {
    ctx.fillStyle = theme.ink;
    roundRect(this.px, this.py, this.w, this.h, 4); ctx.fill();
    ctx.fillStyle = theme.paper;
    for (let i = 0; i < 3; i++)
      ctx.fillRect(this.px + this.w / 2 - 14 + i * 12, this.py + this.h / 2 - 1.5, 6, 3);
  }
}

class Conveyor {
  // a solid belt that pushes whoever stands on it.
  constructor(rect, opts = {}) {
    this.rect = { ...rect };
    this.dir = opts.dir ?? 1;
    this.force = opts.force ?? 150;
    this.reset();
  }
  reset() { this.t = 0; }
  update(dt, g) {
    this.t += dt * this.dir;
    const p = g.player, r = this.rect;
    const standing = p.grounded && Math.abs((p.y + p.h) - r.y) < 4 &&
      p.x + p.w > r.x && p.x < r.x + r.w;
    if (standing) p.x += this.dir * this.force * dt;
  }
  solids() { return [this.rect]; }
  kills() { return []; }
  draw() {
    const r = this.rect;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = theme.paper;
    const off = (this.t * 70) % 40;
    for (let x = r.x - 40 + off; x < r.x + r.w; x += 40) {
      ctx.beginPath();
      if (this.dir > 0) {
        ctx.moveTo(x, r.y + 10); ctx.lineTo(x + 12, r.y + r.h / 2); ctx.lineTo(x, r.y + r.h - 10);
      } else {
        ctx.moveTo(x + 12, r.y + 10); ctx.lineTo(x, r.y + r.h / 2); ctx.lineTo(x + 12, r.y + r.h - 10);
      }
      ctx.lineWidth = 3; ctx.strokeStyle = theme.paper; ctx.stroke();
    }
    ctx.restore();
  }
}

class Spring {
  // non-solid bounce pad. preserves horizontal momentum for running spring-jumps.
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y; this.w = opts.w ?? 50; this.h = opts.h ?? 14;
    this.power = opts.power ?? -980;
    this.reset();
  }
  reset() { this.c = 0; }
  update(dt, g) {
    this.c = Math.max(0, this.c - dt * 5);
    const p = g.player;
    const overX = p.x + p.w > this.x + 3 && p.x < this.x + this.w - 3;
    const bottom = p.y + p.h;
    if (overX && p.vy >= 0 && bottom >= this.y - 6 && bottom <= this.y + 40) {
      p.y = this.y - p.h;
      p.vy = this.power;
      p.grounded = false;
      this.c = 1;
      AudioFX.bounce();
      spawnDust(this.x + this.w / 2, this.y, 6);
    }
  }
  solids() { return []; }
  kills() { return []; }
  draw() {
    const comp = this.c * 6;
    const top = this.y + comp;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const coils = 3;
    for (let i = 0; i <= coils; i++) {
      const yy = lerp(this.y + this.h + 6, top + 4, i / coils);
      const xx = this.x + (i % 2 === 0 ? 6 : this.w - 6);
      if (i === 0) ctx.moveTo(this.x + 6, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    roundRect(this.x, top, this.w, 7, 3); ctx.fill();
  }
}

class FireBrazier {
  // Underground Fire Pot / Pit obstacle embedded into the ground
  constructor(x, y, opts = {}) {
    this.x = x;          // center X of fire pot
    this.y = y ?? 480;   // ground surface level Y
    this.w = opts.w ?? 50; // width of ground pit opening (jumpable)
    this.h = opts.h ?? 32; // depth of underground pot
    this.flameH = opts.flameH ?? 42; // height flame shoots above ground (jumpable height)
    this.period = opts.period ?? 1.8;  // cyclic burst timing
    this.phase = opts.phase ?? 0;
    this.holdOut = opts.holdOut ?? 0.6; // duration flame stays up during cycle
    this.trigger = opts.trigger ?? null; // trigger rect if activated on proximity
    this.style = opts.style ?? "brazier";
    this.reset();
  }

  reset() {
    this.t = 0;
    this.ct = this.phase;
    this.flameScale = this.period === 0 && !this.trigger ? 1 : 0.25;
    this.sparks = [];
    for (let i = 0; i < 10; i++) {
      this.sparks.push({
        x: this.x + rand(-this.w * 0.35, this.w * 0.35),
        y: this.y + rand(0, this.h) - rand(0, 40),
        vy: rand(-40, -110),
        vx: rand(-12, 12),
        size: rand(3, 6),
        rot: rand(0, Math.PI),
        alpha: rand(0.3, 0.95),
        life: rand(0.8, 1.8),
        t: rand(0, 1.2)
      });
    }
  }

  update(dt, g) {
    this.t += dt;

    if (this.trigger) {
      if (aabb(g.player, this.trigger)) {
        this.flameScale = Math.min(1, this.flameScale + 4 * dt);
      } else {
        this.flameScale = Math.max(0.25, this.flameScale - 2.5 * dt);
      }
    } else if (this.period > 0) {
      this.ct += dt;
      const cyc = this.ct % this.period;
      if (cyc < this.holdOut) {
        this.flameScale = Math.min(1, this.flameScale + 6 * dt);
      } else {
        this.flameScale = Math.max(0.25, this.flameScale - 3 * dt);
      }
    } else {
      this.flameScale = 1;
    }

    // Update floating ember sparks
    for (const sp of this.sparks) {
      sp.t += dt;
      sp.y += sp.vy * dt;
      sp.x += sp.vx * dt + Math.sin(sp.t * 3) * 0.8;
      sp.rot += dt * 2;
      sp.alpha = (1 - sp.t / sp.life) * (0.4 + 0.6 * this.flameScale);

      if (sp.t >= sp.life || sp.y < this.y - this.flameH - 35) {
        sp.x = this.x + rand(-this.w * 0.35, this.w * 0.35);
        sp.y = this.y + this.h - rand(4, 12);
        sp.vy = rand(-40, -100) * (0.5 + 0.5 * this.flameScale);
        sp.vx = rand(-12, 12);
        sp.size = rand(3, 5);
        sp.life = rand(0.6, 1.5);
        sp.t = 0;
        sp.alpha = rand(0.5, 0.9);
      }
    }
  }

  solids() {
    // Recessed underground fire pot: no solid platform on top so player steps in or falls into flames
    return [];
  }

  kills() {
    // Persistent small flame (min height ~12px above rim + pit interior) ensures player CANNOT walk through fire on foot
    const actualH = Math.max(12, this.flameH * this.flameScale);
    return [R(this.x - this.w * 0.38, this.y - actualH + 4, this.w * 0.76, actualH + this.h - 4)];
  }

  draw() {
    ctx.save();
    const isWarning = this.trigger ? (this.flameScale > 0.25 && this.flameScale < 0.6) : false;

    if (this.style === "brazier") {
      drawCoffeeBrazier(ctx, this.x, this.y, this.w, this.flameScale, isWarning);
      ctx.restore();
      return;
    }

    const cx = this.x;
    const cy = this.y; // ground surface level
    const w = this.w;
    const h = this.h; // depth under ground

    // 1. Subterranean Fire Pit Cavity
    ctx.fillStyle = "#1c110a";
    ctx.fillRect(cx - w / 2, cy, w, h);

    // Stone pit walls
    ctx.fillStyle = "#3d281a";
    ctx.fillRect(cx - w / 2, cy, 6, h);
    ctx.fillRect(cx + w / 2 - 6, cy, 6, h);
    ctx.fillRect(cx - w / 2, cy + h - 6, w, 6);

    ctx.strokeStyle = "#120803";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - w / 2, cy, w, h);

    // Stone Rim Lip on Ground Surface
    ctx.fillStyle = "#6e503b";
    ctx.fillRect(cx - w / 2 - 6, cy - 3, 10, 6);
    ctx.fillRect(cx + w / 2 - 4, cy - 3, 10, 6);
    ctx.strokeStyle = "#2e1a10";
    ctx.strokeRect(cx - w / 2 - 6, cy - 3, 10, 6);
    ctx.strokeRect(cx + w / 2 - 4, cy - 3, 10, 6);

    // 2. Hot Coals & Burning Embers inside Underground Pot
    const pitBottomY = cy + h - 8;
    ctx.fillStyle = "#2d1a10";
    const coals = [
      { rx: -0.38, ry: 0, r: 7 },
      { rx: -0.2,  ry: -3, r: 9 },
      { rx: 0.0,   ry: -4, r: 10 },
      { rx: 0.2,   ry: -3, r: 9 },
      { rx: 0.38,  ry: 0, r: 7 },
    ];
    for (const c of coals) {
      ctx.beginPath();
      ctx.arc(cx + w * c.rx, pitBottomY + c.ry, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hot ember glow inside pit
    if (this.flameScale > 0.05) {
      ctx.fillStyle = `rgba(255, 90, 20, ${0.5 + 0.5 * Math.sin(this.t * 8)})`;
      for (const c of coals) {
        ctx.beginPath();
        ctx.arc(cx + w * c.rx, pitBottomY + c.ry, c.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Flames blasting UPWARDS from inside the underground pot
    if (this.flameScale > 0.05) {
      const curH = this.flameH * this.flameScale;
      const flicker = Math.sin(this.t * 14) * 5 + Math.cos(this.t * 22) * 4;
      const fh = curH + flicker;

      // Outer Red-Orange Flame
      ctx.fillStyle = "#e84e1b";
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.42, cy + h - 6);
      ctx.quadraticCurveTo(cx - w * 0.3, cy - fh * 0.4, cx - w * 0.1, cy - fh * 0.85);
      ctx.quadraticCurveTo(cx, cy - fh, cx + w * 0.1, cy - fh * 0.75);
      ctx.quadraticCurveTo(cx + w * 0.3, cy - fh * 0.35, cx + w * 0.42, cy + h - 6);
      ctx.closePath();
      ctx.fill();

      // Middle Golden Flame
      ctx.fillStyle = "#f5902b";
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.28, cy + h - 8);
      ctx.quadraticCurveTo(cx - w * 0.12, cy - fh * 0.45, cx + Math.sin(this.t * 16) * 5, cy - fh * 0.78);
      ctx.quadraticCurveTo(cx + w * 0.12, cy - fh * 0.35, cx + w * 0.28, cy + h - 8);
      ctx.closePath();
      ctx.fill();

      // Inner Yellow Hot Core
      ctx.fillStyle = "#ffe042";
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.16, cy + h - 10);
      ctx.quadraticCurveTo(cx, cy - fh * 0.35, cx + Math.cos(this.t * 20) * 3, cy - fh * 0.55);
      ctx.quadraticCurveTo(cx, cy - fh * 0.2, cx + w * 0.16, cy + h - 10);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Floating Diamond Sparks (◆) rising from underground
    for (const sp of this.sparks) {
      if (sp.alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, sp.alpha));
      ctx.fillStyle = sp.size > 4.5 ? "#f5902b" : "#ffcc41";
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.beginPath();
      ctx.moveTo(0, -sp.size);
      ctx.lineTo(sp.size * 0.65, 0);
      ctx.lineTo(0, sp.size);
      ctx.lineTo(-sp.size * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

class Saw {
  // spinning blade gliding along a polyline (ping-pong).
  constructor(path, opts = {}) {
    this.path = path.map((p) => ({ ...p }));
    this.r = opts.r ?? 22;
    this.speed = opts.speed ?? 130;
    this.reset();
  }
  reset() {
    this.seg = 0; this.dir = 1; this.f = 0; this.spin = 0;
    this.x = this.path[0].x; this.y = this.path[0].y;
  }
  update(dt) {
    this.spin += dt * 9;
    if (this.path.length < 2) return;
    const a = this.path[this.seg];
    const b = this.path[this.seg + this.dir];
    if (!b) { this.dir *= -1; return; }
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    this.f += (this.speed * dt) / len;
    while (this.f >= 1) {
      this.f -= 1;
      this.seg += this.dir;
      if (this.seg + this.dir < 0 || this.seg + this.dir >= this.path.length) {
        this.dir *= -1;
      }
    }
    const a2 = this.path[this.seg], b2 = this.path[this.seg + this.dir] || a2;
    this.x = lerp(a2.x, b2.x, this.f);
    this.y = lerp(a2.y, b2.y, this.f);
  }
  solids() { return []; }
  kills() {
    // Spiked wheel hazard kill radius matching outer spike perimeter
    const kR = this.r * 1.15;
    return [R(this.x - kR, this.y - kR, kR * 2, kR * 2)];
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);

    const r = this.r;

    // 1. Draw 8 Silver Metallic Triangular Spikes around perimeter
    const numSpikes = 8;
    for (let i = 0; i < numSpikes; i++) {
      const angle = (i / numSpikes) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);

      const spikeLen = r * 0.62;
      const spikeBaseW = r * 0.28;

      // Spike Base Bracket / Collar
      ctx.fillStyle = "#3A3A3A";
      ctx.beginPath();
      ctx.rect(-spikeBaseW * 0.55, r * 0.78, spikeBaseW * 1.1, r * 0.22);
      ctx.fill();

      // Spike Main Metallic Blade with gradient for silver luster
      const grad = ctx.createLinearGradient(-spikeBaseW * 0.5, r * 0.9, spikeBaseW * 0.5, r + spikeLen);
      grad.addColorStop(0, "#D6D6D6");
      grad.addColorStop(0.35, "#FFFFFF");
      grad.addColorStop(0.7, "#9E9E9E");
      grad.addColorStop(1, "#4F4F4F");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-spikeBaseW * 0.5, r * 0.95);
      ctx.lineTo(0, r + spikeLen);
      ctx.lineTo(spikeBaseW * 0.5, r * 0.95);
      ctx.closePath();
      ctx.fill();

      // Center Ridge Highlight on Spike
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.95);
      ctx.lineTo(0, r + spikeLen * 0.88);
      ctx.stroke();

      ctx.restore();
    }

    // 2. Outer Dark Wood Wheel Rim
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#4E2F17";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = "#2B170A";
    ctx.stroke();

    // 3. Inner Wood Face (Warm Brown Grain)
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    const woodGrad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 0.85);
    woodGrad.addColorStop(0, "#A86E33");
    woodGrad.addColorStop(0.7, "#7A4A1F");
    woodGrad.addColorStop(1, "#593311");
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.strokeStyle = "#381E09";
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();

    // Plank lines on wooden face
    ctx.strokeStyle = "rgba(40, 20, 5, 0.4)";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.3);
    ctx.moveTo(-r * 0.75, 0); ctx.lineTo(r * 0.75, 0);
    ctx.moveTo(-r * 0.6, r * 0.3); ctx.lineTo(r * 0.6, r * 0.3);
    ctx.stroke();

    // 4. Golden Rivets / Metal Studs on Rim
    const numRivets = 8;
    for (let i = 0; i < numRivets; i++) {
      const a = (i / numRivets) * Math.PI * 2 + (Math.PI / numRivets);
      const rx = Math.cos(a) * (r * 0.72);
      const ry = Math.sin(a) * (r * 0.72);
      ctx.beginPath();
      ctx.arc(rx, ry, Math.max(1.2, r * 0.065), 0, Math.PI * 2);
      ctx.fillStyle = "#E8B446";
      ctx.fill();
      ctx.strokeStyle = "#6E4E16";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 5. Golden 8-Pointed Star Motif in Center
    const starOuter = r * 0.52;
    const starInner = r * 0.26;
    const starPoints = 8;
    ctx.beginPath();
    for (let i = 0; i < starPoints * 2; i++) {
      const a = (i / (starPoints * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? starOuter : starInner;
      const sx = Math.cos(a) * rad;
      const sy = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    const goldGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, starOuter);
    goldGrad.addColorStop(0, "#FFF099");
    goldGrad.addColorStop(0.5, "#EBB42C");
    goldGrad.addColorStop(1, "#A37410");
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.strokeStyle = "#5C3E04";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.stroke();

    // Concentric Ring inside Star
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.strokeStyle = "#7A5205";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.stroke();

    // 6. Center Raised Metallic Gold Boss/Dome
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    const bossGrad = ctx.createRadialGradient(-r * 0.06, -r * 0.06, 0, 0, 0, r * 0.22);
    bossGrad.addColorStop(0, "#FFF6C2");
    bossGrad.addColorStop(0.5, "#EEB93B");
    bossGrad.addColorStop(1, "#8A5F0C");
    ctx.fillStyle = bossGrad;
    ctx.fill();
    ctx.strokeStyle = "#4F3505";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.stroke();

    // Shiny Specular Highlight on Center Boss
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 0.06, r * 0.065, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fill();

    ctx.restore();
  }
}

class Laser {
  // telegraphed beam. off -> warn -> fire, cyclic.
  constructor(opts = {}) {
    this.x = opts.x; this.y = opts.y; this.len = opts.len ?? 400;
    this.vertical = opts.vertical ?? false;
    this.thick = opts.thick ?? 10;
    this.period = opts.period ?? 2.2;
    this.warn = opts.warn ?? 0.55;
    this.fire = opts.fire ?? 0.5;
    this.phase = opts.phase ?? 0;
    this.reset();
  }
  reset() { this.t = this.phase * this.period; this.fired = false; }
  update(dt) {
    this.t += dt;
    const st = this._state();
    if (st === "fire" && !this.fired) { AudioFX.zap(); this.fired = true; }
    if (st !== "fire") this.fired = false;
    if (st === "warn" && Math.random() < 0.06) AudioFX.beep();
  }
  _state() {
    const u = this.t % this.period;
    if (u < this.period - this.warn - this.fire) return "off";
    if (u < this.period - this.fire) return "warn";
    return "fire";
  }
  _beam() {
    return this.vertical
      ? R(this.x - this.thick / 2, this.y, this.thick, this.len)
      : R(this.x, this.y - this.thick / 2, this.len, this.thick);
  }
  solids() { return []; }
  kills() { return this._state() === "fire" ? [this._beam()] : []; }
  draw() {
    const st = this._state();
    // emitter nubs
    ctx.fillStyle = theme.metal;
    if (this.vertical) {
      ctx.fillRect(this.x - 8, this.y - 8, 16, 8);
      ctx.fillRect(this.x - 8, this.y + this.len, 16, 8);
    } else {
      ctx.fillRect(this.x - 8, this.y - 8, 8, 16);
      ctx.fillRect(this.x + this.len, this.y - 8, 8, 16);
    }
    if (st === "off") return;
    const b = this._beam();
    if (st === "warn") {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = theme.danger;
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.vertical) { ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y + this.len); }
      else { ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.len, this.y); }
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = theme.danger;
      ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.danger;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = theme.paper;
      ctx.globalAlpha = 0.5;
      if (this.vertical) ctx.fillRect(b.x + b.w / 2 - 1, b.y, 2, b.h);
      else ctx.fillRect(b.x, b.y + b.h / 2 - 1, b.w, 2);
      ctx.restore();
    }
  }
}

class Teleporter {
  // step in A -> appear at B (and back if twoWay).
  constructor(ax, ay, bx, by, opts = {}) {
    const w = opts.w ?? 30, h = opts.h ?? 48;
    this.a = R(ax, ay, w, h);
    this.b = R(bx, by, w, h);
    this.twoWay = opts.twoWay ?? true;
    this.reset();
  }
  reset() { this.cool = 0; this.t = 0; }
  update(dt, g) {
    this.t += dt;
    this.cool = Math.max(0, this.cool - dt);
    if (this.cool > 0) return;
    const p = g.player;
    const warp = (from, to) => {
      spawnPoof(from.x + from.w / 2, from.y + from.h / 2);
      p.x = to.x + to.w / 2 - p.w / 2;
      p.y = to.y + to.h - p.h;
      p.vx = 0;
      this.cool = 0.45;
      AudioFX.poof();
      spawnPoof(to.x + to.w / 2, to.y + to.h / 2);
    };
    if (aabb(p, this.a)) warp(this.a, this.b);
    else if (this.twoWay && aabb(p, this.b)) warp(this.b, this.a);
  }
  solids() { return []; }
  kills() { return []; }
  _portal(r) {
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.ellipse(0, 0, r.w / 2 - 2, r.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = this.t * 2 + i * 2.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, (r.w / 2 - 4) * (0.4 + 0.2 * i), (r.h / 2 - 4) * (0.4 + 0.2 * i), a, 0, Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  draw() { this._portal(this.a); if (this.twoWay) this._portal(this.b); else this._portal(this.b); }
}

class Button {
  // floor switch. sets g.flags[key]. momentary or latching.
  constructor(x, y, key, opts = {}) {
    this.x = x; this.y = y; this.w = opts.w ?? 44; this.h = 10;
    this.key = key;
    this.momentary = opts.momentary ?? false;
    this.reset();
  }
  reset() { this.pressed = false; this.dip = 0; }
  update(dt, g) {
    const hit = R(this.x, this.y - 8, this.w, this.h + 12);
    const on = aabb(g.player, hit);
    if (this.momentary) { this.pressed = on; }
    else if (on) { if (!this.pressed) AudioFX.beep(); this.pressed = true; }
    g.flags[this.key] = this.pressed;
    this.dip = clamp(this.dip + (this.pressed ? 1 : -1) * dt * 8, 0, 1);
  }
  solids() { return []; }
  kills() { return []; }
  draw() {
    ctx.fillStyle = theme.metal;
    ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h);
    ctx.fillStyle = this.pressed ? theme.accent : theme.ink;
    roundRect(this.x, this.y + this.dip * 5, this.w, 7, 3); ctx.fill();
  }
}

class Gate {
  // solid when closed; slides into the ceiling when its flag opens it.
  constructor(rect, key, opts = {}) {
    this.rect = { ...rect };
    this.key = key;
    this.invert = opts.invert ?? false;
    this.reset();
  }
  reset() { this.open = 0; }
  update(dt, g) {
    let want = !!g.flags[this.key];
    if (this.invert) want = !want;
    this.open = clamp(this.open + (want ? 1 : -1) * dt * 4, 0, 1);
  }
  _cur() {
    const r = this.rect;
    const shift = this.open * (r.h + 4);
    return R(r.x, r.y - shift, r.w, r.h);
  }
  solids() { return this.open > 0.92 ? [] : [this._cur()]; }
  kills() { return []; }
  draw() {
    const c = this._cur();
    ctx.fillStyle = theme.ink;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = theme.accent;
    for (let i = 0; i < 3; i++) ctx.fillRect(c.x + c.w / 2 - 2, c.y + 10 + i * (c.h / 3), 4, c.h / 6);
  }
}

class BlinkPlatform {
  // solid platform that phases in and out on a timer.
  constructor(rect, opts = {}) {
    this.rect = { ...rect };
    this.period = opts.period ?? 1.8;
    this.onFrac = opts.onFrac ?? 0.5;
    this.phase = opts.phase ?? 0;
    this.reset();
  }
  reset() { this.t = this.phase * this.period; }
  update(dt) { this.t += dt; }
  _on() { return (this.t % this.period) < this.period * this.onFrac; }
  solids() { return this._on() ? [this.rect] : []; }
  kills() { return []; }
  draw() {
    const on = this._on();
    const r = this.rect;
    if (on) {
      ctx.fillStyle = theme.ink;
      roundRect(r.x, r.y, r.w, r.h, 4); ctx.fill();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = theme.ink;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      roundRect(r.x, r.y, r.w, r.h, 4); ctx.stroke();
      ctx.restore();
    }
  }
}

class Pendulum {
  // swinging spiked bob mounted at (px,py).
  constructor(px, py, opts = {}) {
    this.px = px; this.py = py;
    this.len = opts.len ?? 380;
    this.amp = opts.amp ?? 0.85;
    this.speed = opts.speed ?? 1.6;
    this.r = opts.r ?? 18;
    this.phase = opts.phase ?? 0;
    this.reset();
  }
  reset() { this.t = this.phase; }
  update(dt) { this.t += dt; }
  _ang() { return Math.sin(this.t * this.speed) * this.amp; }
  _bob() { const a = this._ang(); return { x: this.px + Math.sin(a) * this.len, y: this.py + Math.cos(a) * this.len }; }
  solids() { return []; }
  kills() { const b = this._bob(); return [R(b.x - this.r * 0.66, b.y - this.r * 0.66, this.r * 1.32, this.r * 1.32)]; }
  draw() {
    const b = this._bob();
    ctx.strokeStyle = theme.metal;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(this.px, this.py); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(this.px, this.py, 5, 0, Math.PI * 2); ctx.fill();
    // spiked bob
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = theme.ink;
    const teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 0.5) / teeth) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * this.r, Math.sin(a0) * this.r);
      ctx.lineTo(Math.cos(a1) * this.r * 0.7, Math.sin(a1) * this.r * 0.7);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

class Turret {
  // fires projectiles horizontally on a timer.
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.dir = opts.dir ?? -1;
    this.period = opts.period ?? 1.6;
    this.speed = opts.speed ?? 260;
    this.phase = opts.phase ?? 0;
    this.r = opts.r ?? 7;
    this.reset();
  }
  reset() { this.t = this.phase * this.period; this.shots = []; }
  update(dt) {
    this.t += dt;
    if (this.t >= this.period) { this.t -= this.period; this.shots.push({ x: this.x, y: this.y }); AudioFX.pop(); }
    for (const s of this.shots) s.x += this.dir * this.speed * dt;
    this.shots = this.shots.filter((s) => s.x > -30 && s.x < W + 30);
  }
  solids() { return []; }
  kills() { return this.shots.map((s) => R(s.x - this.r, s.y - this.r, this.r * 2, this.r * 2)); }
  draw() {
    ctx.fillStyle = theme.metal;
    ctx.fillRect(this.x - (this.dir < 0 ? 4 : 14), this.y - 11, 18, 22);
    ctx.fillRect(this.x + (this.dir < 0 ? -14 : 6), this.y - 4, 10, 8);
    ctx.fillStyle = theme.danger;
    for (const s of this.shots) {
      ctx.beginPath(); ctx.arc(s.x, s.y, this.r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- doors & houses (Ethiopian Styles)
function drawGojoHouse(ctx, cx, cy, w = 120, h = 95, openFrac = 0) {
  ctx.save();
  const houseW = Math.max(110, w);
  const houseH = Math.max(90, h);
  const hx = cx - houseW / 2;

  // 1. Stone foundation base
  ctx.fillStyle = "#6D5843";
  ctx.fillRect(hx - 6, cy - 12, houseW + 12, 12);
  ctx.strokeStyle = "#38291A";
  ctx.lineWidth = 1;
  ctx.strokeRect(hx - 6, cy - 12, houseW + 12, 12);

  // 2. Mud & Wattle Wall (Earthen circular wall)
  const wallH = 48;
  const wallY = cy - 12 - wallH;
  ctx.fillStyle = "#8A5837";
  ctx.beginPath();
  ctx.moveTo(hx, wallY);
  ctx.lineTo(hx + houseW, wallY);
  ctx.lineTo(hx + houseW - 4, cy - 12);
  ctx.lineTo(hx + 4, cy - 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4D2C18";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Woven Ethiopian Tricolor Trim line on wall
  const stripeH = 3;
  ctx.fillStyle = "#009A44"; ctx.fillRect(hx + 8, wallY + 6, houseW - 16, stripeH);
  ctx.fillStyle = "#FED100"; ctx.fillRect(hx + 8, wallY + 6 + stripeH, houseW - 16, stripeH);
  ctx.fillStyle = "#E10600"; ctx.fillRect(hx + 8, wallY + 6 + stripeH * 2, houseW - 16, stripeH);

  // Side decor: Clay Jebena Coffee Pot on ground (left)
  const jebX = hx - 14;
  const jebY = cy - 6;
  ctx.fillStyle = "#4A2C1B";
  ctx.beginPath();
  ctx.arc(jebX, jebY - 6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(jebX - 2, jebY - 15, 4, 9);
  // Spout
  ctx.beginPath();
  ctx.moveTo(jebX + 2, jebY - 9);
  ctx.lineTo(jebX + 7, jebY - 13);
  ctx.stroke();

  // Side decor: Red Hanging Cloth / Banner on Wooden Posts (right)
  const postX = hx + houseW + 10;
  ctx.strokeStyle = "#5A3A22";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(postX, cy); ctx.lineTo(postX, cy - 35);
  ctx.moveTo(postX + 16, cy); ctx.lineTo(postX + 16, cy - 35);
  ctx.stroke();

  // Red hanging cloth banner
  ctx.fillStyle = "#C8261D";
  ctx.beginPath();
  ctx.moveTo(postX, cy - 30);
  ctx.quadraticCurveTo(postX + 8, cy - 20, postX + 16, cy - 30);
  ctx.lineTo(postX + 16, cy - 12);
  ctx.quadraticCurveTo(postX + 8, cy - 4, postX, cy - 12);
  ctx.closePath();
  ctx.fill();

  // 3. Conical Thatched Straw Roof
  const roofW = houseW + 28;
  const roofH = 52;
  const rx = cx - roofW / 2;
  const ry = wallY - roofH + 6;

  // Base straw cone
  ctx.fillStyle = "#CBA258";
  ctx.beginPath();
  ctx.moveTo(rx, wallY + 6);
  ctx.quadraticCurveTo(cx, wallY + 12, rx + roofW, wallY + 6);
  ctx.lineTo(cx, ry);
  ctx.closePath();
  ctx.fill();

  // Straw texture / folds
  ctx.fillStyle = "#A87D36";
  ctx.beginPath();
  ctx.moveTo(rx + 6, wallY + 4); ctx.lineTo(cx, ry); ctx.lineTo(rx + 22, wallY + 5); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rx + roofW - 6, wallY + 4); ctx.lineTo(cx, ry); ctx.lineTo(rx + roofW - 22, wallY + 5); ctx.fill();

  // Top Crown & Wooden Spire
  ctx.fillStyle = "#EBD59D";
  ctx.beginPath();
  ctx.moveTo(cx - 12, ry + 16);
  ctx.lineTo(cx, ry);
  ctx.lineTo(cx + 12, ry + 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#4A2C1B";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, ry + 4); ctx.lineTo(cx, ry - 14); ctx.stroke();

  ctx.fillStyle = "#8A5837";
  ctx.beginPath(); ctx.arc(cx, ry - 14, 3.5, 0, Math.PI * 2); ctx.fill();

  // 4. Entrance Doorway (Center bottom)
  const doorW = 36;
  const doorH = 50;
  const dx = cx - doorW / 2;
  const dy = cy - 12 - doorH;

  // Outer Door Frame
  ctx.fillStyle = "#3D2213";
  ctx.beginPath();
  ctx.moveTo(dx - 3, cy - 12);
  ctx.lineTo(dx - 3, dy + 8);
  ctx.quadraticCurveTo(cx, dy - 5, dx + doorW + 3, dy + 8);
  ctx.lineTo(dx + doorW + 3, cy - 12);
  ctx.closePath();
  ctx.fill();

  // Dark Inner Opening / Golden Glow
  ctx.fillStyle = "#120803";
  ctx.fillRect(dx, dy + 6, doorW, doorH - 6);

  if (openFrac > 0.05) {
    ctx.fillStyle = `rgba(255, 200, 80, ${openFrac * 0.85})`;
    ctx.fillRect(dx, dy + 6, doorW, doorH - 6);
  }

  // Double Wooden Doors (Pivot open based on openFrac)
  const leafW = doorW / 2;
  const pAngle = openFrac * Math.PI * 0.45;

  // Left Door Leaf
  ctx.save();
  ctx.translate(dx, dy + 6);
  ctx.rotate(-pAngle);
  ctx.fillStyle = "#633D25";
  ctx.fillRect(0, 0, leafW, doorH - 6);
  ctx.strokeStyle = "#2B170A";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, leafW, doorH - 6);
  // Handle
  ctx.fillStyle = "#D1A85B";
  ctx.beginPath(); ctx.arc(leafW - 4, (doorH - 6) / 2, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Right Door Leaf
  ctx.save();
  ctx.translate(dx + doorW, dy + 6);
  ctx.rotate(pAngle);
  ctx.fillStyle = "#633D25";
  ctx.fillRect(-leafW, 0, leafW, doorH - 6);
  ctx.strokeStyle = "#2B170A";
  ctx.lineWidth = 1;
  ctx.strokeRect(-leafW, 0, leafW, doorH - 6);
  // Handle
  ctx.fillStyle = "#D1A85B";
  ctx.beginPath(); ctx.arc(-leafW + 4, (doorH - 6) / 2, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawDoorShape(x, y, w, h, color = null, style = "gojo", openFrac = 0) {
  if (style === "gojo_house") {
    drawGojoHouse(ctx, x + w / 2, y + h, 120, 95, openFrac);
    return;
  }

  ctx.save();

  if (style === "wooden") {
    // Wooden Door Frame
    ctx.fillStyle = "#4A2A18";
    ctx.fillRect(x - 4, y - 4, w + 8, h + 4);
    ctx.fillStyle = "#2B170A";
    ctx.fillRect(x, y, w, h);

    if (openFrac > 0.05) {
      ctx.fillStyle = `rgba(255, 200, 80, ${openFrac * 0.9})`;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 2);
    }

    const leafW = w / 2;
    const pAngle = openFrac * Math.PI * 0.45;

    // Left Leaf
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pAngle);
    ctx.fillStyle = "#804A26";
    ctx.fillRect(0, 0, leafW, h);
    ctx.strokeStyle = "#31180A";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0, 0, leafW, h);
    ctx.restore();

    // Right Leaf
    ctx.save();
    ctx.translate(x + w, y);
    ctx.rotate(pAngle);
    ctx.fillStyle = "#804A26";
    ctx.fillRect(-leafW, 0, leafW, h);
    ctx.strokeStyle = "#31180A";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-leafW, 0, leafW, h);
    ctx.restore();

    // Ring Knocker Handle (if closed)
    if (openFrac < 0.2) {
      ctx.strokeStyle = "#FAC835";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.45, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (style === "axum") {
    // Axum Style Carved Stone Door
    ctx.fillStyle = "#B39E82";
    ctx.beginPath();
    ctx.moveTo(x - 5, y + h);
    ctx.lineTo(x - 5, y + 12);
    ctx.arc(x + w / 2, y + 12, w / 2 + 5, Math.PI, 0, false);
    ctx.lineTo(x + w + 5, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1B120B";
    ctx.fillRect(x, y + 14, w, h - 14);

    if (openFrac > 0.05) {
      ctx.fillStyle = `rgba(255, 200, 80, ${openFrac * 0.9})`;
      ctx.fillRect(x + 2, y + 16, w - 4, h - 16);
    }

    const leafW = w / 2;
    const pAngle = openFrac * Math.PI * 0.45;

    // Left stone leaf
    ctx.save();
    ctx.translate(x, y + 14);
    ctx.rotate(-pAngle);
    ctx.fillStyle = "#96836B";
    ctx.fillRect(0, 0, leafW, h - 14);
    ctx.strokeStyle = "#4D3B26";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, leafW, h - 14);
    ctx.restore();

    // Right stone leaf
    ctx.save();
    ctx.translate(x + w, y + 14);
    ctx.rotate(pAngle);
    ctx.fillStyle = "#96836B";
    ctx.fillRect(-leafW, 0, leafW, h - 14);
    ctx.strokeStyle = "#4D3B26";
    ctx.lineWidth = 1;
    ctx.strokeRect(-leafW, 0, leafW, h - 14);
    ctx.restore();

    // Carved cross top
    ctx.strokeStyle = "#4D3B26";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 4, y + 6); ctx.lineTo(x + w / 2 + 4, y + 6);
    ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + 10);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (style === "church") {
    // Church Door Arch with Ethiopian Cross
    ctx.fillStyle = "#3D2415";
    ctx.beginPath();
    ctx.moveTo(x - 4, y + h);
    ctx.lineTo(x - 4, y + 16);
    ctx.arc(x + w / 2, y + 16, w / 2 + 4, Math.PI, 0, false);
    ctx.lineTo(x + w + 4, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#120B06";
    ctx.fillRect(x, y + 18, w, h - 18);

    if (openFrac > 0.05) {
      ctx.fillStyle = `rgba(255, 200, 80, ${openFrac * 0.9})`;
      ctx.fillRect(x + 2, y + 20, w - 4, h - 20);
    }

    const leafW = w / 2;
    const pAngle = openFrac * Math.PI * 0.45;

    // Left wooden arch leaf
    ctx.save();
    ctx.translate(x, y + 18);
    ctx.rotate(-pAngle);
    ctx.fillStyle = "#633C24";
    ctx.fillRect(0, 0, leafW, h - 18);
    ctx.strokeStyle = "#2B190E";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, leafW, h - 18);
    ctx.restore();

    // Right wooden arch leaf
    ctx.save();
    ctx.translate(x + w, y + 18);
    ctx.rotate(pAngle);
    ctx.fillStyle = "#633C24";
    ctx.fillRect(-leafW, 0, leafW, h - 18);
    ctx.strokeStyle = "#2B190E";
    ctx.lineWidth = 1;
    ctx.strokeRect(-leafW, 0, leafW, h - 18);
    ctx.restore();

    // Orthodox Cross on Top
    ctx.strokeStyle = "#FAC835";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 6, y + 6); ctx.lineTo(x + w / 2 + 6, y + 6);
    ctx.moveTo(x + w / 2, y - 2); ctx.lineTo(x + w / 2, y + 12);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (style === "castle") {
    // Gondar / Fasil Ghebbi Castle Door with Battlements
    ctx.fillStyle = "#7D6B58";
    ctx.fillRect(x - 6, y + 10, w + 12, h - 10);
    // Battlements
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) ctx.fillRect(x - 6 + i * (w + 12) / 4, y - 2, (w + 12) / 4, 12);
    }

    ctx.fillStyle = "#120B06";
    ctx.fillRect(x, y + 22, w, h - 22);

    if (openFrac > 0.05) {
      ctx.fillStyle = `rgba(255, 200, 80, ${openFrac * 0.9})`;
      ctx.fillRect(x + 2, y + 24, w - 4, h - 24);
    }

    // Heavy iron-bound castle portcullis/gate (raises or opens)
    const liftY = openFrac * (h - 22);
    ctx.fillStyle = "#4A3525";
    ctx.fillRect(x + 1, y + 22 - liftY, w - 2, h - 22);
    ctx.strokeStyle = "#22140A";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 1, y + 22 - liftY, w - 2, h - 22);

    ctx.restore();
    return;
  }

  // Default: Gojo Bet Door (Thatched Straw Roof Overhang)
  const roofW = w + 16;
  const roofH = h * 0.52;
  const rx = x - 8;
  const ry = y - 4;

  // Roof shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.moveTo(rx, ry + roofH);
  ctx.lineTo(rx + roofW, ry + roofH);
  ctx.lineTo(rx + roofW / 2, ry - 6);
  ctx.closePath();
  ctx.fill();

  // Wall structure (Wattle & Daub / Wooden cylinder)
  const wallW = w;
  const wallH = h * 0.58;
  const wallX = x;
  const wallY = y + h - wallH;

  // Mud / Wood Wall background
  ctx.fillStyle = "#8A5633"; // Warm earth brown mud wall
  ctx.beginPath();
  ctx.moveTo(wallX + 2, wallY);
  ctx.lineTo(wallX + wallW - 2, wallY);
  ctx.lineTo(wallX + wallW, wallY + wallH);
  ctx.lineTo(wallX, wallY + wallH);
  ctx.closePath();
  ctx.fill();

  // Vertical wood texture slats
  ctx.strokeStyle = "#5C361D";
  ctx.lineWidth = 1.2;
  for (let i = 1; i <= 4; i++) {
    const wx = wallX + (wallW / 5) * i;
    ctx.beginPath();
    ctx.moveTo(wx, wallY);
    ctx.lineTo(wx, wallY + wallH);
    ctx.stroke();
  }

  // Woven Ethiopian Tricolor Lintel / Trim above door
  const lintelY = wallY + 6;
  const stripeH = 2.5;
  ctx.fillStyle = "#009A44"; ctx.fillRect(wallX + 6, lintelY, wallW - 12, stripeH);
  ctx.fillStyle = "#FED100"; ctx.fillRect(wallX + 6, lintelY + stripeH, wallW - 12, stripeH);
  ctx.fillStyle = "#E10600"; ctx.fillRect(wallX + 6, lintelY + stripeH * 2, wallW - 12, stripeH);

  // Arched Entrance Doorway
  const doorW = wallW - 16;
  const doorH = wallH - 16;
  const doorX = wallX + 8;
  const doorY = wallY + wallH - doorH;

  // Outer Door Arch Frame
  ctx.fillStyle = "#422312";
  ctx.beginPath();
  ctx.moveTo(doorX - 2, doorY + doorH);
  ctx.lineTo(doorX - 2, doorY + 6);
  ctx.quadraticCurveTo(doorX + doorW / 2, doorY - 4, doorX + doorW + 2, doorY + 6);
  ctx.lineTo(doorX + doorW + 2, doorY + doorH);
  ctx.closePath();
  ctx.fill();

  // Inner Dark / Glowing Doorway Opening
  ctx.fillStyle = color || "#1F120A";
  ctx.beginPath();
  ctx.moveTo(doorX, doorY + doorH);
  ctx.lineTo(doorX, doorY + 6);
  ctx.quadraticCurveTo(doorX + doorW / 2, doorY - 1, doorX + doorW, doorY + 6);
  ctx.lineTo(doorX + doorW, doorY + doorH);
  ctx.closePath();
  ctx.fill();

  // Door Handle / Keyhole
  ctx.fillStyle = "#FED100";
  ctx.beginPath();
  ctx.arc(doorX + doorW - 4, doorY + doorH / 2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Conical Straw Roof Layers
  ctx.fillStyle = "#C89B48";
  ctx.beginPath();
  ctx.moveTo(rx, ry + roofH);
  ctx.quadraticCurveTo(rx + roofW / 2, ry + roofH + 4, rx + roofW, ry + roofH);
  ctx.lineTo(rx + roofW / 2, ry - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#A87A30";
  ctx.beginPath();
  ctx.moveTo(rx + 4, ry + roofH - 2);
  ctx.lineTo(rx + roofW / 2, ry);
  ctx.lineTo(rx + 12, ry + roofH);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(rx + roofW - 4, ry + roofH - 2);
  ctx.lineTo(rx + roofW / 2, ry);
  ctx.lineTo(rx + roofW - 12, ry + roofH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#EAD18D";
  ctx.beginPath();
  ctx.moveTo(rx + 8, ry + roofH * 0.5);
  ctx.lineTo(rx + roofW / 2, ry - 6);
  ctx.lineTo(rx + roofW - 8, ry + roofH * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#5C361D";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rx + roofW / 2, ry - 2);
  ctx.lineTo(rx + roofW / 2, ry - 12);
  ctx.stroke();

  ctx.fillStyle = "#8A5633";
  ctx.beginPath();
  ctx.arc(rx + roofW / 2, ry - 12, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

class FakeDoor {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y; this.w = 38; this.h = 64;
    this.label = opts.label ?? null;
    this.reset();
  }
  reset() { this.sprung = false; this.out = 0; }
  update(dt, g) {
    if (!this.sprung && aabb(g.player, R(this.x - 2, this.y, this.w + 4, this.h))) {
      this.sprung = true;
      AudioFX.laugh();
    }
    if (this.sprung) this.out = clamp(this.out + 16 * dt, 0, 1);
  }
  solids() { return []; }
  kills() { return this.out > 0.4 ? [R(this.x - 6, this.y, this.w + 12, this.h)] : []; }
  draw() {
    drawDoorShape(this.x, this.y, this.w, this.h);
    if (this.label) {
      ctx.fillStyle = theme.ink;
      ctx.globalAlpha = 0.45;
      ctx.font = `italic 15px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(this.label, this.x + this.w / 2, this.y - 12);
      ctx.globalAlpha = 1;
    }
    if (this.out > 0.01) {
      const n = 4;
      ctx.fillStyle = theme.ink;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const by = this.y + this.h - i * (this.h / n);
        const len = 30 * this.out;
        ctx.moveTo(this.x + 4, by);
        ctx.lineTo(this.x - len, by - this.h / n / 2);
        ctx.lineTo(this.x + 4, by - this.h / n);
        ctx.moveTo(this.x + this.w - 4, by);
        ctx.lineTo(this.x + this.w + len, by - this.h / n / 2);
        ctx.lineTo(this.x + this.w - 4, by - this.h / n);
      }
      ctx.fill();
    }
  }
}

class Door {
  constructor(positions, opts = {}) {
    this.positions = positions.map((p) => ({ ...p }));
    this.fleeDist = opts.fleeDist ?? 110;
    this.customStyle = opts.style ?? null;
    this.w = opts.w ?? 38; this.h = opts.h ?? 64;
    this.reset();
  }
  reset() { this.i = 0; this.poofT = 0; }
  get pos() { return this.positions[this.i]; }
  get style() {
    if (this.customStyle) return this.customStyle;
    const styles = ["gojo_house", "straw", "axum", "church", "castle", "wooden"];
    return styles[Math.abs(Game.levelIndex || 0) % styles.length];
  }
  update(dt, g) {
    this.poofT = Math.max(0, this.poofT - dt);
    if (this.i < this.positions.length - 1) {
      const p = g.player;
      const dx = (p.x + p.w / 2) - (this.pos.x + this.w / 2);
      const dy = (p.y + p.h / 2) - (this.pos.y + this.h / 2);
      if (Math.hypot(dx, dy) < this.fleeDist) {
        spawnPoof(this.pos.x + this.w / 2, this.pos.y + this.h / 2);
        this.i++;
        this.poofT = 0.25;
        spawnPoof(this.pos.x + this.w / 2, this.pos.y + this.h / 2);
        AudioFX.poof();
        if (this.i === this.positions.length - 1) AudioFX.laugh();
      }
    }
  }
  playerWins(p) {
    const r = R(this.pos.x + 6, this.pos.y + 6, this.w - 12, this.h - 6);
    return this.i === this.positions.length - 1 && aabb(p, r);
  }
  draw() {
    const s = this.poofT > 0 ? 1 + this.poofT * 1.2 : 1;
    ctx.save();
    ctx.translate(this.pos.x + this.w / 2, this.pos.y + this.h);
    ctx.scale(s, s);
    ctx.translate(-(this.w / 2), -this.h);

    const isWinState = Game.state === "win";
    let openFrac = 0;
    if (isWinState) {
      if (Game.winT <= 0.25) {
        // Smooth opening ease-out: 0 to 1 over 0.25s
        const t = Game.winT / 0.25;
        openFrac = Math.sin(t * Math.PI / 2);
      } else if (Game.winT <= 0.55) {
        // Smooth closing ease-in-out: 1 to 0 over 0.3s
        const t = (Game.winT - 0.25) / 0.30;
        openFrac = 0.5 + 0.5 * Math.cos(t * Math.PI);
      } else {
        openFrac = 0;
      }
    }

    drawDoorShape(0, 0, this.w, this.h, null, this.style, openFrac);
    ctx.restore();
  }
}

const FleeingDoor = Door;

// ---------------------------------------------------------------- decor text
class Note {
  constructor(x, y, text, opts = {}) {
    this.x = x; this.y = y; this.text = text;
    this.size = opts.size ?? 16;
    this.angle = opts.angle ?? 0;
  }
  reset() {} update() {} solids() { return []; } kills() { return []; }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.36;
    ctx.font = `italic ${this.size}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

// ================================================================ LEVELS
const floorSeg = (x0, x1, y = 480) => R(x0, y, x1 - x0, H - y);
const wallL = () => R(-40, -200, 40, H + 400);
const wallR = () => R(W, -200, 40, H + 400);
const roof = (h = 30) => R(0, 0, W, h);

const LEVELS = [
  // ---------------------------------------------------- 1
  {
    name: "INJERA HAS TRUST ISSUES",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door(
        [{ x: 876, y: 416 }, { x: 548, y: 416 }],
        { fleeDist: 92 }
      ),
      solids: [floorSeg(0, 400), floorSeg(500, 960), wallL(), wallR()],
      traps: [
        new CollapseFloor(R(400, 480, 100, 60), R(400, 405, 100, 75), { delay: 0.01, shakeTime: 0.045 }),
        new FallBlock(R(608, 44, 62, 42), R(548, 240, 36, 240), { shakeTime: 0.06 }),
        new PopSpikes(760, 480, 80, R(708, 330, 26, 150), { delay: 0.06 }),
        new PopSpikes(532, 480, 58, R(650, 330, 24, 150), { delay: 1.15 }),
        new Saw([{ x: 250, y: 454 }, { x: 340, y: 454 }], { r: 17, speed: 92 }),
        new Note(210, 430, "easy as sharing injera :)"),
      ],
    }),
  },
  // ---------------------------------------------------- 2
  {
    name: "BUNA BREAK? NOT YET",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door([{ x: 876, y: 416 }]),
      solids: [floorSeg(0, 200), floorSeg(760, 960), wallL(), wallR()],
      traps: [
        new CrumblePlatform(R(270, 408, 92, 16), { delay: 0.32 }),
        new CrumblePlatform(R(430, 360, 92, 16), { delay: 0.32 }),
        new CrumblePlatform(R(590, 408, 92, 16), { delay: 0.18 }),
        new FallBlock(R(440, 40, 70, 42), R(430, 200, 92, 170), { floorY: 540 }),
        new StaticSpikes(200, 540, 560, { size: 32 }),
        new Saw([{ x: 540, y: 332 }, { x: 540, y: 408 }], { r: 18, speed: 86 }),
        new PopSpikes(764, 480, 70, R(700, 330, 20, 150), { delay: 0.02 }),
        new Note(310, 380, "they look sturdy", { angle: -0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 3
  {
    name: "SIMIEN SWITCHBACK",
    build: () => ({
      spawn: { x: 50, y: 440 },
      door: new Door([{ x: 880, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new ChasingThornVines(180, 760, { y: 480, maxH: 80, waveSpeed: 190 }),
        new PopSpikes(220, 480, 64, null, { period: 1.7, phase: 0.0, holdOut: 0.75 }),
        new PopSpikes(330, 480, 64, null, { period: 1.7, phase: 0.28, holdOut: 0.75 }),
        new PopSpikes(440, 480, 64, null, { period: 1.7, phase: 0.56, holdOut: 0.75 }),
        new PopSpikes(550, 480, 64, null, { period: 1.7, phase: 0.84, holdOut: 0.75 }),
        new PopSpikes(660, 480, 64, null, { period: 1.7, phase: 1.12, holdOut: 0.75 }),
        new PopSpikes(790, 480, 76, R(742, 330, 18, 150), { delay: 0.05 }),
        new Pendulum(520, 38, { len: 300, amp: 0.42, speed: 1.25, r: 16 }),
        new Note(120, 420, "run fast!", { angle: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 4
  {
    name: "HIGHLAND SKYFALL",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 876, y: 416 }]),
      solids: [floorSeg(0, 960), roof(40), wallL(), wallR()],
      traps: [
        new FallBlock(R(200, 40, 64, 42), R(180, 200, 104, 280)),
        new FallBlock(R(360, 40, 64, 42), R(340, 200, 104, 280)),
        new FallBlock(R(520, 40, 64, 42), R(500, 200, 104, 280)),
        new FallBlock(R(680, 40, 64, 42), R(660, 200, 104, 280)),
        new FallBlock(R(820, 40, 76, 42), R(770, 200, 40, 280), { shakeTime: 0.04 }),
        new Saw([{ x: 300, y: 452 }, { x: 610, y: 452 }], { r: 17, speed: 112 }),
        new Note(120, 100, "look up.", { size: 14 }),
      ],
    }),
  },
  // ---------------------------------------------------- 5  (NEW: moving platform)
  {
    name: "BLUE NILE EXPRESS",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 300), floorSeg(620, 960), wallL(), wallR()],
      traps: [
        new MovingPlatform(R(300, 452, 100, 16), { toX: 520, speed: 95, pause: 0.5 }),
        new Note(160, 430, "hop on. free ride :)"),
        new PopSpikes(806, 480, 70, R(706, 330, 18, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 6  (fleeing door)
  {
    name: "CATCH THE GOJO",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door(
        [
          { x: 870, y: 416 },
          { x: 470, y: 416 },
          { x: 120, y: 416 },
          { x: 856, y: 288 },
        ],
        { fleeDist: 105 }
      ),
      solids: [floorSeg(0, 960), R(640, 420, 92, 14), R(800, 352, 160, 16), wallL(), wallR()],
      traps: [
        new ChasingThornVines(140, 820, { y: 480, maxH: 85, waveSpeed: 195 }),
        new PopSpikes(652, 420, 68, R(640, 320, 92, 100), { delay: 0.45 }),
        new Note(760, 250, "it just wants a hug"),
      ],
    }),
  },
  // ---------------------------------------------------- 7  (NEW: conveyor)
  {
    name: "ADDIS RUSH HOUR",
    build: () => ({
      spawn: { x: 150, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(120, 960), wallL(), wallR()],
      traps: [
        new Conveyor(R(300, 480, 320, 60), { dir: -1, force: 165 }),
        new FireBrazier(580, 480, { w: 70, h: 30, flameH: 60, period: 2.0, phase: 0.0 }),
        new Note(450, 430, "keep walking →"),
        new PopSpikes(812, 480, 66, R(720, 330, 16, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 8  (sliding hole)
  {
    name: "RIFT VALLEY RUSE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 880, y: 416 }]),
      solids: [wallL(), wallR()],
      traps: [
        new SlidingHole(0, 960, { gapW: 96, startGap: 760, speed: 150, trigger: R(120, 300, 20, 180) }),
        new PopSpikes(806, 480, 64, R(756, 330, 16, 150), { delay: 0.03 }),
        new Note(420, 420, "the hole is friendly", { angle: -0.03 }),
      ],
    }),
  },
  // ---------------------------------------------------- 9  (NEW: spring)
  {
    name: "TEFF SPRING",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door([{ x: 884, y: 226 }]),
      solids: [floorSeg(0, 440), R(480, 290, 480, 16), wallL(), wallR()],
      traps: [
        new Spring(360, 480, { power: -1220 }),
        new FireBrazier(650, 290, { w: 68, h: 28, flameH: 55 }),
        new Note(160, 430, "trampoline time"),
        new PopSpikes(780, 290, 60, R(580, 200, 18, 90), { delay: 0.3 }),
      ],
    }),
  },
  // ---------------------------------------------------- 10 (invert)
  {
    name: "GEEZ DIRECTION",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 880, y: 416 }]),
      solids: [floorSeg(0, 350), floorSeg(430, 540), floorSeg(620, 960), wallL(), wallR()],
      traps: [
        new InvertZone(R(280, 0, 420, 480)),
        new StaticSpikes(355, 540, 70, { dir: "up", size: 40 }),
        new StaticSpikes(545, 540, 70, { dir: "up", size: 40 }),
        new PopSpikes(700, 480, 64, R(648, 330, 16, 150), { delay: 0.4 }),
        new Note(490, 300, "sdrawkcab", { size: 18 }),
      ],
    }),
  },
  // ---------------------------------------------------- 11 (NEW: blink platforms)
  {
    name: "AXUM VANISHING ACT",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 250), floorSeg(740, 960), wallL(), wallR()],
      traps: [
        new BlinkPlatform(R(300, 430, 96, 16), { period: 1.7, onFrac: 0.62, phase: 0.0 }),
        new BlinkPlatform(R(444, 400, 96, 16), { period: 1.7, onFrac: 0.62, phase: 0.34 }),
        new BlinkPlatform(R(588, 430, 96, 16), { period: 1.7, onFrac: 0.62, phase: 0.68 }),
        new Note(150, 430, "now you don't"),
        new PopSpikes(806, 480, 66, R(720, 330, 16, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 12 (fake doors)
  {
    name: "HARAR'S HIDDEN DOOR",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new FakeDoor(380, 416, { label: "definitely this one" }),
        new FakeDoor(600, 416, { label: "or this one?" }),
        new FallBlock(R(800, 40, 70, 42), R(745, 200, 50, 280), { shakeTime: 0.05 }),
        new PopSpikes(700, 480, 70, R(560, 330, 30, 150), { delay: 0.85 }),
        new Note(884 + 19, 396, "scam", { size: 13, angle: 0.06 }),
      ],
    }),
  },
  // ---------------------------------------------------- 13 (NEW: saw)
  {
    name: "SIMIEN SAWTOOTH",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Saw([{ x: 300, y: 444 }, { x: 640, y: 444 }], { r: 24, speed: 165 }),
        new Saw([{ x: 520, y: 90 }, { x: 520, y: 430 }], { r: 22, speed: 185 }),
        new Note(150, 430, "perfectly safe"),
        new PopSpikes(820, 480, 64, R(740, 330, 16, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 14 (crushers)
  {
    name: "GONDAR CRUSH",
    build: () => ({
      spawn: { x: 50, y: 440 },
      door: new Door([{ x: 880, y: 416 }]),
      solids: [floorSeg(0, 960), roof(36), wallL(), wallR()],
      traps: [
        new Crusher(230, 92, { topY: 36, period: 1.9, phase: 0.0 }),
        new Crusher(450, 92, { topY: 36, period: 1.9, phase: 0.95 }),
        new Crusher(640, 92, { topY: 36, period: 1.9, phase: 0.45 }),
        new Crusher(806, 100, { topY: 36, trigger: R(770, 320, 12, 160), slamSpeed: 2100 }),
        new Note(340, 110, "nice and flat here"),
      ],
    }),
  },
  // ---------------------------------------------------- 15 (NEW: laser)
  {
    name: "DANAKIL FLASH",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Laser({ x: 300, y: 30, len: 418, vertical: true, period: 2.2, warn: 0.55, fire: 0.5, phase: 0.0 }),
        new Laser({ x: 480, y: 30, len: 418, vertical: true, period: 2.2, warn: 0.55, fire: 0.5, phase: 0.5 }),
        new Laser({ x: 660, y: 30, len: 418, vertical: true, period: 2.2, warn: 0.55, fire: 0.5, phase: 1.0 }),
        new Note(150, 430, "hold still"),
        new PopSpikes(820, 480, 64, R(740, 330, 16, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 16 (NEW: teleporter)
  {
    name: "TANA CROSSING",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 360), floorSeg(620, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(360, 540, 260, { dir: "up", size: 44 }),
        new Teleporter(300, 432, 648, 432, { w: 30, h: 48, twoWay: false }),
        new Note(170, 430, "step in →"),
        new PopSpikes(806, 480, 66, R(720, 330, 16, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 17 (NEW: pendulum)
  {
    name: "MESKEL TICK TOCK",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Pendulum(240, 30, { len: 400, amp: 0.85, speed: 1.6, r: 18, phase: 0.0 }),
        new Pendulum(470, 30, { len: 400, amp: 0.85, speed: 1.6, r: 18, phase: 1.1 }),
        new Pendulum(700, 30, { len: 400, amp: 0.85, speed: 1.6, r: 18, phase: 2.2 }),
        new Note(150, 430, "mind the swing"),
        new PopSpikes(844, 480, 58, R(764, 330, 14, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 18 (NEW: turret)
  {
    name: "ADWA INCOMING",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new FireBrazier(580, 480, { w: 72, h: 32, flameH: 60, period: 2.2, phase: 0.5 }),
        new Turret(942, 430, { dir: -1, period: 1.3, speed: 300, phase: 0.0 }),
        new Turret(942, 388, { dir: -1, period: 1.7, speed: 250, phase: 0.6 }),
        new Note(150, 430, "duck! (you can't)"),
        new PopSpikes(300, 480, 64, null, { period: 1.8, phase: 0, holdOut: 0.7 }),
      ],
    }),
  },
  // ---------------------------------------------------- 19 (NEW: button + gate)
  {
    name: "COFFEE CEREMONY BUTTON",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new Button(330, 470, "g", { momentary: false }),
        new Gate(R(620, 300, 28, 180), "g"),
        new FakeDoor(720, 416, { label: "this way!" }),
        new PopSpikes(812, 480, 66, R(740, 330, 16, 150), { delay: 0.05 }),
        new Note(352, 440, "press to open the gate"),
      ],
    }),
  },
  // ---------------------------------------------------- 20 (NEW: ferries + spikes)
  {
    name: "ENTOTO ELEVATOR",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 300), floorSeg(660, 960), R(450, 330, 120, 16), wallL(), wallR()],
      traps: [
        new StaticSpikes(300, 540, 360, { dir: "up", size: 46 }),
        new MovingPlatform(R(300, 452, 120, 16), { toY: 320, speed: 62, pause: 0.45 }),
        new MovingPlatform(R(560, 320, 120, 16), { toY: 452, speed: 62, pause: 0.45, phase: 0.5 }),
        new Note(150, 430, "going up ↑"),
        new PopSpikes(812, 480, 64, R(740, 330, 16, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 21 (NEW: conveyor + crushers)
  {
    name: "ADDIS CONVEYOR",
    build: () => ({
      spawn: { x: 80, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Conveyor(R(260, 480, 420, 60), { dir: 1, force: 150 }),
        new Crusher(360, 90, { topY: 30, period: 1.7, phase: 0.0 }),
        new Crusher(520, 90, { topY: 30, period: 1.7, phase: 0.85 }),
        new Crusher(660, 90, { topY: 30, period: 1.7, phase: 0.4 }),
        new Note(150, 430, "belt + hammers, fun"),
        new PopSpikes(812, 480, 64, R(740, 330, 16, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 22 (NEW: springs)
  {
    name: "BALE MOUNTAIN BOUNCE",
    build: () => ({
      spawn: { x: 60, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 300), floorSeg(460, 650), floorSeg(790, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(300, 540, 160, { dir: "up", size: 44 }),
        new StaticSpikes(650, 540, 140, { dir: "up", size: 44 }),
        new Spring(250, 480, { power: -1080 }),
        new Spring(600, 480, { power: -1080 }),
        new Note(150, 430, "run and bounce →"),
        new PopSpikes(820, 480, 64, R(742, 330, 16, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 23 (NEW: blink + saw)
  {
    name: "WALIA PEEKABOO",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 260), floorSeg(700, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(260, 540, 440, { dir: "up", size: 46 }),
        new BlinkPlatform(R(320, 420, 100, 16), { period: 1.6, onFrac: 0.6, phase: 0.0 }),
        new BlinkPlatform(R(540, 420, 100, 16), { period: 1.6, onFrac: 0.6, phase: 0.5 }),
        new Saw([{ x: 480, y: 150 }, { x: 480, y: 360 }], { r: 22, speed: 180 }),
        new Note(150, 430, "time it"),
        new PopSpikes(806, 480, 66, R(720, 330, 16, 150), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 24 (NEW: turret + laser)
  {
    name: "RIFT VALLEY CROSSFIRE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Turret(942, 430, { dir: -1, period: 1.2, speed: 300 }),
        new Laser({ x: 430, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.45, phase: 0.0 }),
        new Laser({ x: 620, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.45, phase: 0.5 }),
        new Note(150, 430, "crossfire!"),
        new PopSpikes(280, 480, 64, null, { period: 1.7, phase: 0, holdOut: 0.7 }),
      ],
    }),
  },
  // ---------------------------------------------------- 25 (NEW: teleporter + platform)
  {
    name: "AFAR PORTAL HOP",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 196 }]),
      solids: [floorSeg(0, 300), floorSeg(640, 960), R(760, 260, 200, 16), wallL(), wallR()],
      traps: [
        new StaticSpikes(300, 540, 340, { dir: "up", size: 46 }),
        new MovingPlatform(R(320, 452, 100, 16), { toX: 520, speed: 95, pause: 0.4 }),
        new Teleporter(700, 432, 820, 222, { w: 30, h: 48, twoWay: false }),
        new Note(150, 430, "ride, then warp up"),
        new PopSpikes(806, 260, 60, R(720, 180, 16, 80), { delay: 0.05 }),
      ],
    }),
  },
  // ---------------------------------------------------- 26 (NEW: pop spikes + lasers)
  {
    name: "ESKISTA RHYTHM",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new PopSpikes(240, 480, 64, null, { period: 1.5, phase: 0.0, holdOut: 0.7 }),
        new PopSpikes(360, 480, 64, null, { period: 1.5, phase: 0.3, holdOut: 0.7 }),
        new PopSpikes(480, 480, 64, null, { period: 1.5, phase: 0.6, holdOut: 0.7 }),
        new Laser({ x: 600, y: 30, len: 418, vertical: true, period: 1.8, warn: 0.45, fire: 0.4, phase: 0.0 }),
        new Laser({ x: 720, y: 30, len: 418, vertical: true, period: 1.8, warn: 0.45, fire: 0.4, phase: 0.9 }),
        new Note(150, 430, "feel the beat"),
        new PopSpikes(844, 480, 58, R(770, 330, 14, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 27 (NEW: mixed sampler)
  {
    name: "ETHIOPIAN PLATTER",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 360), floorSeg(540, 960), roof(30), wallL(), wallR()],
      traps: [
        new Conveyor(R(120, 480, 200, 60), { dir: 1, force: 120 }),
        new StaticSpikes(360, 540, 180, { dir: "up", size: 44 }),
        new MovingPlatform(R(360, 452, 100, 16), { toX: 450, speed: 80, pause: 0.4 }),
        new Saw([{ x: 660, y: 150 }, { x: 660, y: 360 }], { r: 20, speed: 170 }),
        new Crusher(770, 90, { topY: 30, period: 1.8, phase: 0.3 }),
        new Note(150, 430, "a bit of everything"),
        new PopSpikes(844, 480, 58, R(800, 330, 14, 150), { delay: 0.04 }),
      ],
    }),
  },
  // ---------------------------------------------------- 28 (NEW: trust nobody)
  {
    name: "TRUST NO HYENA",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 620), floorSeg(770, 960), wallL(), wallR()],
      traps: [
        new FakeDoor(300, 416, { label: "100% real" }),
        new FakeDoor(520, 416, { label: "trust me" }),
        new CollapseFloor(R(620, 480, 150, 60), R(560, 300, 30, 180)),
        new Button(700, 470, "x", { momentary: false }),
        new FallBlock(R(820, 40, 70, 42), R(790, 200, 40, 280), { shakeTime: 0.05 }),
        new Note(150, 430, "trust nobody"),
      ],
    }),
  },
  // ---------------------------------------------------- 29 (the gauntlet)
  {
    name: "HIGHLAND GAUNTLET",
    build: () => ({
      spawn: { x: 45, y: 440 },
      door: new Door(
        [
          { x: 884, y: 416 },
          { x: 70, y: 200 },
        ],
        { fleeDist: 70 }
      ),
      solids: [
        floorSeg(0, 230), floorSeg(360, 500), floorSeg(790, 960),
        R(40, 264, 130, 16), R(205, 336, 90, 14), R(330, 410, 80, 14),
        wallL(), wallR(),
      ],
      traps: [
        new CollapseFloor(R(230, 480, 130, 60), R(170, 280, 24, 200)),
        new FallBlock(R(420, 40, 64, 42), R(400, 200, 104, 280)),
        new SlidingHole(500, 790, { gapW: 88, startGap: 740, speed: 135, trigger: R(470, 300, 20, 180) }),
        new PopSpikes(800, 480, 70, R(750, 330, 20, 150), { delay: 0.05 }),
        new PopSpikes(218, 336, 64, R(205, 240, 90, 96), { delay: 0.5 }),
        new Note(600, 430, "almost there :)"),
        new Note(105, 240, "ok fine. you earned it.", { size: 13 }),
      ],
    }),
  },
  // ---------------------------------------------------- 30 (NEW: SPIKED WHEEL CHAMPION)
  {
    name: "THE SPIKED WHEEL CHAMPION",
    build: () => ({
      spawn: { x: 50, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [
        floorSeg(0, 200),
        R(240, 390, 130, 16),
        R(410, 300, 120, 16),
        R(580, 210, 120, 16),
        floorSeg(740, 960),
        roof(30),
        wallL(),
        wallR()
      ],
      traps: [
        // Spiked Wooden Wheel 1 patrolling the bottom gap
        new Saw([{ x: 200, y: 460 }, { x: 400, y: 460 }], { r: 24, speed: 120 }),
        // Spiked Wooden Wheel 2 patrolling vertically between platforms
        new Saw([{ x: 380, y: 150 }, { x: 380, y: 380 }], { r: 24, speed: 150 }),
        // Spiked Wooden Wheel 3 guarding upper platform transition
        new Saw([{ x: 550, y: 150 }, { x: 720, y: 150 }], { r: 22, speed: 140 }),
        // Moving platform for a smooth, skill-based crossing
        new MovingPlatform(R(550, 360, 110, 16), { toX: 680, speed: 85, pause: 0.3 }),
        // Pop spikes near door platform requiring timed jump
        new PopSpikes(830, 480, 60, R(760, 350, 20, 150), { delay: 0.05 }),
        new Note(120, 430, "no trampolines, pure skill!"),
        new Note(450, 270, "watch out for the spiked wheels!"),
      ],
    }),
  },
];

const MITMITA_LEVELS = [
  // 1: SPICY WELCOME
  {
    name: "SPICY WELCOME",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 360), floorSeg(760, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(360, 540, 400, { dir: "up", size: 46 }),
        new FireBrazier(240, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new CollapseFloor(R(360, 480, 160, 60), R(320, 300, 20, 180)),
        new SlidingHole(520, 760, { gapW: 90, startGap: 700, speed: 200, trigger: R(440, 300, 20, 180) }),
        new FireBrazier(680, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.8 }),
        new FallBlock(R(820, 40, 70, 40), R(780, 300, 70, 180)),
        new PopSpikes(840, 480, 50, R(790, 300, 20, 180), { period: 0 }),
        new Note(150, 430, "🌶️ Mitmita: JUMP OVER FIRE!"),
      ],
    }),
  },

  // 2: RUNAWAY DOOR & UNDERGROUND FIRE
  {
    name: "RUNAWAY DOOR & UNDERGROUND FIRE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new FleeingDoor(
        [{ x: 884, y: 416 }, { x: 480, y: 280 }, { x: 80, y: 200 }],
        { fleeDist: 110 }
      ),
      solids: [
        floorSeg(0, 960),
        R(420, 340, 140, 16),
        R(40, 260, 140, 16),
        wallL(), wallR()
      ],
      traps: [
        new FireBrazier(280, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new FireBrazier(660, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.9 }),
        new FallBlock(R(200, 40, 70, 40), R(160, 300, 70, 180)),
        new Spring(180, 480, { power: -1100 }),
        new PopSpikes(480, 340, 60, R(420, 200, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 3: CEILING CRUSHERS & FIRE PITS
  {
    name: "CEILING CRUSHERS & FIRE PITS",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 300), floorSeg(640, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(300, 540, 340, { dir: "up", size: 46 }),
        new Crusher(380, 90, { topY: 30, period: 1.8, phase: 0.0 }),
        new Crusher(540, 90, { topY: 30, period: 1.8, phase: 0.9 }),
        new MovingPlatform(R(330, 452, 90, 16), { toX: 550, speed: 120, pause: 0.25 }),
        new FireBrazier(720, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.3 }),
        new Turret(942, 400, { dir: -1, period: 1.5, speed: 280 }),
      ],
    }),
  },

  // 4: DOUBLE FAKE DOOR & LASER TRAP
  {
    name: "DOUBLE FAKE DOOR & LASER TRAP",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 236 }]),
      solids: [
        floorSeg(0, 960),
        R(820, 280, 140, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new FakeDoor(260, 416, { label: "SHORTCUT!" }),
        new FakeDoor(520, 416, { label: "100% REAL" }),
        new PopSpikes(260, 480, 60, null, { period: 1.8, phase: 0.0, holdOut: 0.6 }),
        new PopSpikes(520, 480, 60, null, { period: 1.8, phase: 0.9, holdOut: 0.6 }),
        new Laser({ x: 390, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.2 }),
        new FireBrazier(680, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.5 }),
        new Spring(760, 480, { power: -1150 }),
      ],
    }),
  },

  // 5: CHASING VINES & FIRE GAUNTLET
  {
    name: "CHASING VINES & FIRE GAUNTLET",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new ChasingThornVines({ startX: 0, endX: 920, speed: 130, h: 480, delay: 0.8 }),
        new FireBrazier(260, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.0 }),
        new FireBrazier(480, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.5 }),
        new FireBrazier(700, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 1.0 }),
        new PopSpikes(830, 480, 50, R(780, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 6: THE TROLL SWITCH & TELEPORT PIT
  {
    name: "THE TROLL SWITCH & TELEPORT PIT",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 480), floorSeg(620, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(480, 540, 140, { dir: "up", size: 46 }),
        new Button(280, 470, "g1", { momentary: false }),
        new Gate(R(780, 300, 28, 180), "g1"),
        new FallBlock(R(270, 40, 80, 40), R(240, 300, 80, 180)),
        new Note(280, 430, "PRESS TO OPEN!"),
        new Teleporter(380, 432, 530, 432, { w: 30, h: 48, twoWay: false }),
        new MovingPlatform(R(480, 480, 80, 16), { toX: 600, speed: 100, pause: 0.2 }),
        new FireBrazier(680, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.2 }),
      ],
    }),
  },

  // 7: SPICY RAIN & COLLAPSING FLOOR
  {
    name: "SPICY RAIN & COLLAPSING FLOOR",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 200), floorSeg(780, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(200, 540, 580, { dir: "up", size: 46 }),
        new CollapseFloor(R(220, 480, 120, 60), R(180, 300, 20, 180)),
        new CollapseFloor(R(380, 480, 120, 60), R(340, 300, 20, 180)),
        new CollapseFloor(R(540, 480, 120, 60), R(500, 300, 20, 180)),
        new FallBlock(R(260, 40, 70, 40), R(220, 300, 60, 180)),
        new FallBlock(R(420, 40, 70, 40), R(380, 300, 60, 180)),
        new FallBlock(R(580, 40, 70, 40), R(540, 300, 60, 180)),
        new FireBrazier(720, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
      ],
    }),
  },

  // 8: FLOATING ILLUSION & SAWS
  {
    name: "FLOATING ILLUSION & SAWS",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 220), floorSeg(780, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(220, 540, 560, { dir: "up", size: 46 }),
        new BlinkPlatform(R(250, 420, 90, 16), { period: 1.8, onFrac: 0.6, phase: 0.0 }),
        new BlinkPlatform(R(410, 420, 90, 16), { period: 1.8, onFrac: 0.6, phase: 0.6 }),
        new Saw([{ x: 560, y: 150 }, { x: 560, y: 390 }], { r: 22, speed: 200 }),
        new BlinkPlatform(R(620, 420, 90, 16), { period: 1.8, onFrac: 0.6, phase: 1.2 }),
      ],
    }),
  },

  // 9: TRIPLE LASER INFERNO
  {
    name: "TRIPLE LASER INFERNO",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Laser({ x: 250, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.0 }),
        new FireBrazier(365, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.2 }),
        new Laser({ x: 480, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.6 }),
        new FireBrazier(595, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.8 }),
        new Laser({ x: 710, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 1.2 }),
        new Turret(942, 388, { dir: -1, period: 1.5, speed: 280 }),
      ],
    }),
  },

  // 10: CONVEYOR CHAOS & UNDERGROUND FIRE
  {
    name: "CONVEYOR CHAOS & UNDERGROUND FIRE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Conveyor(R(160, 480, 240, 60), { dir: 1, force: 180 }),
        new FireBrazier(290, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new Crusher(360, 90, { topY: 30, period: 1.6, phase: 0.0 }),
        new Conveyor(R(440, 480, 240, 60), { dir: -1, force: 180 }),
        new FireBrazier(570, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.7 }),
        new PopSpikes(760, 480, 60, R(710, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 11: TELEPORT MAZE OF SURPRISES
  {
    name: "TELEPORT MAZE OF SURPRISES",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 196 }]),
      solids: [
        floorSeg(0, 280),
        floorSeg(400, 520),
        floorSeg(680, 960),
        R(750, 240, 210, 16),
        wallL(), wallR()
      ],
      traps: [
        new StaticSpikes(280, 540, 120, { dir: "up", size: 46 }),
        new StaticSpikes(520, 540, 160, { dir: "up", size: 46 }),
        new Teleporter(200, 432, 460, 432, { w: 30, h: 48, twoWay: false }),
        new FireBrazier(600, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new Teleporter(490, 432, 780, 202, { w: 30, h: 48, twoWay: false }),
        new Saw([{ x: 600, y: 120 }, { x: 600, y: 380 }], { r: 22, speed: 200 }),
        new PopSpikes(820, 240, 50, null, { period: 1.8, phase: 0.0, holdOut: 0.6 }),
      ],
    }),
  },

  // 12: PENDULUM OF DEATH & FIRE PITS
  {
    name: "PENDULUM OF DEATH & FIRE PITS",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 260), floorSeg(680, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(260, 540, 420, { dir: "up", size: 46 }),
        new Spring(180, 480, { power: -1150 }),
        new Pendulum(440, 30, { len: 360, amp: 0.9, speed: 1.8, r: 20 }),
        new MovingPlatform(R(300, 420, 90, 16), { toX: 580, speed: 110, pause: 0.25 }),
        new FireBrazier(720, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.4 }),
        new FallBlock(R(450, 40, 80, 40), R(400, 300, 80, 180)),
      ],
    }),
  },

  // 13: DOUBLE SLIDING PITS & FIRE
  {
    name: "DOUBLE SLIDING PITS & FIRE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 220), floorSeg(720, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(220, 540, 500, { dir: "up", size: 46 }),
        new SlidingHole(220, 450, { gapW: 85, startGap: 220, speed: 160, trigger: R(160, 300, 20, 180) }),
        new FireBrazier(380, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new SlidingHole(500, 720, { gapW: 85, startGap: 720, speed: -160, trigger: R(440, 300, 20, 180) }),
        new FireBrazier(650, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.75 }),
        new PopSpikes(830, 480, 50, R(780, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 14: TRIPLE FAKE & RUNAWAY GATE
  {
    name: "TRIPLE FAKE & RUNAWAY GATE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new FleeingDoor(
        [{ x: 884, y: 416 }, { x: 80, y: 200 }],
        { fleeDist: 110 }
      ),
      solids: [
        floorSeg(0, 960),
        R(40, 260, 150, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new FakeDoor(240, 416, { label: "EASY WIN" }),
        new FakeDoor(520, 416, { label: "100% REAL" }),
        new Crusher(240, 90, { topY: 30, period: 1.6, phase: 0.0 }),
        new PopSpikes(520, 480, 60, null, { period: 1.8, phase: 0.0, holdOut: 0.6 }),
        new FireBrazier(380, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new FireBrazier(660, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.5 }),
        new Spring(780, 480, { power: -1100 }),
      ],
    }),
  },

  // 15: THE MITMITA GAUNTLET
  {
    name: "THE MITMITA GAUNTLET",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new FleeingDoor(
        [{ x: 884, y: 416 }, { x: 480, y: 260 }, { x: 80, y: 200 }],
        { fleeDist: 100 }
      ),
      solids: [
        floorSeg(0, 960),
        R(420, 320, 140, 16),
        R(40, 260, 140, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new ChasingThornVines({ startX: 0, endX: 920, speed: 140, h: 480, delay: 0.6 }),
        new FireBrazier(260, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.0 }),
        new FireBrazier(500, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.5 }),
        new FireBrazier(720, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 1.0 }),
        new Saw([{ x: 380, y: 150 }, { x: 380, y: 390 }], { r: 22, speed: 200 }),
        new Spring(180, 480, { power: -1100 }),
      ],
    }),
  },

  // 16: TROLL SPRING & CEILING SPIKES
  {
    name: "TROLL SPRING & CEILING SPIKES",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 250), floorSeg(650, 960), roof(30), wallL(), wallR()],
      traps: [
        new StaticSpikes(250, 540, 400, { dir: "up", size: 46 }),
        new StaticSpikes(250, 30, 400, { dir: "down", size: 46 }),
        new Spring(200, 480, { power: -1300 }),
        new MovingPlatform(R(320, 420, 90, 16), { toX: 540, speed: 140, pause: 0.2 }),
        new FireBrazier(700, 480, { w: 50, flameH: 45, period: 1.6, holdOut: 0.5, phase: 0.2 }),
        new Note(180, 430, "WATCH THE CEILING!"),
      ],
    }),
  },

  // 17: FALSE FLOOR & UNDERGROUND PIT
  {
    name: "FALSE FLOOR & UNDERGROUND PIT",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 260), floorSeg(400, 500), floorSeg(640, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(260, 540, 140, { dir: "up", size: 46 }),
        new StaticSpikes(500, 540, 140, { dir: "up", size: 46 }),
        new CollapseFloor(R(260, 480, 140, 60), R(220, 300, 20, 180)),
        new FireBrazier(330, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new CollapseFloor(R(500, 480, 140, 60), R(460, 300, 20, 180)),
        new FireBrazier(570, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.5 }),
        new FallBlock(R(530, 40, 80, 40), R(480, 300, 80, 180)),
        new PopSpikes(830, 480, 50, R(780, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 18: DUAL TURRET & LASER CROSSFIRE
  {
    name: "DUAL TURRET & LASER CROSSFIRE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new Turret(18, 380, { dir: 1, period: 1.6, speed: 260 }),
        new Laser({ x: 320, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.0 }),
        new FireBrazier(450, 480, { w: 50, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.3 }),
        new Laser({ x: 580, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.7 }),
        new Turret(942, 380, { dir: -1, period: 1.6, speed: 260 }),
      ],
    }),
  },

  // 19: THE BLINKING GAUNTLET
  {
    name: "THE BLINKING GAUNTLET",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 180), floorSeg(820, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(180, 540, 640, { dir: "up", size: 46 }),
        new BlinkPlatform(R(210, 420, 90, 16), { period: 1.6, onFrac: 0.6, phase: 0.0 }),
        new BlinkPlatform(R(360, 420, 90, 16), { period: 1.6, onFrac: 0.6, phase: 0.4 }),
        new BlinkPlatform(R(510, 420, 90, 16), { period: 1.6, onFrac: 0.6, phase: 0.8 }),
        new BlinkPlatform(R(660, 420, 90, 16), { period: 1.6, onFrac: 0.6, phase: 1.2 }),
        new Saw([{ x: 430, y: 180 }, { x: 430, y: 380 }], { r: 20, speed: 180 }),
        new FireBrazier(840, 480, { w: 45, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.0 }),
      ],
    }),
  },

  // 20: CRUSHING ELEVATOR OF DOOM
  {
    name: "CRUSHING ELEVATOR OF DOOM",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 196 }]),
      solids: [
        floorSeg(0, 220),
        R(780, 240, 180, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new StaticSpikes(220, 540, 740, { dir: "up", size: 46 }),
        new MovingPlatform(R(260, 440, 100, 16), { toY: 180, speed: 110, pause: 0.4 }),
        new Crusher(300, 120, { topY: 30, period: 1.8, phase: 0.0 }),
        new FireBrazier(520, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new MovingPlatform(R(620, 240, 100, 16), { toX: 760, speed: 100, pause: 0.3 }),
      ],
    }),
  },

  // 21: TRIPLE TELEPORT TROLL
  {
    name: "TRIPLE TELEPORT TROLL",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 196 }]),
      solids: [
        floorSeg(0, 260),
        floorSeg(380, 600),
        R(760, 240, 200, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new Teleporter(180, 432, 420, 432, { w: 30, h: 48, twoWay: false }),
        new Teleporter(520, 432, 300, 432, { w: 30, h: 48, twoWay: false }),
        new Teleporter(450, 432, 800, 202, { w: 30, h: 48, twoWay: false }),
        new FireBrazier(300, 480, { w: 48, flameH: 40, period: 0, phase: 0 }),
        new FireBrazier(680, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.2 }),
        new Note(140, 430, "PORTAL 1? 2? OR 3?"),
      ],
    }),
  },

  // 22: SAW WAVE & SLIDING HOLES
  {
    name: "SAW WAVE & SLIDING HOLES",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 200), floorSeg(440, 620), floorSeg(840, 960), wallL(), wallR()],
      traps: [
        new StaticSpikes(200, 540, 240, { dir: "up", size: 46 }),
        new StaticSpikes(620, 540, 220, { dir: "up", size: 46 }),
        new SlidingHole(200, 440, { gapW: 85, startGap: 200, speed: 180, trigger: R(150, 300, 20, 180) }),
        new Saw([{ x: 200, y: 440 }, { x: 440, y: 440 }], { r: 20, speed: 220 }),
        new FireBrazier(520, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new SlidingHole(620, 840, { gapW: 85, startGap: 840, speed: -180, trigger: R(560, 300, 20, 180) }),
        new Saw([{ x: 620, y: 440 }, { x: 840, y: 440 }], { r: 20, speed: 220 }),
      ],
    }),
  },

  // 23: PENDULUM & LASER CHAOS
  {
    name: "PENDULUM & LASER CHAOS",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 220), floorSeg(780, 960), roof(30), wallL(), wallR()],
      traps: [
        new StaticSpikes(220, 540, 560, { dir: "up", size: 46 }),
        new Pendulum(360, 30, { len: 360, amp: 0.8, speed: 1.8, r: 22 }),
        new Pendulum(620, 30, { len: 360, amp: 0.8, speed: 1.8, r: 22 }),
        new Laser({ x: 490, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.0 }),
        new MovingPlatform(R(260, 420, 90, 16), { toX: 700, speed: 120, pause: 0.3 }),
        new FireBrazier(820, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.2 }),
      ],
    }),
  },

  // 24: CHASING VINES & CONVEYOR MADNESS
  {
    name: "CHASING VINES & CONVEYOR MADNESS",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new ChasingThornVines({ startX: 0, endX: 920, speed: 120, h: 480, delay: 0.8 }),
        new Conveyor(R(180, 480, 300, 60), { dir: -1, force: 190 }),
        new FireBrazier(340, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.0 }),
        new FallBlock(R(480, 40, 80, 40), R(440, 300, 80, 180)),
        new Conveyor(R(560, 480, 260, 60), { dir: 1, force: 190 }),
        new FireBrazier(690, 480, { w: 48, flameH: 40, period: 1.6, holdOut: 0.5, phase: 0.6 }),
      ],
    }),
  },

  // 25: THE DOUBLE BUTTON GATE
  {
    name: "THE DOUBLE BUTTON GATE",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [
        floorSeg(0, 960),
        R(400, 280, 160, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new Button(180, 470, "g1", { momentary: false }),
        new Button(480, 270, "g2", { momentary: false }),
        new Gate(R(760, 300, 28, 180), "g1"),
        new Gate(R(800, 300, 28, 180), "g2"),
        new FireBrazier(320, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new FireBrazier(620, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.5 }),
        new Spring(260, 480, { power: -1150 }),
      ],
    }),
  },

  // 26: SLIDING PIT & CEILING CRUSHER
  {
    name: "SLIDING PIT & CEILING CRUSHER",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 220), floorSeg(520, 960), roof(30), wallL(), wallR()],
      traps: [
        new StaticSpikes(220, 540, 300, { dir: "up", size: 46 }),
        new SlidingHole(220, 520, { gapW: 90, startGap: 220, speed: 200, trigger: R(160, 300, 20, 180) }),
        new Crusher(360, 100, { topY: 30, period: 1.6, phase: 0.0 }),
        new FireBrazier(600, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.3 }),
        new FallBlock(R(720, 40, 80, 40), R(680, 300, 80, 180)),
        new PopSpikes(830, 480, 50, R(780, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 27: THE FALLING SKY PARKOUR
  {
    name: "THE FALLING SKY PARKOUR",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), roof(30), wallL(), wallR()],
      traps: [
        new FallBlock(R(180, 40, 70, 40), R(140, 300, 60, 180)),
        new FallBlock(R(300, 40, 70, 40), R(260, 300, 60, 180)),
        new FireBrazier(420, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new FallBlock(R(540, 40, 70, 40), R(500, 300, 60, 180)),
        new FallBlock(R(660, 40, 70, 40), R(620, 300, 60, 180)),
        new FireBrazier(760, 480, { w: 48, flameH: 40, period: 1.8, holdOut: 0.6, phase: 0.5 }),
      ],
    }),
  },

  // 28: DOUBLE SAW INFERNO
  {
    name: "DOUBLE SAW INFERNO",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 416 }]),
      solids: [floorSeg(0, 960), wallL(), wallR()],
      traps: [
        new Saw([{ x: 260, y: 160 }, { x: 260, y: 420 }], { r: 22, speed: 220 }),
        new FireBrazier(380, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
        new Saw([{ x: 520, y: 420 }, { x: 520, y: 160 }], { r: 22, speed: 220 }),
        new FireBrazier(660, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.5 }),
        new PopSpikes(830, 480, 50, R(780, 300, 20, 180), { period: 0 }),
      ],
    }),
  },

  // 29: DEVIL'S TELEPORTER & LASER
  {
    name: "DEVIL'S TELEPORTER & LASER",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new Door([{ x: 884, y: 216 }]),
      solids: [
        floorSeg(0, 280),
        floorSeg(680, 960),
        R(780, 260, 180, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new StaticSpikes(280, 540, 400, { dir: "up", size: 46 }),
        new Teleporter(180, 432, 380, 380, { w: 30, h: 48, twoWay: false }),
        new MovingPlatform(R(350, 400, 90, 16), { toX: 650, speed: 130, pause: 0.2 }),
        new Laser({ x: 500, y: 30, len: 418, vertical: true, period: 2.0, warn: 0.5, fire: 0.4, phase: 0.0 }),
        new FireBrazier(720, 480, { w: 50, flameH: 42, period: 1.8, holdOut: 0.6, phase: 0.0 }),
      ],
    }),
  },

  // 30: THE ULTIMATE MITMITA INFERNO
  {
    name: "THE ULTIMATE MITMITA INFERNO",
    build: () => ({
      spawn: { x: 55, y: 440 },
      door: new FleeingDoor(
        [{ x: 884, y: 416 }, { x: 480, y: 260 }, { x: 80, y: 200 }],
        { fleeDist: 100 }
      ),
      solids: [
        floorSeg(0, 960),
        R(420, 320, 140, 16),
        R(40, 260, 140, 16),
        roof(30), wallL(), wallR()
      ],
      traps: [
        new MitmitaPepperDash(140, 448),
        new FireBrazier(240, 480, { w: 48, flameH: 42, period: 1.5, holdOut: 0.5, phase: 0.0 }),
        new Laser({ x: 340, y: 30, len: 418, vertical: true, period: 1.8, warn: 0.4, fire: 0.4, phase: 0.2 }),
        new FireBrazier(480, 480, { w: 48, flameH: 42, period: 1.5, holdOut: 0.5, phase: 0.5 }),
        new Crusher(600, 90, { topY: 30, period: 1.5, phase: 0.3 }),
        new FireBrazier(720, 480, { w: 48, flameH: 42, period: 1.5, holdOut: 0.5, phase: 1.0 }),
        new Saw([{ x: 380, y: 150 }, { x: 380, y: 390 }], { r: 22, speed: 200 }),
        new ChiliSpring(470, 456, { power: -1050 }),
        new InjeraBridge(180, 290, 240, 16),
        new Note(50, 240, "Safe! Taste the victory 🌶️", { size: 12 }),
      ],
    }),
  },
];

// ================================================================ FUNNY LEVEL DEVIL TROLL CUSTOM CLASSES
class FloatingText {
  constructor(x, y, text, opts = {}) {}
  reset() {}
  update(dt, g) {}
  solids() { return []; }
  kills() { return []; }
  draw() {}
}

class RunwaySpikes {
  constructor(x, y, w, opts = {}) {
    this.startX = x;
    this.x = x; this.y = y; this.w = w;
    this.size = opts.size ?? 26;
    this.dir = opts.dir ?? "up";
    this.style = opts.style ?? "spear";
    this.speed = opts.speed ?? 150;
    this.triggered = false;
  }
  reset() {
    this.x = this.startX;
    this.triggered = false;
  }
  update(dt, g) {
    const p = g.player;
    if (!this.triggered && Math.abs(p.x - this.x) < 140) {
      this.triggered = true;
      AudioFX.bounce();
    }
    if (this.triggered) {
      this.x += this.speed * dt;
      if (this.x > 750) this.x = 750;
    }
  }
  solids() { return []; }
  kills() {
    if (this.triggered) return [];
    if (this.dir === "up") return [R(this.x + 4, this.y - this.size + 8, this.w - 8, this.size - 8)];
    return [R(this.x + 4, this.y, this.w - 8, this.size - 8)];
  }
  draw() {
    ctx.save();
    const n = Math.max(2, Math.round(this.w / 18)), sw = this.w / n;
    const st = getTrapStyleForInstance(this.x, this.y, this.style);

    for (let i = 0; i < n; i++) {
      const cx = this.x + i * sw + sw / 2;
      if (st === "stela") {
        drawAxumStela(ctx, cx, this.y, this.dir, this.size, sw);
      } else if (st === "shield") {
        drawShieldSpear(ctx, cx, this.y, this.dir, this.size, sw);
      } else {
        drawSpear(ctx, cx, this.y, this.dir, this.size, sw);
      }
    }
    ctx.restore();
  }
}

class JebenaBounce {
  constructor(rect, trigger, opts = {}) {
    this.home = { ...rect };
    this.trigger = trigger;
    this.shakeT = opts.shakeTime ?? 0.12;
    this.floorY = opts.floorY ?? 480;
    this.reset();
  }
  reset() {
    this.rect = { ...this.home };
    this.state = "idle";
    this.t = 0;
    this.vy = 0;
  }
  update(dt, g) {
    const p = g.player;
    if (this.state === "idle" && aabb(p, this.trigger)) {
      this.state = "shake"; this.t = 0; AudioFX.rumble();
    } else if (this.state === "shake") {
      this.t += dt;
      if (this.t > this.shakeT) this.state = "fall";
    } else if (this.state === "fall") {
      this.vy += 2200 * dt;
      this.rect.y += this.vy * dt;
      if (this.rect.y + this.rect.h >= this.floorY) {
        this.rect.y = this.floorY - this.rect.h;
        this.state = "landed";
        AudioFX.slam();
        g.shake(7, 0.22);
        spawnDust(this.rect.x + this.rect.w / 2, this.floorY, 12, "#5D4037");
      }
    } else if (this.state === "landed") {
      const playerFeet = R(p.x, p.y + p.h - 4, p.w, 6);
      const topRect = R(this.rect.x, this.rect.y - 4, this.rect.w, 10);
      if (aabb(playerFeet, topRect) && p.vy >= 0) {
        p.vy = -1050;
        p.squash = 0.5;
        AudioFX.bounce();
        spawnDust(this.rect.x + this.rect.w / 2, this.rect.y, 8, "#FFB300");
      }
    }
  }
  solids() {
    return this.state === "landed" ? [this.rect] : [];
  }
  kills() { return []; }
  draw() {
    const r = this.rect;
    let ox = this.state === "shake" ? rand(-3, 3) : 0;
    
    ctx.save();
    const cx = r.x + r.w / 2 + ox;
    const cy = r.y + r.h / 2;
    
    ctx.fillStyle = "#5D4037";
    ctx.beginPath();
    ctx.arc(cx, cy + 8, r.w * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3E2723";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = "#8D6E63";
    ctx.fillRect(cx - 8, cy - r.h * 0.4, 16, r.h * 0.5);
    ctx.strokeRect(cx - 8, cy - r.h * 0.4, 16, r.h * 0.5);
    
    ctx.fillStyle = "#D7CCC8";
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx - 24, cy - 14);
    ctx.lineTo(cx - 20, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#3E2723";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx + 14, cy - 2, 12, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    ctx.fillStyle = "#FFD54F";
    ctx.fillRect(cx - 8, cy - r.h * 0.25, 16, 4);
    ctx.beginPath();
    ctx.arc(cx, cy + 8, r.w * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class MitmitaPepperDash {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.w = 32; this.h = 32;
    this.active = true;
  }
  reset() { this.active = true; }
  update(dt, g) {
    if (!this.active) return;
    const p = g.player;
    const r = R(this.x, this.y, this.w, this.h);
    if (aabb(p, r)) {
      this.active = false;
      p.spicyDash = 1.6;
      AudioFX.bounce();
      spawnPoof(this.x + this.w / 2, this.y + this.h / 2);
      g.shake(8, 0.3);
    }
  }
  solids() { return []; }
  kills() { return []; }
  draw() {
    if (!this.active) return;
    
    ctx.save();
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.quadraticCurveTo(cx + 8, cy - 14, cx + 4, cy - 18);
    ctx.stroke();

    ctx.fillStyle = "#F44336";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.quadraticCurveTo(cx + 12, cy + 6, cx + 2, cy + 14);
    ctx.quadraticCurveTo(cx - 10, cy + 4, cx - 6, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#D32F2F";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 1, 3, 6, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class InjeraBridge {
  constructor(x, y, targetW, h, opts = {}) {
    this.x = x; this.y = y; this.targetW = targetW; this.h = h;
    this.w = 0;
    this.active = false;
  }
  reset() {
    this.w = 0;
    this.active = false;
  }
  update(dt, g) {
    if (g.level.door.i >= 1) {
      if (!this.active) {
        this.active = true;
        AudioFX.rumble();
      }
      this.w = clamp(this.w + 240 * dt, 0, this.targetW);
    } else {
      this.w = 0;
      this.active = false;
    }
  }
  solids() {
    if (this.w <= 10) return [];
    return [R(this.x, this.y, this.w, this.h)];
  }
  kills() { return []; }
  draw() {
    if (this.w <= 0.1) return;
    
    ctx.save();
    ctx.fillStyle = "#E0D0C0";
    ctx.strokeStyle = "#A1887F";
    ctx.lineWidth = 2.5;
    
    roundRect(this.x, this.y, this.w, this.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#BCAAA4";
    for (let lx = 6; lx < this.w - 6; lx += 14) {
      const h1 = (lx * 13) % 7 + 2;
      ctx.beginPath();
      ctx.arc(this.x + lx, this.y + h1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      const h2 = (lx * 23) % 6 + 9;
      ctx.beginPath();
      ctx.arc(this.x + lx + 5, this.y + h2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.w < this.targetW) {
      ctx.fillStyle = "#D7CCC8";
      ctx.beginPath();
      ctx.ellipse(this.x + this.w, this.y + this.h / 2, 8, this.h / 2 + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ChiliSpring {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.w = 34; this.h = 24;
    this.power = opts.power ?? -1050;
    this.active = false;
    this.scaleY = 1.0;
  }
  reset() {
    this.active = false;
    this.scaleY = 1.0;
  }
  update(dt, g) {
    if (g.level.door.i >= 1) {
      if (!this.active) {
        this.active = true;
        AudioFX.rumble();
        spawnDust(this.x + this.w / 2, this.y + this.h, 10, "#FF5252");
      }
    } else {
      this.active = false;
    }

    this.scaleY = lerp(this.scaleY, 1.0, 12 * dt);
    
    if (!this.active) return;

    const p = g.player;
    const r = R(this.x, this.y, this.w, this.h);
    if (aabb(p, r) && p.vy >= -50) {
      p.vy = this.power;
      p.squash = 0.45;
      this.scaleY = 0.3;
      AudioFX.bounce();
      spawnDust(this.x + this.w / 2, this.y, 8, "#FF1744");
    }
  }
  solids() { return []; }
  kills() { return []; }
  draw() {
    if (!this.active) return;
    
    ctx.save();
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h;
    
    ctx.translate(cx, cy);
    ctx.scale(1.2, this.scaleY);
    
    ctx.strokeStyle = "#D50000";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.bezierCurveTo(-15, -6, 15, -6, 10, -10);
    ctx.bezierCurveTo(-15, -12, 15, -12, -10, -16);
    ctx.bezierCurveTo(-15, -18, 15, -18, 10, -22);
    ctx.stroke();

    ctx.fillStyle = "#FF5252";
    ctx.fillRect(-14, -26, 28, 5);
    ctx.strokeStyle = "#B71C1C";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-14, -26, 28, 5);

    ctx.restore();
  }
}

class FunnyPopSpikes extends PopSpikes {
  constructor(x, y, w, trigger, opts = {}) {
    super(x, y, w, trigger, opts);
    this.mode = opts.funnyMode ?? "normal";
    this.startX = x;
    this.startY = y;
    this.slideSpeed = opts.slideSpeed ?? 240;
    this.chasing = false;
  }

  reset() {
    super.reset();
    this.x = this.startX;
    this.y = this.startY;
    this.chasing = false;
  }

  update(dt, g) {
    const p = g.player;
    
    super.update(dt, g);

    if (this.mode === "runaway") {
      if (this.state === "popping" && this.out > 0.4) {
        if (Math.abs(p.x - this.x) < 110) {
          const dir = p.x < this.x ? 1 : -1;
          this.x += dir * this.slideSpeed * dt;
          this.x = clamp(this.x, 30, 930);
        }
      }
    } else if (this.mode === "chaser") {
      if (this.state === "popping" && this.out > 0.3) {
        if (!this.chasing && Math.abs(p.x - this.x) < 160) {
          this.chasing = true;
          AudioFX.bounce();
        }
        if (this.chasing) {
          const dir = p.x > this.x ? 1 : -1;
          this.x += dir * this.slideSpeed * dt;
          this.x = clamp(this.x, 30, 930);
        }
      }
    } else if (this.mode === "fake") {
      if (this.state === "popping" && this.out > 0.7) {
        this.state = "retreating";
      }
      if (this.state === "retreating") {
        this.out = clamp(this.out - this.speed * 1.5 * dt, 0, 1);
        if (this.out <= 0) {
          this.state = "idle";
        }
      }
    }
  }

  kills() {
    if (this.state === "retreating" && this.out < 0.25) return [];
    return super.kills();
  }

  draw() {
    super.draw();
  }
}

class FunnyFallBlock extends FallBlock {
  constructor(rect, trigger, opts = {}) {
    super(rect, trigger, opts);
    this.mode = opts.funnyMode ?? "normal";
    this.startY = rect.y;
  }

  reset() {
    super.reset();
    this.rect.y = this.startY;
  }

  update(dt, g) {
    if (this.mode === "fake" && this.state === "fall") {
      this.vy += 1800 * dt;
      this.rect.y += this.vy * dt;
      if (this.rect.y >= this.home.y + 110) {
        this.rect.y = this.home.y + 110;
        this.state = "fake_retreat";
        this.vy = 0;
        AudioFX.poof();
      }
    } else if (this.state === "fake_retreat") {
      this.rect.y = lerp(this.rect.y, this.home.y, 4 * dt);
      if (Math.abs(this.rect.y - this.home.y) < 2) {
        this.rect.y = this.home.y;
        this.state = "idle";
      }
    } else if (this.mode === "fast" && this.state === "fall") {
      this.vy += 4800 * dt;
      this.rect.y += this.vy * dt;
      if (this.rect.y + this.rect.h >= this.floorY) {
        this.rect.y = this.floorY - this.rect.h;
        this.state = "landed";
        AudioFX.slam();
        g.shake(8, 0.25);
        spawnDust(this.rect.x + this.rect.w / 2, this.floorY, 12);
      }
    } else {
      super.update(dt, g);
    }
  }

  solids() {
    if (this.state === "fake_retreat") return [];
    return super.solids();
  }

  kills() {
    if (this.state === "fake_retreat") return [];
    return super.kills();
  }

  draw() {
    super.draw();
  }
}

class ShiftingFloorBlock {
  constructor(x, y, w, h, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.targetY = opts.targetY ?? y;
    this.trigger = opts.trigger ?? null;
    this.speed = opts.speed ?? 120;
    this.reset();
  }
  reset() {
    this.cy = this.y;
    this.active = false;
  }
  update(dt, g) {
    const p = g.player;
    if (!this.active) {
      if (this.trigger) {
        if (aabb(p, this.trigger)) {
          this.active = true;
          AudioFX.rumble();
        }
      } else if (Math.abs((p.x + p.w / 2) - (this.x + this.w / 2)) < 110) {
        this.active = true;
        AudioFX.rumble();
      }
    }
    if (this.active) {
      const diff = this.targetY - this.cy;
      const step = clamp(diff, -this.speed * dt, this.speed * dt);
      this.cy += step;
    }
  }
  solids() {
    return [R(this.x, this.cy, this.w, this.h)];
  }
  kills() { return []; }
  draw() {
    drawEarthRect(R(this.x, this.cy, this.w, this.h));
  }
}

function makeTerrainUpAndDown(level, levelIndex) {
  if (levelIndex === 29 || levelIndex === 59) {
    return level;
  }

  const spawnX = level.spawn?.x ?? 55;
  const firstDoorX = level.door?.positions?.[0]?.x ?? 880;

  const pattern = levelIndex % 5;
  if (pattern === 0) {
    return level;
  }

  const groundSegs = (level.solids || []).filter(
    (s) => Math.abs(s.y - 480) < 5 && s.w >= 200
  );

  if (groundSegs.length === 0) {
    return level;
  }

  const newSolids = (level.solids || []).filter(
    (s) => !(Math.abs(s.y - 480) < 5 && s.w >= 200)
  );

  const spawnSafeL = spawnX - 45;
  const spawnSafeR = spawnX + 85;
  const doorSafeL = firstDoorX - 65;
  const doorSafeR = firstDoorX + 105;

  const heights = [];

  for (const seg of groundSegs) {
    const xStart = seg.x;
    const xEnd = seg.x + seg.w;
    const blockW = 60;

    for (let bx = xStart; bx < xEnd; bx += blockW) {
      const bw = Math.min(blockW, xEnd - bx);
      const bmid = bx + bw / 2;

      let by = 480;

      if (bmid >= spawnSafeL && bmid <= spawnSafeR) {
        by = 480;
      } else if (bmid >= doorSafeL && bmid <= doorSafeR) {
        by = 480;
      } else {
        if (pattern === 1) {
          const midPoint = (spawnSafeR + doorSafeL) / 2;
          const halfDist = (doorSafeL - spawnSafeR) / 2;
          const distFromMid = Math.abs(bmid - midPoint);
          const ratio = Math.max(0, 1 - distFromMid / halfDist);
          by = 480 - Math.round(ratio * 90);
        } else if (pattern === 2) {
          const blockIndex = Math.floor((bx - xStart) / blockW);
          if (blockIndex % 3 === 1) {
            by = 520;
          } else if (blockIndex % 3 === 2) {
            by = 420;
          } else {
            by = 460;
          }
        } else if (pattern === 3) {
          const rad = ((bmid - spawnSafeR) / (doorSafeL - spawnSafeR)) * Math.PI * 2;
          by = 480 - Math.round(Math.sin(rad) * 60);
        } else if (pattern === 4) {
          const targetY = 480 + ((bx % 3 === 0) ? -75 : 65);
          level.traps.push(
            new ShiftingFloorBlock(bx, 480, bw, H - 480, {
              targetY: targetY,
              speed: 150,
            })
          );
          heights.push({ x0: bx, x1: bx + bw, y: 480 });
          continue;
        }
      }

      by = Math.max(340, Math.min(525, by));

      newSolids.push(R(bx, by, bw, H - by));
      heights.push({ x0: bx, x1: bx + bw, y: by });
    }
  }

  level.solids = newSolids;

  const findHeight = (x) => {
    const h = heights.find((entry) => x >= entry.x0 && x < entry.x1);
    return h ? h.y : 480;
  };

  const spawnY = findHeight(spawnX);
  level.spawn.y = spawnY - 40;

  if (level.door && level.door.positions) {
    for (const pos of level.door.positions) {
      const doorFloorY = findHeight(pos.x);
      pos.y = doorFloorY - 64;
    }
  }

  if (level.traps) {
    for (const trap of level.traps) {
      let tx = trap.x;
      if (tx === undefined && trap.rect) {
        tx = trap.rect.x + trap.rect.w / 2;
      }
      if (tx !== undefined) {
        const floorY = findHeight(tx);
        
        // 1) PopSpikes & StaticSpikes (only if originally on/near the 480 floor)
        if (trap instanceof PopSpikes || trap instanceof StaticSpikes) {
          if (trap.y !== undefined && Math.abs(trap.y - 480) < 15) {
            const diffY = floorY - trap.y;
            trap.y = floorY;
            if (trap.trigger) {
              trap.trigger.y += diffY;
            }
          }
        }
        // 2) FireBrazier & Spring (only if originally on/near the 480 floor)
        else if (trap instanceof FireBrazier || trap instanceof Spring) {
          if (trap.y !== undefined && Math.abs(trap.y - 480) < 15) {
            trap.y = floorY;
          }
        }
        // 3) Saw
        else if (trap instanceof Saw) {
          if (trap.path) {
            for (const pt of trap.path) {
              if (Math.abs(pt.y - 454) < 15) {
                pt.y = floorY - 26;
              } else if (Math.abs(pt.y - 480) < 15) {
                pt.y = floorY;
              }
            }
          }
        }
        // 4) FallBlock & Crusher & JebenaBounce (adjust floorY if originally near 480)
        else if (trap.floorY !== undefined && Math.abs(trap.floorY - 480) < 15) {
          trap.floorY = floorY;
        }
      }
    }
  }

  return level;
}

// One continuous campaign: the original 30-level journey flows directly into
// the 30-level Mitmita challenge set for a complete 60-level progression.
const KARYA_LEVELS = [...LEVELS, ...MITMITA_LEVELS];

const LEVEL_PACKS = {
  karya: {
    id: "karya",
    name: "ETHIO DEVIL",
    icon: "🇪🇹",
    levels: KARYA_LEVELS,
  },
  mitmita: {
    id: "mitmita",
    name: "ሚጥሚጣ",
    icon: "🌶️",
    levels: MITMITA_LEVELS,
  },
};

let currentPackId = "karya";

function addCampaignSurprises(level, levelIndex) {
  level.traps = level.traps || [];

  if (levelIndex === 29) {
    return level;
  }

  const spawnX = level.spawn?.x ?? 55;
  const firstDoorX = level.door?.positions?.[0]?.x ?? 884;
  const ambushWidth = 54 + (levelIndex % 3) * 6;
  const groundSegments = (level.solids || []).filter(
    (segment) => Math.abs(segment.y - 480) < 2 && segment.w >= 150
  );
  const existingGroundHazards = level.traps
    .map((trap) => {
      if (trap instanceof PopSpikes || trap instanceof StaticSpikes) {
        return { center: trap.x + trap.w / 2, radius: trap.w / 2 };
      }
      if (trap instanceof FireBrazier) {
        return { center: trap.x, radius: trap.w / 2 };
      }
      return null;
    })
    .filter(Boolean);

  if (groundSegments.length > 0) {
    const orderedSegments = groundSegments
      .map((segment) => {
        const minX = Math.max(segment.x + 34, spawnX + 125);
        const maxX = Math.min(
          segment.x + segment.w - ambushWidth - 26,
          firstDoorX - ambushWidth - 90
        );
        return { segment, minX, maxX, room: maxX - minX };
      })
      .filter((candidate) => candidate.room >= 24);

    if (orderedSegments.length > 0) {
      const candidate = orderedSegments[levelIndex % orderedSegments.length];
      const positionRatio = 0.28 + ((levelIndex * 37) % 44) / 100;
      let trapX = Math.round(lerp(candidate.minX, candidate.maxX, positionRatio));

      const overlapsExistingHazard = (x) => {
        const center = x + ambushWidth / 2;
        return existingGroundHazards.some(
          (hazard) => Math.abs(center - hazard.center) < hazard.radius + ambushWidth / 2 + 54
        );
      };

      if (overlapsExistingHazard(trapX)) {
        const mirroredX = Math.round(lerp(candidate.maxX, candidate.minX, positionRatio));
        trapX = overlapsExistingHazard(mirroredX) ? null : mirroredX;
      }

      if (trapX !== null) {
        const triggerX = Math.max(spawnX + 35, trapX - 92 - (levelIndex % 3) * 12);
        const funnyModes = ["normal", "runaway", "chaser", "fake"];
        const mode = funnyModes[(levelIndex + 3) % funnyModes.length];
        
        level.traps.push(
          new FunnyPopSpikes(
            trapX,
            candidate.segment.y,
            ambushWidth,
            R(triggerX, candidate.segment.y - 150, 24, 150),
            {
              delay: 0.035 + (levelIndex % 4) * 0.045,
              speed: 15 + Math.min(5, Math.floor(levelIndex / 12)),
              funnyMode: mode,
            }
          )
        );
      }
    }
  }

  const existingFallBlocks = level.traps
    .filter((trap) => trap instanceof FallBlock)
    .map((trap) => trap.home.x + trap.home.w / 2);
  let blockX = null;

  if (existingFallBlocks.length === 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateX = 220 + ((levelIndex * 149 + attempt * 113) % 520);
      const candidateCenter = candidateX + 30;
      const clearOfEndpoints =
        Math.abs(candidateCenter - spawnX) >= 125 &&
        Math.abs(candidateCenter - firstDoorX) >= 100;

      if (clearOfEndpoints) {
        blockX = candidateX;
        break;
      }
    }
  }

  if (blockX !== null) {
    const blockModes = ["normal", "fake", "fast"];
    const mode = blockModes[levelIndex % blockModes.length];

    level.traps.push(
      new FunnyFallBlock(
        R(blockX, 34, 52 + (levelIndex % 3) * 6, 38),
        R(blockX - 92, 220, 48, 260),
        {
          shakeTime: Math.max(0.035, 0.075 - levelIndex * 0.0006),
          floorY: 540,
          funnyMode: mode,
        }
      )
    );
  }

  level = makeTerrainUpAndDown(level, levelIndex);

  return level;
}

const DEATH_LINES = [
  "OUCH.", "LOL.", "SKILL ISSUE.", "SO CLOSE.", "AGAIN?", "PERFECTLY PLANNED.",
  "YOU FELL FOR IT.", "ቃርያ LAUGHS.", "CLASSIC.", "WHO PUT THAT THERE?",
  "OOPS.", "TRY WALKING SLOWER.", "THAT ONE'S ON YOU.", "HE-HE.", "NICE ONE.",
];
const ROASTS = [
  [0, "wait... flawless?!"],
  [25, "pretty respectable, honestly."],
  [75, "ቃርያ enjoyed every single one."],
  [150, "have you considered walking?"],
  [9999, "the floor knows you personally now."],
];

// ================================================================ ETHIOPIAN BACKGROUNDS (5 Themes per Level)
function drawAtmosphericCloud(cx, cy, rx, ry, opacity = 0.15) {
  if (!ctx) return;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
  grad.addColorStop(0.6, `rgba(255, 255, 255, ${opacity * 0.5})`);
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Side puffs
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.5, cy + ry * 0.1, rx * 0.6, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + rx * 0.5, cy + ry * 0.1, rx * 0.6, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAcaciaTree(x, y, scale = 1, opacity = 1) {
  if (!ctx) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;
  
  // Trunk
  ctx.fillStyle = "rgba(42, 22, 10, 0.9)";
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-4, -18, -12, -34);
  ctx.lineTo(-4, -34);
  ctx.quadraticCurveTo(2, -18, 5, 0);
  ctx.closePath();
  ctx.fill();

  // Branch structure
  const branches = [
    [-12, -34, -28, -52, -22, -54, -6, -38],
    [-8, -34, 4, -58, 10, -58, 0, -36],
    [-3, -34, 28, -50, 34, -50, 4, -34],
    [-18, -44, -38, -58, -34, -60, -14, -48]
  ];
  for (const b of branches) {
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[2], b[3]);
    ctx.lineTo(b[4], b[5]);
    ctx.lineTo(b[6], b[7]);
    ctx.closePath();
    ctx.fill();
  }

  // Classic flat-top African canopy
  ctx.fillStyle = "rgba(35, 24, 12, 0.95)";
  
  // Left flat-top pod
  ctx.beginPath();
  ctx.ellipse(-26, -56, 26, 6, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Center flat-top pod
  ctx.beginPath();
  ctx.ellipse(4, -62, 36, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right flat-top pod
  ctx.beginPath();
  ctx.ellipse(30, -52, 24, 5, 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFlyingBird(x, y, scale = 1, opacity = 0.65) {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = `rgba(30, 15, 5, ${opacity})`;
  ctx.lineWidth = 1.6 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Classic stylized mountain eagle wing curves
  ctx.moveTo(x - 12 * scale, y + 4 * scale);
  ctx.quadraticCurveTo(x - 6 * scale, y - 5 * scale, x, y + 1 * scale);
  ctx.quadraticCurveTo(x + 6 * scale, y - 5 * scale, x + 12 * scale, y + 4 * scale);
  ctx.stroke();
  ctx.restore();
}

function drawGeneratedEthiopianBackground(levelIdx = 0) {
  // Always return false to use the beautifully stylized, non-realistic 2D vector/pixel-art game backgrounds
  return false;
}

function drawEthiopianBackground(levelIdx = 0) {
  if (!ensureCanvas() || !ctx) return;
  ctx.save();

  if (drawGeneratedEthiopianBackground(levelIdx)) {
    ctx.restore();
    return;
  }

  const themeIdx = Math.abs(levelIdx) % 5;
  const atmosphereIdx = Math.floor(Math.abs(levelIdx) / 5) % 6;

  if (themeIdx === 0) {
    // ---------------- THEME 0: SIMIEN MOUNTAINS & AMBAS (Golden Savanna Sunset)
    // Multilayer Sky Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#E25A2F"); // Deep orange-red at top
    bgGrad.addColorStop(0.4, "#F0AA4C"); // Golden yellow mid-sky
    bgGrad.addColorStop(0.8, "#FED682"); // Pale sunset near horizon
    bgGrad.addColorStop(1, "#EBB760");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Glowing Sun Disc (Radial Gradient)
    const sunX = W * 0.55;
    const sunY = 160;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 180);
    sunGrad.addColorStop(0, "#FFFFFF");
    sunGrad.addColorStop(0.1, "#FFF4CC");
    sunGrad.addColorStop(0.3, "rgba(254, 209, 0, 0.45)");
    sunGrad.addColorStop(0.6, "rgba(254, 160, 0, 0.18)");
    sunGrad.addColorStop(1, "rgba(254, 90, 0, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 180, 0, Math.PI * 2); ctx.fill();

    // High Altitude Wispy Clouds
    drawAtmosphericCloud(160, 80, 120, 10, 0.2);
    drawAtmosphericCloud(720, 110, 150, 12, 0.15);
    drawAtmosphericCloud(400, 60, 90, 8, 0.1);

    // Layer 1: Extremely Distant Mountains (Warm purple-pink haze)
    ctx.fillStyle = "rgba(125, 68, 55, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(0, 280);
    ctx.lineTo(120, 260);
    ctx.lineTo(180, 210); // Far Amba 1
    ctx.lineTo(310, 210);
    ctx.lineTo(360, 270);
    ctx.lineTo(520, 250);
    ctx.lineTo(580, 190); // Far Amba 2
    ctx.lineTo(720, 190);
    ctx.lineTo(780, 260);
    ctx.lineTo(W, 230);
    ctx.lineTo(W, H - 40);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Simien Table Mountains / Ambas (Middle range)
    ctx.fillStyle = "rgba(132, 69, 31, 0.38)";
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(0, 340);
    ctx.lineTo(80, 300);
    ctx.lineTo(140, 230); // Amba Peak
    ctx.lineTo(240, 230); // Flat-topped summit
    ctx.lineTo(280, 290);
    ctx.lineTo(390, 260);
    ctx.lineTo(460, 200); // Sharp jagged peak
    ctx.lineTo(520, 280);
    ctx.lineTo(590, 205); // Second large Amba
    ctx.lineTo(710, 205);
    ctx.lineTo(760, 275);
    ctx.lineTo(860, 245);
    ctx.lineTo(W, 290);
    ctx.lineTo(W, H - 40);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Foreground Cliffs & Ridges (Deeper brown-orange silhouettes)
    ctx.fillStyle = "rgba(85, 41, 16, 0.32)";
    ctx.beginPath();
    ctx.moveTo(0, H - 20);
    ctx.lineTo(0, 400);
    ctx.lineTo(150, 340);
    ctx.lineTo(320, 410);
    ctx.lineTo(480, 350);
    ctx.lineTo(620, 390);
    ctx.lineTo(780, 320);
    ctx.lineTo(W, 360);
    ctx.lineTo(W, H - 20);
    ctx.closePath();
    ctx.fill();

    // Acacia Tortilis Savanna Trees scattered on foreground ridges
    drawAcaciaTree(80, 400, 0.85);
    drawAcaciaTree(130, 355, 0.55);
    drawAcaciaTree(490, 362, 0.65);
    drawAcaciaTree(760, 332, 0.7);
    drawAcaciaTree(810, 336, 0.5);

    // Gelada Baboon Family Silhouettes sitting on cliff edge
    ctx.fillStyle = "rgba(62, 28, 10, 0.75)";
    // Parent Baboon
    ctx.beginPath(); ctx.arc(146, 334, 5, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.beginPath(); ctx.arc(143, 341, 8, 0, Math.PI * 2); ctx.fill(); // Body
    ctx.fillRect(138, 341, 3, 8); // Back limb
    // Child Baboon
    ctx.beginPath(); ctx.arc(155, 336, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(153, 341, 5, 0, Math.PI * 2); ctx.fill();

    // Flying Eagles/Hawks soaring on thermals
    drawFlyingBird(120, 140, 1.2);
    drawFlyingBird(180, 110, 0.8);
    drawFlyingBird(640, 90, 1.5);
    drawFlyingBird(690, 115, 0.9);

  } else if (themeIdx === 1) {
    // ---------------- THEME 1: AXUM ANCIENT KINGDOM (Starlit Dawn Aurora)
    // Celestial cosmic purple-blue gradient sky
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0B0616"); // Extremely dark violet at zenith
    bgGrad.addColorStop(0.4, "#24133A"); // Deep royal grape purple
    bgGrad.addColorStop(0.8, "#51295D"); // Nebula purple
    bgGrad.addColorStop(1, "#7D4367"); // Soft warm horizon glow
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars of varying sizes & glowing nebulae
    // Background cosmic dust nebula
    const nebGrad = ctx.createRadialGradient(W * 0.7, 120, 10, W * 0.7, 120, 200);
    nebGrad.addColorStop(0, "rgba(220, 50, 180, 0.08)");
    nebGrad.addColorStop(0.5, "rgba(100, 50, 200, 0.04)");
    nebGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebGrad;
    ctx.beginPath(); ctx.arc(W * 0.7, 120, 200, 0, Math.PI * 2); ctx.fill();

    // Twinkling stars
    ctx.fillStyle = "rgba(255, 245, 220, 0.85)";
    const stars = [
      [90, 45, 1.8], [140, 75, 1.2], [230, 30, 2.3], [280, 110, 1.0], [350, 60, 1.5],
      [420, 40, 2.0], [490, 95, 1.3], [540, 50, 2.5], [620, 115, 1.1], [680, 35, 1.7],
      [730, 80, 2.2], [810, 100, 1.4], [890, 45, 1.9], [930, 70, 2.1], [50, 120, 1.3]
    ];
    for (const [sx, sy, sz] of stars) {
      ctx.beginPath(); ctx.arc(sx, sy, sz * 0.9, 0, Math.PI * 2); ctx.fill();
    }

    // A beautiful shooting star with tail
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(400, 40);
    ctx.lineTo(330, 85);
    ctx.stroke();
    // Head glow
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath(); ctx.arc(330, 85, 1.5, 0, Math.PI * 2); ctx.fill();

    // Glowing Crescent Moon
    const moonX = 180;
    const moonY = 100;
    // Faint full-disc phantom glow
    ctx.fillStyle = "rgba(255, 235, 190, 0.05)";
    ctx.beginPath(); ctx.arc(moonX, moonY, 26, 0, Math.PI * 2); ctx.fill();
    // Active bright silver crescent
    ctx.fillStyle = "rgba(255, 240, 200, 0.88)";
    ctx.beginPath(); ctx.arc(moonX, moonY, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#24133A"; // Mask color matches middle sky
    ctx.beginPath(); ctx.arc(moonX + 8, moonY - 4, 22, 0, Math.PI * 2); ctx.fill();

    // Distant mountain outline to anchor steles
    ctx.fillStyle = "rgba(42, 22, 48, 0.38)";
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(0, 390);
    ctx.lineTo(250, 320);
    ctx.lineTo(500, 380);
    ctx.lineTo(750, 340);
    ctx.lineTo(W, 395);
    ctx.lineTo(W, H - 40);
    ctx.closePath();
    ctx.fill();

    // Stele 1: The Great Stele of Axum (Extremely Detailed Silhouette)
    const ax1X = 280, ax1Y = 460, ax1W = 38, ax1H = 220;
    ctx.fillStyle = "rgba(32, 17, 36, 0.75)";
    ctx.beginPath();
    ctx.moveTo(ax1X, ax1Y);
    ctx.lineTo(ax1X + 3, ax1Y - ax1H + 30);
    // Tapering up to the classic semi-circular crown (Medri-Gabr)
    ctx.lineTo(ax1X + 5, ax1Y - ax1H);
    ctx.arc(ax1X + ax1W / 2, ax1Y - ax1H, ax1W / 2 - 5, Math.PI, 0, false);
    ctx.lineTo(ax1X + ax1W - 5, ax1Y - ax1H);
    ctx.lineTo(ax1X + ax1W - 3, ax1Y - ax1H + 30);
    ctx.lineTo(ax1X + ax1W, ax1Y);
    ctx.closePath();
    ctx.fill();

    // Carved details (multi-story decorative window grids)
    ctx.fillStyle = "rgba(255, 225, 170, 0.22)";
    ctx.strokeStyle = "rgba(10, 5, 12, 0.6)";
    ctx.lineWidth = 1.2;
    for (let story = 0; story < 8; story++) {
      const wy = ax1Y - 32 - story * 24;
      // Window frame rect
      ctx.fillRect(ax1X + 8, wy, ax1W - 16, 12);
      ctx.strokeRect(ax1X + 8, wy, ax1W - 16, 12);
      // Center dividing beam
      ctx.beginPath();
      ctx.moveTo(ax1X + ax1W / 2, wy);
      ctx.lineTo(ax1X + ax1W / 2, wy + 12);
      ctx.stroke();
    }
    // Base Doorway Arch Carving
    ctx.fillStyle = "rgba(12, 6, 15, 0.9)";
    ctx.beginPath();
    ctx.arc(ax1X + ax1W / 2, ax1Y, 7, Math.PI, 0, false);
    ctx.fill();

    // Stele 2 (Smaller, slightly offset in background distance)
    const ax2X = 680, ax2Y = 460, ax2W = 28, ax2H = 160;
    ctx.fillStyle = "rgba(22, 11, 25, 0.65)";
    ctx.beginPath();
    ctx.moveTo(ax2X, ax2Y);
    ctx.lineTo(ax2X + 2, ax2Y - ax2H);
    ctx.arc(ax2X + ax2W / 2, ax2Y - ax2H, ax2W / 2 - 2, Math.PI, 0, false);
    ctx.lineTo(ax2X + ax2W - 2, ax2Y - ax2H);
    ctx.lineTo(ax2X + ax2W, ax2Y);
    ctx.closePath();
    ctx.fill();
    // Stele 2 carved bands
    ctx.fillStyle = "rgba(255, 225, 170, 0.14)";
    for (let story = 0; story < 5; story++) {
      ctx.fillRect(ax2X + 6, ax2Y - 28 - story * 26, ax2W - 12, 9);
    }

    // framing ancient acacia tree silhouettes on the borders of the view
    drawAcaciaTree(80, 420, 1.15, 0.7);
    drawAcaciaTree(860, 430, 0.95, 0.7);

  } else if (themeIdx === 2) {
    // ---------------- THEME 2: LALIBELA ROCK-HEWN CHURCHES (Terracotta Red Earth)
    // Red earth / dust dawn sky gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#4C1C0D"); // Dark baked earth red
    bgGrad.addColorStop(0.5, "#803E24"); // Rich terracotta orange
    bgGrad.addColorStop(0.9, "#BC6843"); // Dusty pink-brown
    bgGrad.addColorStop(1, "#9E4F2F");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Warm Morning Sun with heavy atmospheric dust diffusion
    const sunX = 720;
    const sunY = 140;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 130);
    sunGrad.addColorStop(0, "rgba(255, 230, 170, 0.45)");
    sunGrad.addColorStop(0.4, "rgba(235, 150, 90, 0.22)");
    sunGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 130, 0, Math.PI * 2); ctx.fill();

    // High clouds catching morning orange light
    drawAtmosphericCloud(220, 90, 130, 12, 0.12);
    drawAtmosphericCloud(620, 110, 100, 9, 0.1);

    // Layer of distant rocky excavation pits & canyons
    ctx.fillStyle = "rgba(76, 28, 13, 0.32)";
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(0, 360);
    ctx.quadraticCurveTo(150, 380, 300, 350);
    ctx.lineTo(400, 350);
    ctx.lineTo(520, 290); // Distant church roof peaks
    ctx.lineTo(640, 360);
    ctx.quadraticCurveTo(780, 330, W, 370);
    ctx.lineTo(W, H - 40);
    ctx.closePath();
    ctx.fill();

    // Excavated Pit Rim Walls (gives the "Rock-Hewn" subterranean feel!)
    ctx.fillStyle = "rgba(50, 18, 8, 0.55)";
    ctx.beginPath();
    ctx.moveTo(0, H - 20);
    ctx.lineTo(0, 395);
    ctx.lineTo(180, 410);
    ctx.lineTo(260, 420); // Dropping into the Lalibela trench
    ctx.lineTo(700, 420); // Trench bottom
    ctx.lineTo(780, 400); // Back up to canyon edge
    ctx.lineTo(W, 390);
    ctx.lineTo(W, H - 20);
    ctx.closePath();
    ctx.fill();

    // THE MONOLITHIC CROSS CHURCH: Bete Giyorgis (Church of St. George) Standing in the pit!
    // Highly detailed silhouette showing three-dimensional tiered roof cross relief
    const lalX = 480, lalY = 460;
    // Main church block body
    ctx.fillStyle = "rgba(42, 14, 6, 0.88)";
    ctx.fillRect(lalX - 55, lalY - 145, 110, 145);

    // Roof details: Three tiered steps mimicking the famous cross-within-cross shape
    // Step 1: Broad roof trim
    ctx.fillStyle = "rgba(62, 22, 10, 0.95)";
    ctx.fillRect(lalX - 60, lalY - 148, 120, 6);
    // Step 2: Mid roof tier
    ctx.fillRect(lalX - 44, lalY - 156, 88, 8);
    // Step 3: Top small cross tier
    ctx.fillRect(lalX - 22, lalY - 162, 44, 6);

    // Embossed Cross on Roof (viewed slightly from above-front)
    ctx.fillStyle = "rgba(235, 170, 120, 0.15)";
    const arm = 14;
    ctx.fillRect(lalX - arm / 2, lalY - 145, arm, 110);
    ctx.fillRect(lalX - 45, lalY - 105, 90, arm);

    // Detailed Arched Keyhole Windows (Axumite style double-arch)
    ctx.fillStyle = "rgba(15, 5, 2, 0.95)";
    for (let col = -1; col <= 1; col++) {
      if (col === 0) continue; // Leaves space for vertical cross facade columns
      const wx = lalX + col * 32 - 7;
      for (let floor = 0; floor < 3; floor++) {
        const wy = lalY - 32 - floor * 36;
        // Window opening
        ctx.beginPath();
        ctx.arc(wx + 7, wy, 7, Math.PI, 0, false);
        ctx.fillRect(wx, wy, 14, 16);
        ctx.fill();
        // Carved window cross relief detail inside
        ctx.strokeStyle = "rgba(235, 170, 120, 0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + 7, wy - 5);
        ctx.lineTo(wx + 7, wy + 16);
        ctx.moveTo(wx, wy + 5);
        ctx.lineTo(wx + 14, wy + 5);
        ctx.stroke();
      }
    }

    // Massive arched entrance doorway
    ctx.fillStyle = "rgba(10, 2, 0, 0.98)";
    ctx.beginPath();
    ctx.arc(lalX, lalY, 14, Math.PI, 0, false);
    ctx.fillRect(lalX - 14, lalY, 28, 18);
    ctx.fill();

    // Sparse, windblown dry acacia shrubbery around Lalibela pits
    drawAcaciaTree(140, 415, 0.45, 0.85);
    drawAcaciaTree(820, 395, 0.55, 0.85);

    // Eagles circling above St. George
    drawFlyingBird(460, 120, 1.1);
    drawFlyingBird(520, 150, 0.8);

  } else if (themeIdx === 3) {
    // ---------------- THEME 3: GONDAR FASIL GHEBBI CASTLE (Royal Twilight Blue)
    // Deep royal indigo night sky
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#080B13"); // Velvet black-blue
    bgGrad.addColorStop(0.5, "#141D2D"); // Royal night blue
    bgGrad.addColorStop(0.9, "#283B55"); // Soft horizon navy
    bgGrad.addColorStop(1, "#3E5777");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Glowing Silvery Full Moon
    const moonX = 260;
    const moonY = 130;
    // Large ambient misty moon glow
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 110);
    moonGlow.addColorStop(0, "rgba(235, 245, 255, 0.35)");
    moonGlow.addColorStop(0.3, "rgba(200, 220, 255, 0.15)");
    moonGlow.addColorStop(0.7, "rgba(100, 140, 220, 0.05)");
    moonGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(moonX, moonY, 110, 0, Math.PI * 2); ctx.fill();

    // Solid Silver Moon Disc with faint crater painting
    ctx.fillStyle = "#EAF2FA";
    ctx.beginPath(); ctx.arc(moonX, moonY, 36, 0, Math.PI * 2); ctx.fill();
    // Soft organic gray crater textures
    ctx.fillStyle = "#CEDCEB";
    const craters = [[-12, -10, 6], [14, 8, 8], [-6, 16, 5], [12, -14, 4], [-20, 4, 3]];
    for (const [cx_off, cy_off, cr] of craters) {
      ctx.beginPath();
      ctx.arc(moonX + cx_off, moonY + cy_off, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Low, drifting, misty night clouds behind castle turrets
    drawAtmosphericCloud(520, 200, 220, 15, 0.08);
    drawAtmosphericCloud(800, 160, 140, 10, 0.06);

    // Distant mountain ridge silhouette
    ctx.fillStyle = "rgba(12, 19, 32, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(0, 380);
    ctx.lineTo(300, 340);
    ctx.lineTo(600, 375);
    ctx.lineTo(820, 350);
    ctx.lineTo(W, 390);
    ctx.lineTo(W, H - 40);
    ctx.closePath();
    ctx.fill();

    // GONDAR CASTLE: Fasilides' Castle Keep & Turrets (Extremely detailed silhouette)
    const casX = 520, casY = 460;
    // Foundation fortress wall
    ctx.fillStyle = "rgba(8, 14, 24, 0.82)";
    ctx.fillRect(casX - 80, casY - 30, 280, 30);

    // Main Central Square Keep Castle
    ctx.fillRect(casX, casY - 140, 120, 110);

    // Crenellations (battlements) along the central block roof
    ctx.fillStyle = "rgba(8, 14, 24, 0.82)";
    const battlementW = 10;
    const battlementH = 8;
    for (let c = 0; c < 7; c++) {
      ctx.fillRect(casX + 4 + c * 17, casY - 148, battlementW, battlementH);
    }

    // Left Circular Corner Turret with egg-shaped cupola dome
    const turretLeftX = casX - 30;
    const turretLeftY = casY - 150;
    ctx.fillRect(turretLeftX, turretLeftY, 30, 120);
    // Circular dome top
    ctx.beginPath();
    ctx.arc(turretLeftX + 15, turretLeftY, 15, Math.PI, 0, false);
    ctx.fill();
    // Wooden spire & flagpole
    ctx.strokeStyle = "rgba(8, 14, 24, 0.82)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(turretLeftX + 15, turretLeftY - 15);
    ctx.lineTo(turretLeftX + 15, turretLeftY - 32);
    ctx.stroke();

    // Right Circular Corner Turret (matching left)
    const turretRightX = casX + 120;
    const turretRightY = casY - 150;
    ctx.fillRect(turretRightX, turretRightY, 30, 120);
    ctx.beginPath();
    ctx.arc(turretRightX + 15, turretRightY, 15, Math.PI, 0, false);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(turretRightX + 15, turretRightY - 15);
    ctx.lineTo(turretRightX + 15, turretRightY - 32);
    ctx.stroke();

    // Central watchtower (second tier)
    const midX = casX + 30;
    const midY = casY - 170;
    ctx.fillRect(midX, midY, 60, 30);
    for (let c = 0; c < 4; c++) {
      ctx.fillRect(midX + 2 + c * 15, midY - 6, 7, 6);
    }

    // Windows with actual glowing golden light radiating from inside!
    // Creates a magnificent, cozy royal night vibe.
    ctx.fillStyle = "#FED100";
    ctx.shadowColor = "#FED100";
    // 2 Arched windows on the main castle block
    const winY1 = casY - 100;
    ctx.beginPath();
    ctx.arc(casX + 35, winY1, 6, Math.PI, 0, false);
    ctx.fillRect(casX + 29, winY1, 12, 14);
    ctx.arc(casX + 85, winY1, 6, Math.PI, 0, false);
    ctx.fillRect(casX + 79, winY1, 12, 14);
    // 1 Arched window on the left and right turret
    ctx.arc(turretLeftX + 15, turretLeftY + 40, 4, Math.PI, 0, false);
    ctx.fillRect(turretLeftX + 11, turretLeftY + 40, 8, 10);
    ctx.arc(turretRightX + 15, turretRightY + 40, 4, Math.PI, 0, false);
    ctx.fillRect(turretRightX + 11, turretRightY + 40, 8, 10);
    ctx.fill();

    // Reset shadow parameters immediately to prevent gameplay canvas leakage
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Faint brickwork textures on Gondar castle walls
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(casX + 15, casY - 70, 18, 8);
    ctx.strokeRect(casX + 75, casY - 50, 22, 8);
    ctx.strokeRect(turretLeftX + 6, turretLeftY + 70, 14, 6);

    // Old growth Acacia trees framing the castle grounds
    drawAcaciaTree(110, 410, 0.75, 0.65);
    drawAcaciaTree(860, 415, 0.8, 0.65);

  } else {
    // ---------------- THEME 4: HARAR JUGOL & LAKE TANA (Oasis Emerald Sunset)
    // Deep emerald lagoon Sunset
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#072023"); // Deep emerald shadow
    bgGrad.addColorStop(0.4, "#133E3B"); // Rich tropical sea-green
    bgGrad.addColorStop(0.8, "#2F7C73"); // Glowing aqua emerald
    bgGrad.addColorStop(1, "#549E93"); // Bright pale horizon turquoise
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Crimson-Orange Sun sinking into Lake Tana
    const sunX = W * 0.35;
    const sunY = 150;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 110);
    sunGrad.addColorStop(0, "#FFE599");
    sunGrad.addColorStop(0.2, "#FF9966");
    sunGrad.addColorStop(0.5, "rgba(225, 50, 50, 0.32)");
    sunGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 110, 0, Math.PI * 2); ctx.fill();

    // Clouds reflecting the teal sunset
    drawAtmosphericCloud(140, 110, 120, 10, 0.1);
    drawAtmosphericCloud(760, 90, 160, 14, 0.12);

    // Lake Tana Water horizon (subtle reflections and wave glimmers)
    const waterY = 410;
    const waterH = 50;
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, waterY + waterH);
    waterGrad.addColorStop(0, "rgba(10, 36, 32, 0.6)");
    waterGrad.addColorStop(0.6, "rgba(16, 54, 48, 0.45)");
    waterGrad.addColorStop(1, "rgba(35, 88, 78, 0.2)");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, W, waterH);

    // Golden sun reflection ripples in the water
    ctx.fillStyle = "rgba(255, 230, 150, 0.22)";
    const rippleRows = [
      [sunX - 60, waterY + 6, 120, 2],
      [sunX - 45, waterY + 14, 90, 2],
      [sunX - 80, waterY + 22, 160, 1.8],
      [sunX - 30, waterY + 30, 60, 1.5],
      [sunX - 55, waterY + 38, 110, 1.5],
      [sunX - 20, waterY + 44, 40, 1.2]
    ];
    for (const [rx, ry, rw, rh] of rippleRows) {
      ctx.beginPath();
      ctx.ellipse(rx + rw / 2, ry, rw / 2, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Classic papyrus Tankwa boat silhouetted on Lake Tana
    const boatX = sunX + 80;
    const boatY = waterY + 16;
    ctx.fillStyle = "rgba(12, 34, 30, 0.9)";
    ctx.beginPath();
    // Distinctive organic upward curved papyrus bow and stern
    ctx.moveTo(boatX - 35, boatY);
    ctx.quadraticCurveTo(boatX, boatY + 12, boatX + 35, boatY);
    ctx.quadraticCurveTo(boatX + 44, boatY - 14, boatX + 48, boatY - 18); // Bow curve
    ctx.quadraticCurveTo(boatX + 25, boatY + 6, boatX - 25, boatY + 6);
    ctx.quadraticCurveTo(boatX - 42, boatY - 8, boatX - 46, boatY - 12); // Stern curve
    ctx.closePath();
    ctx.fill();

    // Tankwa Fisherman Silhouette holding paddle
    ctx.beginPath();
    ctx.arc(boatX - 4, boatY - 11, 3.5, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.fillRect(boatX - 6, boatY - 7, 5, 10); // Torso
    // Paddle line crossing water
    ctx.strokeStyle = "rgba(12, 34, 30, 0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(boatX - 12, boatY - 15);
    ctx.lineTo(boatX + 2, boatY + 14);
    ctx.stroke();

    // Ancient stone Harar Wall Gate Silhouette
    const gateX = 640, gateY = 460;
    ctx.fillStyle = "rgba(12, 34, 30, 0.85)";
    // Wall structure
    ctx.fillRect(gateX, gateY - 100, 180, 100);
    // Left Watchtower column
    ctx.fillRect(gateX - 20, gateY - 120, 36, 120);
    // Right Watchtower column
    ctx.fillRect(gateX + 164, gateY - 120, 36, 120);

    // Crenellations along Harar Gate Wall
    for (let c = 0; c < 6; c++) {
      ctx.fillRect(gateX + 10 + c * 28, gateY - 110, 16, 10);
    }

    // Majestic Archway Opening
    ctx.fillStyle = "rgba(6, 18, 15, 0.98)";
    ctx.beginPath();
    ctx.arc(gateX + 90, gateY - 20, 32, Math.PI, 0, false);
    ctx.fillRect(gateX + 58, gateY - 20, 64, 20);
    ctx.fill();

    // Exotic Tropical Palm Tree Silhouettes flanking the Lake oasis
    const drawPalmTree = (px, py, hScale = 1) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(hScale, hScale);
      ctx.fillStyle = "rgba(12, 34, 30, 0.95)";
      
      // Slanted textured trunk
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.quadraticCurveTo(8, -40, 12, -80);
      ctx.lineTo(16, -80);
      ctx.quadraticCurveTo(12, -40, 3, 0);
      ctx.closePath();
      ctx.fill();

      // Curved tropical palm fronds branching out from head
      ctx.strokeStyle = "rgba(12, 34, 30, 0.95)";
      ctx.lineWidth = 3;
      const fronds = [
        [-15, -15, -28, -25], [-24, -4, -36, -8], [-12, 10, -22, 14],
        [15, -15, 28, -25], [24, -4, 36, -8], [12, 10, 22, 14],
        [0, -20, 0, -32]
      ];
      for (const f of fronds) {
        ctx.beginPath();
        ctx.moveTo(14, -80);
        ctx.quadraticCurveTo(14 + f[0], -80 + f[1], 14 + f[2], -80 + f[3]);
        ctx.stroke();
      }
      ctx.restore();
    };
    drawPalmTree(140, 415, 0.9);
    drawPalmTree(180, 415, 0.65);
    drawPalmTree(860, 420, 1.15);

  }

  // Common Horizon Floor Base (Gently blended shadow under elements)
  ctx.fillStyle = "rgba(22, 11, 5, 0.28)";
  ctx.fillRect(0, 450, W, 90);

  // Corner Watermarks (Ge'ez Crosses)
  ctx.strokeStyle = "rgba(255, 220, 150, 0.15)";
  ctx.lineWidth = 2.5;
  const drawGeezCross = (cx, cy, s) => {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
    ctx.moveTo(cx - s * 0.6, cy - s * 0.6); ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
    ctx.moveTo(cx + s * 0.6, cy - s * 0.6); ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.stroke();
  };
  drawGeezCross(80, 80, 26);
  drawGeezCross(880, 80, 26);

  // A restrained level-specific wash makes repeat visits to the five regions
  // feel different across the full campaign without turning them photographic.
  const atmosphereWashes = [
    "rgba(255, 194, 82, 0.00)",
    "rgba(21, 94, 82, 0.07)",
    "rgba(111, 55, 96, 0.07)",
    "rgba(219, 112, 47, 0.06)",
    "rgba(27, 54, 96, 0.07)",
    "rgba(236, 208, 126, 0.06)",
  ];
  ctx.fillStyle = atmosphereWashes[atmosphereIdx];
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

function drawGeezDeathCounter(deaths) {
  if (!ensureCanvas() || !ctx) return;
  ctx.save();

  const geezStr = toGeezNumeral(deaths);
  const interpretStr = `${deaths} death${deaths === 1 ? '' : 's'}`;

  const cx = W / 2;
  const cy = 26;
  const boxW = 126;
  const boxH = 34;

  // Background Glass Pill
  ctx.fillStyle = "rgba(22, 14, 10, 0.82)";
  ctx.strokeStyle = "rgba(216, 180, 120, 0.55)";
  ctx.lineWidth = 1.5;
  roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 17);
  ctx.fill();
  ctx.stroke();

  // Ethiopian Flag Accent Bar on top
  const stripeW = 42;
  const stripeH = 2.5;
  const sx = cx - stripeW / 2;
  const sy = cy - boxH / 2 + 2;
  ctx.fillStyle = "#009A44"; ctx.fillRect(sx, sy, stripeW / 3, stripeH);
  ctx.fillStyle = "#FED100"; ctx.fillRect(sx + stripeW / 3, sy, stripeW / 3, stripeH);
  ctx.fillStyle = "#E10600"; ctx.fillRect(sx + stripeW * 2 / 3, sy, stripeW / 3, stripeH);

  // Ge'ez Numeral (Primary Display)
  ctx.fillStyle = "#FED100";
  ctx.font = "bold 15px 'Noto Sans Ethiopic', 'Segoe UI Historic', 'Ethiopic', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`ሞት: ${geezStr}`, cx, cy - 3);

  // Small Interpreter Counter below
  ctx.fillStyle = "#D8C2A0";
  ctx.font = "10px sans-serif";
  ctx.fillText(`(${interpretStr})`, cx, cy + 9);

  ctx.restore();
}

// ================================================================ GAME
const Game = {
  state: "menu",
  levelIndex: 0,
  levelDeaths: 0,
  level: null,
  player: null,
  deaths: 0,
  invertControls: false,
  flags: {},
  deathT: 0,
  deathLine: "",
  winT: 0,
  shakeAmt: 0,
  shakeT: 0,
  wipe: 0,
  wipeDir: 0,
  wipeNext: null,
  time: 0,

  shake(amt, t) { this.shakeAmt = Math.max(this.shakeAmt, amt); this.shakeT = Math.max(this.shakeT, t); },

  togglePause() {
    if (this.state === "play") {
      this.state = "paused";
      document.getElementById("pause-menu")?.classList.remove("hidden");
      updatePauseMenuStats();
    } else if (this.state === "paused") {
      this.state = "play";
      document.getElementById("pause-menu")?.classList.add("hidden");
    }
  },

  loadLevel(i, packId = currentPackId) {
    currentPackId = packId;
    const pack = LEVEL_PACKS[packId] || LEVEL_PACKS.karya;
    this.currentPack = pack;
    this.levelIndex = i;
    this.levelDeaths = 0;
    const def = pack.levels[i] || pack.levels[0];
    this.flags = {};
    this.level = addCampaignSurprises(def.build(), i);
    this.level.name = def.name;
    this.spawnPlayer();
    stains = [];
    particles.length = 0;
    setElText("hud-levelname", def.name);
    setElText("hud-levelnum", `${pack.name} - ${i + 1}`);
  },

  spawnPlayer() {
    const s = this.level.spawn;
    this.player = {
      x: s.x, y: s.y - 6, w: 22, h: 22,
      vx: 0, vy: 0,
      grounded: false, coyote: 0, face: 1,
      squash: 0, jumping: false,
    };
  },

  restartLevel(manual = false) {
    if (manual) {
      this.levelDeaths = (this.levelDeaths || 0) + 1;
      this.deaths++;
      saveProgress();
      updateDeathHud();
    }
    this.loadLevel(this.levelIndex, currentPackId);
    this.state = "play";
  },

  die(x, y) {
    if (this.state !== "play") return;
    this.levelDeaths = (this.levelDeaths || 0) + 1;
    this.deaths++;
    saveProgress();
    updateDeathHud();
    AudioFX.death();
    spawnBlood(x, y);
    addStain(x, Math.min(y + 20, 478));
    this.shake(9, 0.3);
    this.state = "dead";
    this.deathT = 0;
    this.deathLine = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
  },

  winLevel() {
    this.state = "win";
    this.winT = 0;
    AudioFX.win();
    saveLevelDone(currentPackId, this.levelIndex);
  },

  startWipe(cb) { this.wipeDir = 1; this.wipeNext = cb; },

  update(dt) {
    if (this.state === "paused") return;
    this.time += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT <= 0) this.shakeAmt = 0;
    updateParticles(dt);

    if (this.wipeDir !== 0) {
      this.wipe += this.wipeDir * dt * 3;
      if (this.wipeDir > 0 && this.wipe >= 1) {
        this.wipe = 1;
        if (this.wipeNext) this.wipeNext();
        this.wipeNext = null;
        this.wipeDir = -1;
      } else if (this.wipeDir < 0 && this.wipe <= 0) {
        this.wipe = 0; this.wipeDir = 0;
      }
    }

    if (this.state === "play") this.updatePlay(dt);
    else if (this.state === "dead") {
      this.deathT += dt;
      for (const t of this.level.traps) t.update(dt, this);
      if (this.deathT > 0.85) {
        this.startWipe(() => { this.loadLevel(this.levelIndex, currentPackId); this.state = "play"; });
        this.state = "respawning";
      }
    } else if (this.state === "win") {
      const prevWinT = this.winT;
      this.winT += dt;
      if (prevWinT < 0.55 && this.winT >= 0.55) {
        AudioFX.slam();
      }
      if (this.winT > 0.8) {
        this.state = "betweenLevels";
        const pack = LEVEL_PACKS[currentPackId] || LEVEL_PACKS.karya;
        if (this.levelIndex + 1 >= pack.levels.length) {
          this.startWipe(() => showEnd());
        } else {
          this.startWipe(() => { this.loadLevel(this.levelIndex + 1, currentPackId); this.state = "play"; });
        }
      }
    }
  },

  collectSolids() {
    const out = [...this.level.solids];
    for (const t of this.level.traps) out.push(...t.solids());
    return out;
  },

  updatePlay(dt) {
    const p = this.player;
    this.invertControls = false;

    for (const t of this.level.traps) t.update(dt, this);
    this.level.door.update(dt, this);

    let dir = 0;
    if (heldLeft()) dir -= 1;
    if (heldRight()) dir += 1;
    if (this.invertControls) dir = -dir;
    if (dir !== 0) p.face = dir;

    p.spicyDash = p.spicyDash || 0;
    let currentSpeed = 310;
    let accel = p.grounded ? 2800 : 1950;
    let target = dir * currentSpeed;

    if (p.spicyDash > 0) {
      p.spicyDash -= dt;
      dir = 1;
      p.face = 1;
      currentSpeed = 580;
      accel = 6000;
      target = currentSpeed;
      if (Math.random() < 0.4) {
        spawnSpicyParticle(p.x, p.y + p.h / 2);
      }
    }

    if (target > p.vx) p.vx = Math.min(target, p.vx + accel * dt);
    else if (target < p.vx) p.vx = Math.max(target, p.vx - accel * dt);

    jumpBuffered = Math.max(0, jumpBuffered - dt);
    p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
    if (jumpBuffered > 0 && p.coyote > 0) {
      p.vy = -665;
      p.grounded = false;
      p.coyote = 0;
      p.jumping = true;
      jumpBuffered = 0;
      AudioFX.jump();
      spawnDust(p.x + p.w / 2, p.y + p.h, 4);
    }
    if (p.vy >= 0) p.jumping = false;
    if (!heldJump() && p.jumping && p.vy < -220) { p.vy = -220; p.jumping = false; }

    p.vy = Math.min(p.vy + 2250 * dt, 1040);

    const solids = this.collectSolids();
    const wasGrounded = p.grounded;

    p.x += p.vx * dt;
    for (const s of solids) {
      if (aabb(p, s)) {
        if (p.vx > 0) p.x = s.x - p.w;
        else if (p.vx < 0) p.x = s.x + s.w;
        else p.x = p.x + p.w / 2 < s.x + s.w / 2 ? s.x - p.w : s.x + s.w;
        p.vx = 0;
      }
    }

    p.y += p.vy * dt;
    p.grounded = false;
    for (const s of solids) {
      if (aabb(p, s)) {
        if (p.vy > 0) {
          p.y = s.y - p.h;
          p.grounded = true;
          if (!wasGrounded && p.vy > 350) { AudioFX.land(); spawnDust(p.x + p.w / 2, p.y + p.h, 5); p.squash = 0.12; }
          p.vy = 0;
        } else if (p.vy < 0) {
          p.y = s.y + s.h;
          p.vy = 0;
        }
      }
    }
    p.squash = Math.max(0, p.squash - dt);

    for (const s of solids) {
      if (aabb(R(p.x + 4, p.y + 4, p.w - 8, p.h - 8), s)) {
        this.die(p.x + p.w / 2, p.y + p.h / 2);
        return;
      }
    }

    for (const t of this.level.traps) {
      for (const k of t.kills()) {
        if (aabb(p, k)) { this.die(p.x + p.w / 2, p.y + p.h / 2); return; }
      }
    }

    if (p.y > H + 40) {
      this.levelDeaths = (this.levelDeaths || 0) + 1;
      this.deaths++;
      saveProgress();
      updateDeathHud();
      AudioFX.death();
      this.state = "dead";
      this.deathT = 0;
      this.deathLine = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
      this.shake(6, 0.25);
      return;
    }

    if (this.level.door.playerWins(p)) this.winLevel();
  },

  // ============================================================== draw
  draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // Render Ethiopian cultural and historical background varying per level (Simien, Axum, Lalibela, Gondar, Harar)
    drawEthiopianBackground(this.levelIndex || 0);

    if (this.shakeAmt > 0) {
      ctx.translate(rand(-this.shakeAmt, this.shakeAmt), rand(-this.shakeAmt, this.shakeAmt));
    }

    if (this.level) {
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = theme.blood;
      for (const s of stains) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      this.level.door.draw();

      // Draw ground solids with rich terracotta earth and geometric Ethiopian pattern trim
      for (const s of this.level.solids) {
        if (s.x < -20 || s.x > W) continue;
        ctx.save();
        drawEarthRect(s);
        ctx.restore();
      }

      for (const t of this.level.traps) t.draw();

      if (this.state === "play" || this.state === "win" || this.state === "betweenLevels") this.drawPlayer();

      drawParticles();

      // Top-Middle Real-Time Ge'ez Death Counter (when enabled)
      if (showDeathCounter && (this.state === "play" || this.state === "win" || this.state === "betweenLevels" || this.state === "dead")) {
        drawGeezDeathCounter(this.deaths || 0);
      }

      // Top-Left ESC button
      ctx.save();
      const btnX = 18, btnY = 16;
      ctx.fillStyle = "#351C12";
      roundRect(btnX, btnY, 28, 28, 4);
      ctx.fill();

      ctx.fillStyle = "#FAC835";
      ctx.beginPath();
      ctx.moveTo(btnX + 19, btnY + 7);
      ctx.lineTo(btnX + 8, btnY + 14);
      ctx.lineTo(btnX + 19, btnY + 21);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#FAC835";
      ctx.font = "bold 13px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("esc", btnX + 14, btnY + 42);
      ctx.restore();

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, theme.vignette);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      if (this.state === "dead" || this.state === "respawning") {
        const a = clamp(this.deathT * 4, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = theme.danger;
        ctx.font = `900 58px ${FONT}`;
        ctx.textAlign = "center";
        const wob = Math.sin(this.time * 30) * 2 * (1 - this.deathT);
        ctx.fillText(this.deathLine, W / 2 + wob, H / 2 - 30);
        ctx.globalAlpha = 1;
      }

      if (this.state === "win" || this.state === "betweenLevels") {
        const a = clamp(this.winT * 5, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = theme.accent;
        ctx.font = `900 52px ${FONT}`;
        ctx.textAlign = "center";
        const pack = LEVEL_PACKS[currentPackId] || LEVEL_PACKS.karya;
        ctx.fillText(this.levelIndex + 1 >= pack.levels.length ? "አሸነፍክ!" : "FINE. NEXT.", W / 2, H / 2 - 40);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    if (this.wipe > 0.001) {
      const maxR = Math.hypot(W, H) / 2 + 40;
      const r = (1 - this.wipe) * maxR;
      ctx.fillStyle = theme.wipe;
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(W / 2, H / 2, Math.max(r, 0), 0, Math.PI * 2, true);
      ctx.fill();
    }
  },

  drawPlayer() {
    const p = this.player;
    if (!p) return;
    if (this.state === "betweenLevels") return; // Completely hidden between levels

    ensureCanvas();
    if (!ctx) return;
    const time = performance.now() / 1000;

    let enterAlpha = 1;
    let enterScale = 1;
    let drawCx = p.x + p.w / 2;
    let drawBy = p.y + p.h;

    // Disappear / step inside house when reaching destination door
    if (this.state === "win") {
      const winProgress = clamp(this.winT * 4, 0, 1); // 0 to 1 over first ~0.25s
      enterAlpha = 1 - winProgress;
      if (enterAlpha <= 0.01) return; // Character is completely inside the house!

      const doorCenter = this.level && this.level.door && this.level.door.pos
        ? (this.level.door.pos.x + this.level.door.w / 2)
        : drawCx;
      drawCx = drawCx + (doorCenter - drawCx) * winProgress;
      enterScale = 1 - winProgress * 0.45;
    }

    const isMoving = Math.abs(p.vx) > 15 && p.grounded && this.state === "play";
    const isJumping = !p.grounded;
    const isRising = isJumping && p.vy < -40;
    const isFalling = isJumping && p.vy > 40;
    const face = p.face || 1;

    // Squash and stretch calculations
    const squashY = p.squash > 0 ? 1 - p.squash * 2.2 : 1;
    const stretchY = isJumping ? clamp(1 + Math.abs(p.vy) / 2200, 1, 1.25) : squashY;
    const sx = 1 / stretchY;

    // Position center-bottom
    const runBounce = isMoving ? -Math.abs(Math.sin(time * 18)) * 2.5 : 0;
    const by = drawBy + runBounce;

    ctx.save();
    ctx.translate(drawCx, by);
    ctx.globalAlpha = enterAlpha;

    // Lean body into movement or jump direction
    let bodyLean = 0;
    if (isMoving) bodyLean = 0.12 * Math.sign(p.vx);
    else if (isRising) bodyLean = 0.1 * face;
    else if (isFalling) bodyLean = -0.05 * face;

    ctx.scale(face * sx * enterScale, stretchY * enterScale);
    ctx.rotate(bodyLean);

    const s = 1.15;
    ctx.scale(s, s);

    // Color Palette - Character matching the uploaded reference image
    const SKIN = '#5A3B28';          // Rich dark warm brown skin tone
    const SKIN_SHADOW = '#3F2618';   // Deep warm skin shadow
    const HAIR = '#1E1C1B';          // Spiky dark anime hair
    const HAIR_HIGHLIGHT = '#353130';// Hair sheen/highlight
    const EYE_COLOR = '#3A2010';     // Expressive deep brown eye
    const TUNIC_MAIN = '#FAF7F0';    // White/cream traditional tunic
    const TUNIC_SHADOW = '#DDD7CA';  // Tunic shadow
    const GREEN_SASH = '#1B7A3E';    // Green Tibeb sash
    const SASH_YELLOW = '#E8AC23';   // Tibeb yellow pattern
    const SASH_RED = '#C92A2A';      // Tibeb red pattern
    const GOLD_CUFF = '#E2AE32';     // Gold arm bands & cuffs
    const GOLD_HIGHLIGHT = '#FFF2A8';// Gold glint
    const SANDAL_LEATHER = '#5A3822';// Brown leather sandals
    const SANDAL_STRAP = '#3A2213';  // Dark sandal straps

    // Helper to draw Tibeb sash pattern (Green band with red & yellow geometric diamonds)
    const drawTibebSashBand = (x1, y1, x2, y2, width) => {
      ctx.save();
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      ctx.translate(x1, y1);
      ctx.rotate(angle);

      // Green base sash
      ctx.fillStyle = GREEN_SASH;
      ctx.fillRect(0, -width / 2, len, width);

      // Yellow border edges
      ctx.fillStyle = SASH_YELLOW;
      ctx.fillRect(0, -width / 2, len, 1);
      ctx.fillRect(0, width / 2 - 1, len, 1);

      // Red & Yellow Diamond/Triangle Geometric Tibeb Pattern inside sash
      const numPatterns = Math.max(2, Math.floor(len / 5));
      const step = len / numPatterns;
      for (let i = 0; i < numPatterns; i++) {
        const cx = i * step + step / 2;
        // Red diamond
        ctx.fillStyle = SASH_RED;
        ctx.beginPath();
        ctx.moveTo(cx - 1.8, 0);
        ctx.lineTo(cx, -width / 3);
        ctx.lineTo(cx + 1.8, 0);
        ctx.lineTo(cx, width / 3);
        ctx.closePath();
        ctx.fill();

        // Gold center dot
        ctx.fillStyle = SASH_YELLOW;
        ctx.fillRect(cx - 0.6, -0.6, 1.2, 1.2);
      }
      ctx.restore();
    };

    // 1. Fluttering Tunic Back Flap (drapes dynamically)
    const breathe = (!isMoving && !isJumping) ? Math.sin(time * 4) * 0.4 : 0;
    let tunicWave = 0;
    if (isMoving) tunicWave = Math.sin(time * 18) * 3;
    else if (isRising) tunicWave = 4;
    else if (isFalling) tunicWave = -3;

    ctx.fillStyle = TUNIC_SHADOW;
    ctx.beginPath();
    ctx.moveTo(-6, -16 + breathe);
    ctx.lineTo(-12 - tunicWave * 0.5, -8 + tunicWave);
    ctx.lineTo(-5, -6 + breathe);
    ctx.closePath();
    ctx.fill();

    // 2. Legs & Feet (Bare Dark Brown Legs + Strappy Leather Sandals)
    let backLegX = -5, backLegY = -10, backFootY = 4;
    let frontLegX = 1, frontLegY = -10, frontFootY = 4;

    if (isMoving) {
      const legPhase = time * 18;
      frontLegX = 1 + Math.sin(legPhase) * 6;
      frontFootY = 4 - Math.max(0, Math.cos(legPhase) * 5);

      backLegX = -5 - Math.sin(legPhase) * 6;
      backFootY = 4 - Math.max(0, -Math.cos(legPhase) * 5);
    } else if (isRising) {
      frontLegX = 3; frontLegY = -12; frontFootY = 2;
      backLegX = -6; backLegY = -8; backFootY = 6;
    } else if (isFalling) {
      frontLegX = 2; frontLegY = -8; frontFootY = 6;
      backLegX = -4; backLegY = -9; backFootY = 5;
    }

    // Back Leg (Skin)
    ctx.fillStyle = SKIN_SHADOW;
    ctx.fillRect(backLegX, backLegY, 4.5, 12);
    // Back Sandal (Sole + Leather Straps)
    ctx.fillStyle = SANDAL_LEATHER;
    ctx.fillRect(backLegX - 1, backLegY + 9, 6.5, 3);
    ctx.strokeStyle = SANDAL_STRAP;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(backLegX, backLegY + 4); ctx.lineTo(backLegX + 4, backLegY + 9);
    ctx.moveTo(backLegX + 4, backLegY + 4); ctx.lineTo(backLegX, backLegY + 9);
    ctx.stroke();

    // Front Leg (Skin)
    ctx.fillStyle = SKIN;
    ctx.fillRect(frontLegX, frontLegY, 4.5, 12);
    // Front Sandal (Sole + Leather Straps)
    ctx.fillStyle = SANDAL_LEATHER;
    ctx.fillRect(frontLegX - 1, frontLegY + 9, 6.5, 3);
    ctx.strokeStyle = SANDAL_STRAP;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(frontLegX, frontLegY + 4); ctx.lineTo(frontLegX + 4, frontLegY + 9);
    ctx.moveTo(frontLegX + 4, frontLegY + 4); ctx.lineTo(frontLegX, frontLegY + 9);
    ctx.stroke();

    // 3. Tunic Body (White Habesha Tobe / Kemis with side slit)
    ctx.fillStyle = TUNIC_SHADOW;
    ctx.fillRect(-6.5, -23 + breathe, 12.5, 16);

    ctx.fillStyle = TUNIC_MAIN;
    ctx.beginPath();
    ctx.moveTo(-6, -23 + breathe);
    ctx.lineTo(5.5, -23 + breathe);
    ctx.lineTo(6.5, -7 + breathe);
    ctx.lineTo(-6, -7 + breathe);
    ctx.closePath();
    ctx.fill();

    // Tunic hem detail
    ctx.fillStyle = TUNIC_SHADOW;
    ctx.fillRect(-6, -8 + breathe, 12.5, 1.2);

    // 4. Diagonal Green Tibeb Sash (Drapes from Right Shoulder to Left Hip) & Waist Wrap
    drawTibebSashBand(-3, -22 + breathe, 4, -12 + breathe, 5.5); // Diagonal sash
    drawTibebSashBand(-5.5, -12 + breathe, 5.5, -12 + breathe, 4.5); // Waist belt wrap

    // Hanging Tassels at Left Hip
    ctx.fillStyle = SASH_YELLOW;
    ctx.fillRect(-5.5, -10 + breathe, 1.2, 4);
    ctx.fillRect(-3.8, -10 + breathe, 1.2, 5);
    ctx.fillStyle = GREEN_SASH;
    ctx.fillRect(-4.7, -10 + breathe, 1.2, 4.5);

    // 5. Arms & Gold Cuffs (Upper Arm & Wrist Gold Bands)
    let armAngle = 0;
    if (isMoving) {
      armAngle = -Math.sin(time * 18) * 0.65;
    } else if (isRising) {
      armAngle = -1.1;
    } else if (isFalling) {
      armAngle = -0.4;
    }

    ctx.save();
    ctx.translate(0, -19 + breathe);
    ctx.rotate(armAngle);

    // Short Tunic Sleeve
    ctx.fillStyle = TUNIC_MAIN;
    ctx.fillRect(-2, -1, 5, 5);

    // Bare Arm (Dark Skin)
    ctx.fillStyle = SKIN;
    ctx.fillRect(-1.5, 4, 4, 6);

    // Upper Arm Gold Cuff
    ctx.fillStyle = GOLD_CUFF;
    ctx.fillRect(-1.8, 4.2, 4.6, 1.5);
    ctx.fillStyle = GOLD_HIGHLIGHT;
    ctx.fillRect(-1.2, 4.2, 1.5, 1.5);

    // Wrist Gold Band
    ctx.fillStyle = GOLD_CUFF;
    ctx.fillRect(-1.8, 8, 4.6, 1.8);
    ctx.fillStyle = GOLD_HIGHLIGHT;
    ctx.fillRect(-1.2, 8, 1.5, 1.8);

    // Hand
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(0.5, 11, 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Walking Stick
    ctx.fillStyle = "#3e2723"; // Dark brown wood
    ctx.beginPath();
    ctx.roundRect(-0.5, -2, 2.5, 24, 1);
    ctx.fill();
    // Stick Knob
    ctx.fillStyle = "#5d4037"; // Lighter brown wood knob
    ctx.beginPath();
    ctx.arc(0.7, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 6. Hair
    ctx.fillStyle = HAIR;

    // Head Base Core
    ctx.beginPath();
    ctx.arc(0, -32 + breathe, 9, 0, Math.PI * 2);
    ctx.fill();

    if (characterGender === "male") {
      // Male: Spiky Anime Hair
      const hairSpikes = [
        { x1: -4, y1: -38, x2: -1, y2: -48, x3: 3, y3: -38 },
        { x1: -9, y1: -35, x2: -7, y2: -45, x3: -2, y3: -38 },
        { x1: 1, y1: -38, x2: 6, y2: -46, x3: 8, y3: -35 },
        { x1: -10, y1: -30, x2: -16, y2: -36, x3: -7, y3: -38 },
        { x1: -9, y1: -24, x2: -15, y2: -28, x3: -8, y3: -33 },
        { x1: -6, y1: -22, x2: -11, y2: -21, x3: -6, y3: -27 },
        { x1: 5, y1: -36, x2: 12, y2: -40, x3: 9, y3: -30 },
        { x1: 6, y1: -28, x2: 12, y2: -31, x3: 7, y3: -23 },
        { x1: -2, y1: -40, x2: 2, y2: -49, x3: 5, y3: -39 },
      ];

      for (const sp of hairSpikes) {
        ctx.beginPath();
        ctx.moveTo(sp.x1, sp.y1 + breathe);
        ctx.lineTo(sp.x2, sp.y2 + breathe);
        ctx.lineTo(sp.x3, sp.y3 + breathe);
        ctx.closePath();
        ctx.fill();
      }

      // Hair Sheen / Highlights
      ctx.fillStyle = HAIR_HIGHLIGHT;
      ctx.beginPath();
      ctx.moveTo(-3, -37 + breathe); ctx.lineTo(-1, -43 + breathe); ctx.lineTo(1, -37 + breathe); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-7, -33 + breathe); ctx.lineTo(-11, -37 + breathe); ctx.lineTo(-5, -36 + breathe); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -36 + breathe); ctx.lineTo(5, -41 + breathe); ctx.lineTo(6, -34 + breathe); ctx.fill();
    } else {
      // Female: Braided hair pulled back into a small bun
      ctx.beginPath();
      ctx.arc(-8, -25 + breathe, 4.5, 0, Math.PI * 2); // Bun at the back
      ctx.fill();
      
      // Braid texture lines
      ctx.strokeStyle = HAIR_HIGHLIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -36 + breathe); ctx.bezierCurveTo(-1, -35 + breathe, 0, -32 + breathe, -6, -26 + breathe);
      ctx.moveTo(0, -38 + breathe); ctx.bezierCurveTo(4, -36 + breathe, 5, -30 + breathe, -4, -24 + breathe);
      ctx.moveTo(3, -35 + breathe); ctx.bezierCurveTo(6, -32 + breathe, 6, -28 + breathe, 1, -22 + breathe);
      ctx.stroke();
      
      // Bun highlight
      ctx.fillStyle = HAIR_HIGHLIGHT;
      ctx.beginPath();
      ctx.arc(-8, -25 + breathe, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Neck & Head Base (Side Profile facing forward +X)
    // Neck
    ctx.fillStyle = SKIN_SHADOW;
    ctx.fillRect(-1.5, -25 + breathe, 4, 3.5);

    // Head Base
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(0.5, -28 + breathe, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Profile Nose (pointing forward +X)
    ctx.beginPath();
    ctx.moveTo(5.5, -29.2 + breathe);
    ctx.lineTo(8.0, -27.5 + breathe); // nose tip
    ctx.lineTo(5.5, -26.0 + breathe);
    ctx.closePath();
    ctx.fill();

    // Profile Mouth & Chin
    ctx.beginPath();
    ctx.moveTo(5.5, -26.0 + breathe);
    ctx.lineTo(6.6, -25.0 + breathe); // lips
    ctx.lineTo(6.0, -24.0 + breathe);
    ctx.lineTo(5.5, -22.5 + breathe); // chin
    ctx.lineTo(1.0, -22.5 + breathe);
    ctx.lineTo(1.0, -26.0 + breathe);
    ctx.closePath();
    ctx.fill();

    // Side-View Ear with Gold Earring
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(-2.5, -27.2 + breathe, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKIN_SHADOW;
    ctx.beginPath();
    ctx.arc(-2.2, -27.2 + breathe, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Gold Earring
    ctx.strokeStyle = GOLD_CUFF;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-2.5, -25.0 + breathe, 1.2, 0, Math.PI);
    ctx.stroke();

    // 8. Expressive Eye & Brow (Side Profile)
    // White of eye in profile
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(3.8, -28.5 + breathe, 1.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris / Pupil looking forward
    ctx.fillStyle = EYE_COLOR;
    ctx.beginPath();
    ctx.ellipse(4.2, -28.5 + breathe, 1.1, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(4.6, -29.2 + breathe, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2.2, -31.5 + breathe);
    ctx.lineTo(5.8, -31.0 + breathe);
    ctx.stroke();

    ctx.restore();
  },
};

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- progress / DOM
function getDone(packId = currentPackId) {
  try {
    const key = `fd_done_${packId}`;
    let val = localStorage.getItem(key);
    if (!val && packId === "karya") {
      val = localStorage.getItem("fd_done");
    }
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

function saveLevelDone(packId, levelIndex) {
  try {
    const done = getDone(packId);
    done[levelIndex] = true;
    localStorage.setItem(`fd_done_${packId}`, JSON.stringify(done));
    if (packId === "karya") {
      localStorage.setItem("fd_done", JSON.stringify(done));
    }
  } catch {}
}

function saveProgress() { localStorage.setItem("fd_deaths", Game.deaths); }
function loadProgress() {
  let d = localStorage.getItem("fd_deaths");
  if (d === null) d = localStorage.getItem("ld_deaths"); // migrate from Level Devil
  Game.deaths = parseInt(d) || 0;
  if (!localStorage.getItem("fd_done_karya")) {
    const old = localStorage.getItem("fd_done") || localStorage.getItem("ld_done");
    if (old) localStorage.setItem("fd_done_karya", old);
  }
}
function updateDeathHud() {
  setElText("hud-deaths", Game.deaths);
  setElText("menu-deaths", Game.deaths);
  setElText("pause-total-deaths", Game.deaths);
  setElText("pause-geez-deaths", toGeezNumeral(Game.deaths));
}

function updatePauseMenuStats() {
  const pack = LEVEL_PACKS[currentPackId] || LEVEL_PACKS.karya;
  setElText("pause-level-info", `${pack.name} · LEVEL ${Game.levelIndex + 1}: ${Game.level ? Game.level.name : ""}`);
  setElText("pause-geez-deaths", toGeezNumeral(Game.deaths || 0));
  setElText("pause-total-deaths", Game.deaths || 0);

  const pc = document.getElementById("pbtn-counter");
  const pt = document.getElementById("pbtn-theme");
  const pm = document.getElementById("pbtn-mute");
  const pf = document.getElementById("pbtn-fs");

  if (pc) pc.classList.toggle("active", showDeathCounter);
  if (pt) pt.classList.toggle("active", theme.bg === "#1C1410" || document.body.dataset.theme === "dark");
  if (pm) pm.classList.toggle("active", AudioFX.isMuted());
  if (pf) pf.classList.toggle("active", !!document.fullscreenElement);
}

function wirePauseMenu() {
  const btnPause = document.getElementById("btn-pause");
  if (btnPause) btnPause.addEventListener("click", () => Game.togglePause());

  const btnResume = document.getElementById("pause-resume-btn");
  if (btnResume) btnResume.addEventListener("click", () => Game.togglePause());

  const btnRestart = document.getElementById("pause-restart-btn");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      document.getElementById("pause-menu")?.classList.add("hidden");
      Game.restartLevel(true);
    });
  }

  const btnMenu = document.getElementById("pause-menu-btn");
  if (btnMenu) {
    btnMenu.addEventListener("click", () => {
      document.getElementById("pause-menu")?.classList.add("hidden");
      showMenu();
    });
  }

  const pchar = document.getElementById("pbtn-char");
  const pc = document.getElementById("pbtn-counter");
  const pt = document.getElementById("pbtn-theme");
  const pm = document.getElementById("pbtn-mute");
  const pf = document.getElementById("pbtn-fs");

  if (pchar) pchar.addEventListener("click", () => { toggleCharacter(); updatePauseMenuStats(); });
  if (pc) pc.addEventListener("click", () => { toggleDeathCounter(); updatePauseMenuStats(); });
  if (pt) pt.addEventListener("click", () => { toggleTheme(); updatePauseMenuStats(); });
  if (pm) pm.addEventListener("click", () => { AudioFX.init(); setMuteIcon(AudioFX.toggleMute()); updatePauseMenuStats(); });
  if (pf) pf.addEventListener("click", () => { toggleFullscreen(); updatePauseMenuStats(); });
}

function initCanvasClick() {
  ensureCanvas();
  if (!cv) return;
  cv.addEventListener("pointerdown", (e) => {
    const rect = cv.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Top-Left ESC/Pause area on canvas
    if (clickX >= 0 && clickX <= 70 && clickY >= 0 && clickY <= 60) {
      if (Game.state === "play" || Game.state === "paused") {
        Game.togglePause();
      }
    }
  });
}

// ---------------------------------------------------------------- topbar controls (theme / mute / fullscreen)
const SUN_PATH = '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.9 1.9M17.1 17.1L19 19M19 5l-1.9 1.9M6.9 17.1L5 19"/></g></svg>';
const MOON_PATH = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5z" fill="currentColor"/></svg>';
const VOL_ON = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const VOL_OFF = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const FS_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const FS_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>';

function setMuteIcon(muted) {
  const el = document.getElementById("ic-mute");
  if (el) el.innerHTML = muted ? VOL_OFF : VOL_ON;
}
function setFsIcon() {
  const el = document.getElementById("ic-fs");
  if (el) el.innerHTML = document.fullscreenElement ? FS_ON : FS_OFF;
}
function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  try {
    if (!d.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen)?.call(d);
    }
  } catch {}
}
document.addEventListener("fullscreenchange", () => { setFsIcon(); fit(); });

function wireTopbar() {
  const bchar = document.getElementById("btn-char");
  const bc = document.getElementById("btn-counter");
  const bt = document.getElementById("btn-theme");
  const bm = document.getElementById("btn-mute");
  const bf = document.getElementById("btn-fs");
  if (bchar) bchar.addEventListener("click", () => { toggleCharacter(); });
  if (bc) bc.addEventListener("click", () => { toggleDeathCounter(); });
  if (bt) bt.addEventListener("click", () => { toggleTheme(); });
  if (bm) bm.addEventListener("click", () => { AudioFX.init(); setMuteIcon(AudioFX.toggleMute()); });
  if (bf) bf.addEventListener("click", () => { toggleFullscreen(); });
  updateCounterIcon();
  setMuteIcon(AudioFX.isMuted());
  setFsIcon();
}

// ---------------------------------------------------------------- touch controls
function bindHold(id, on, off) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => { e.preventDefault(); el.classList.add("held"); AudioFX.init(); on(); };
  const release = (e) => { e.preventDefault(); el.classList.remove("held"); off(); };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}

function initTouchControls() {
  bindHold("tc-left", () => (touch.left = true), () => (touch.left = false));
  bindHold("tc-right", () => (touch.right = true), () => (touch.right = false));
  bindHold("tc-jump",
    () => { touch.jump = true; jumpBuffered = 0.12; },
    () => (touch.jump = false)
  );
  const tcR = document.getElementById("tc-restart");
  if (tcR) {
    tcR.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (Game.state === "play") Game.restartLevel(true);
    });
  }
}

function setTouchControlsVisible(v) {
  const touchEl = document.getElementById("touch-controls");
  if (touchEl) touchEl.classList.toggle("hidden", !(v && IS_TOUCH));
}

function selectCategory(packId) {
  currentPackId = packId;
  const btnKarya = document.getElementById("cat-btn-karya");
  const btnMitmita = document.getElementById("cat-btn-mitmita");
  const gridLabel = document.getElementById("grid-label");
  const playBtn = document.getElementById("play-btn");

  if (btnKarya) btnKarya.classList.toggle("active", packId === "karya");
  if (btnMitmita) btnMitmita.classList.toggle("active", packId === "mitmita");

  const pack = LEVEL_PACKS[packId] || LEVEL_PACKS.karya;
  if (gridLabel) gridLabel.textContent = `${pack.name} (${pack.levels.length} LEVELS)`;
  if (playBtn) playBtn.textContent = "START JOURNEY";

  buildLevelGrid();
}

function wireCategorySelector() {
  const btnKarya = document.getElementById("cat-btn-karya");
  const btnMitmita = document.getElementById("cat-btn-mitmita");

  if (btnKarya) btnKarya.onclick = (e) => { e.preventDefault(); selectCategory("karya"); };
  if (btnMitmita) btnMitmita.onclick = (e) => { e.preventDefault(); selectCategory("mitmita"); };

  // Delegated fallback listener for extra reliability across mounts
  document.addEventListener("click", (e) => {
    const karyaBtn = e.target.closest("#cat-btn-karya, .cat-btn-karya");
    const mitmitaBtn = e.target.closest("#cat-btn-mitmita, .cat-btn-mitmita");
    if (karyaBtn) {
      e.preventDefault();
      selectCategory("karya");
    } else if (mitmitaBtn) {
      e.preventDefault();
      selectCategory("mitmita");
    }
  });
}

function buildLevelGrid() {
  const grid = document.getElementById("level-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const pack = LEVEL_PACKS[currentPackId] || LEVEL_PACKS.karya;
  const done = getDone(currentPackId);
  let unlockedUpTo = 0;
  for (let i = 0; i < pack.levels.length; i++) {
    if (done[i]) unlockedUpTo = i + 1;
  }

  for (let i = 0; i < pack.levels.length; i++) {
    const b = document.createElement("button");
    b.textContent = i + 1;
    b.disabled = i > unlockedUpTo;
    if (done[i]) b.classList.add("done");
    b.addEventListener("click", () => startGame(i, currentPackId));
    grid.appendChild(b);
  }
}

function startGame(i, packId = currentPackId) {
  AudioFX.init();
  if (IS_TOUCH && !document.fullscreenElement) toggleFullscreen();
  document.getElementById("menu")?.classList.add("hidden");
  document.getElementById("pause-menu")?.classList.add("hidden");
  document.getElementById("end-screen")?.classList.add("hidden");
  document.getElementById("hud")?.classList.remove("hidden");
  setTouchControlsVisible(true);
  if (i === 0) {
    Game.deaths = 0;
    saveProgress();
    updateDeathHud();
  }
  Game.loadLevel(i, packId);
  Game.state = "play";
  Game.wipe = 1;
  Game.wipeDir = -1;
}

function showMenu() {
  selectCategory(currentPackId);
  updateDeathHud();
  document.getElementById("menu")?.classList.remove("hidden");
  document.getElementById("pause-menu")?.classList.add("hidden");
  document.getElementById("end-screen")?.classList.add("hidden");
  document.getElementById("hud")?.classList.add("hidden");
  setTouchControlsVisible(false);
  Game.state = "menu";
}

function showEnd() {
  document.getElementById("hud")?.classList.add("hidden");
  document.getElementById("pause-menu")?.classList.add("hidden");
  setTouchControlsVisible(false);
  document.getElementById("end-screen")?.classList.remove("hidden");
  Game.state = "end";
  setElText("end-deaths", Game.deaths);
  let roast = ROASTS[ROASTS.length - 1][1];
  for (const [n, t] of ROASTS) { if (Game.deaths <= n) { roast = t; break; } }
  setElText("end-roast", roast);
}

function wireButtons() {
  const pBtn = document.getElementById("play-btn");
  if (pBtn) pBtn.addEventListener("click", () => startGame(0, currentPackId));
  const eBtn = document.getElementById("end-menu-btn");
  if (eBtn) eBtn.addEventListener("click", showMenu);
}

// ---------------------------------------------------------------- layout / overlays sizing
function fit() {
  ensureCanvas();
  if (!cv) return;
  const vw = window.innerWidth;
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const pad = IS_TOUCH ? 0 : 36;
  const scale = Math.min((vw - pad) / W, (vh - pad) / H);
  const cw = Math.round(W * scale), ch = Math.round(H * scale);
  cv.style.width = cw + "px";
  cv.style.height = ch + "px";
  const m = document.getElementById("menu");
  const h = document.getElementById("hud");
  const e = document.getElementById("end-screen");
  const pm = document.getElementById("pause-menu");
  for (const el of [m, h, e, pm]) {
    if (!el) continue;
    el.style.width = cw + "px";
    el.style.height = el === h ? "auto" : ch + "px";
    el.style.left = `calc(50% - ${cw / 2}px)`;
    el.style.top = `calc(50% - ${ch / 2}px)`;
  }

  const topbar = document.getElementById("topbar");
  if (topbar) {
    const inset = vw <= 680 ? 8 : 12;
    topbar.style.top = `calc(50% - ${ch / 2}px + ${inset}px)`;
    topbar.style.right = `calc(50% - ${cw / 2}px + ${inset}px)`;
  }

  // portrait rotate hint
  const rot = document.getElementById("rotate-hint");
  if (rot) rot.classList.toggle("show", IS_TOUCH && vw < vh);
}
addEventListener("resize", fit);
if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);

// ---------------------------------------------------------------- boot
function initGame() {
  ensureCanvas();
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("fd_theme"); } catch {}
    if (!saved) saved = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    applyTheme(saved, false);
    let savedChar = null;
    try { savedChar = localStorage.getItem("fd_char"); } catch {}
    applyCharacterGender(savedChar || "male", false);
  })();
  wireTopbar();
  wirePauseMenu();
  initCanvasClick();
  initTouchControls();
  wireButtons();
  wireCategorySelector();
  loadProgress();
  updateDeathHud();
  selectCategory("karya");
  fit();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame);
} else {
  initGame();
}

// ---------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  ensureCanvas();
  if (ctx) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 1 / 30);
    Game.update(dt);
    Game.draw();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
