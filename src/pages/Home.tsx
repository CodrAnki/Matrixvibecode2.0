import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SceneBackdrop from "../components/SceneBackdrop";
import MagneticButton from "../components/MagneticButton";
import TiltCard from "../components/TiltCard";
import Reveal from "../components/Reveal";
import CountUp from "../components/CountUp";
import SectionTitle from "../components/SectionTitle";
import Timeline from "../components/Timeline";
import PrizesSection from "../components/PrizesSection";
import AnnouncementsSection from "../components/AnnouncementsSection";
import ProblemsSection from "../components/ProblemsSection";
import SpecialPrize from "../components/SpecialPrize";
import SupportCta from "../components/SupportCta";
import EventEvolution from "../components/EventEvolution";
import EvolutionTransition from "../components/EvolutionTransition";
import Countdown, { ProblemsLive } from "../components/Countdown";
import { useEventPhase } from "../lib/eventPhase";
import { useAuth } from "../context/AuthContext";
import { ABOUT, EVENT, EVENTS, STATS, TOTAL_PRIZE_POOL } from "../data/event";
import { IconChevronDown } from "../components/Icons";

const ease = [0.22, 1, 0.36, 1] as const;

function Hero() {
  const { phase, registrationOpen } = useEventPhase();
  const revealed = phase === "revealed";
  const { team } = useAuth();
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-10 pt-32 md:px-10"
    >
      {/* Second column is intentionally empty: it keeps the hero copy off full width on desktop
          and leaves the right side to the 3D backdrop. */}
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="hud-label mb-6"
          >
            {EVENT.org} presents
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="mb-5 flex items-center gap-4 font-mono text-[clamp(1rem,2.3vw,1.6rem)] uppercase leading-none tracking-[0.26em] text-[#F3F0E9]"
          >
            {EVENT.name}
            <span aria-hidden className="hidden h-px flex-1 bg-white/15 sm:block" />
          </motion.p>
          <h1 className="display text-[clamp(2.5rem,7.4vw,6.6rem)]">
            {[
              { t: "CODE", c: "hl-red" },
              { t: "CREATE", c: "text-outline display-serif" },
              { t: "COLLABORATE", c: "hl-green" },
            ].map((w, i) => (
              <motion.span
                key={w.t}
                className={`block ${w.c}`}
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, delay: 0.2 + i * 0.18, ease }}
              >
                {w.t}
              </motion.span>
            ))}
          </h1>
          {revealed ? (
            // Problems are out: that's what participants are here for, so it replaces the
            // tagline and the Register / Explore buttons as the hero's call to action.
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.9, ease }}
              className="mt-9 max-w-3xl"
            >
              <ProblemsLive />
            </motion.div>
          ) : (
            <>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.9, ease }}
                className="mt-7 max-w-xl text-base text-[#D4D4D8]/85 md:text-xl"
              >
                {EVENT.sub}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.1, ease }}
                className="mt-9 flex flex-wrap gap-4"
              >
                {team ? (
                  // Already signed in: never prompt a registered team to register again, whether
                  // or not registration is still technically open.
                  <MagneticButton to="/dashboard" variant="solid">
                    Team Dashboard →
                  </MagneticButton>
                ) : registrationOpen ? (
                  <MagneticButton to="/register" variant="solid">
                    Register Now →
                  </MagneticButton>
                ) : (
                  <MagneticButton to="/login" variant="solid">
                    Team Login →
                  </MagneticButton>
                )}
                <MagneticButton to={{ pathname: "/", hash: "#about" }}>
                  Explore Event
                </MagneticButton>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.2, ease }}
                className="mt-10 max-w-3xl"
              >
                <Countdown />
              </motion.div>
            </>
          )}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.3, ease }}
            className="glass hud-corners relative mt-8 grid max-w-3xl grid-cols-3 px-4 py-3 md:mt-20 md:px-6 md:py-5"
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`px-2 md:px-3 ${i > 0 ? "border-l border-white/[0.06]" : ""}`}
              >
                <div className="display text-3xl leading-none text-[#F3F0E9] md:text-4xl md:leading-none">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 font-mono text-[0.56rem] uppercase leading-tight tracking-[0.14em] text-[#F4F4F5]/80 md:text-[0.62rem] md:tracking-[0.2em]">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[#F4F4F5]/70">
          Scroll
        </span>
        <span className="h-10 w-px bg-gradient-to-b from-[#F4F4F5] to-transparent" />
      </div>
    </section>
  );
}

const ABOUT_FACTS = [
  { k: "Date", v: "14 Oct 2026" },
  { k: "Venue", v: "JEC, Jabalpur" },
  { k: "Prize pool", v: TOTAL_PRIZE_POOL },
];

