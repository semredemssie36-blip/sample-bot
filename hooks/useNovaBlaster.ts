// ─────────────────────────────────────────────────────────────────────────────
// Nova Blaster — Production Arcade Shooter Engine v2
// Real formation attacks, bullet levels, screen shake, proper game feel
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase = "idle" | "playing" | "paused" | "gameover";
export type EnemyType = "fighter" | "heavy" | "scout" | "gunship" | "boss";
export type PowerUpType = "bulletUp" | "rapidFire" | "shield" | "bomb" | "nova" | "missile";
export type BulletOwner = "player" | "enemy";
export type FormationType = "vshape" | "line" | "pincer" | "swarm" | "wall";

export interface Vec2 { x: number; y: number; }

export interface Star {
  x: number; y: number;
  speed: number; size: number; alpha: number; twinkle: number;
}

export interface Bullet {
  id: number; x: number; y: number;
  vx: number; vy: number;
  owner: BulletOwner;
  level: number;       // player bullet level 1-4
  color: string; size: number; damage: number;
  isMissile: boolean;
  targetId?: number;   // missile homing target
  trail: Array<{x:number;y:number}>;
}

export interface Enemy {
  id: number; type: EnemyType;
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number;
  // Formation movement
  formX: number; formY: number;  // target formation position
  phase: number; timer: number;
  shootCooldown: number;
  color: string; size: number;
  points: number; nova: number;
  flashTimer: number;
  // Movement state
  entered: boolean;   // has reached formation position
  diveTimer: number;  // countdown to dive attack
  isDiving: boolean;
  diveTargetX: number; diveTargetY: number;
}

export interface PowerUp {
  id: number; type: PowerUpType;
  x: number; y: number; vy: number;
  pulse: number;
}

export interface Particle {
  id: number; x: number; y: number;
  vx: number; vy: number;
  color: string; size: number;
  life: number; decay: number;
  shape: "circle" | "spark" | "ring";
}

export interface FloatText {
  id: number; x: number; y: number;
  text: string; color: string; life: number; scale: number;
}

export interface Player {
  x: number; y: number;
  width: number; height: number;
  shield: number; maxShield: number;
  lives: number;
  invincible: number;
  bulletLevel: number;   // 1-4
  rapidFire: number;
  hasBomb: boolean;
  hasMissile: boolean;
  shootTimer: number;
  missileTimer: number;
  engineFlame: number;   // animated flame size
}

