"use client";

export type Tab = "home" | "quests" | "tap" | "wallet" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  energy: number;
  energyMax: number;
}

export default function BottomNav({ active, onChange, energy, energyMax }: BottomNavProps) {
  const energyPct = Math.round((energy / energyMax) * 100);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-end justify-around"
      style={{
        background:    "rgba(10,8,24,0.97)",
        borderTop:     "1px solid rgba(124,58,237,0.2)",
        backdropFilter:"blur(20px)",
        paddingBottom: "max(env(safe-area-inset-bottom,0px),8px)",
        paddingTop:    "6px",
      }}
    >
      <NavBtn id="home"    active={active} onChange={onChange} label="Home"    icon={<HomeIcon    active={active==="home"}    />} />
      <NavBtn id="quests"  active={active} onChange={onChange} label="Quests"  icon={<QuestsIcon  active={active==="quests"}  />} />

      {/* ── Centre TAP button ── */}
      <div className="relative flex flex-col items-center" style={{ marginTop: "-22px" }}>
        <button
          onClick={() => onChange("tap")}
          aria-label="Tap to earn"
          className="relative flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: active === "tap"
              ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
              : "linear-gradient(135deg,#d97706,#f59e0b)",
            boxShadow: active === "tap"
              ? "0 0 28px rgba(245,158,11,0.7), 0 0 56px rgba(245,158,11,0.3)"
              : "0 0 18px rgba(245,158,11,0.4)",
            border: "2.5px solid rgba(251,191,36,0.4)",
          }}
        >
          <span className="text-2xl" aria-hidden="true">🪙</span>
          {/* Energy indicator ring */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="29" fill="none"
              stroke={energyPct > 20 ? "rgba(255,255,255,0.5)" : "rgba(239,68,68,0.7)"}
              strokeWidth="3"
              strokeDasharray={`${(energyPct / 100) * 182} 182`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>
        </button>
        <span className="mt-1 text-[0.55rem] font-bold" style={{ color: active === "tap" ? "#f59e0b" : "rgba(245,158,11,0.5)" }}>
          PLAY
        </span>
      </div>

      <NavBtn id="wallet"  active={active} onChange={onChange} label="Wallet"  icon={<WalletIcon  active={active==="wallet"}  />} />
      <NavBtn id="profile" active={active} onChange={onChange} label="Profile" icon={<ProfileIcon active={active==="profile"} />} />
    </nav>
  );
}

function NavBtn({ id, active, onChange, label, icon }: { id: Tab; active: Tab; onChange: (t: Tab) => void; label: string; icon: React.ReactNode }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all active:opacity-60"
    >
      {icon}
      <span className="text-[0.58rem] font-semibold" style={{ color: isActive ? "#a855f7" : "rgba(167,139,250,0.35)" }}>
        {label}
      </span>
    </button>
  );
}

const ic = (on: boolean) => ({ stroke: on ? "#a855f7" : "rgba(167,139,250,0.4)", strokeWidth: "1.8", fill: "none", strokeLinecap: "round" as const });

function HomeIcon({ active }: { active: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? "#a855f7" : "rgba(167,139,250,0.4)"} aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
}
function QuestsIcon({ active }: { active: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...ic(active)} aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinejoin="round"/></svg>;
}
function WalletIcon({ active }: { active: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...ic(active)} aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill={active ? "#a855f7" : "rgba(167,139,250,0.4)"}/><path d="M2 9h20"/></svg>;
}
function ProfileIcon({ active }: { active: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...ic(active)} aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
