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
import Trophy from "../components/Trophy";
import AnnouncementsSection from "../components/AnnouncementsSection";
import ProblemsSection from "../components/ProblemsSection";
import SpecialPrize from "../components/SpecialPrize";
import WhatsAppContacts from "../components/WhatsAppContacts";
import { LOGO_SRC } from "../components/Logo";
import Countdown from "../components/Countdown";
import {
  ABOUT,
  EVENT,
  EVENTS,
  PRIZES,
  STATS,
  TOTAL_PRIZE_POOL,
} from "../data/event";

const ease = [0.22, 1, 0.36, 1] as const;

function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-10 pt-32 md:px-10"
    >
      {/* Ambient glow orbs for cinematic depth */}
      <div className="orb-drift pointer-events-none absolute -left-24 top-24 h-[38vmax] w-[38vmax] rounded-full bg-[radial-gradient(circle,rgba(0,255,102,0.14),transparent_65%)] blur-2xl" />
      <div
        className="orb-drift pointer-events-none absolute -right-24 bottom-10 h-[34vmax] w-[34vmax] rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.12),transparent_65%)] blur-2xl"
        style={{ animationDelay: "-4s" }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="hud-label mb-6 flex items-center gap-3"
          >
            <span className="blink h-2 w-2 rounded-full bg-[#00FF66] shadow-[0_0_10px_#00FF66]" />{" "}
            {EVENT.org} presents
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="mb-2 font-mono text-xs uppercase tracking-[0.35em] text-[#8B9691]"
          >
            {EVENT.name}
          </motion.p>
          <h1 className="display text-[clamp(2.5rem,7.4vw,6.6rem)]">
            {[
              { t: "CODE", c: "text-grad" },
              { t: "CREATE", c: "text-glow" },
              { t: "COLLABORATE", c: "text-grad" },
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
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease }}
            className="mt-7 max-w-xl text-base text-[#c8d6cf]/85 md:text-xl"
          >
            {EVENT.sub}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1, ease }}
            className="mt-9 flex flex-wrap gap-4"
          >
            <MagneticButton to="/register" variant="solid">
              Register Now →
            </MagneticButton>
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
                <div className="text-3xl font-bold leading-none text-white md:text-4xl md:leading-none [text-shadow:0_0_22px_rgba(0,255,102,0.5)]">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 font-mono text-[0.56rem] uppercase leading-tight tracking-[0.14em] text-[#00D9FF]/80 md:text-[0.62rem] md:tracking-[0.2em]">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating 3D logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: "blur(16px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.4, ease }}
          className="relative mx-auto hidden aspect-square w-full max-w-md items-center justify-center lg:flex"
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,255,102,0.22),rgba(0,217,255,0.08)_45%,transparent_70%)] blur-xl" />
          <div className="pointer-events-none absolute inset-8 rounded-full border border-[#00FF66]/15" />
          <div className="pointer-events-none absolute inset-16 rounded-full border border-[#00D9FF]/10" />
          <img
            src={LOGO_SRC}
            alt="MATRIX.JEC logo"
            className="logo-float relative z-10 w-3/4 max-w-[340px] object-contain drop-shadow-[0_0_35px_rgba(0,255,102,0.25)]"
          />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[#00D9FF]/70">
          Scroll
        </span>
        <span className="h-10 w-px bg-gradient-to-b from-[#00D9FF] to-transparent" />
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <SectionTitle
              kicker="About MATRIX"
              title="Enter the build arena."
            />
            <Reveal delay={0.1}>
              <p className="max-w-xl text-lg leading-relaxed text-white">
                MATRIX Vibe Coding 2.0 is a technology event hosted by the
                MATRIX community at JEC. Student teams from colleges across the
                country team up to turn real problem statements into working
                products, using modern stacks and AI-assisted development.
              </p>
              <p className="mt-5 max-w-xl leading-relaxed text-white">
                Expect a build round, mentors on call, and a live finale, with a
                ₹6K+ prize pool for the teams that ship the best ideas.
              </p>
            </Reveal>
          </div>
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"
            style={{ perspective: 1200 }}
          >
            {ABOUT.map((a, i) => (
              <Reveal key={a.code} delay={i * 0.1}>
                <TiltCard className="p-6">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-semibold text-white">
                      {a.title}
                    </h3>
                    <span className="font-mono text-xs tracking-widest text-cyan-300/70">
                      {a.code}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-sky-100/65">
                    {a.text}
                  </p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Events() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section id="events" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          kicker="Event modules"
          title="Three ways to compete and level up."
        />
        <div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          style={{ perspective: 1200 }}
        >
          {EVENTS.map((e, i) => (
            <Reveal key={e.code} delay={(i % 3) * 0.1}>
              <TiltCard
                className="h-full cursor-pointer overflow-hidden p-6"
                max={12}
                onClick={() => setOpen(open === e.code ? null : e.code)}
              >
                {[12, 32, 55, 78, 90].map((l, k) => (
                  <span
                    key={k}
                    className="spark"
                    style={{
                      left: `${l}%`,
                      bottom: "18%",
                      animationDelay: `${k * 0.25}s`,
                    }}
                  />
                ))}
                <div className="flex items-center justify-between font-mono text-[0.65rem] tracking-[0.25em] text-cyan-300/70">
                  <span>{e.code}</span>
                  <span className="rounded border border-cyan-400/30 px-2 py-0.5">
                    {open === e.code ? "OPEN" : "ACTIVE"}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-bold tracking-wide text-white">
                  {e.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-sky-100/65">
                  {e.text}
                </p>
                <AnimatePresence initial={false}>
                  {open === e.code && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-4 text-sm leading-relaxed text-cyan-100/80"
                    >
                      {e.more}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="mt-6 flex flex-wrap gap-2">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-cyan-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.25em] text-cyan-300/60">
                  {open === e.code ? "Tap to collapse −" : "Tap for details +"}
                </p>
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
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          align="center"
          kicker="Mission workflow"
          title="From registration to build."
          sub="Four stages. One pipeline. Scroll to travel through it."
        />
        <Timeline />
      </div>
    </section>
  );
}

function Podium() {
  const order = [PRIZES[1], PRIZES[0], PRIZES[2]];
  const heights = ["h-32 md:h-44", "h-44 md:h-64", "h-24 md:h-36"];
  return (
    <div
      className="mx-auto mt-4 flex max-w-4xl items-end justify-center gap-3 md:gap-6"
      style={{ perspective: 1000 }}
    >
      {order.map((p, i) => (
        <Reveal key={p.place} delay={i === 1 ? 0 : 0.15} className="flex-1">
          <motion.div
            whileHover={{ y: -8 }}
            className="flex flex-col items-center text-center"
          >
            <Trophy
              tone={p.tone}
              className={i === 1 ? "h-28 md:h-44" : "h-20 md:h-32"}
            />
            <p
              className="mt-3 font-mono text-[0.65rem] tracking-[0.3em]"
              style={{ color: p.tone }}
            >
              {p.name.toUpperCase()}
            </p>
            <p className="mt-1 text-lg font-bold text-white md:text-3xl [text-shadow:0_0_20px_rgba(0,255,102,0.4)]">
              {p.amount}
            </p>
            <div
              className={`relative mt-4 w-full ${heights[i]} overflow-hidden rounded-t-xl border border-b-0 border-[#00D9FF]/30 bg-gradient-to-b from-[#00D9FF]/15 via-[#0A3D24]/40 to-transparent`}
              style={{
                transform: "rotateX(8deg)",
                transformOrigin: "bottom",
                boxShadow: `0 -10px 50px -18px ${p.tone}`,
              }}
            >
              <span
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: p.tone, boxShadow: `0 0 16px ${p.tone}` }}
              />
              <span className="display absolute inset-0 grid place-items-center text-4xl text-white/10 md:text-7xl">
                {p.place}
              </span>
            </div>
          </motion.div>
        </Reveal>
      ))}
    </div>
  );
}

function Prizes() {
  return (
    <section id="prizes" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[60vmin] w-[60vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,255,102,0.12),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl">
        <SectionTitle
          align="center"
          kicker="Championship"
          title="₹6K+ in prizes."
          sub="The podium is waiting. Ship something remarkable."
        />
        <Podium />
        <Reveal delay={0.2}>
          <div className="glass hud-corners relative mx-auto mt-16 max-w-md p-6 text-center">
            <p className="hud-label">Total Prize Pool</p>
            <p className="mt-2 text-4xl font-bold text-white [text-shadow:0_0_24px_rgba(0,255,102,0.5)] md:text-5xl">
              {TOTAL_PRIZE_POOL}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ContactInfo() {
  const c = EVENT.contact;
  return (
    <section id="find-us" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          kicker="Find us"
          title="Open a channel."
          sub="Prefer email or social? Reach the organizers here."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Reveal>
            <div className="glass h-full p-6">
              <p className="hud-label">Email</p>
              <a
                href={`mailto:${c.email}`}
                className="mt-2 block break-words text-lg text-white hover:text-cyan-200"
              >
                {c.email}
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="glass h-full p-6">
              <p className="hud-label">Location</p>
              <p className="mt-2 text-lg text-white">{c.location}</p>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="glass h-full p-6">
              <p className="hud-label">Social</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#00D9FF]/25 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-slate-200 transition-all hover:border-[#00D9FF] hover:shadow-[0_0_20px_-4px_#00D9FF]"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="glass h-full p-6">
              <p className="hud-label">Event organizers</p>
              <ul className="mt-3 divide-y divide-cyan-400/10">
                {c.organizers.map((o) => (
                  <li
                    key={o.role}
                    className="flex justify-between gap-4 py-2.5 text-sm"
                  >
                    <span className="text-white">{o.role}</span>
                    <span className="text-sky-200/60">{o.team}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
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
        <Events />
        <Workflow />
        <Prizes />
        <SpecialPrize />
        <AnnouncementsSection />
        <ProblemsSection />
        <WhatsAppContacts />
        <ContactInfo />
      </main>
      <Footer />
    </div>
  );
}