export interface GameState {
  phase: GamePhase;
  score: number; novaEarned: number;
  wave: number; waveTimer: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  floatTexts: FloatText[];
  stars: Star[];
  bossActive: boolean;
  waveCleared: boolean;
  totalTime: number;
  // Screen shake
  shakeX: number; shakeY: number; shakeDuration: number;
  // Screen flash
  flashAlpha: number; flashColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_SPEED     = 7;
const SHOOT_RATES      = [0, 16, 14, 12, 9];  // by bullet level
const RAPID_MULTIPLIER = 0.45;
const NOVA_PER_ENEMY   = 2;
const NOVA_BOSS        = 150;
const NOVA_COIN        = 20;
const NOVA_WAVE_BASE   = 10;
const SURVIVAL_FRAMES  = 300;
const POWERUP_CHANCE   = 0.28;

let _uid = 100;
const uid = () => ++_uid;

// ─── Stars ────────────────────────────────────────────────────────────────────
export function makeStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    speed: Math.random() * 2 + 0.4,
    size: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.6 + 0.3,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

// ─── Player ───────────────────────────────────────────────────────────────────
function makePlayer(w: number, h: number): Player {
  return {
    x: w / 2, y: h - 90,
    width: 36, height: 44,
    shield: 3, maxShield: 3,
    lives: 3, invincible: 0,
    bulletLevel: 1,
    rapidFire: 0, hasBomb: false, hasMissile: false,
    shootTimer: 0, missileTimer: 0,
    engineFlame: 1,
  };
}

// ─── Enemy factory ────────────────────────────────────────────────────────────
function makeEnemy(type: EnemyType, wave: number, formX: number, formY: number): Enemy {
  const w = 1 + (wave - 1) * 0.12;
  const configs: Record<EnemyType, Partial<Enemy>> = {
    fighter:  { hp:2,  maxHp:2,  speed:1.4*w, color:"#00e5ff", size:22, points:10,  nova:NOVA_PER_ENEMY,   shootCooldown:200 },
    heavy:    { hp:5,  maxHp:5,  speed:0.9*w, color:"#ff6d00", size:28, points:25,  nova:NOVA_PER_ENEMY+2, shootCooldown:100 },
    scout:    { hp:1,  maxHp:1,  speed:2.2*w, color:"#69f0ae", size:16, points:8,   nova:NOVA_PER_ENEMY,   shootCooldown:999 },
    gunship:  { hp:4,  maxHp:4,  speed:1.0*w, color:"#e040fb", size:26, points:20,  nova:NOVA_PER_ENEMY+1, shootCooldown:70  },
    boss:     { hp:60+wave*15, maxHp:60+wave*15, speed:0.7, color:"#ff1744", size:56, points:1000, nova:NOVA_BOSS, shootCooldown:35 },
  };
  const c = configs[type];
  return {
    id: uid(), type,
    x: formX, y: type === "boss" ? -80 : -(Math.random() * 100 + 80),
    hp: c.hp!, maxHp: c.maxHp!,
    speed: c.speed!, color: c.color!,
    size: c.size!, points: c.points!, nova: c.nova!,
    shootCooldown: c.shootCooldown!, timer: Math.random() * (c.shootCooldown ?? 100),
    formX, formY,
    phase: Math.random() * Math.PI * 2,
    flashTimer: 0,
    entered: false,
    diveTimer: 200 + Math.random() * 300,
    isDiving: false,
    diveTargetX: formX, diveTargetY: formY,
  };
}

// ─── Formation spawner ────────────────────────────────────────────────────────
function spawnFormation(wave: number, cw: number): Enemy[] {
  if (wave % 5 === 0) return [makeEnemy("boss", wave, cw / 2, 100)];

  const enemies: Enemy[] = [];
  const formations: FormationType[] = ["vshape","line","pincer","swarm","wall"];
  const form = formations[(wave - 1) % formations.length];
  const typePool: EnemyType[] = wave === 1 ? ["fighter"] :
    wave === 2 ? ["fighter","scout"] :
    wave === 3 ? ["fighter","heavy","scout"] :
    wave === 4 ? ["fighter","heavy","gunship"] :
    ["fighter","heavy","scout","gunship"];

  const randType = () => typePool[Math.floor(Math.random() * typePool.length)];
  const cx = cw / 2;

  switch (form) {
    case "vshape": {
      const rows = Math.min(3 + Math.floor(wave / 2), 5);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= r; c++) {
          const xOff = (c - r / 2) * 52;
          enemies.push(makeEnemy(randType(), wave, cx + xOff, 80 + r * 55));
        }
      }
      break;
    }
    case "line": {
      const cols = Math.min(5 + wave, 10);
      for (let i = 0; i < cols; i++) {
        const x = (cw - (cols - 1) * 48) / 2 + i * 48;
        enemies.push(makeEnemy(randType(), wave, x, 90));
        if (wave >= 3) enemies.push(makeEnemy(randType(), wave, x, 145));
      }
      break;
    }
    case "pincer": {
      const side = Math.min(3 + Math.floor(wave / 2), 7);
      for (let i = 0; i < side; i++) {
        enemies.push(makeEnemy(randType(), wave, 40 + i * 40, 80 + i * 38));
        enemies.push(makeEnemy(randType(), wave, cw - 40 - i * 40, 80 + i * 38));
      }
      break;
    }
    case "swarm": {
      const count = 8 + wave * 2;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 80 + Math.random() * 60;
        enemies.push(makeEnemy("scout", wave, cx + Math.cos(angle) * r, 150 + Math.sin(angle) * 40));
      }
      break;
    }
    case "wall": {
      const cols = Math.min(4 + Math.floor(wave / 2), 7);
      const rows2 = 2 + Math.floor(wave / 3);
      for (let r = 0; r < rows2; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (cw - (cols - 1) * 50) / 2 + c * 50;
          enemies.push(makeEnemy(r === 0 ? "heavy" : randType(), wave, x, 70 + r * 55));
        }
      }
      break;
    }
  }
  return enemies;
}

