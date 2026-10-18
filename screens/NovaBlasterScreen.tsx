"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import NovaBlasterCanvas from "@/components/NovaBlasterCanvas";
import { createInitialState, startGame, updateGame, type GameState } from "@/hooks/useNovaBlaster";
import { saveGameSession } from "@/app/actions";

interface Props { userId: number; onBalanceUpdate:(d:number)=>void; }

// ─── Safe canvas size: fills space between HUD (52px) and bottom nav (72px) ───
function useCanvasSize() {
  const [sz, setSz] = useState({w:360,h:520});
  useEffect(()=>{
    const calc=()=>{
      const w = Math.min(window.innerWidth, 480);
      const h = window.innerHeight - 52 - 72;   // HUD top + bottom nav
      setSz({w, h:Math.max(h,380)});
    };
    calc();
    window.addEventListener("resize",calc);
    return ()=>window.removeEventListener("resize",calc);
  },[]);
  return sz;
}

// ─── Shield dots ──────────────────────────────────────────────────────────────
function Shield({cur,max}:{cur:number;max:number}) {
  return (
    <div className="flex gap-1">
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} className="h-3 w-3 rounded-sm transition-all"
          style={{background:i<cur?"linear-gradient(135deg,#3b82f6,#60a5fa)":"rgba(255,255,255,0.1)",
            boxShadow:i<cur?"0 0 6px rgba(59,130,246,0.7)":"none"}} />
      ))}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NovaBlasterScreen({userId,onBalanceUpdate}:Props) {
  const {w:cw, h:ch} = useCanvasSize();

  const [gs, setGs]   = useState<GameState>(()=>createInitialState(cw,ch));
  const gsRef         = useRef(gs);
  gsRef.current       = gs;

  const rafRef        = useRef(0);
  const targetXRef    = useRef<number|null>(null);
  const useBombRef    = useRef(false);
  const savedRef      = useRef(false);
  const startMsRef    = useRef(0);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // ── Game loop ───────────────────────────────────────────────────────────────
  const tick = useCallback(()=>{
    const cur = gsRef.current;
    if (cur.phase!=="playing"){rafRef.current=0;return;}
    const next = updateGame(cur,cw,ch,targetXRef.current,useBombRef.current);
    useBombRef.current=false;
    setGs(next);
    if (next.phase==="playing") rafRef.current=requestAnimationFrame(tick);
    else rafRef.current=0;
  },[cw,ch]);

  const stopLoop = useCallback(()=>{
    if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=0;}
  },[]);

  // ── Start / restart ─────────────────────────────────────────────────────────
  const handleStart = useCallback(()=>{
    stopLoop(); savedRef.current=false; startMsRef.current=Date.now();
    const fresh=startGame(cw,ch);
    setGs(fresh); gsRef.current=fresh;
    rafRef.current=requestAnimationFrame(tick);
  },[cw,ch,tick,stopLoop]);

  // ── Save on game over ────────────────────────────────────────────────────────
  useEffect(()=>{
    if(gs.phase==="gameover"&&!savedRef.current){
      savedRef.current=true;
      const dur=Math.round((Date.now()-startMsRef.current)/1000);
      saveGameSession(userId,gs.score,gs.novaEarned,dur,"nova_blaster")
        .then(()=>{ if(gs.novaEarned>0) onBalanceUpdate(gs.novaEarned); })
        .catch(()=>{});
    }
  },[gs.phase,gs.score,gs.novaEarned,userId,onBalanceUpdate]);

  // ── Touch controls ───────────────────────────────────────────────────────────
  const getCanvasX = useCallback((clientX:number)=>{
    const rect=canvasWrapRef.current?.getBoundingClientRect();
    return rect ? clientX - rect.left : clientX;
  },[]);

  const onTouchStart  = useCallback((e:React.TouchEvent)=>{ e.preventDefault(); targetXRef.current=getCanvasX(e.touches[0].clientX); },[getCanvasX]);
  const onTouchMove   = useCallback((e:React.TouchEvent)=>{ e.preventDefault(); targetXRef.current=getCanvasX(e.touches[0].clientX); },[getCanvasX]);
  const onTouchEnd    = useCallback((e:React.TouchEvent)=>{ e.preventDefault(); targetXRef.current=null; },[]);
  const onMouseMove   = useCallback((e:React.MouseEvent)=>{ if(e.buttons===1) targetXRef.current=getCanvasX(e.clientX); },[getCanvasX]);
  const onMouseLeave  = useCallback(()=>{ targetXRef.current=null; },[]);

  useEffect(()=>()=>stopLoop(),[stopLoop]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const {player,score,novaEarned,wave,phase,bossActive} = gs;
  const powerUpIcons = useMemo(()=>{
    const icons:string[]=[];
    if(player.bulletLevel>=2) icons.push(`⚡Lv${player.bulletLevel}`);
    if(player.rapidFire>0) icons.push("🔫");
    if(player.hasMissile) icons.push("🚀");
    return icons;
  },[player]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{background:"#070514", height:"100%"}}>

      {/* ── HUD bar — fixed 52px ───────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0 px-4"
        style={{height:52, background:"rgba(7,5,20,0.97)", borderBottom:"1px solid rgba(124,58,237,0.25)"}}>

        {/* Lives + shield */}
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {Array.from({length:3}).map((_,i)=>(
              <span key={i} style={{fontSize:14,opacity:i<player.lives?1:0.18}} aria-hidden="true">🚀</span>
            ))}
          </div>
          <Shield cur={player.shield} max={player.maxShield} />
        </div>

        {/* Centre: title + wave */}
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest"
            style={{color:"#a855f7",textShadow:"0 0 10px rgba(168,85,247,0.7)"}}>
            NOVA BLASTER
          </p>
          {phase==="playing"&&(
            <p className="text-[0.58rem] font-bold" style={{color:bossActive?"#ff1744":"rgba(167,139,250,0.6)"}}>
              {bossActive?"⚠️ BOSS WAVE":"WAVE "+wave}
            </p>
          )}
        </div>

        {/* NOVA + score */}
        <div className="text-right">
          <p className="text-sm font-black" style={{color:"#f59e0b"}}>🪙 {novaEarned}</p>
          <p className="text-[0.58rem]" style={{color:"rgba(167,139,250,0.5)"}}>{score.toLocaleString()}</p>
        </div>
      </div>

      {/* ── Canvas + overlays — fills remaining space ──────────────────── */}
      <div ref={canvasWrapRef} className="relative flex-1 overflow-hidden"
        style={{cursor:"none"}}
        onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>

        <div style={{width:cw,height:ch,margin:"0 auto",position:"relative"}}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

          <NovaBlasterCanvas gameState={gs} width={cw} height={ch} />

          {/* Power-up badge */}
          {phase==="playing"&&powerUpIcons.length>0&&(
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2 rounded-2xl px-3 py-1.5"
              style={{background:"rgba(7,5,20,0.75)",border:"1px solid rgba(124,58,237,0.3)"}}>
              {powerUpIcons.map((ic,i)=>(
                <span key={i} className="text-xs font-bold" style={{color:"#c084fc"}}>{ic}</span>
              ))}
            </div>
          )}

          {/* Bomb button — bottom right, well above nav */}
          {phase==="playing"&&player.hasBomb&&(
            <button
              onTouchStart={(e)=>{e.stopPropagation();useBombRef.current=true;}}
              onClick={()=>{useBombRef.current=true;}}
              className="absolute bottom-16 right-3 rounded-2xl px-4 py-3 text-sm font-black text-white active:scale-90 transition-transform"
              style={{background:"linear-gradient(135deg,#dc2626,#ef4444)",
                boxShadow:"0 0 20px rgba(239,68,68,0.6)",zIndex:10}}
              aria-label="Use bomb">
              💣 BOMB
            </button>
          )}

          {/* ── START SCREEN ────────────────────────────────────────── */}
          {phase==="idle"&&(
            <div className="absolute inset-0 flex flex-col overflow-y-auto no-scrollbar"
              style={{background:"linear-gradient(180deg,rgba(7,5,20,0.88) 0%,rgba(7,5,20,0.97) 100%)"}}>

              <div className="flex flex-col items-center px-5 pt-8 pb-6 min-h-full">
                {/* Title */}
                <div className="text-center mb-5">
                  <p className="text-5xl font-black uppercase tracking-widest leading-none"
                    style={{color:"#e879f9",textShadow:"0 0 40px rgba(232,121,249,0.7)"}}>NOVA</p>
                  <p className="text-5xl font-black uppercase tracking-widest leading-none"
                    style={{color:"#a855f7",textShadow:"0 0 40px rgba(168,85,247,0.7)"}}>BLASTER</p>
                  <p className="text-xs mt-2" style={{color:"rgba(167,139,250,0.5)"}}>
                    Survive the swarm — the deeper you go, the more you earn
                  </p>
                </div>

                {/* How to play */}
                <div className="w-full rounded-2xl px-5 py-4 mb-4"
                  style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.25)"}}>
                  <p className="text-xs font-black uppercase tracking-widest text-center text-white mb-3">
                    HOW TO PLAY
                  </p>
                  {[
                    ["👆","Drag left/right to move your ship"],
                    ["🔫","Auto-fires — focus on dodging bullets"],
                    ["⚡","Collect power-ups to upgrade your guns"],
                    ["🚀","Missiles home in on enemies automatically"],
                    ["💣","Bomb clears the entire screen instantly"],
                    ["👾","Boss spawns every 5 waves — +150 NOVA"],
                  ].map(([ic,tx])=>(
                    <div key={tx} className="flex items-center gap-2.5 mb-2">
                      <span style={{fontSize:16,width:20,textAlign:"center"}}>{ic}</span>
                      <p className="text-xs" style={{color:"rgba(167,139,250,0.75)"}}>{tx}</p>
                    </div>
                  ))}
                </div>

                {/* Earn rates */}
                <div className="grid grid-cols-2 gap-2 w-full mb-5">
                  {[
                    ["Per Kill","2 NOVA"],["Per Wave","10×wave"],
                    ["Boss Kill","150 NOVA"],["Coin Drop","20 NOVA"],
                  ].map(([l,v])=>(
                    <div key={l} className="rounded-xl px-3 py-2.5 text-center"
                      style={{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)"}}>
                      <p className="text-[0.58rem]" style={{color:"rgba(167,139,250,0.4)"}}>{l}</p>
                      <p className="text-sm font-black" style={{color:"#f59e0b"}}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* LAUNCH button — always visible */}
                <button onClick={handleStart}
                  className="w-full max-w-xs rounded-2xl py-4 text-base font-black text-white uppercase tracking-widest transition-all active:scale-95"
                  style={{background:"linear-gradient(135deg,#7c3aed,#a855f7,#e879f9)",
                    boxShadow:"0 0 40px rgba(168,85,247,0.55)",letterSpacing:"0.1em"}}>
                  🚀 LAUNCH
                </button>
              </div>
            </div>
          )}

          {/* ── GAME OVER SCREEN ────────────────────────────────────── */}
          {phase==="gameover"&&(
            <div className="absolute inset-0 flex flex-col overflow-y-auto no-scrollbar"
              style={{background:"linear-gradient(180deg,rgba(7,5,20,0.92) 0%,rgba(7,5,20,0.98) 100%)"}}>

              <div className="flex flex-col items-center px-5 pt-8 pb-6">
                {/* Title */}
                <p className="text-3xl font-black uppercase tracking-widest mb-1"
                  style={{color:"#ef4444",textShadow:"0 0 24px rgba(239,68,68,0.6)"}}>
                  GAME OVER
                </p>
                <p className="text-xs mb-5" style={{color:"rgba(167,139,250,0.5)"}}>
                  Wave {wave} reached
                </p>

                {/* NOVA hero */}
                <div className="flex items-center gap-3 mb-5">
                  <span style={{fontSize:36}}>🪙</span>
                  <span className="text-5xl font-black tabular-nums"
                    style={{color:"#f59e0b",textShadow:"0 0 30px rgba(245,158,11,0.6)"}}>
                    {novaEarned.toLocaleString()}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
                  {[
                    {l:"Score",      v:score.toLocaleString(),          c:"#a855f7"},
                    {l:"Wave",       v:String(wave),                    c:"#60a5fa"},
                    {l:"Enemies",    v:String(Math.floor(score/12)),    c:"#10b981"},
                    {l:"Survived",   v:`${Math.round(gs.totalTime/60)}s`,c:"#f59e0b"},
                  ].map(({l,v,c})=>(
                    <div key={l} className="rounded-2xl px-4 py-3 text-center"
                      style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                      <p className="text-[0.58rem] uppercase tracking-wide" style={{color:"rgba(167,139,250,0.4)"}}>{l}</p>
                      <p className="text-xl font-black" style={{color:c}}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Credited notice */}
                {novaEarned>0&&(
                  <div className="w-full max-w-xs rounded-xl px-4 py-2.5 mb-4 text-center text-sm font-semibold"
                    style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981"}}>
                    ✅ {novaEarned.toLocaleString()} NOVA added to your balance
                  </div>
                )}

                {/* Play again */}
                <button onClick={handleStart}
                  className="w-full max-w-xs rounded-2xl py-4 text-base font-black text-white uppercase tracking-widest transition-all active:scale-95"
                  style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",
                    boxShadow:"0 0 30px rgba(124,58,237,0.4)"}}>
                  🚀 Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
