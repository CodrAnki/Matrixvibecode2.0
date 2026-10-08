import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { EVENT } from "../data/event";
import { useRegistrationOpen } from "../lib/eventPhase";
import { useAuth } from "../context/AuthContext";
import { IconArrowUp, IconArrowUpRight, IconMail, IconPin } from "./Icons";
import { scrollToTarget } from "../lib/smoothScroll";

function ColHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="h-px w-5 bg-[#C44552]/45" />
      <h3 className="hud-label">{children}</h3>
    </div>
  );
}

const NAV = [
  { label: "Home", to: { pathname: "/", hash: "#home" } },
  { label: "Problem Statements", to: "/problems" },
  { label: "How it works", to: { pathname: "/", hash: "#workflow" } },
  { label: "Support", to: "/support" },
];

export default function Footer() {
  const registrationOpen = useRegistrationOpen();
  const { team } = useAuth();
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-[#080909] text-slate-300">
      <section className="border-b border-white/[0.08] px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${registrationOpen ? "bg-[#38B878] shadow-[0_0_8px_#38B878]" : "bg-slate-600"}`} />
            {registrationOpen ? "Registrations open" : "Registrations closed"}
          </div>
          <div className="grid-surface hud-corners relative flex flex-col gap-8 overflow-hidden rounded-[14px] border border-white/[0.08] px-6 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="display text-[clamp(3rem,8vw,6rem)] leading-[0.88] text-[#F3F0E9]">
                Ready
                <br />
                to <span className="text-[#38B878]">build?</span>
              </h2>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
                {EVENT.sub}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pb-1">
              {team ? (
                // Already signed in — never prompt a registered team to register again.
                <Link to="/dashboard" className="btn btn-solid">
                  Go to dashboard <span aria-hidden>→</span>
                </Link>
              ) : registrationOpen ? (
                <Link to="/register" className="btn btn-solid">
                  Register for Vibe Coding 2.0 <span aria-hidden>→</span>
                </Link>
              ) : (
                <Link to="/problems" className="btn btn-solid">
                  Problem statements <span aria-hidden>→</span>
                </Link>
              )}
              {!team && (
                <Link to="/login" className="btn">
                  Team Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="grid-surface grid-surface-soft pointer-events-none absolute inset-0 -z-10 [-webkit-mask-image:linear-gradient(to_bottom,black,black_85%,transparent)] [mask-image:linear-gradient(to_bottom,black,black_85%,transparent)]"
        />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 md:px-10 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex w-fit items-center gap-3">
              <Logo className="h-9" showImage showText={false} />
              <span className="font-bold tracking-wide text-white">
                MATRIX <span className="text-slate-500">/</span>{" "}
                <span className="font-mono text-xs font-normal tracking-[0.2em] text-slate-400">
                  JEC
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400 md:text-base">
              The technical club of Jabalpur Engineering College (JEC) — organiser of Vibe Coding 2.0.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ColHeading>Explore</ColHeading>
            <ul className="space-y-3 text-sm md:text-base">
              {NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    className="transition-colors hover:text-[#70D6A2]"
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {!team && registrationOpen && (
                <li>
                  <Link className="transition-colors hover:text-[#70D6A2]" to="/register">
                    Register
                  </Link>
                </li>
              )}
              <li>
                <Link className="transition-colors hover:text-[#70D6A2]" to={team ? "/dashboard" : "/login"}>
                  {team ? "Team Dashboard" : "Team login"}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <ColHeading>Follow Matrix</ColHeading>
            <ul className="space-y-3 text-sm md:text-base">
              {EVENT.contact.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 transition-colors hover:text-[#70D6A2]"
                  >
                    {social.label}
                    <IconArrowUpRight className="h-3 w-3 text-slate-600 transition-colors group-hover:text-[#70D6A2]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColHeading>Contact</ColHeading>
            <a
              className="flex items-start gap-2 break-words text-sm transition-colors hover:text-[#70D6A2] md:text-base"
              href={`mailto:${EVENT.contact.email}`}
            >
              <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              {EVENT.contact.email}
            </a>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-slate-400 md:text-base">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              {EVENT.contact.location}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500 sm:flex-row md:px-10">
        <span>© {new Date().getFullYear()} MATRIX, Jabalpur Engineering College</span>
        <button
          type="button"
          onClick={() => scrollToTarget(0)}
          className="group flex items-center gap-1.5 transition-colors hover:text-[#70D6A2]"
        >
          Back to top
          <IconArrowUp className="h-3 w-3 transition-transform group-hover:-translate-y-0.5" />
        </button>
      </div>
    </footer>
  );
}