// ─── Bullet factory ───────────────────────────────────────────────────────────
function spawnPlayerBullets(p: Player): Bullet[] {
  const bullets: Bullet[] = [];
  const base = { owner: "player" as BulletOwner, damage: 1, isMissile: false, trail: [] };

  switch (p.bulletLevel) {
    case 1:
      bullets.push({ ...base, id: uid(), x: p.x, y: p.y - 26, vx: 0, vy: -15, level: 1, color: "#c084fc", size: 4 });
      break;
    case 2:
      bullets.push({ ...base, id: uid(), x: p.x - 11, y: p.y - 20, vx: 0, vy: -15, level: 2, color: "#a855f7", size: 4 });
      bullets.push({ ...base, id: uid(), x: p.x + 11, y: p.y - 20, vx: 0, vy: -15, level: 2, color: "#a855f7", size: 4 });
      break;
    case 3:
      bullets.push({ ...base, id: uid(), x: p.x - 12, y: p.y - 18, vx: -0.8, vy: -15, level: 3, color: "#e879f9", size: 5 });
      bullets.push({ ...base, id: uid(), x: p.x,       y: p.y - 26, vx: 0,    vy: -16, level: 3, color: "#f0abfc", size: 5, damage: 2 });
      bullets.push({ ...base, id: uid(), x: p.x + 12, y: p.y - 18, vx:  0.8, vy: -15, level: 3, color: "#e879f9", size: 5 });
      break;
    case 4:
      for (let i = -2; i <= 2; i++) {
        bullets.push({ ...base, id: uid(), x: p.x + i * 13, y: p.y - 20, vx: i * 0.6, vy: -15, level: 4, color: "#fbbf24", size: 5, damage: i === 0 ? 3 : 2 });
      }
      break;
  }
  return bullets;
}

function spawnEnemyBullets(e: Enemy, px: number, py: number, wave: number): Bullet[] {
  const base = { owner: "enemy" as BulletOwner, level: 0, isMissile: false, trail: [], damage: 1 };
  const dx = px - e.x; const dy = py - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd = 4 + wave * 0.3;
  const bullets: Bullet[] = [];

  switch (e.type) {
    case "fighter":
      bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: 0, vy: spd, color: "#00e5ff", size: 5 });
      break;
    case "heavy":
      // 3-way spread
      for (let a = -1; a <= 1; a++) {
        bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: a * spd * 0.5, vy: spd, color: "#ff6d00", size: 6, damage: 2 });
      }
      break;
    case "gunship":
      // Aimed shot + downward
      bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: (dx / dist) * spd * 1.1, vy: (dy / dist) * spd * 1.1, color: "#e040fb", size: 6 });
      break;
    case "boss": {
      // Phase 1: 5-way spread
      for (let a = -2; a <= 2; a++) {
        bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: a * spd * 0.6, vy: spd * 1.1, color: "#ff1744", size: 7, damage: 2 });
      }
      // Aimed shot
      bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: (dx / dist) * spd * 1.4, vy: (dy / dist) * spd * 1.4, color: "#ff6d00", size: 8, damage: 3 });
      break;
    }
    default:
      bullets.push({ ...base, id: uid(), x: e.x, y: e.y + e.size / 2, vx: 0, vy: spd, color: e.color, size: 5 });
  }
  return bullets;
}

