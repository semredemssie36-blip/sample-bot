"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameState, PowerUpType } from "@/hooks/useNovaBlaster";

interface NovaBlasterCanvasProps {
  gameState:  GameState;
  width:      number;
  height:     number;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerShip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, invincible: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Blink when invincible
  if (invincible > 0 && Math.floor(invincible / 6) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Engine flame
  const flameH = 10 + Math.sin(time * 0.3) * 4;
  const grad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + flameH);
  grad.addColorStop(0, "rgba(168,85,247,0.9)");
  grad.addColorStop(0.5, "rgba(236,72,153,0.6)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-6, h / 2);
  ctx.lineTo(0, h / 2 + flameH);
  ctx.lineTo(6, h / 2);
  ctx.closePath();
  ctx.fill();

  // Ship glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
  glow.addColorStop(0, "rgba(168,85,247,0.25)");
  glow.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, w, 0, Math.PI * 2);
  ctx.fill();

  // Main body (pink/purple ship)
  ctx.fillStyle = "#e879f9";
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);         // nose
  ctx.lineTo(w / 2.5, h / 4);   // right wing base
  ctx.lineTo(w / 2, h / 2);     // right wing tip
  ctx.lineTo(w / 6, h / 4);     // right inner
  ctx.lineTo(-w / 6, h / 4);    // left inner
  ctx.lineTo(-w / 2, h / 2);    // left wing tip
  ctx.lineTo(-w / 2.5, h / 4);  // left wing base
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#c084fc";
  ctx.beginPath();
  ctx.ellipse(0, -h / 8, w / 6, h / 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-w / 8, -h / 4, w / 10, h / 10, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemyShip(ctx: CanvasRenderingContext2D, e: GameState["enemies"][0], time: number) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // Flash white when hit
  const flashAlpha = e.flashTimer > 0 ? e.flashTimer / 6 : 0;

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 1.5);
  glow.addColorStop(0, e.color + "40");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, e.size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (e.type === "boss") {
    // Boss — large octagon shape
    ctx.fillStyle = flashAlpha > 0 ? `rgba(255,255,255,${flashAlpha})` : e.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? e.size : e.size * 0.7;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    // Boss HP bar
    const hpPct = e.hp / e.maxHp;
    const bw = e.size * 2.5;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-bw / 2, e.size + 6, bw, 6);
    ctx.fillStyle = hpPct > 0.5 ? "#10b981" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(-bw / 2, e.size + 6, bw * hpPct, 6);

    // Boss core glow pulse
    const pulse = Math.sin(time * 0.08) * 0.3 + 0.7;
    const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 0.4);
    coreGlow.addColorStop(0, `rgba(255,109,0,${pulse})`);
    coreGlow.addColorStop(1, "transparent");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(0, 0, e.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Regular enemy — inverted triangle / alien shape
    ctx.fillStyle = flashAlpha > 0 ? `rgba(255,255,255,${flashAlpha})` : e.color;
    const s = e.size;

    if (e.type === "straight") {
      // Simple diamond
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s * 0.6);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
    } else if (e.type === "zigzag") {
      // Arrow shape
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(s * 0.8, -s * 0.4);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.lineTo(0, -s);
      ctx.lineTo(-s * 0.3, -s * 0.1);
      ctx.lineTo(-s * 0.8, -s * 0.4);
      ctx.closePath();
    } else if (e.type === "diver") {
      // Narrow dart
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(s * 0.4, -s * 0.5);
      ctx.lineTo(0, -s);
      ctx.lineTo(-s * 0.4, -s * 0.5);
      ctx.closePath();
    } else if (e.type === "shooter") {
      // Wide cruiser
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(-s * 0.5, -s * 0.6);
      ctx.lineTo(0, -s * 0.3);
      ctx.lineTo(s * 0.5, -s * 0.6);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.3, s * 0.6);
      ctx.lineTo(-s * 0.3, s * 0.6);
      ctx.closePath();
    } else {
      // Circler — hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
    }
    ctx.fill();

    // Center dot
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const POWERUP_ICONS: Record<PowerUpType, string> = {
  doubleShot: "⚡",
  rapidFire:  "🔫",
  shield:     "🛡️",
  bomb:       "💣",
  nova:       "🪙",
};