function About() {
  return (
    <section id="about" className="relative isolate px-5 py-28 md:px-10 md:py-36">
      <div
        aria-hidden
        className="grid-surface grid-surface-soft pointer-events-none absolute inset-0 -z-10 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]"
      />
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div>
            <SectionTitle
              index="01"
              kicker="About MATRIX"
              title={<>Enter the <span className="hl-green">build arena.</span></>}
            />
            <Reveal delay={0.1}>
              <p className="max-w-xl text-xl leading-relaxed text-[#F3F0E9] md:text-[1.35rem] md:leading-[1.6]">
                Vibe Coding 2.0 is a hackathon hosted by MATRIX, the technical
                club of Jabalpur Engineering College (JEC). Compete solo or in a
                duo to turn a real problem statement into a working product,
                using modern stacks and AI-assisted development.
              </p>
              <p className="mt-5 max-w-xl leading-relaxed text-slate-400 md:text-lg">
                Expect a build round, mentors on call, and a live finale, with a
                ₹6K+ prize pool for the teams that ship the best ideas.
              </p>
              <dl className="mt-10 grid max-w-xl grid-cols-3 border-t border-white/[0.1]">
                {ABOUT_FACTS.map((f, i) => (
                  <div key={f.k} className={`pt-5 ${i > 0 ? "border-l border-white/[0.1] pl-4 sm:pl-6" : "pr-4"}`}>
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">{f.k}</dt>
                    <dd className="display mt-2 text-lg text-[#F3F0E9] sm:text-2xl">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:pt-2">
            <Reveal>
              <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
                What you'll do
              </p>
            </Reveal>
            <ol className="border-t border-white/[0.12]">
              {ABOUT.map((a, i) => (
                <li key={a.code} className="group relative border-b border-white/[0.12] transition-colors hover:bg-white/[0.02]">
                  <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[2px] origin-top scale-y-0 bg-[#C44552] transition-transform duration-300 group-hover:scale-y-100" />
                  <Reveal delay={i * 0.08} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-7 sm:gap-8">
                    <span className="pl-3 pt-1.5 font-mono text-sm text-[#C44552]/70 transition-colors group-hover:text-[#C44552]">
                      {a.code}
                    </span>
                    <div>
                      <h3 className="display text-[1.75rem] text-[#F3F0E9] md:text-[2rem]">{a.title}</h3>
                      <p className="mt-2 max-w-md leading-relaxed text-slate-400">{a.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Events() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section id="games" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          index="03"
          kicker="Crowd games"
          title={<>Quick games <span className="hl-red">between</span> the <span className="hl-green">builds.</span></>}
          sub="Short, loud and open to everyone in the room — these run between build sessions to keep the energy up."
        />
        <div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          style={{ perspective: 1200 }}
        >
          {EVENTS.map((e, i) => (
            <Reveal key={e.code} delay={(i % 3) * 0.1}>
              <TiltCard
                className="group h-full cursor-pointer overflow-hidden p-6"
                max={12}
                onClick={() => setOpen(open === e.code ? null : e.code)}
                role="button"
                tabIndex={0}
                aria-expanded={open === e.code}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setOpen(open === e.code ? null : e.code); }
                }}
              >
                <div className="flex items-center justify-between font-mono text-[0.62rem] tracking-[0.22em] text-red-300/70">
                  <span>{e.code}</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-red-400/25 py-1 pl-2.5 pr-1.5 uppercase tracking-[0.18em] text-red-300/80 transition-colors group-hover:border-red-400/50 group-hover:text-red-100">
                    {open === e.code ? "Less" : "Details"}
                    <motion.span
                      animate={{ rotate: open === e.code ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="grid h-4 w-4 place-items-center rounded-full bg-red-400/15"
                    >
                      <IconChevronDown className="h-3 w-3" strokeWidth={2.5} />
                    </motion.span>
                  </span>
                </div>
                <h3 className="display mt-8 text-[1.6rem] leading-[1.05] text-[#F3F0E9]">
                  {e.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {e.text}
                </p>
                <AnimatePresence initial={false}>
                  {open === e.code && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-4 text-sm leading-relaxed text-red-100/80"
                    >
                      {e.more}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="mt-6 flex flex-wrap gap-2">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-red-400/25 bg-red-400/5 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-red-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section id="workflow" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="relative z-0 mx-auto max-w-7xl">
        <SectionTitle
          align="center"
          index="04"
          kicker="Mission workflow"
          title={<>From <span className="hl-red">registration</span> to <span className="hl-green">build.</span></>}
          sub="Four stages. One pipeline. Scroll to travel through it."
        />
        <div className="grid-surface relative rounded-[14px] border border-white/[0.08] px-4 py-8 sm:px-6 md:px-10 md:py-12">
          <Timeline />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <SceneBackdrop variant="hero" className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/50 via-transparent to-void/60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,5,4,0.85)_100%)]" />
      </div>
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <About />
        <EventEvolution />
        <EvolutionTransition />
        <Events />
        <Workflow />
        <PrizesSection />
        <SpecialPrize />
        <AnnouncementsSection />
        <ProblemsSection />
        <SupportCta />
      </main>
      <Footer />
    </div>
  );
}
