"use client";

export type Tab = "home" | "quests" | "play" | "redeem" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-end justify-around"
      style={{
        background: "rgba(13,11,26,0.97)",
        borderTop: "1px solid rgba(139,92,246,0.15)",
        backdropFilter: "blur(16px)",
        paddingBottom: "max(env(safe-area-inset-bottom,0px), 8px)",
        paddingTop: "8px",
      }}
      aria-label="Main navigation"
    >
      {/* Home */}
      <NavBtn id="home" active={active} onChange={onChange} label="Home">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active === "home" ? "#a855f7" : "rgba(167,139,250,0.4)"} aria-hidden="true">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </NavBtn>

      {/* Quests */}
      <NavBtn id="quests" active={active} onChange={onChange} label="Quests">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"
          stroke={active === "quests" ? "#a855f7" : "rgba(167,139,250,0.4)"}
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      </NavBtn>

      {/* ── Centre game controller (Play) — elevated ── */}
      <div className="relative flex flex-col items-center" style={{ marginTop: "-20px" }}>
        <button
          onClick={() => onChange("play")}
          aria-label="Play"
          aria-current={active === "play" ? "page" : undefined}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: active === "play"
              ? "linear-gradient(135deg,#7c3aed,#a855f7)"
              : "linear-gradient(135deg,#5b21b6,#7c3aed)",
            boxShadow: active === "play"
              ? "0 0 24px rgba(168,85,247,0.6), 0 0 8px rgba(124,58,237,0.4)"
              : "0 0 16px rgba(124,58,237,0.35)",
            border: "2px solid rgba(167,139,250,0.3)",
          }}
        >
          {/* Game controller icon */}
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white" aria-hidden="true">
            <path d="M7 12h2m2-2v2m0 0v2m0-2h2M6 8l-.707.707A8 8 0 1018.707 8.707L18 8H6zm2-3h8a2 2 0 012 2v1H6V7a2 2 0 012-2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <circle cx="17" cy="14" r="1" fill="white"/>
            <circle cx="19" cy="12" r="1" fill="white"/>
          </svg>
        </button>
      </div>

      {/* Redeem */}
      <NavBtn id="redeem" active={active} onChange={onChange} label="Redeem">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"
          stroke={active === "redeem" ? "#a855f7" : "rgba(167,139,250,0.4)"}
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 3H8L2 7h20l-6-4z"/>
          <path d="M12 12v4m-2-2h4"/>
        </svg>
      </NavBtn>

      {/* Profile */}
      <NavBtn id="profile" active={active} onChange={onChange} label="Profile">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"
          stroke={active === "profile" ? "#a855f7" : "rgba(167,139,250,0.4)"}
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </NavBtn>
    </nav>
  );
}

// ─── Reusable tab button ──────────────────────────────────────────────────────
function NavBtn({
  id, active, onChange, label, children,
}: {
  id: Tab;
  active: Tab;
  onChange: (t: Tab) => void;
  label: string;
  children: React.ReactNode;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className="flex flex-col items-center gap-0.5 px-3 py-1 transition-opacity active:opacity-60"
    >
      {children}
      <span
        className="text-[0.6rem] font-semibold"
        style={{ color: isActive ? "#a855f7" : "rgba(167,139,250,0.35)" }}
      >
        {label}
      </span>
    </button>
  );
}
