import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";

const GAMES = [
  {
    code: "G-01",
    title: "CHILLY SHOT",
    description:
      "A question lands on two participants. Answer wrong, and the shot is yours — chilli sauce, a lemon shot, or whatever's on the tray.",
    details:
      "A quick, light-hearted head-to-head round between build sessions. Take the question, make your call, and let the room decide.",
    tags: ["On-stage", "No mercy"],
  },
  {
    code: "G-02",
    title: "OPEN QUIZ",
    description:
      "Open floor, open mic. Whoever answers first and right walks off with a small prize — no teams, no turns.",
    details:
      "Listen for the question, buzz in by raising your hand, and give your answer. The host confirms the winner before the next question.",
    tags: ["Open floor", "Fastest wins"],
  },
  {
    code: "G-03",
    title: "TECH OR BULLSHIT?",
    description:
      "Two “facts” about tech, read back to back. One's real, one's made up — call it A or B before the timer runs out.",
    details:
      "Pick which statement is real before time is up. Get it right to score a point; the audience can play along too.",
    tags: ["True or false", "Quickfire"],
  },
];

export default function QuickGames() {
  const [openGame, setOpenGame] = useState<string | null>(null);

  return (
    <section
      id="games"
      aria-labelledby="quick-games-title"
      className="relative px-5 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 max-w-4xl md:mb-14">
          <p className="hud-label mb-4">03 / Crowd games</p>
          <h2
            id="quick-games-title"
            className="display text-[clamp(2.7rem,6.5vw,5.7rem)] leading-[0.98] text-[#F3F0E9]"
          >
            Quick games{" "}
            <span className="text-[#C44552]">between</span> the{" "}
            <span className="text-[#38B878]">builds.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
            Short, loud and open to everyone in the room — these run between
            build sessions to keep the energy up.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, index) => {
            const isOpen = openGame === game.code;
            return (
              <Reveal key={game.code} delay={index * 0.08}>
                <TiltCard className="h-full p-6 md:p-7">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs font-medium tracking-[0.22em] text-[#E08B93]/75">
                        {game.code}
                      </span>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`game-details-${game.code}`}
                        onClick={() => setOpenGame(isOpen ? null : game.code)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#C44552]/30 px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#E08B93] transition-colors hover:bg-[#C44552]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C44552]"
                      >
                        {isOpen ? "Close" : "Details"}
                        <span aria-hidden className="text-sm leading-none">
                          {isOpen ? "−" : "⌄"}
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-8 text-2xl font-bold tracking-tight text-white md:text-[1.7rem]">
                      {game.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                      {game.description}
                    </p>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.p
                          id={`game-details-${game.code}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-4 text-sm leading-relaxed text-slate-400"
                        >
                          {game.details}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div className="mt-auto flex flex-wrap gap-2 pt-7">
                      {game.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#C44552]/25 bg-[#C44552]/[0.06] px-3 py-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.12em] text-[#E8B2B7]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
