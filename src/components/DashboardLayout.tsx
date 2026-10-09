import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import Logo, { ORIGINAL_LOGO_SRC } from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/dashboard/team", label: "My Team" },
  { to: "/dashboard/qr", label: "Team QR" },
  { to: "/dashboard/workflow", label: "Workflow" },
  { to: "/dashboard/announcements", label: "Announcements" },
];

export default function DashboardLayout() {
  const { team, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  if (loading) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-void">
        <p className="hud-label">Authenticating…</p>
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  const side = (
    <div className="flex h-full flex-col p-5">
      <Link to="/" className="mb-8 block">
        <Logo className="h-10" imageSrc={ORIGINAL_LOGO_SRC} />
      </Link>

      <p className="hud-label mb-3">Mission control</p>

      <nav className="grid gap-1" aria-label="Dashboard">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `relative rounded-lg px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.2em] transition-all ${
                isActive
                  ? "bg-[#C44552]/10 text-[#F2C9CC] shadow-[inset_2px_0_0_#C44552,0_0_24px_-10px_#C44552]"
                  : "text-slate-400 hover:bg-white/5 hover:text-[#F2C9CC]"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <div className="mb-3 rounded-lg border border-red-400/15 px-4 py-3">
          <p className="truncate text-sm font-semibold text-white">
            {team.teamName}
          </p>
          <p className="font-mono text-[0.62rem] tracking-widest text-red-300/70">
            {team.teamId}
          </p>
        </div>

        <button
          onClick={() => {
            logout();
            nav("/login", { replace: true });
          }}
          className="w-full rounded-lg border border-rose-400/30 px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-rose-300 transition-colors hover:bg-rose-500/10"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-[100svh]">
      {/* Background: grid only, circular decorations removed */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 grid-bg opacity-70" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 !rounded-none border-y-0 border-l-0 lg:block">
        {side}
      </aside>

      {/* Mobile Header */}
      <header
        className="glass sticky top-0 z-30 flex items-center justify-between !rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <Logo className="h-8" imageSrc={ORIGINAL_LOGO_SRC} />

        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg border border-red-400/30 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-red-200"
        >
          Menu
        </button>
      </header>

      {/* Mobile Navigation */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 260,
            }}
            className="glass absolute inset-y-0 left-0 w-72 !rounded-none !bg-void/95"
          >
            {side}
          </motion.aside>
        </div>
      )}

      {/* Dashboard Content */}
      <main className="relative z-10 px-4 py-8 md:px-8 lg:ml-64 lg:px-10 lg:py-10">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-6xl"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
