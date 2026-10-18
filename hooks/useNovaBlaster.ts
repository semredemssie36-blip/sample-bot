// ─────────────────────────────────────────────────────────────────────────────
// Nova Blaster — Complete Game Engine
// Full vertical space shooter: 5 enemy types, boss waves, power-ups,
// particle explosions, drag controls, wave progression, NOVA earning
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase = "idle" | "playing" | "paused" | "gameover";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }

export type EnemyType = "straight" | "zigzag" | "diver" | "shooter" | "circler" | "boss";
export type PowerUpType = "doubleShot" | "rapidFire" | "shield" | "bomb" | "nova";
export type BulletOwner = "player" | "enemy";

export interface Star { x: number; y: number; speed: number; size: number; alpha: number; }

export interface Bullet {
  id:     number;
  x:      number;
  y:      number;
  vx:     number;
  vy:     number;
  owner:  BulletOwner;
  color:  string;
  size:   number;
  damage: number;
}

export interface Enemy {
  id:      number;
  type:    EnemyType;
  x:       number;
  y:       number;
  hp:      number;
  maxHp:   number;
  speed:   number;
  phase:   number;   // internal movement phase
  timer:   number;   // shoot timer
  shootCooldown: number;
  color:   string;
  size:    number;
  points:  number;
  nova:    number;
  flashTimer: number;
}

export interface PowerUp {
  id:   number;
  type: PowerUpType;
  x:    number;
  y:    number;
  vy:   number;
}

export interface Particle {
  id:    number;
  x:     number;
  y:     number;
  vx:    number;
  vy:    number;
  color: string;
  size:  number;
  life:  number;  // 0-1, decreases each frame
  decay: number;
}

export interface FloatText {
  id:   number;
  x:    number;
  y:    number;
  text: string;
  color: string;
  life: number;
}

export interface Player {
  x:       number;
  y:       number;
  width:   number;
  height:  number;
  shield:  number;
  maxShield: number;
  lives:   number;
  invincible: number;  // frames of invincibility after hit
  // Power-ups
  doubleShot: number;
  rapidFire:  number;
  hasBomb:    boolean;
  shootTimer: number;
  baseShootRate: number;
}

export interface GameState {
  phase:       GamePhase;
  score:       number;
  novaEarned:  number;
  wave:        number;
  waveTimer:   number;   // countdown between waves
  player:      Player;
  enemies:     Enemy[];
  bullets:     Bullet[];
  powerUps:    PowerUp[];
  particles:   Particle[];
  floatTexts:  FloatText[];
  stars:       Star[];
  bossActive:  boolean;
  waveCleared: boolean;
  totalTime:   number;   // seconds survived
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYER_SPEED       = 6;
const BASE_SHOOT_RATE    = 18;  // frames between shots
const RAPID_SHOOT_RATE   = 7;
const SHIELD_MAX         = 3;
const LIVES_MAX          = 3;
const POWERUP_CHANCE     = 0.25; // 25% drop chance
const NOVA_PER_ENEMY     = 2;
const NOVA_PER_WAVE      = 10;
const NOVA_BOSS_KILL     = 100;
const NOVA_COIN_VALUE    = 20;
const NOVA_SURVIVAL_RATE = 300; // frames per +1 NOVA

let _id = 1;
const nextId = () => ++_id;

// ─── Factories ────────────────────────────────────────────────────────────────

function makeStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x:     Math.random() * w,
    y:     Math.random() * h,
    speed: Math.random() * 1.5 + 0.3,
    size:  Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.7 + 0.3,
  }));
}

function makePlayer(w: number, h: number): Player {
  return {
    x:         w / 2,
    y:         h - 80,
    width:     32,
    height:    36,
    shield:    SHIELD_MAX,
    maxShield: SHIELD_MAX,
    lives:     LIVES_MAX,
    invincible: 0,
    doubleShot: 0,
    rapidFire:  0,
    hasBomb:    false,
    shootTimer: 0,
    baseShootRate: BASE_SHOOT_RATE,
  };
}

