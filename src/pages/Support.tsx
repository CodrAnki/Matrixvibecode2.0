import PageShell from "../components/PageShell";
import ContactList from "../components/ContactList";
import Reveal from "../components/Reveal";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../data/event";

export default function Support() {
  return (
    <PageShell
      kicker="Support"
      title={<>Questions? <span className="hl-green">Ask MATRIX.</span></>}
      sub="Registration, problem statements or anything else about Vibe Coding 2.0. MATRIX club members are on hand to answer your queries on WhatsApp, or reach the club on Instagram."
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal>
          <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
            WhatsApp a club member
          </p>
          <ContactList />
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
            Instagram
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass holo-card group block p-6 outline-none focus-visible:ring-1 focus-visible:ring-[#38B878]/50 md:p-8"
          >
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">
              MATRIX, JEC
            </span>
            <span className="display mt-3 block break-words text-3xl text-[#F3F0E9] transition-colors group-hover:text-[#70D6A2] md:text-4xl">
              {INSTAGRAM_HANDLE}
            </span>
            <span className="mt-4 block text-sm leading-relaxed text-slate-400">
              Follow for event updates, or send us a DM.
            </span>
            <span className="mt-6 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-300 transition-colors group-hover:text-[#70D6A2]">
              Open Instagram <span aria-hidden>↗</span>
            </span>
          </a>
        </Reveal>
      </div>
    </PageShell>
  );
}