// ─── Collision ────────────────────────────────────────────────────────────────
function circ(ax:number,ay:number,ar:number,bx:number,by:number,br:number):boolean {
  const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy < (ar+br)*(ar+br);
}
function circRect(cx:number,cy:number,cr:number,rx:number,ry:number,rw:number,rh:number):boolean {
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy < cr*cr;
}

// ─── Particles ────────────────────────────────────────────────────────────────
function burst(x:number,y:number,color:string,n:number,spd=4): Particle[] {
  return Array.from({length:n}, ()=>{
    const a=Math.random()*Math.PI*2, s=Math.random()*spd+1;
    return { id:uid(), x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
             color, size:Math.random()*5+2, life:1, decay:Math.random()*0.04+0.02,
             shape: Math.random()<0.3?"spark":"circle" as "circle"|"spark" };
  });
}
function ring(x:number,y:number,color:string): Particle[] {
  return [{ id:uid(), x, y, vx:0, vy:0, color, size:10, life:1, decay:0.04, shape:"ring" }];
}

function floatText(x:number,y:number,text:string,color:string): FloatText {
  return { id:uid(), x, y, text, color, life:1, scale:1 };
}

// ─── Power-up drop ────────────────────────────────────────────────────────────
function maybeDrop(x:number,y:number,bulletLevel:number): PowerUp|null {
  if (Math.random() > POWERUP_CHANCE) return null;
  const pool: [PowerUpType,number][] =
    bulletLevel < 4
      ? [["bulletUp",5],["rapidFire",3],["shield",3],["bomb",1],["nova",4],["missile",2]]
      : [["rapidFire",4],["shield",4],["bomb",2],["nova",5],["missile",3]];
  let total = pool.reduce((s,[,w])=>s+w,0);
  let r = Math.random()*total;
  for (const [t,w] of pool) { r-=w; if (r<=0) return {id:uid(),type:t,x,y,vy:1.8,pulse:0}; }
  return {id:uid(),type:"nova",x,y,vy:1.8,pulse:0};
}

