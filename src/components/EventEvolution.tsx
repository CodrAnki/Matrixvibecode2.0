import Reveal from "./Reveal";

const FIRST_EVENT = [
  "20 minutes to plan before building starts.",
  "4 hours of building a problem-solving website with AI and web tools.",
  "Shortlisted teams demoed to mentors and judges.",
];

export default function EventEvolution() {
  return (
    <section
      id="event-evolution"
      aria-label="From Vibe Coding 1.0 to 2.0"
      className="event-evolution relative isolate overflow-hidden px-5 py-24 md:px-10 md:py-32"
    >
      <div className="relative z-0 mx-auto max-w-7xl">
        <Reveal className="mb-16">
          <div className="flex items-center justify-between gap-4 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500 sm:text-xs sm:tracking-[0.25em]">
            <span>04 / Vibe Coding 1.0</span>
            <span className="text-right">Vibe Coding 2.0 / MATRIX JEC</span>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mb-16">
          <div className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
            <h2 className="display text-[clamp(3.4rem,9vw,7rem)] leading-[0.88] text-[#F3F0E9]">
              From <span className="text-[#C44552]">1.0</span>
              <br />
              to <span className="text-[#38B878]">2.0.</span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-slate-400 md:justify-self-end md:pb-2 md:text-lg">
              1.0 established the idea. 2.0 takes it further.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-12 border-t border-white/[0.1] pt-10 md:grid-cols-2 md:gap-16 md:pt-12">
          <Reveal>
            <article>
              <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
                Event 01 / 25 Jul 2025
              </p>
              <h3 className="display text-4xl text-[#F3F0E9] sm:text-5xl md:text-6xl">
                Vibe Coding
              </h3>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
                The first Vibe Coding, organised by MATRIX at JEC. Students from
                all branches took part and shortlisted teams presented their
                projects to an evaluation panel of faculty.
              </p>
              <p className="mt-6 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Jashan Auditorium, JEC
              </p>

              <div className="mt-10 grid max-w-xl grid-cols-2 border-t border-white/[0.1] pt-6">
                <div className="pr-4 sm:pr-8">
                  <p className="text-[clamp(3.5rem,8vw,5.5rem)] font-bold leading-none tracking-[-0.07em] text-[#C44552]">
                    150
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-200 sm:text-base">
                    Students took part
                  </p>
                  <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">
                    From all branches
                  </p>
                </div>
                <div className="border-l border-white/[0.1] pl-4 sm:pl-8">
                  <p className="text-[clamp(3.5rem,8vw,5.5rem)] font-bold leading-none tracking-[-0.07em] text-[#C44552]">
                    19
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-200 sm:text-base">
                    Teams shortlisted and presented
                  </p>
                  <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">
                    To a faculty evaluation panel
                  </p>
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="md:pt-1">
              <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
                How 1.0 ran
              </p>
              <ol className="border-t border-white/[0.12]">
                {FIRST_EVENT.map((item, index) => (
                  <li
                    key={item}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-b border-white/[0.12] py-5 sm:gap-8"
                  >
                    <span className="font-mono text-sm text-[#C44552]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base leading-relaxed text-slate-200 md:text-lg">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 border-l-2 border-[#38B878] py-1 pl-5 sm:pl-6">
                <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#38B878]">
                  Now: 2.0
                </p>
                <p className="text-lg leading-relaxed text-slate-100 md:text-xl">
                  Solo or duo, with the problem statement revealed on the day.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
