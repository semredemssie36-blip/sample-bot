"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SnakeCanvas from "@/components/SnakeCanvas";
import SwipeControls from "@/components/SwipeControls";
import { useSnakeGame } from "@/hooks/useSnakeGame";
import { completeQuest, getQuests } from "@/app/actions";

interface PlayScreenProps {
  userId: number;
  onBalanceUpdate: (delta: number) => void;
}

// NOVA earned per food eaten during a game session
const NOVA_PER_FOOD = 5;

function useGameSize() {
  const [size, setSize] = useState(320);
  useEffect(() => {
    const calc = () => {
      const maxH = window.innerHeight - 160 - 120;
      const maxW = window.innerWidth - 32;
      setSize(Math.min(maxW, maxH, 380));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

export default function PlayScreen({ userId, onBalanceUpdate }: PlayScreenProps) {
  const [screen, setScreen] = useState<"start" | "game" | "gameover">("start");
  const [lastScore, setLastScore] = useState(0);
  const [novaEarned, setNovaEarned] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [gameQuestId, setGameQuestId] = useState<string | null>(null);
  const gameSize = useGameSize();
  const earnedRef = useRef(0);

  // Load PLAY_GAME quest ID on mount
  useEffect(() => {
    getQuests(userId).then((quests) => {
      const playQuest = quests.find((q) => q.type === "PLAY_GAME" && !q.completed);
      if (playQuest) setGameQuestId(playQuest.id);
    });
  }, [userId]);

  const onDeath = useCallback(
    async (score: number) => {
      setLastScore(score);
      const earned = earnedRef.current;
      setNovaEarned(earned);
      earnedRef.current = 0;

      if (earned > 0) {
        onBalanceUpdate(earned);
      }

      const newBest = score > highScore;
      if (newBest) setHighScore(score);
      setIsNewBest(newBest && score > 0);

      // Auto-complete PLAY_GAME quest on any game over
      if (gameQuestId && userId) {
        completeQuest(userId, gameQuestId).catch(() => {});
      }

      setScreen("gameover");
    },
    [highScore, onBalanceUpdate, userId, gameQuestId]
  );

  const [gameState, gameControls] = useSnakeGame(onDeath);

  // Track NOVA earnings as snake grows
  const prevLengthRef = useRef(3);
  useEffect(() => {
    if (screen !== "game") return;
    const currentLength = gameState.snake.length;
    if (currentLength > prevLengthRef.current) {
      const foodEaten = currentLength - prevLengthRef.current;
      earnedRef.current += foodEaten * NOVA_PER_FOOD;
      prevLengthRef.current = currentLength;
    }
  }, [gameState.snake.length, screen]);

  const startGame = () => {
    prevLengthRef.current = 3;
    earnedRef.current = 0;
    setNovaEarned(0);
    setIsNewBest(false);
    setScreen("game");
    gameControls.startGame();
  };

  const LEVEL_COLORS = [
    "#22d3ee", "#4ade80", "#a3e635",
    "#facc15", "#fb923c", "#f87171",
    "#e879f9", "#a855f7",
  ];
  const levelColor = LEVEL_COLORS[(gameState.level - 1) % LEVEL_COLORS.length];

  return (
    <div
      className="flex flex-col min-h-full pb-24"
      style={{ background: "#0d0b1a" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-black text-white">Play & Earn</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
          Eat food → earn {NOVA_PER_FOOD} NOVA per bite
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-3">
        {[
          { label: "Score", value: screen === "game" ? gameState.score : lastScore, color: "#a855f7" },
          { label: "Level", value: screen === "game" ? gameState.level : 1, color: levelColor },
          { label: "Best", value: highScore, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl px-3 py-2"
            style={{ background: "rgba(42,26,94,0.6)", border: "1px solid rgba(139,92,246,0.15)" }}
          >
            <p className="text-[0.6rem] uppercase tracking-wide" style={{ color: "rgba(167,139,250,0.5)" }}>
              {label}
            </p>
            <p className="text-xl font-black tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Game canvas */}
      <div className="flex flex-col items-center px-4">
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ width: gameSize, height: gameSize }}
        >
          <SnakeCanvas
            snake={gameState.snake}
            food={gameState.food}
            phase={gameState.phase}
            sizePx={gameSize}
          />

          {screen === "game" && (
            <SwipeControls onDirection={gameControls.changeDirection} />
          )}

          {/* NOVA earned live indicator */}
          {screen === "game" && earnedRef.current > 0 && (
            <div
              className="absolute top-3 right-3 rounded-xl px-2.5 py-1 text-xs font-black"
              style={{ background: "rgba(245,158,11,0.85)", color: "white" }}
            >
              +{earnedRef.current} NOVA
            </div>
          )}

          {/* Start overlay */}
          {screen === "start" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "rgba(13,11,26,0.88)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-5xl mb-3">🐍</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1">Snake</h2>
              <p className="text-xs mb-2" style={{ color: "rgba(167,139,250,0.6)" }}>
                Earn {NOVA_PER_FOOD} NOVA per food eaten
              </p>
              <button
                onClick={startGame}
                className="mt-3 rounded-2xl px-8 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
              >
                Play Now
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {screen === "gameover" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6"
              style={{ background: "rgba(13,11,26,0.92)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-4xl mb-2">💀</div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-3">Game Over</h2>

              {/* Score */}
              <div className="mb-2 text-center">
                <p className="text-4xl font-black tabular-nums" style={{ color: "#a855f7" }}>
                  {lastScore}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
                  {isNewBest ? "🎉 New best!" : `Best: ${highScore}`}
                </p>
              </div>

              {/* NOVA earned this game */}
              {novaEarned > 0 && (
                <div
                  className="mb-3 rounded-xl px-4 py-2 text-sm font-black"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}
                >
                  +{novaEarned} NOVA earned this game 🪙
                </div>
              )}

              <div className="flex gap-3 w-full mt-1">
                <button
                  onClick={startGame}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  Retry
                </button>
                <button
                  onClick={() => setScreen("start")}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold active:scale-95 transition-transform"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.8)" }}
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to play */}
      {screen === "start" && (
        <div className="mx-4 mt-4 rounded-2xl px-4 py-4" style={{ background: "rgba(42,26,94,0.4)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="text-xs font-bold text-white mb-2">How to play</p>
          <div className="space-y-1.5">
            {[
              { icon: "👆", text: "Swipe or use D-pad to move" },
              { icon: "🍎", text: `Eat food → +${NOVA_PER_FOOD} NOVA per bite` },
              { icon: "⚡", text: "Level up every 5 foods — gets faster" },
              { icon: "💀", text: "Don't hit walls or your own tail" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