// ─── Main update ──────────────────────────────────────────────────────────────
export function updateGame(
  state: GameState, cw: number, ch: number,
  targetX: number|null, useBomb: boolean,
): GameState {
  if (state.phase !== "playing") return state;

  let { player, enemies, bullets, powerUps, particles, floatTexts, stars,
        wave, waveTimer, score, novaEarned, bossActive, waveCleared, totalTime,
        shakeX, shakeY, shakeDuration, flashAlpha, flashColor } = state;

  player    = {...player};
  enemies   = enemies.map(e=>({...e}));
  bullets   = bullets.map(b=>({...b}));
  powerUps  = powerUps.map(p=>({...p}));
  particles = particles.map(p=>({...p}));
  floatTexts= floatTexts.map(f=>({...f}));
  stars     = stars.map(s=>({...s}));

  const newBullets:   Bullet[]   = [];
  const newParticles: Particle[] = [];
  const newFloats:    FloatText[]= [];
  const newPowerUps:  PowerUp[]  = [];

  totalTime++;

  // Survival NOVA
  if (totalTime % SURVIVAL_FRAMES === 0) novaEarned++;

  // Screen shake decay
  if (shakeDuration > 0) {
    shakeDuration--;
    const mag = shakeDuration * 0.3;
    shakeX = (Math.random()-0.5)*mag*2;
    shakeY = (Math.random()-0.5)*mag*2;
  } else { shakeX=0; shakeY=0; }

  // Flash decay
  flashAlpha = Math.max(0, flashAlpha - 0.06);

  // ── Stars ─────────────────────────────────────────────────────────────────
  for (const s of stars) {
    s.y += s.speed; s.twinkle += 0.05;
    if (s.y > ch) { s.y=0; s.x=Math.random()*cw; }
  }

  // ── Player movement ───────────────────────────────────────────────────────
  if (targetX !== null) {
    const dx = targetX - player.x;
    player.x = Math.max(player.width/2, Math.min(cw-player.width/2, player.x + Math.sign(dx)*Math.min(Math.abs(dx), PLAYER_SPEED)));
  }
  player.engineFlame = 1 + Math.sin(totalTime * 0.25) * 0.3;
  if (player.invincible > 0) player.invincible--;
  if (player.rapidFire  > 0) player.rapidFire--;

  // ── Player shooting ───────────────────────────────────────────────────────
  player.shootTimer--;
  const shootRate = SHOOT_RATES[player.bulletLevel] * (player.rapidFire > 0 ? RAPID_MULTIPLIER : 1);
  if (player.shootTimer <= 0) {
    player.shootTimer = shootRate;
    newBullets.push(...spawnPlayerBullets(player));
  }

  // Missiles
  if (player.hasMissile) {
    player.missileTimer--;
    if (player.missileTimer <= 0) {
      player.missileTimer = 45;
      const target = enemies.find(e => e.y > 0);
      if (target) {
        newBullets.push({ id:uid(), x:player.x-16, y:player.y-10, vx:-1, vy:-8,
          owner:"player", level:99, color:"#f59e0b", size:6, damage:5, isMissile:true, targetId:target.id, trail:[] });
        newBullets.push({ id:uid(), x:player.x+16, y:player.y-10, vx: 1, vy:-8,
          owner:"player", level:99, color:"#f59e0b", size:6, damage:5, isMissile:true, targetId:target.id, trail:[] });
      }
    }
  }

  // ── Bomb ──────────────────────────────────────────────────────────────────
  if (useBomb && player.hasBomb) {
    player.hasBomb = false;
    for (const e of enemies) {
      if (e.y > -e.size) {
        newParticles.push(...burst(e.x, e.y, e.color, 15, 6));
        newParticles.push(...ring(e.x, e.y, e.color));
        novaEarned += e.nova; score += e.points;
        newFloats.push(floatText(e.x, e.y, `+${e.nova}`, "#f59e0b"));
      }
    }
    enemies = [];
    shakeX=0; shakeY=0; shakeDuration=30;
    flashAlpha=0.6; flashColor="#ffffff";
    newParticles.push(...burst(cw/2, ch/2, "#f59e0b", 60, 10));
  }

  // ── Wave management ───────────────────────────────────────────────────────
  if (enemies.length === 0 && !waveCleared) {
    waveCleared = true; waveTimer = 140;
    const bonus = wave * NOVA_WAVE_BASE;
    novaEarned += bonus;
    newFloats.push(floatText(cw/2, ch/2-40, `WAVE ${wave} CLEAR  +${bonus} NOVA`, "#f59e0b"));
  }
  if (waveCleared) {
    waveTimer--;
    if (waveTimer <= 0) {
      wave++; bossActive = wave % 5 === 0; waveCleared = false;
      const newEnemies = spawnFormation(wave, cw);
      enemies.push(...newEnemies);
      if (bossActive) { shakeDuration=20; flashAlpha=0.3; flashColor="#ff1744"; }
    }
  }

  // ── Enemy update ──────────────────────────────────────────────────────────
  const aliveEnemies: Enemy[] = [];
  for (const e of enemies) {
    e.flashTimer = Math.max(0, e.flashTimer-1);
    e.phase += e.type==="boss" ? 0.012 : 0.04;

    if (!e.entered) {
      // Move toward formation position
      const dx = e.formX - e.x, dy = e.formY - e.y;
      const dist = Math.sqrt(dx*dx+dy*dy)||1;
      const spd = Math.min(e.speed*2, dist);
      e.x += (dx/dist)*spd; e.y += (dy/dist)*spd;
      if (dist < 4) { e.x=e.formX; e.y=e.formY; e.entered=true; }
    } else if (e.isDiving) {
      // Dive attack toward player
      const dx=e.diveTargetX-e.x, dy=e.diveTargetY-e.y;
      const dist=Math.sqrt(dx*dx+dy*dy)||1;
      e.x += (dx/dist)*e.speed*2.2;
      e.y += (dy/dist)*e.speed*2.2;
      if (e.y > ch + e.size*2) { e.isDiving=false; e.y=e.formY-100; e.entered=false; }
    } else {
      // Formation idle movement
      if (e.type==="boss") {
        e.x = cw/2 + Math.sin(e.phase)*cw*0.36;
        e.y = Math.max(e.formY, e.y + (e.formY-e.y)*0.02);
      } else {
        e.x = e.formX + Math.sin(e.phase + e.id*0.7)*18;
        e.y = e.formY + Math.cos(e.phase*0.6)*8;
      }
      // Random dive
      e.diveTimer--;
      if (e.diveTimer <= 0 && e.type !== "boss" && e.type !== "heavy") {
        e.isDiving=true; e.diveTimer=300+Math.random()*300;
        e.diveTargetX = state.player.x + (Math.random()-0.5)*80;
        e.diveTargetY = ch+60;
      }
    }

    // Shooting
    if (e.y > 20 && e.shootCooldown < 900) {
      e.timer--;
      if (e.timer <= 0) {
        e.timer = e.shootCooldown * (0.7 + Math.random()*0.6);
        newBullets.push(...spawnEnemyBullets(e, player.x, player.y, wave));
      }
    }

    if (e.y < ch + e.size*3) aliveEnemies.push(e);
  }

  // ── Bullet update + collision ─────────────────────────────────────────────
  const aliveBullets: Bullet[] = [];
  for (const b of [...bullets, ...newBullets]) {
    // Missile homing
    if (b.isMissile && b.targetId) {
      const tgt = aliveEnemies.find(e=>e.id===b.targetId);
      if (tgt) {
        const dx=tgt.x-b.x, dy=tgt.y-b.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
        b.vx += (dx/dist)*1.2; b.vy += (dy/dist)*1.2;
        const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
        if (spd>14){b.vx=(b.vx/spd)*14;b.vy=(b.vy/spd)*14;}
      }
    }

    // Trail
    b.trail = [{x:b.x,y:b.y}, ...b.trail.slice(0,5)];
    b.x += b.vx; b.y += b.vy;

    if (b.y < -30||b.y > ch+30||b.x < -30||b.x > cw+30) continue;
    let hit = false;

    if (b.owner==="player") {
      for (const e of aliveEnemies) {
        if (circ(b.x,b.y,b.size+2,e.x,e.y,e.size*0.82)) {
          e.hp -= b.damage; e.flashTimer=8; hit=true;
          newParticles.push(...burst(b.x,b.y,e.color,4,2));

          if (e.hp<=0) {
            const isB=e.type==="boss";
            newParticles.push(...burst(e.x,e.y,e.color,isB?40:14,isB?8:5));
            newParticles.push(...ring(e.x,e.y,e.color));
            if (isB) { newParticles.push(...burst(e.x,e.y,"#ffffff",20,6)); }
            newFloats.push(floatText(e.x,e.y-8,`+${e.nova}`,isB?"#ff6d00":"#f59e0b"));
            novaEarned += e.nova; score += e.points;
            if (isB) { shakeDuration=40; flashAlpha=0.5; flashColor="#ff6d00"; }
            const drop = maybeDrop(e.x,e.y,player.bulletLevel);
            if (drop) newPowerUps.push(drop);
          }
          break;
        }
      }
    } else {
      if (player.invincible===0 &&
          circRect(b.x,b.y,b.size+3,player.x-player.width/2,player.y-player.height/2,player.width,player.height)) {
        hit=true; player.invincible=90;
        newParticles.push(...burst(player.x,player.y,"#3b82f6",10,4));
        if (player.shield>0) {
          player.shield -= b.damage; if(player.shield<0)player.shield=0;
          newFloats.push(floatText(player.x,player.y-24,"SHIELD!","#60a5fa"));
        } else {
          player.lives--;
          shakeDuration=18; flashAlpha=0.45; flashColor="#ef4444";
          newFloats.push(floatText(player.x,player.y-24,"HIT!","#ef4444"));
          if(player.lives<=0){
            return {...state, phase:"gameover", score, novaEarned, wave, player,
              enemies:aliveEnemies, bullets:aliveBullets, powerUps,
              particles:[...particles,...newParticles].map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,life:p.life-p.decay})).filter(p=>p.life>0),
              floatTexts:[...floatTexts,...newFloats], stars, bossActive, waveCleared, totalTime,
              shakeX,shakeY,shakeDuration,flashAlpha,flashColor};
          }
        }
      }
    }
    if (!hit) aliveBullets.push(b);
  }

  // Remove dead enemies
  const finalEnemies = aliveEnemies.filter(e=>e.hp>0);

  // ── Power-up update ───────────────────────────────────────────────────────
  const alivePowerUps: PowerUp[] = [];
  for (const p of [...powerUps,...newPowerUps]) {
    p.y += p.vy; p.pulse += 0.1;
    if (p.y > ch+30) continue;
    if (circ(p.x,p.y,18,player.x,player.y,player.width*0.6)) {
      const labels: Record<PowerUpType,string> = {
        bulletUp:"POWER UP!",rapidFire:"RAPID FIRE!",shield:"SHIELD +1",
        bomb:"BOMB!",nova:`+${NOVA_COIN} NOVA`,missile:"MISSILES!"
      };
      newFloats.push(floatText(p.x,p.y-10,labels[p.type],"#10b981"));
      switch(p.type){
        case "bulletUp":  player.bulletLevel=Math.min(4,player.bulletLevel+1); break;
        case "rapidFire": player.rapidFire=360; break;
        case "shield":    player.shield=Math.min(player.maxShield,player.shield+1); break;
        case "bomb":      player.hasBomb=true; break;
        case "missile":   player.hasMissile=true; player.missileTimer=10; break;
        case "nova":      novaEarned+=NOVA_COIN; break;
      }
      continue;
    }
    alivePowerUps.push(p);
  }

  // ── Particle + float update ───────────────────────────────────────────────
  const aliveParticles = [...particles,...newParticles]
    .map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+0.08,size:p.size*(p.shape==="ring"?1.12:1),life:p.life-p.decay}))
    .filter(p=>p.life>0);
  const aliveFloats = [...floatTexts,...newFloats]
    .map(f=>({...f,y:f.y-1.4,life:f.life-0.022,scale:1+0.3*(1-f.life)}))
    .filter(f=>f.life>0);

  return {
    ...state, phase:"playing", score, novaEarned, wave, waveTimer,
    player, enemies:finalEnemies, bullets:aliveBullets,
    powerUps:alivePowerUps, particles:aliveParticles,
    floatTexts:aliveFloats, stars, bossActive, waveCleared, totalTime,
    shakeX, shakeY, shakeDuration, flashAlpha, flashColor,
  };
}

// ─── State factories ──────────────────────────────────────────────────────────
export function createInitialState(cw: number, ch: number): GameState {
  return {
    phase:"idle", score:0, novaEarned:0, wave:0, waveTimer:0,
    player:makePlayer(cw,ch), enemies:[], bullets:[], powerUps:[],
    particles:[], floatTexts:[], stars:makeStars(100,cw,ch),
    bossActive:false, waveCleared:false, totalTime:0,
    shakeX:0, shakeY:0, shakeDuration:0, flashAlpha:0, flashColor:"#ffffff",
  };
}
export function startGame(cw: number, ch: number): GameState {
  const s = createInitialState(cw, ch);
  return { ...s, phase:"playing", wave:1, enemies:spawnFormation(1, cw) };
}
