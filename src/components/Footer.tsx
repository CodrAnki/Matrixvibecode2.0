import { Link } from "react-router-dom";
import Logo, { ORIGINAL_LOGO_SRC } from "./Logo";
import { EVENT } from "../data/event";

const NAV = [
  { label: "Vibe Coding 2.0", hash: "#home" },
  { label: "Problem Statements", hash: "#problems" },
  { label: "How it works", hash: "#workflow" },
  { label: "Details", hash: "#contact" },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-[#080909] font-sans text-slate-300">
      <section className="border-b border-white/[0.08] px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center justify-between border-t border-white/[0.12] pt-4 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
            <span>Register</span>
            <span>Vibe Coding 2.0</span>
          </div>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="display text-[clamp(3.5rem,9vw,7rem)] leading-[0.88] text-[#F3F0E9]">
                Ready
                <br />
                to <span className="text-[#38B878]">build?</span>
              </h2>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
                {EVENT.sub}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pb-1">
              <Link to="/register" className="btn btn-solid">
                Register for Vibe Coding 2.0 <span aria-hidden>→</span>
              </Link>
              <Link to="/login" className="btn">
                Team Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="footer-grid border-b border-white/[0.08] px-5 py-7 md:px-10 md:py-9">
        <div className="mx-auto flex max-w-7xl items-center gap-5">
          <Logo
            className="h-10 shrink-0"
            showImage
            showText={false}
            imageSrc={ORIGINAL_LOGO_SRC}
          />
          <p className="max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
            <span className="text-slate-200">Organised by MATRIX,</span> the
            technical community of Jabalpur Engineering College.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 md:px-10 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo
              className="h-9"
              showImage
              showText={false}
              imageSrc={ORIGINAL_LOGO_SRC}
            />
            <span className="font-bold tracking-wide text-white">
              MATRIX <span className="text-slate-500">/</span>{" "}
              <span className="font-mono text-xs font-normal tracking-[0.2em] text-slate-400">
                JEC
              </span>
            </span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400 md:text-base">
            Organiser of Vibe Coding 2.0.
            <br />
            The technical community of Jabalpur Engineering College.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h3 className="hud-label mb-5">Vibe Coding 2.0</h3>
          <ul className="space-y-3 text-sm md:text-base">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  className="transition-colors hover:text-white"
                  to={{ pathname: "/", hash: item.hash }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="transition-colors hover:text-white" to="/register">
                Register
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-white" to="/login">
                Team login
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="hud-label mb-5">Follow Matrix</h3>
          <ul className="space-y-3 text-sm md:text-base">
            {EVENT.contact.socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="hud-label mb-5">Contact</h3>
          <a
            className="break-words text-sm transition-colors hover:text-white md:text-base"
            href={`mailto:${EVENT.contact.email}`}
          >
            {EVENT.contact.email}
          </a>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 md:text-base">
            {EVENT.contact.location}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-5 text-center font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500 md:px-10">
        © {new Date().getFullYear()} MATRIX, Jabalpur Engineering College
      </div>
    </footer>
  );
}