function makeEnemy(type: EnemyType, wave: number, canvasW: number): Enemy {
  const waveScale = 1 + (wave - 1) * 0.15;
  const configs: Record<EnemyType, Partial<Enemy>> = {
    straight: { hp: 1, maxHp: 1, speed: 1.2 * waveScale, color: "#00e5ff", size: 20, points: 10, nova: NOVA_PER_ENEMY, shootCooldown: 0 },
    zigzag:   { hp: 1, maxHp: 1, speed: 1.0 * waveScale, color: "#ff4081", size: 22, points: 15, nova: NOVA_PER_ENEMY, shootCooldown: 0 },
    diver:    { hp: 2, maxHp: 2, speed: 2.5 * waveScale, color: "#ffea00", size: 24, points: 20, nova: NOVA_PER_ENEMY + 1, shootCooldown: 0 },
    shooter:  { hp: 2, maxHp: 2, speed: 0.8 * waveScale, color: "#e040fb", size: 22, points: 25, nova: NOVA_PER_ENEMY + 1, shootCooldown: 120 },
    circler:  { hp: 3, maxHp: 3, speed: 1.4 * waveScale, color: "#69f0ae", size: 26, points: 30, nova: NOVA_PER_ENEMY + 2, shootCooldown: 80 },
    boss:     { hp: 40 + wave * 10, maxHp: 40 + wave * 10, speed: 0.6, color: "#ff6d00", size: 50, points: 500, nova: NOVA_BOSS_KILL, shootCooldown: 40 },
  };
  const cfg = configs[type];
  return {
    id: nextId(),
    type,
    x:    type === "boss" ? canvasW / 2 : Math.random() * (canvasW - 60) + 30,
    y:    type === "boss" ? -60 : -(Math.random() * 200),
    hp:   cfg.hp!,
    maxHp: cfg.maxHp!,
    speed: cfg.speed!,
    phase: Math.random() * Math.PI * 2,
    timer: Math.random() * (cfg.shootCooldown ?? 120),
    shootCooldown: cfg.shootCooldown ?? 999,
    color: cfg.color!,
    size:  cfg.size!,
    points: cfg.points!,
    nova:  cfg.nova!,
    flashTimer: 0,
  };
}

function makeBullet(x: number, y: number, vx: number, vy: number, owner: BulletOwner, color: string, damage = 1): Bullet {
  return { id: nextId(), x, y, vx, vy, owner, color, size: owner === "player" ? 4 : 5, damage };
}

function makePowerUp(type: PowerUpType, x: number, y: number): PowerUp {
  return { id: nextId(), type, x, y, vy: 1.5 };
}

function makeParticles(x: number, y: number, color: string, count: number, speed = 3): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 1;
    return {
      id:    nextId(),
      x, y,
      vx:    Math.cos(angle) * s,
      vy:    Math.sin(angle) * s,
      color,
      size:  Math.random() * 5 + 2,
      life:  1,
      decay: Math.random() * 0.04 + 0.02,
    };
  });
}

function makeFloatText(x: number, y: number, text: string, color: string): FloatText {
  return { id: nextId(), x, y, text, color, life: 1 };
}

// ─── Wave definitions ─────────────────────────────────────────────────────────

function spawnWave(wave: number, canvasW: number): Enemy[] {
  const isBossWave = wave % 5 === 0;
  if (isBossWave) {
    return [makeEnemy("boss", wave, canvasW)];
  }

  const enemies: Enemy[] = [];
  const count = 5 + wave * 2;

  const typePool: EnemyType[] = wave === 1
    ? ["straight", "straight", "straight"]
    : wave === 2
    ? ["straight", "zigzag", "straight", "zigzag"]
    : wave === 3
    ? ["straight", "zigzag", "shooter", "diver"]
    : ["straight", "zigzag", "shooter", "diver", "circler"];

  for (let i = 0; i < count; i++) {
    const type = typePool[Math.floor(Math.random() * typePool.length)];
    const enemy = makeEnemy(type, wave, canvasW);
    // Stagger spawn
    enemy.y = -(i * 60 + Math.random() * 40);
    enemies.push(enemy);
  }
  return enemies;
}

// ─── Collision ────────────────────────────────────────────────────────────────

function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

