import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Reveal from "./Reveal";

/** Frame for the standalone public pages (problems, support): site navbar and footer on the
 *  graph-paper background, with the same kicker / headline treatment as the home sections. */
export default function PageShell({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string;
  title: ReactNode;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[100svh]">
      <div aria-hidden className="grid-surface fixed inset-0 z-0" />
      <Navbar />
      <main className="relative z-10 px-5 pb-28 pt-32 md:px-10 md:pb-36 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/"
            className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-[#70D6A2]"
          >
            ← Back to Vibe Coding 2.0
          </Link>
          <Reveal className="mb-12 mt-10 max-w-3xl md:mb-16">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-[#C44552]/45" />
              <span className="hud-label">{kicker}</span>
            </div>
            <h1 className="display text-[clamp(2.6rem,6vw,5rem)] text-[#F3F0E9]">{title}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">{sub}</p>
          </Reveal>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