const POWERUP_COLORS: Record<PowerUpType, string> = {
  doubleShot: "#a855f7",
  rapidFire:  "#f59e0b",
  shield:     "#3b82f6",
  bomb:       "#ef4444",
  nova:       "#f59e0b",
};

function drawPowerUp(ctx: CanvasRenderingContext2D, p: GameState["powerUps"][0], time: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const pulse = Math.sin(time * 0.1) * 0.15 + 0.85;
  ctx.scale(pulse, pulse);

  // Glow ring
  const color = POWERUP_COLORS[p.type];
  ctx.fillStyle = color + "25";
  ctx.strokeStyle = color + "80";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Icon
  ctx.font = "14px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(POWERUP_ICONS[p.type], 0, 1);

  ctx.restore();
}

// ─── Main canvas renderer ─────────────────────────────────────────────────────

export default function NovaBlasterCanvas({ gameState, width, height }: NovaBlasterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef   = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    timeRef.current++;
    const t = timeRef.current;
    const { player, enemies, bullets, powerUps, particles, floatTexts, stars } = gameState;

    // ── Background ─────────────────────────────────────────────────────────
    ctx.fillStyle = "#08061a";
    ctx.fillRect(0, 0, width, height);

    // Ambient nebula glow
    const nebula = ctx.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.3, height * 0.2, width * 0.6);
    nebula.addColorStop(0, "rgba(124,58,237,0.04)");
    nebula.addColorStop(1, "transparent");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    // Stars
    for (const s of stars) {
      drawStar(ctx, s.x, s.y, s.size, "#ffffff", s.alpha);
    }

    // ── Particles ──────────────────────────────────────────────────────────
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Power-ups ──────────────────────────────────────────────────────────
    for (const p of powerUps) {
      drawPowerUp(ctx, p, t);
    }

    // ── Enemies ────────────────────────────────────────────────────────────
    for (const e of enemies) {
      if (e.y > -e.size) drawEnemyShip(ctx, e, t);
    }

    // ── Bullets ────────────────────────────────────────────────────────────
    for (const b of bullets) {
      ctx.save();
      if (b.owner === "player") {
        // Player bullets — elongated purple bolts
        const grad = ctx.createLinearGradient(b.x, b.y - 12, b.x, b.y + 4);
        grad.addColorStop(0, "#e879f9");
        grad.addColorStop(0.5, "#a855f7");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#a855f7";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 6, 2.5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Enemy bullets — red/orange glowing orbs
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size + 3);
        grad.addColorStop(0, "white");
        grad.addColorStop(0.3, b.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Player ship ────────────────────────────────────────────────────────
    if (gameState.phase === "playing") {
      drawPlayerShip(ctx, player.x, player.y, player.width, player.height, player.invincible, t);
    }

    // ── Float texts ────────────────────────────────────────────────────────
    for (const f of floatTexts) {
      ctx.save();
      ctx.globalAlpha  = f.life;
      ctx.fillStyle    = f.color;
      ctx.font         = `bold ${f.text.length > 10 ? 11 : 13}px Inter,sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur   = 6;
      ctx.shadowColor  = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    // ── Wave cleared overlay ───────────────────────────────────────────────
    if (gameState.waveCleared && gameState.waveTimer > 60) {
      ctx.save();
      ctx.globalAlpha  = Math.min(1, (gameState.waveTimer - 60) / 30);
      ctx.fillStyle    = "#f59e0b";
      ctx.font         = "bold 22px Inter,sans-serif";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur   = 20;
      ctx.shadowColor  = "#f59e0b";
      ctx.fillText(`WAVE ${gameState.wave} CLEARED!`, width / 2, height / 2);
      ctx.restore();
    }

  }, [gameState, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", touchAction: "none" }}
      aria-label="Nova Blaster game canvas"
    />
  );
}