function circles(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx, dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// ─── Main update function (called every frame) ────────────────────────────────

export function updateGame(
  state: GameState,
  canvasW: number,
  canvasH: number,
  targetX: number | null,  // player drag target X, null = not dragging
  useBomb: boolean,
): GameState {
  if (state.phase !== "playing") return state;

  // Deep clone mutable arrays
  let { player, enemies, bullets, powerUps, particles, floatTexts, stars, wave,
        waveTimer, score, novaEarned, bossActive, waveCleared, totalTime } = state;
  player     = { ...player };
  enemies    = enemies.map((e) => ({ ...e }));
  bullets    = bullets.map((b) => ({ ...b }));
  powerUps   = powerUps.map((p) => ({ ...p }));
  particles  = particles.map((p) => ({ ...p }));
  floatTexts = floatTexts.map((f) => ({ ...f }));
  stars      = stars.map((s) => ({ ...s }));

  const newBullets:     Bullet[]    = [];
  const newParticles:   Particle[]  = [];
  const newFloatTexts:  FloatText[] = [];
  const newPowerUps:    PowerUp[]   = [];

  totalTime++;

  // ── Survival NOVA ──────────────────────────────────────────────────────────
  if (totalTime % NOVA_SURVIVAL_RATE === 0) {
    novaEarned++;
  }

  // ── Stars scroll ──────────────────────────────────────────────────────────
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > canvasH) { s.y = 0; s.x = Math.random() * canvasW; }
  }

  // ── Player movement ────────────────────────────────────────────────────────
  if (targetX !== null) {
    const dx = targetX - player.x;
    const move = Math.min(Math.abs(dx), PLAYER_SPEED) * Math.sign(dx);
    player.x = Math.max(player.width / 2, Math.min(canvasW - player.width / 2, player.x + move));
  }

  // ── Player invincibility countdown ────────────────────────────────────────
  if (player.invincible > 0) player.invincible--;

  // ── Player power-up countdowns ─────────────────────────────────────────────
  if (player.doubleShot > 0) player.doubleShot--;
  if (player.rapidFire  > 0) player.rapidFire--;

  // ── Player shooting ────────────────────────────────────────────────────────
  player.shootTimer--;
  const shootRate = player.rapidFire > 0 ? RAPID_SHOOT_RATE : BASE_SHOOT_RATE;
  if (player.shootTimer <= 0) {
    player.shootTimer = shootRate;
    if (player.doubleShot > 0) {
      newBullets.push(makeBullet(player.x - 10, player.y - 20, 0, -14, "player", "#a855f7"));
      newBullets.push(makeBullet(player.x + 10, player.y - 20, 0, -14, "player", "#a855f7"));
    } else {
      newBullets.push(makeBullet(player.x, player.y - 20, 0, -14, "player", "#c084fc"));
    }
  }

  // ── Bomb ───────────────────────────────────────────────────────────────────
  if (useBomb && player.hasBomb) {
    player.hasBomb = false;
    // Destroy all enemies on screen
    for (const e of enemies) {
      if (e.y > -e.size) {
        newParticles.push(...makeParticles(e.x, e.y, e.color, 12, 5));
        newFloatTexts.push(makeFloatText(e.x, e.y, `+${e.nova}`, "#f59e0b"));
        novaEarned += e.nova;
        score      += e.points;
      }
    }
    enemies = [];
    // Big explosion in center
    newParticles.push(...makeParticles(canvasW / 2, canvasH / 2, "#f59e0b", 40, 8));
  }

  // ── Wave spawn / management ────────────────────────────────────────────────
  if (enemies.length === 0 && !waveCleared) {
    waveCleared = true;
    waveTimer   = 120; // 2 seconds between waves
    const waveBonus = wave * NOVA_PER_WAVE;
    novaEarned += waveBonus;
    newFloatTexts.push(makeFloatText(canvasW / 2, canvasH / 2 - 30, `Wave ${wave} Clear! +${waveBonus} NOVA`, "#f59e0b"));
  }

  if (waveCleared) {
    waveTimer--;
    if (waveTimer <= 0) {
      wave++;
      bossActive  = wave % 5 === 0;
      waveCleared = false;
      enemies.push(...spawnWave(wave, canvasW));
    }
  }

  // ── Enemy update ───────────────────────────────────────────────────────────
  const survivingEnemies: Enemy[] = [];
  for (const e of enemies) {
    e.flashTimer = Math.max(0, e.flashTimer - 1);

    // Movement patterns
    switch (e.type) {
      case "straight":
        e.y += e.speed;
        break;
      case "zigzag":
        e.y   += e.speed;
        e.phase += 0.05;
        e.x   += Math.sin(e.phase) * 2.5;
        e.x    = Math.max(e.size, Math.min(canvasW - e.size, e.x));
        break;
      case "diver":
        // Accelerates toward player
        e.y += e.speed * (1 + e.phase * 0.1);
        e.phase = Math.min(e.phase + 0.02, 3);
        break;
      case "shooter":
        e.y   += e.speed;
        e.phase += 0.02;
        e.x   += Math.sin(e.phase * 0.5) * 1.5;
        e.x    = Math.max(e.size, Math.min(canvasW - e.size, e.x));
        break;
      case "circler":
        e.y   += e.speed * 0.5;
        e.phase += 0.04;
        e.x   += Math.sin(e.phase) * 3;
        e.x    = Math.max(e.size, Math.min(canvasW - e.size, e.x));
        break;
      case "boss":
        // Enter from top, then patrol side to side
        if (e.y < 80) {
          e.y += 1.5;
        } else {
          e.phase += 0.01;
          e.x = canvasW / 2 + Math.sin(e.phase) * (canvasW * 0.38);
        }
        break;
    }

    // Enemy shooting
    if (e.shootCooldown < 999 && e.y > 0) {
      e.timer--;
      if (e.timer <= 0) {
        e.timer = e.shootCooldown;
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (e.type === "boss") {
          // Boss fires 3-way spread + aimed shot
          for (let i = -1; i <= 1; i++) {
            newBullets.push(makeBullet(e.x, e.y + e.size, i * 2, 5, "enemy", "#ff6d00", 1));
          }
          newBullets.push(makeBullet(e.x, e.y + e.size, (dx / dist) * 4, (dy / dist) * 4, "enemy", "#ff0000", 2));
        } else if (e.type === "circler") {
          // Fires aimed shot
          newBullets.push(makeBullet(e.x, e.y + e.size / 2, (dx / dist) * 3.5, (dy / dist) * 3.5, "enemy", e.color));
        } else {
          // Straight down
          newBullets.push(makeBullet(e.x, e.y + e.size / 2, 0, 4.5, "enemy", e.color));
        }
      }
    }

    // Remove if off-screen bottom
    if (e.y > canvasH + e.size * 2) {
      // Enemy escaped — minor penalty
      continue;
    }
    survivingEnemies.push(e);
  }

  // ── Bullet update + collision ──────────────────────────────────────────────
  const survivingBullets: Bullet[] = [];
  for (const b of [...bullets, ...newBullets]) {
    b.x += b.vx;
    b.y += b.vy;

    // Off-screen
    if (b.y < -20 || b.y > canvasH + 20 || b.x < -20 || b.x > canvasW + 20) continue;

    let hit = false;

    if (b.owner === "player") {
      // Check enemy collisions
      for (const e of survivingEnemies) {
        if (circles(b.x, b.y, b.size, e.x, e.y, e.size * 0.85)) {
          e.hp -= b.damage;
          e.flashTimer = 6;
          hit = true;

          if (e.hp <= 0) {
            // Enemy killed
            newParticles.push(...makeParticles(e.x, e.y, e.color, e.type === "boss" ? 30 : 12, e.type === "boss" ? 7 : 4));
            newFloatTexts.push(makeFloatText(e.x, e.y - 10, `+${e.nova}`, "#f59e0b"));
            novaEarned += e.nova;
            score      += e.points;

            // Power-up drop
            if (e.type !== "boss" && Math.random() < POWERUP_CHANCE) {
              const types: PowerUpType[] = ["doubleShot", "rapidFire", "shield", "bomb", "nova"];
              const weights              = [3, 3, 3, 1, 4]; // weighted random
              let total = weights.reduce((a, c) => a + c, 0);
              let r = Math.random() * total;
              let pType: PowerUpType = "nova";
              for (let i = 0; i < types.length; i++) {
                r -= weights[i];
                if (r <= 0) { pType = types[i]; break; }
              }
              newPowerUps.push(makePowerUp(pType, e.x, e.y));
            } else if (e.type === "boss") {
              // Boss always drops multiple power-ups
              newPowerUps.push(makePowerUp("shield",     e.x - 40, e.y));
              newPowerUps.push(makePowerUp("nova",       e.x,      e.y));
              newPowerUps.push(makePowerUp("doubleShot", e.x + 40, e.y));
              newFloatTexts.push(makeFloatText(e.x, e.y - 40, `BOSS DOWN! +${NOVA_BOSS_KILL} NOVA`, "#ff6d00"));
              novaEarned += NOVA_BOSS_KILL;
            }
          }
          break;
        }
      }
    } else {
      // Enemy bullet hits player
      if (player.invincible === 0 &&
          circleRect(b.x, b.y, b.size + 2, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)) {
        hit = true;
        player.invincible = 90; // 1.5s invincibility

        if (player.shield > 0) {
          player.shield -= b.damage;
          newParticles.push(...makeParticles(player.x, player.y, "#3b82f6", 8, 3));
          newFloatTexts.push(makeFloatText(player.x, player.y - 20, "Shield!", "#3b82f6"));
        } else {
          player.lives--;
          newParticles.push(...makeParticles(player.x, player.y, "#ef4444", 15, 5));
          newFloatTexts.push(makeFloatText(player.x, player.y - 20, "HIT!", "#ef4444"));
        }
      }
    }

    if (!hit) survivingBullets.push(b);
  }

  // Remove dead enemies after bullet loop (need the array intact during bullet checks)
  const aliveEnemies = survivingEnemies.filter((e) => e.hp > 0);

  // ── Power-up update + collection ──────────────────────────────────────────
  const survivingPowerUps: PowerUp[] = [];
  for (const p of [...powerUps, ...newPowerUps]) {
    p.y += p.vy;
    if (p.y > canvasH + 30) continue;

    // Check player collection
    if (circles(p.x, p.y, 15, player.x, player.y, player.width)) {
      // Apply power-up
      switch (p.type) {
        case "doubleShot": player.doubleShot = 300; break;
        case "rapidFire":  player.rapidFire  = 300; break;
        case "shield":     player.shield = Math.min(player.maxShield, player.shield + 1); break;
        case "bomb":       player.hasBomb = true; break;
        case "nova":
          novaEarned += NOVA_COIN_VALUE;
          newFloatTexts.push(makeFloatText(p.x, p.y, `+${NOVA_COIN_VALUE} NOVA`, "#f59e0b"));
          break;
      }
      if (p.type !== "nova") {
        const labels: Record<PowerUpType, string> = { doubleShot: "Double Shot!", rapidFire: "Rapid Fire!", shield: "Shield +1", bomb: "Bomb Ready!", nova: "" };
        newFloatTexts.push(makeFloatText(p.x, p.y, labels[p.type], "#10b981"));
      }
      continue;
    }
    survivingPowerUps.push(p);
  }

  // ── Particle update ────────────────────────────────────────────────────────
  const aliveParticles = [...particles, ...newParticles]
    .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, life: p.life - p.decay }))
    .filter((p) => p.life > 0);

  // ── Float text update ──────────────────────────────────────────────────────
  const aliveFloats = [...floatTexts, ...newFloatTexts]
    .map((f) => ({ ...f, y: f.y - 1.2, life: f.life - 0.025 }))
    .filter((f) => f.life > 0);

  // ── Game over check ────────────────────────────────────────────────────────
  if (player.lives <= 0) {
    return {
      ...state,
      phase:      "gameover",
      score,
      novaEarned,
      wave,
      waveTimer,
      player,
      enemies:    aliveEnemies,
      bullets:    survivingBullets,
      powerUps:   survivingPowerUps,
      particles:  aliveParticles,
      floatTexts: aliveFloats,
      stars,
      bossActive,
      waveCleared,
      totalTime,
    };
  }

  return {
    ...state,
    phase:      "playing",
    score,
    novaEarned,
    wave,
    waveTimer,
    player,
    enemies:    aliveEnemies,
    bullets:    survivingBullets,
    powerUps:   survivingPowerUps,
    particles:  aliveParticles,
    floatTexts: aliveFloats,
    stars,
    bossActive,
    waveCleared,
    totalTime,
  };
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function createInitialState(canvasW: number, canvasH: number): GameState {
  return {
    phase:       "idle",
    score:       0,
    novaEarned:  0,
    wave:        0,
    waveTimer:   0,
    player:      makePlayer(canvasW, canvasH),
    enemies:     [],
    bullets:     [],
    powerUps:    [],
    particles:   [],
    floatTexts:  [],
    stars:       makeStars(80, canvasW, canvasH),
    bossActive:  false,
    waveCleared: false,
    totalTime:   0,
  };
}

export function startGame(state: GameState, canvasW: number, canvasH: number): GameState {
  const fresh = createInitialState(canvasW, canvasH);
  const enemies = spawnWave(1, canvasW);
  return { ...fresh, phase: "playing", wave: 1, enemies };
}
