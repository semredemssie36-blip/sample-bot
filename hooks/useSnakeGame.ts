import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

export const GRID_SIZE = 20; // cells per axis
export const CELL_PX = 16;  // rendered pixels per cell (scaled by canvas)

/** Frames-per-second at each speed level (1-indexed). */
const LEVEL_FPS: Record<number, number> = {
  1: 8,
  2: 10,
  3: 13,
  4: 16,
  5: 20,
  6: 25,
  7: 30,
  8: 36,
};
const MAX_LEVEL = 8;
/** Food eaten per level-up. */
const FOOD_PER_LEVEL = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GamePhase = "idle" | "playing" | "dead";

export interface Point {
  x: number;
  y: number;
}

export interface SnakeGameState {
  phase: GamePhase;
  snake: Point[];
  food: Point;
  score: number;
  level: number;
  highScore: number;
}

export interface SnakeGameControls {
  startGame: () => void;
  changeDirection: (dir: Direction) => void;
  setHighScore: (hs: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFood(snake: Point[]): Point {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function moveHead(head: Point, dir: Direction): Point {
  switch (dir) {
    case "UP":    return { x: head.x, y: head.y - 1 };
    case "DOWN":  return { x: head.x, y: head.y + 1 };
    case "LEFT":  return { x: head.x - 1, y: head.y };
    case "RIGHT": return { x: head.x + 1, y: head.y };
  }
}

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSnakeGame(
  onDeath: (score: number) => void,
): [SnakeGameState, SnakeGameControls] {
  const initialSnake: Point[] = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];

  const [phase, setPhase]       = useState<GamePhase>("idle");
  const [snake, setSnake]       = useState<Point[]>(initialSnake);
  const [food, setFood]         = useState<Point>({ x: 15, y: 10 });
  const [score, setScore]       = useState(0);
  const [level, setLevel]       = useState(1);
  const [highScore, setHighScore] = useState(0);

  // Use refs for values consumed inside the game loop to avoid stale closures.
  const snakeRef    = useRef(snake);
  const dirRef      = useRef<Direction>("RIGHT");
  const dirQueue    = useRef<Direction[]>([]);
  const foodRef     = useRef(food);
  const scoreRef    = useRef(0);
  const levelRef    = useRef(1);
  const phaseRef    = useRef<GamePhase>("idle");
  const rafRef      = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // ── Direction input ─────────────────────────────────────────────────
  const changeDirection = useCallback((dir: Direction) => {
    const last = dirQueue.current.length
      ? dirQueue.current[dirQueue.current.length - 1]
      : dirRef.current;
    if (!isOpposite(dir, last) && dir !== last) {
      dirQueue.current.push(dir);
    }
  }, []);

  // ── Keyboard support ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "UP", ArrowDown: "DOWN",
        ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      if (map[e.key]) {
        e.preventDefault();
        changeDirection(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDirection]);

  // ── Game loop ───────────────────────────────────────────────────────
  const tick = useCallback((timestamp: number) => {
    if (phaseRef.current !== "playing") return;

    const fps = LEVEL_FPS[levelRef.current] ?? LEVEL_FPS[MAX_LEVEL];
    const interval = 1000 / fps;

    if (timestamp - lastTickRef.current < interval) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastTickRef.current = timestamp;

    // Consume next queued direction.
    if (dirQueue.current.length > 0) {
      dirRef.current = dirQueue.current.shift()!;
    }

    const currentSnake = snakeRef.current;
    const head = currentSnake[0];
    const newHead = moveHead(head, dirRef.current);

    // Wall collision
    if (
      newHead.x < 0 || newHead.x >= GRID_SIZE ||
      newHead.y < 0 || newHead.y >= GRID_SIZE
    ) {
      phaseRef.current = "dead";
      setPhase("dead");
      onDeath(scoreRef.current);
      return;
    }

    // Self collision (skip tail since it will move)
    if (currentSnake.slice(0, -1).some((s) => s.x === newHead.x && s.y === newHead.y)) {
      phaseRef.current = "dead";
      setPhase("dead");
      onDeath(scoreRef.current);
      return;
    }

    const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
    const newSnake = ateFood
      ? [newHead, ...currentSnake]           // grow
      : [newHead, ...currentSnake.slice(0, -1)]; // move

    let newScore = scoreRef.current;
    let newLevel = levelRef.current;

    if (ateFood) {
      newScore += newLevel * 10; // higher level = more points per food
      newLevel = Math.min(MAX_LEVEL, Math.floor(newScore / (FOOD_PER_LEVEL * 10 * /* avg level */ 1)) + 1);
      // More precise level calculation based on food count
      const foodCount = newSnake.length - 3; // started with length 3
      newLevel = Math.min(MAX_LEVEL, Math.floor(foodCount / FOOD_PER_LEVEL) + 1);

      const newFood = randomFood(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
      scoreRef.current = newScore;
      levelRef.current = newLevel;
      setScore(newScore);
      setLevel(newLevel);
    }

    snakeRef.current = newSnake;
    setSnake([...newSnake]);

    rafRef.current = requestAnimationFrame(tick);
  }, [onDeath]);

  // ── Start game ──────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const initSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 9,  y: 10 },
      { x: 8,  y: 10 },
    ];
    const initFood = randomFood(initSnake);

    // Reset all refs
    snakeRef.current    = initSnake;
    dirRef.current      = "RIGHT";
    dirQueue.current    = [];
    foodRef.current     = initFood;
    scoreRef.current    = 0;
    levelRef.current    = 1;
    phaseRef.current    = "playing";
    lastTickRef.current = 0;

    // Reset state
    setSnake(initSnake);
    setFood(initFood);
    setScore(0);
    setLevel(1);
    setPhase("playing");

    // Cancel any existing loop and start fresh
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return [
    { phase, snake, food, score, level, highScore },
    { startGame, changeDirection, setHighScore },
  ];
}
