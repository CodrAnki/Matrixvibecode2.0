import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, Award, CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HeroScene from "../components/SceneBackdrop";
import SiteBackground from "../components/SiteBackground";
import SmoothScroll from "../components/SmoothScroll";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Countdown from "../components/Countdown";
import AnnouncementsSection from "../components/AnnouncementsSection";
import ProblemsSection from "../components/ProblemsSection";
import OrganizerContacts from "../components/OrganizerContacts";
import { LOGO_SRC } from "../components/Logo";
import { scrollToTarget } from "../lib/smoothScroll";
import {
  ARCHIVE,
  DETAILS,
  EVENT,
  EVENTS,
  FIRST_FORMAT,
  IMPACT,
  PRIZES,
  REASONS,
  TOTAL_PRIZE_POOL,
  WORKFLOW,
} from "../data/event";

const ease = [0.22, 1, 0.36, 1] as const;
const section = "relative px-5 py-24 md:px-10 md:py-32";

/** One line of the headline, revealed from behind a mask. */
function Line({ children, i, accent = false }: { children: string; i: number; accent?: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className={`block ${accent ? "text-accent" : "text-paper"}`}
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

const goTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) scrollToTarget(el);
};

function Hero() {
  return (
    <section id="home" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      {/* The only 3D on the site. Above the headline on mobile, behind it on desktop. */}
      <HeroScene className="absolute inset-x-0 top-0 h-[44svh] lg:inset-0 lg:h-auto" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0A0B0A_0%,rgba(10,11,10,0.55)_45%,transparent_75%)] max-lg:hidden" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/80 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-8 pt-[38svh] md:px-10 lg:pt-28">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.1 }} className="mb-5 flex items-center gap-3">
          <img src={LOGO_SRC} alt="" className="h-7 w-auto" />
          <span className="meta text-paper">MATRIX / JEC <span className="text-silver">presents</span></span>
        </motion.div>

        <h1 className="display text-[clamp(3.1rem,9.2vw,8.5rem)] leading-[0.88]" aria-label="Vibe Coding 2.0">
          <Line i={0}>Vibe Coding</Line>
          <Line i={1} accent>2.0</Line>
        </h1>

        <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8, ease }}>
            <p className="max-w-xl text-lg leading-relaxed text-paper/85 md:text-xl">{EVENT.sub}</p>
            <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-paper">
              <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" strokeWidth={1.75} /><span className="meta !text-paper">14 October 2026</span></li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" strokeWidth={1.75} /><span className="meta !text-paper">JEC Campus, Jabalpur</span></li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" strokeWidth={1.75} /><span className="meta !text-paper">Solo or duo</span></li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.95, ease }} className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/register" className="btn btn-solid btn-lg">Register now <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
            <a href="#how" onClick={goTo("how")} className="btn btn-lg">How it works</a>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 1.2 }} className="mt-9 flex flex-wrap items-center justify-between gap-5 border-t border-white/15 pt-5">
          <div>
            <p className="meta !text-accent">Event starts in</p>
          </div>
          <Countdown />
        </motion.div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section id="event" className={section}>
      <div className="mx-auto max-w-7xl">
        <SectionHead index="01" label="The event" title={<>What is<br />Vibe Coding 2.0?</>} />
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <Reveal>
            <p className="font-display text-[clamp(1.5rem,2.8vw,2.3rem)] font-bold leading-[1.15] tracking-[-0.02em] text-paper">
              A technology event hosted by MATRIX at JEC. Solo participants and duos turn a real problem statement, revealed on the day, into{" "}
              <span className="text-accent">working products</span>, using modern stacks and AI-assisted development.
            </p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-silver">
              Expect a build round, mentors on call, and a live finale, with a {TOTAL_PRIZE_POOL} prize pool for the teams that ship the best ideas.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="meta mb-4">What happens</p>
            <ul className="border-t border-white/15">
              {EVENTS.map((e) => (
                <li key={e.code} className="border-b border-white/15 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-display text-xl font-bold tracking-tight text-paper">{e.title}</p>
                    <span className="meta">{e.code}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-silver">{e.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-20 md:mt-28">
          <Reveal><p className="meta mb-6">Why take part</p></Reveal>
          <ol className="grid border-t border-white/15 md:grid-cols-3">
            {REASONS.map((r, i) => (
              <Reveal key={r.code} delay={i * 0.07}>
                <li className={`h-full border-b border-white/15 py-8 md:border-b-0 md:py-10 ${i > 0 ? "md:border-l md:pl-8" : ""} ${i < 2 ? "md:pr-8" : ""}`}>
                  <span className="font-mono text-sm text-accent">{r.code}</span>
                  <p className="display mt-5 text-[clamp(2.4rem,4.5vw,3.6rem)] text-paper">{r.title}</p>
                  <p className="mt-3 max-w-xs text-base leading-relaxed text-silver">{r.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className={`${section} !pt-0`}>
      <div className="mx-auto max-w-7xl">
        <SectionHead index="03" label="How it works" title={<>From sign-up<br />to showtime.</>}>
          Five steps. Register first; the problem statement and the build happen on the day.
        </SectionHead>
        <ol className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOW.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <li className="h-full border-t border-white/15 py-6">
                <span className="display text-5xl text-paper/25">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-6 font-display text-xl font-bold tracking-tight text-paper">{s.title.charAt(0) + s.title.slice(1).toLowerCase()}</p>
                <p className="mt-2 text-sm leading-relaxed text-silver">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <div className="mt-10">
            <Link to="/register" className="btn btn-solid btn-lg">Start with step 01: register <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Details() {
  return (
    <section id="details" className={section}>
      <div className="mx-auto max-w-7xl">
        <SectionHead index="05" label="Important details" title={<>The details<br />you need.</>} />
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <Reveal>
            <dl className="border-t border-white/15">
              {DETAILS.map((d) => (
                <div key={d.k} className="row-hover grid gap-1 border-b border-white/15 px-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8 md:px-3">
                  <dt className="meta pt-1">{d.k}</dt>
                  <dd className="text-lg text-paper">{d.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <div id="prizes">
              <p className="meta">Prize pool</p>
              <p className="display mt-2 text-[clamp(4.5rem,10vw,8rem)] text-accent">{TOTAL_PRIZE_POOL}</p>
              <ul className="mt-6 border-t border-white/15">
                {PRIZES.map((p) => (
                  <li key={p.place} className="flex items-baseline justify-between gap-6 border-b border-white/15 py-4">
                    <span className="meta">{p.name}</span>
                    <span className="display text-3xl text-paper">{p.amount}</span>
                  </li>
                ))}
              </ul>
              <div id="special-prize" className="mt-6 flex items-start gap-4">
                <Award className="mt-1 h-6 w-6 shrink-0 text-amber" strokeWidth={1.5} />
                <div>
                  <p className="font-display text-lg font-bold tracking-tight text-paper">Special Prize for First Year</p>
                  <p className="mt-1 text-sm leading-relaxed text-silver">Created exclusively for First Year participants and teams.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FirstVibe() {
  return (
    <section id="first-vibe" className={`${section} theme-first`}>
      <div className="mx-auto max-w-7xl">
        <SectionHead index="04" label="Vibe Coding 1.0" title={<>From <span className="text-accent">1.0</span><br />to <span className="theme-second text-accent">2.0.</span></>}>
          1.0 established the idea. 2.0 takes it further.
        </SectionHead>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <Reveal>
            <p className="meta !text-accent">{ARCHIVE.code} / {ARCHIVE.date}</p>
            <h3 className="display mt-3 text-[clamp(2.4rem,5vw,4.2rem)] text-paper">Vibe Coding</h3>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-silver">{ARCHIVE.text}</p>
            <p className="meta mt-5 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />{ARCHIVE.venue}</p>

            <div className="mt-10 grid grid-cols-2 border-t border-white/15">
              {IMPACT.map((s, i) => (
                <div key={s.label} className={`py-6 ${i > 0 ? "border-l border-white/15 pl-6" : "pr-6"}`}>
                  <p className="display text-[clamp(3.4rem,8vw,6rem)] text-accent">{s.value}</p>
                  <p className="mt-3 text-base text-paper">{s.label}</p>
                  <p className="meta mt-1">{s.note}</p>
                </div>
              ))}
            </div>

            <a href={ARCHIVE.source} target="_blank" rel="noreferrer" className="group mt-4 inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-paper">
              <span className="u-link">Read the JEC report</span>
              <ArrowUpRight className="h-4 w-4 text-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="meta mb-4 !text-accent">How 1.0 ran</p>
            <ul className="border-t border-white/15">
              {FIRST_FORMAT.map((t, i) => (
                <li key={t} className="grid grid-cols-[2.4rem_1fr] gap-3 border-b border-white/15 py-4">
                  <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-paper">{t}</span>
                </li>
              ))}
            </ul>
            <div className="theme-second mt-8 border-l-2 border-accent pl-5">
              <p className="meta !text-accent">Now: 2.0</p>
              <p className="mt-2 text-lg leading-relaxed text-paper">Solo or duo, with the problem statement revealed on the day.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * Scroll-linked hand-over from 1.0 (red) to 2.0 (green): the 1.0 numerals fall back as the 2.0 numerals
 * come forward, and a line draws across from red to green. Pure transform/opacity, driven by scroll progress.
 */
function VersionShift() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 85%", "end 35%"] });
  const oldOpacity = useTransform(p, [0, 0.55], [1, 0.18]);
  const oldX = useTransform(p, [0, 1], ["0%", "-8%"]);
  const newOpacity = useTransform(p, [0.3, 0.85], [0.18, 1]);
  const newX = useTransform(p, [0, 1], ["8%", "0%"]);
  const line = useTransform(p, [0.05, 0.9], [0, 1]);
  return (
    <div ref={ref} aria-label="From Vibe Coding 1.0 to Vibe Coding 2.0" role="group" className="relative px-5 py-20 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 items-end gap-4">
          <motion.div style={{ opacity: oldOpacity, x: oldX }} className="theme-first">
            <p className="meta !text-accent">Vibe Coding 1.0 / 25 Jul 2025</p>
            <p className="display mt-2 text-[clamp(4rem,17vw,15rem)] leading-[0.82] text-accent">1.0</p>
          </motion.div>
          <motion.div style={{ opacity: newOpacity, x: newX }} className="theme-second text-right">
            <p className="meta !text-accent">Vibe Coding 2.0 / 14 Oct 2026</p>
            <p className="display mt-2 text-[clamp(4rem,17vw,15rem)] leading-[0.82] text-accent">2.0</p>
          </motion.div>
        </div>
        <div className="relative mt-8 h-px bg-white/15">
          <motion.div style={{ scaleX: line }} className="absolute inset-0 origin-left bg-gradient-to-r from-[#FF0000] to-[#35E884]" />
          <motion.span style={{ left: useTransform(line, (v) => `${v * 100}%`) }} className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#35E884]" />
        </div>
        <p className="meta mt-5 text-center">The idea, then the next step</p>
      </div>
    </div>
  );
}

function Register() {
  return (
    <section id="register" className={`${section} !pb-16 md:!pb-20`}>
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 flex items-center justify-between border-t border-white/15 pt-3">
          <span className="meta">08 / Register</span>
          <span className="meta hidden sm:inline">Vibe Coding 2.0</span>
        </Reveal>
        <Reveal>
          <h2 className="display text-[clamp(3.4rem,11vw,10rem)] text-paper">
            Ready<br />to <span className="text-accent">build?</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <p className="max-w-lg text-lg leading-relaxed text-paper/85">
            Register solo or as a duo and lock in your place for 14 October 2026. The problem statement is revealed on the day.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="btn btn-solid btn-lg">Register for Vibe Coding 2.0 <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
            <Link to="/login" className="btn btn-lg">Team login</Link>
          </div>
        </Reveal>

        <Reveal className="mt-20 grid items-center gap-6 border-t border-white/15 pt-8 md:grid-cols-[auto_1fr] md:gap-8">
          <img src={LOGO_SRC} alt="MATRIX JEC logo" className="h-12 w-auto" />
          <p className="max-w-xl text-silver">
            <span className="text-paper">Organised by MATRIX</span>, the technical community of Jabalpur Engineering College.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="relative">
      <SmoothScroll />
      <SiteBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Intro />
        <ProblemsSection />
        <HowItWorks />
        <FirstVibe />
        <VersionShift />
        <Details />
        <AnnouncementsSection />
        <OrganizerContacts />
        <Register />
      </main>
      <Footer />
    </div>
  );
}
