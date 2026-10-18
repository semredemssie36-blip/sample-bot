"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameState, Enemy, PowerUpType } from "@/hooks/useNovaBlaster";

// ─── Colour helpers ───────────────────────────────────────────────────────────
const hex2rgb = (h:string) => {
  const r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
  return `${r},${g},${b}`;
};

// ─── Player fighter plane ─────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, x:number, y:number, inv:number, bLevel:number, flame:number, t:number) {
  ctx.save();
  ctx.translate(x, y);
  if (inv>0 && Math.floor(inv/5)%2===1) { ctx.globalAlpha=0.3; }

  // Engine afterburner
  const flameLen = 18*flame + Math.sin(t*0.4)*4;
  const fGrad = ctx.createLinearGradient(0, 14, 0, 14+flameLen);
  fGrad.addColorStop(0, "rgba(168,85,247,1)");
  fGrad.addColorStop(0.3,"rgba(236,72,153,0.8)");
  fGrad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = fGrad;
  ctx.beginPath();
  ctx.moveTo(-6,14); ctx.lineTo(0,14+flameLen); ctx.lineTo(6,14);
  ctx.closePath(); ctx.fill();

  // Left wing engine
  const lGrad = ctx.createLinearGradient(-18,8,-18,8+flameLen*0.7);
  lGrad.addColorStop(0,"rgba(168,85,247,0.8)"); lGrad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=lGrad;
  ctx.beginPath();
  ctx.moveTo(-18,8); ctx.lineTo(-20,8+flameLen*0.7); ctx.lineTo(-15,8+flameLen*0.7);
  ctx.closePath(); ctx.fill();

  // Right wing engine
  const rGrad = ctx.createLinearGradient(18,8,18,8+flameLen*0.7);
  rGrad.addColorStop(0,"rgba(168,85,247,0.8)"); rGrad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=rGrad;
  ctx.beginPath();
  ctx.moveTo(18,8); ctx.lineTo(20,8+flameLen*0.7); ctx.lineTo(15,8+flameLen*0.7);
  ctx.closePath(); ctx.fill();

  // Ship body glow
  ctx.shadowBlur=20; ctx.shadowColor="#a855f7";

  // Main fuselage
  ctx.fillStyle="#e879f9";
  ctx.beginPath();
  ctx.moveTo(0,-22);
  ctx.bezierCurveTo(8,-22,12,-10,12,6);
  ctx.lineTo(8,16); ctx.lineTo(-8,16);
  ctx.bezierCurveTo(-12,-10,-8,-22,0,-22);
  ctx.closePath(); ctx.fill();

  // Left wing
  ctx.fillStyle="#a855f7";
  ctx.beginPath();
  ctx.moveTo(-8,2); ctx.lineTo(-28,14); ctx.lineTo(-24,20); ctx.lineTo(-8,14);
  ctx.closePath(); ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(8,2); ctx.lineTo(28,14); ctx.lineTo(24,20); ctx.lineTo(8,14);
  ctx.closePath(); ctx.fill();

  // Cockpit glass
  const glassGrad = ctx.createRadialGradient(-3,-12,0,0,-8,10);
  glassGrad.addColorStop(0,"rgba(255,255,255,0.9)");
  glassGrad.addColorStop(0.4,"rgba(192,132,252,0.6)");
  glassGrad.addColorStop(1,"rgba(109,40,217,0.3)");
  ctx.fillStyle=glassGrad; ctx.shadowBlur=0;
  ctx.beginPath();
  ctx.ellipse(0,-10,5,8,0,0,Math.PI*2);
  ctx.fill();

  // Bullet level indicator — wing tips glow
  if (bLevel >= 2) {
    ctx.fillStyle=bLevel>=3?"#fbbf24":"#a855f7";
    ctx.shadowBlur=8; ctx.shadowColor=bLevel>=3?"#fbbf24":"#a855f7";
    ctx.beginPath(); ctx.arc(-28,14,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(28,14,3,0,Math.PI*2); ctx.fill();
  }
  if (bLevel >= 4) {
    ctx.fillStyle="#f59e0b"; ctx.shadowColor="#f59e0b";
    ctx.beginPath(); ctx.arc(-18,8,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(18,8,4,0,Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

// ─── Enemy ship drawers ───────────────────────────────────────────────────────
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // Entry fade-in
  if (!e.entered) ctx.globalAlpha = 0.7;

  // Flash white on hit
  if (e.flashTimer > 0) {
    ctx.filter = `brightness(${2 + e.flashTimer/2})`;
  }

  const s = e.size;
  ctx.shadowBlur = 14;
  ctx.shadowColor = e.color;

  switch(e.type) {
    case "fighter": {
      // Inverted fighter jet
      ctx.fillStyle = e.flashTimer>0?"#ffffff":e.color;
      // Body
      ctx.beginPath();
      ctx.moveTo(0,s*0.9);
      ctx.bezierCurveTo(s*0.4,s*0.9,s*0.5,0,s*0.3,-s*0.5);
      ctx.lineTo(0,-s*0.9);
      ctx.lineTo(-s*0.3,-s*0.5);
      ctx.bezierCurveTo(-s*0.5,0,-s*0.4,s*0.9,0,s*0.9);
      ctx.closePath(); ctx.fill();
      // Wings
      ctx.beginPath();
      ctx.moveTo(-s*0.3,0); ctx.lineTo(-s*0.9,s*0.5); ctx.lineTo(-s*0.6,s*0.7); ctx.lineTo(-s*0.2,s*0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s*0.3,0); ctx.lineTo(s*0.9,s*0.5); ctx.lineTo(s*0.6,s*0.7); ctx.lineTo(s*0.2,s*0.3);
      ctx.closePath(); ctx.fill();
      // Cockpit
      ctx.fillStyle="rgba(0,229,255,0.6)";
      ctx.beginPath(); ctx.ellipse(0,s*0.1,s*0.18,s*0.25,0,0,Math.PI*2); ctx.fill();
      break;
    }
    case "heavy": {
      ctx.fillStyle = e.flashTimer>0?"#ffffff":e.color;
      // Chunky bomber
      ctx.beginPath();
      ctx.roundRect(-s*0.6,-s*0.4,s*1.2,s*0.9,s*0.15);
      ctx.fill();
      // Wing cannons
      ctx.fillStyle="#ff8f00";
      ctx.beginPath(); ctx.rect(-s*1.0,-s*0.05,s*0.35,s*0.25); ctx.fill();
      ctx.beginPath(); ctx.rect(s*0.65,-s*0.05,s*0.35,s*0.25); ctx.fill();
      // Engine pods
      ctx.fillStyle="#bf360c";
      ctx.beginPath(); ctx.ellipse(-s*0.35,s*0.55,s*0.2,s*0.15,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s*0.35,s*0.55,s*0.2,s*0.15,0,0,Math.PI*2); ctx.fill();
      // Cockpit
      ctx.fillStyle="rgba(255,109,0,0.5)";
      ctx.beginPath(); ctx.ellipse(0,-s*0.15,s*0.25,s*0.2,0,0,Math.PI*2); ctx.fill();
      // HP bar
      const hpPct = e.hp/e.maxHp;
      ctx.fillStyle="rgba(0,0,0,0.4)";
      ctx.fillRect(-s*0.6,s*0.75,s*1.2,5);
      ctx.fillStyle = hpPct>0.5?"#10b981":hpPct>0.25?"#f59e0b":"#ef4444";
      ctx.fillRect(-s*0.6,s*0.75,s*1.2*hpPct,5);
      break;
    }
    case "scout": {
      ctx.fillStyle = e.flashTimer>0?"#ffffff":e.color;
      // Sleek diamond dart
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.lineTo(s*0.45,0); ctx.lineTo(0,s*0.7); ctx.lineTo(-s*0.45,0);
      ctx.closePath(); ctx.fill();
      // Inner highlight
      ctx.fillStyle="rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(0,-s*0.5); ctx.lineTo(s*0.2,0); ctx.lineTo(0,s*0.3); ctx.lineTo(-s*0.2,0);
      ctx.closePath(); ctx.fill();
      break;
    }
    case "gunship": {
      ctx.fillStyle = e.flashTimer>0?"#ffffff":e.color;
      // Hexagonal gunship
      for (let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2-Math.PI/2;
        if(i===0) ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s);
        else ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);
      }
      ctx.closePath(); ctx.fill();
      // Rotating turret
      ctx.save();
      ctx.rotate(t*0.05);
      ctx.fillStyle="#7b1fa2";
      ctx.beginPath(); ctx.arc(0,0,s*0.35,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#e040fb";
      ctx.fillRect(-s*0.08,-s*0.45,s*0.16,s*0.45);
      ctx.restore();
      // HP bar
      const hp2=e.hp/e.maxHp;
      ctx.fillStyle="rgba(0,0,0,0.4)";
      ctx.fillRect(-s,s*1.1,s*2,5);
      ctx.fillStyle=hp2>0.5?"#10b981":hp2>0.25?"#f59e0b":"#ef4444";
      ctx.fillRect(-s,s*1.1,s*2*hp2,5);
      break;
    }
    case "boss": {
      const hp=e.hp/e.maxHp;
      // Outer rotating ring
      ctx.save();
      ctx.rotate(t*0.018);
      ctx.strokeStyle=e.flashTimer>0?"#ffffff":e.color;
      ctx.lineWidth=4;
      ctx.setLineDash([12,8]);
      ctx.beginPath(); ctx.arc(0,0,s*1.3,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Main hull
      ctx.fillStyle=e.flashTimer>0?"#ffffff":"#b71c1c";
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2-Math.PI/2;
        const r=i%2===0?s:s*0.65;
        if(i===0) ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
        else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill();

      // Wing arms
      ctx.fillStyle="#c62828";
      ctx.save(); ctx.rotate(Math.PI/8);
      for(let i=0;i<4;i++){
        ctx.save(); ctx.rotate(i*Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(s*0.5,0); ctx.lineTo(s*1.6,s*0.2); ctx.lineTo(s*1.6,-s*0.2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Core reactor (glows based on HP)
      const coreGrad=ctx.createRadialGradient(0,0,0,0,0,s*0.42);
      coreGrad.addColorStop(0,`rgba(255,${Math.floor(hp*200)},0,1)`);
      coreGrad.addColorStop(0.6,"rgba(180,0,0,0.8)");
      coreGrad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=coreGrad;
      ctx.shadowBlur=30; ctx.shadowColor="#ff1744";
      ctx.beginPath(); ctx.arc(0,0,s*0.42,0,Math.PI*2); ctx.fill();

      // Eye
      ctx.fillStyle="rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.arc(0,0,s*0.12,0,Math.PI*2); ctx.fill();

      // Boss HP bar
      const bw=s*3.5;
      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.roundRect(-bw/2,s*1.55,bw,10,5); ctx.fill();
      const bGrad=ctx.createLinearGradient(-bw/2,0,bw/2,0);
      bGrad.addColorStop(0,hp>0.5?"#10b981":"#ef4444");
      bGrad.addColorStop(1,hp>0.5?"#34d399":"#ff1744");
      ctx.fillStyle=bGrad;
      ctx.roundRect(-bw/2,s*1.55,bw*hp,10,5); ctx.fill();

      // HP text
      ctx.fillStyle="white"; ctx.font=`bold 10px Inter,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`BOSS  ${e.hp}/${e.maxHp}`,0,s*1.6+5);
      break;
    }
  }
  ctx.restore();
}

// ─── Power-up drawer ──────────────────────────────────────────────────────────
const PU_EMOJI: Record<PowerUpType,string> = {
  bulletUp:"⚡",rapidFire:"🔫",shield:"🛡️",bomb:"💣",nova:"🪙",missile:"🚀"
};
const PU_COLOR: Record<PowerUpType,string> = {
  bulletUp:"#a855f7",rapidFire:"#f59e0b",shield:"#3b82f6",bomb:"#ef4444",nova:"#f59e0b",missile:"#10b981"
};

function drawPowerUp(ctx:CanvasRenderingContext2D, p:{type:PowerUpType,x:number,y:number,pulse:number}) {
  ctx.save();
  ctx.translate(p.x,p.y);
  const sc=0.88+Math.sin(p.pulse)*0.12;
  ctx.scale(sc,sc);
  const c=PU_COLOR[p.type];
  // Glow ring
  ctx.shadowBlur=16; ctx.shadowColor=c;
  ctx.strokeStyle=c; ctx.lineWidth=2;
  ctx.globalAlpha=0.6+Math.sin(p.pulse)*0.3;
  ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle=c+"25";
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  ctx.font="14px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(PU_EMOJI[p.type],0,1);
  ctx.restore();
}

// ─── Main renderer ────────────────────────────────────────────────────────────
interface Props { gameState:GameState; width:number; height:number; }

export default function NovaBlasterCanvas({gameState,width,height}:Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef      = useRef(0);

  const draw = useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const ctx=canvas.getContext("2d"); if(!ctx)return;
    tRef.current++;
    const t=tRef.current;
    const {player,enemies,bullets,powerUps,particles,floatTexts,stars,
           shakeX,shakeY,flashAlpha,flashColor}=gameState;

    // Screen shake offset
    ctx.save();
    ctx.translate(shakeX,shakeY);

    // ── Background ───────────────────────────────────────────────────────
    ctx.fillStyle="#070514";
    ctx.fillRect(-4,-4,width+8,height+8);

    // Nebula
    const nb=ctx.createRadialGradient(width*0.6,height*0.15,0,width*0.6,height*0.15,width*0.55);
    nb.addColorStop(0,"rgba(124,58,237,0.06)");
    nb.addColorStop(1,"transparent");
    ctx.fillStyle=nb; ctx.fillRect(0,0,width,height);
    const nb2=ctx.createRadialGradient(width*0.2,height*0.7,0,width*0.2,height*0.7,width*0.4);
    nb2.addColorStop(0,"rgba(236,72,153,0.04)");
    nb2.addColorStop(1,"transparent");
    ctx.fillStyle=nb2; ctx.fillRect(0,0,width,height);

    // Stars
    for (const s of stars) {
      const alpha=s.alpha*(0.7+Math.sin(s.twinkle+t*0.02)*0.3);
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }

    // ── Particles ────────────────────────────────────────────────────────
    for (const p of particles) {
      ctx.save(); ctx.globalAlpha=p.life;
      if (p.shape==="ring") {
        ctx.strokeStyle=p.color; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
      } else if (p.shape==="spark") {
        ctx.fillStyle=p.color;
        ctx.beginPath();
        ctx.moveTo(p.x,p.y-p.size*p.life);
        ctx.lineTo(p.x+p.size*0.3,p.y+p.size*0.5);
        ctx.lineTo(p.x-p.size*0.3,p.y+p.size*0.5);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle=p.color; ctx.shadowBlur=6; ctx.shadowColor=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life*0.8,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // ── Power-ups ─────────────────────────────────────────────────────────
    for (const p of powerUps) drawPowerUp(ctx,p);

    // ── Enemies ───────────────────────────────────────────────────────────
    for (const e of enemies) if(e.y>-e.size*2) drawEnemy(ctx,e,t);

    // ── Bullets ───────────────────────────────────────────────────────────
    for (const b of bullets) {
      ctx.save();
      if (b.owner==="player") {
        // Trail
        for (let i=0;i<b.trail.length;i++){
          const tr=b.trail[i];
          ctx.globalAlpha=(1-i/b.trail.length)*0.4;
          ctx.fillStyle=b.color;
          ctx.beginPath(); ctx.arc(tr.x,tr.y,b.size*(1-i/b.trail.length)*0.7,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        if (b.isMissile) {
          // Missile with trail
          ctx.shadowBlur=12; ctx.shadowColor="#f59e0b";
          ctx.fillStyle="#fbbf24";
          ctx.beginPath();
          ctx.moveTo(b.x,b.y-8); ctx.lineTo(b.x-4,b.y+6); ctx.lineTo(b.x+4,b.y+6);
          ctx.closePath(); ctx.fill();
          const mf=ctx.createLinearGradient(b.x,b.y+6,b.x,b.y+18);
          mf.addColorStop(0,"rgba(245,158,11,0.8)"); mf.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=mf;
          ctx.beginPath(); ctx.moveTo(b.x-3,b.y+6); ctx.lineTo(b.x,b.y+18); ctx.lineTo(b.x+3,b.y+6); ctx.closePath(); ctx.fill();
        } else {
          // Laser bolt — length by level
          const len=6+b.level*3;
          const bGrad=ctx.createLinearGradient(b.x,b.y,b.x,b.y-len*2);
          const colors=["","#c084fc","#a855f7","#e879f9","#fbbf24"];
          bGrad.addColorStop(0,colors[b.level]||"#a855f7");
          bGrad.addColorStop(0.4,colors[b.level]||"#a855f7");
          bGrad.addColorStop(1,"transparent");
          ctx.fillStyle=bGrad;
          ctx.shadowBlur=8+(b.level*2); ctx.shadowColor=colors[b.level]||"#a855f7";
          ctx.beginPath();
          ctx.ellipse(b.x,b.y-len*0.6,b.size*0.7*(b.level>=3?1.2:1),len,0,0,Math.PI*2);
          ctx.fill();
        }
      } else {
        // Enemy bullet — glowing orb
        ctx.shadowBlur=12; ctx.shadowColor=b.color;
        const eg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.size+3);
        eg.addColorStop(0,"rgba(255,255,255,0.95)");
        eg.addColorStop(0.3,b.color);
        eg.addColorStop(1,"transparent");
        ctx.fillStyle=eg;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.size+1,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // ── Player ────────────────────────────────────────────────────────────
    if (gameState.phase==="playing") {
      drawPlayer(ctx,player.x,player.y,player.invincible,player.bulletLevel,player.engineFlame,t);
    }

    // ── Float texts ───────────────────────────────────────────────────────
    for (const f of floatTexts) {
      ctx.save();
      ctx.globalAlpha=f.life;
      ctx.scale(f.scale,f.scale);
      const fx=f.x/f.scale, fy=f.y/f.scale;
      ctx.fillStyle=f.color;
      ctx.shadowBlur=8; ctx.shadowColor=f.color;
      const size=f.text.length>12?10:13;
      ctx.font=`bold ${size}px Inter,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(f.text,fx,fy);
      ctx.restore();
    }

    // ── Screen flash ──────────────────────────────────────────────────────
    if (flashAlpha>0) {
      const rgb=flashColor.startsWith("#")?hex2rgb(flashColor):"255,255,255";
      ctx.fillStyle=`rgba(${rgb},${flashAlpha*0.35})`;
      ctx.fillRect(0,0,width,height);
    }

    // ── Wave cleared banner ───────────────────────────────────────────────
    if (gameState.waveCleared && gameState.waveTimer>80) {
      const a=Math.min(1,(gameState.waveTimer-80)/30);
      ctx.save(); ctx.globalAlpha=a;
      ctx.fillStyle="#f59e0b";
      ctx.shadowBlur=30; ctx.shadowColor="#f59e0b";
      ctx.font="bold 24px Inter,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`⚡ WAVE ${gameState.wave} CLEARED!`,width/2,height/2-20);
      const wave2=(gameState.wave)*10;
      ctx.font="bold 15px Inter,sans-serif";
      ctx.fillStyle="#ffffff"; ctx.shadowColor="#ffffff";
      ctx.fillText(`+${wave2} NOVA BONUS`,width/2,height/2+10);
      ctx.restore();
    }

    ctx.restore(); // end shake
  },[gameState,width,height]);

  useEffect(()=>{ draw(); },[draw]);

  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{display:"block",touchAction:"none"}}
      aria-label="Nova Blaster game" />
  );
}
