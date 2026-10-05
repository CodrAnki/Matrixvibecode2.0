import { Link } from "react-router-dom";
import Logo from "./Logo";
import { EVENT } from "../data/event";

const NAV = ["About", "Events", "Workflow", "Prizes", "Contact"];

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-white/[0.06]"
      style={{ background: "#070908" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00FF66] to-transparent opacity-60" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="h-12" />
          <p className="mt-5 max-w-sm text-lg text-sky-100/80">
            “{EVENT.tagline}”
          </p>
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">
            {EVENT.org}
          </p>
        </div>
        <div>
          <h4 className="hud-label mb-4">Navigate</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            {NAV.map((n) => (
              <li key={n}>
                <Link
                  className="transition-colors hover:text-cyan-200"
                  to={{ pathname: "/", hash: `#${n.toLowerCase()}` }}
                >
                  {n}
                </Link>
              </li>
            ))}
            <li>
              <Link
                className="transition-colors hover:text-cyan-200"
                to="/login"
              >
                Team Login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="hud-label mb-4">Connect</h4>
          <div className="flex flex-wrap gap-2">
            {EVENT.contact.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-cyan-400/25 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-300 hover:text-cyan-100 hover:shadow-[0_0_20px_-4px_#00FF66]"
              >
                {s.label}
              </a>
            ))}
          </div>
          <a
            className="mt-4 block text-sm text-cyan-200 hover:underline"
            href={`mailto:${EVENT.contact.email}`}
          >
            {EVENT.contact.email}
          </a>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center font-mono text-[0.62rem] uppercase tracking-[0.25em] text-slate-600">
        © {new Date().getFullYear()} {EVENT.name} · {EVENT.org} · Developed by
        Ankit Dubey
      </div>
    </footer>
  );
}
