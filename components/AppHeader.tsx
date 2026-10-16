"use client";

interface AppHeaderProps {
  firstName?: string | null;
  username?: string | null;
  level: number;
  xp: number;
  xpForNext: number;
}

export default function AppHeader({ firstName, level, xp, xpForNext }: AppHeaderProps) {
  const displayName = firstName || "Player";
  const xpPct = Math.min((xp / xpForNext) * 100, 100);
  const xpRemaining = Math.max(0, xpForNext - xp);

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Top row: avatar + name/level + bell */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 0 0 2px rgba(139,92,246,0.5)",
            }}
            aria-label="User avatar"
          >
            🧑
            {/* Online dot */}
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-nova-bg"
              style={{ background: "#22c55e" }}
            />
          </div>

          {/* Name + level */}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white">{displayName}</span>
              <span className="text-base">👋</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Level shield icon */}
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M10 2L3 5v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V5l-7-3z"
                  fill="#7c3aed"
                  stroke="#a855f7"
                  strokeWidth="0.5"
                />
              </svg>
              <span className="text-xs font-bold text-purple-300">Level {level}</span>
            </div>
          </div>
        </div>

        {/* Bell */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" stroke="#a855f7" strokeWidth="2" fill="none" aria-hidden="true">
            <path d="M15 17H9m6 0a3 3 0 01-6 0m6 0H5.5A1.5 1.5 0 014 15.5v-.5a2 2 0 01.586-1.414L6 12.172V9a6 6 0 1112 0v3.172l1.414 1.414A2 2 0 0121 15v.5a1.5 1.5 0 01-1.5 1.5H15z" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* XP Progress bar */}
      <div
        className="rounded-2xl px-3.5 py-2.5"
        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          {/* Level shield left */}
          <div className="flex items-center gap-1">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M10 2L3 5v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V5l-7-3z" fill="#7c3aed" stroke="#a855f7" strokeWidth="0.5"/>
            </svg>
          </div>
          <span className="text-xs text-purple-300/70 ml-auto">
            {xpRemaining.toLocaleString()} XP to Level {level + 1}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemax={xpForNext}
          aria-label="XP progress"
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${xpPct}%`,
              background: "linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
