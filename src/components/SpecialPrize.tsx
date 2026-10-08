import { motion, useReducedMotion } from "framer-motion";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";
import Trophy from "./Trophy";
import MagneticButton from "./MagneticButton";
import { useMediaQuery } from "../hooks/useMediaQuery";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Standalone "Special Prize for First Year" section. Sits directly under the Prize Pool section
 * (the negative top margin cancels most of the Prize Pool's bottom padding so the two read as
 * neighbours). Uses the site's glass/3D card system with restrained red accents.
 */
export default function SpecialPrize() {
  const narrow = useMediaQuery("(max-width: 767px)");
  const shouldReduceMotion = useReducedMotion();
  return (
    <section
      id="special-prize"
      aria-label="Special Prize for First Year"
      className="relative -mt-14 px-5 pb-28 md:-mt-20 md:px-10 md:pb-36"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmin] w-[70vmin] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,69,82,0.12),rgba(196,69,82,0.06)_45%,transparent_70%)] blur-xl" />
      <div className="relative mx-auto max-w-5xl" style={{ perspective: 1200 }}>
        <Reveal>
          <TiltCard
            className="!bg-[linear-gradient(145deg,rgba(15,15,17,0.98),rgba(6,6,8,0.98)_60%,rgba(12,12,14,0.98))] p-6 shadow-[0_16px_48px_-28px_rgba(0,0,0,0.9),0_0_36px_-24px_rgba(196,69,82,0.24)] sm:p-8 md:p-12"
            max={narrow ? 3 : 6}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(196,69,82,0.08),transparent_65%)]" />
              <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(196,69,82,0.06),transparent_65%)]" />
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C44552]/70 to-transparent" />
            </div>

            <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
              <motion.div
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, delay: 0.15, ease }}
                className="relative mx-auto grid h-44 w-44 place-items-center sm:h-52 sm:w-52 md:h-60 md:w-60"
              >
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(196,69,82,0.14),rgba(196,69,82,0.06)_50%,transparent_72%)] blur-md" />
                <div className="pointer-events-none absolute inset-3 rounded-full border border-[#C44552]/15" />
                <div className="pointer-events-none absolute inset-8 rounded-full border border-[#F4F4F5]/12" />
                <Trophy
                  tone="#C44552"
                  className="logo-float relative z-10 h-28 sm:h-32 md:h-40"
                />
              </motion.div>

              <div className="min-w-0 text-center md:text-left">
                <p className="hud-label mb-4 flex items-center justify-center gap-3 md:justify-start">
                  <span className="blink h-2 w-2 rounded-full bg-[#C44552] shadow-[0_0_10px_#C44552]" />
                  Exclusive award
                </p>
                <h2 className="display break-words text-[clamp(1.9rem,5vw,3.4rem)] leading-[1.05]">
                  <span aria-hidden></span>{" "}
                  <span className="text-grad">
                    Special Prize for First Year
                  </span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-100/75 md:mx-0 md:text-lg">
                  A prize created exclusively for First Year participants and
                  teams. If your squad is in its first year, this one is all
                  yours to win. Build boldly and show what a first-year team can
                  ship.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                  {["First Year Only", "Special Award"].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[#C44552]/30 bg-[#C44552]/5 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-[#F2C9CC]"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-red-200">
                    For 1st Year Teams
                  </span>
                </div>
                <div className="mt-8">
                  <MagneticButton to="/register" variant="solid">
                    Register your team →
                  </MagneticButton>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
