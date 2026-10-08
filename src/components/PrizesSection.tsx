import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";
import { PRIZES, TOTAL_PRIZE_POOL } from "../data/event";

type Prize = (typeof PRIZES)[number];

const value = (p: Prize) => Number(p.amount.replace(/[^\d]/g, ""));
const POOL = PRIZES.reduce((sum, p) => sum + value(p), 0);

/** Signal-strength style rank mark: three bars, the top rank lights all three. */
function RankBars({ rank, tone }: { rank: number; tone: string }) {
  const lit = PRIZES.length + 1 - rank;
  return (
    <span className="flex items-end gap-[3px]" aria-hidden>
      {[6, 10, 14].map((h, i) => (
        <span
          key={h}
          className="w-[4px]"
          style={{ height: h, background: i < lit ? tone : "rgba(255,255,255,0.12)" }}
        />
      ))}
    </span>
  );
}

function PrizeCard({ prize, rank }: { prize: Prize; rank: number }) {
  const lead = rank === 1;
  const share = Math.round((value(prize) / POOL) * 100);
  const code = String(rank).padStart(2, "0");

  return (
    <div
      className={`glass holo-card relative flex h-full flex-col overflow-hidden ${lead ? "p-6 md:p-9" : "p-6 md:p-7"}`}
      style={lead ? { borderColor: "rgba(196,69,82,0.4)" } : undefined}
    >
      {lead && <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C44552]" />}
      {lead && (
        <span
          aria-hidden
          className="display pointer-events-none absolute -bottom-6 -right-2 select-none text-[11rem] leading-none text-transparent md:text-[15rem]"
          style={{ WebkitTextStroke: "1px rgba(255,255,255,0.06)" }}
        >
          {code}
        </span>
      )}

      <div className="relative flex items-center justify-between font-mono text-[0.62rem] tracking-[0.22em]">
        <span className="text-white/45">RANK {code}</span>
        <RankBars rank={rank} tone={prize.tone} />
      </div>

      <p className="relative mt-auto pt-10 font-mono text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: prize.tone }}>
        {prize.name}
      </p>
      <p
        className={`display relative mt-2 text-[#F3F0E9] ${lead ? "text-[clamp(3.6rem,10vw,7rem)]" : "text-[clamp(2.6rem,6vw,3.6rem)]"}`}
      >
        {prize.amount}
      </p>

      <div className="relative mt-6">
        <div className="flex justify-between font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">
          <span>Share of pool</span>
          <span className="text-slate-300">{share}%</span>
        </div>
        <div className="mt-2 h-[3px] w-full bg-white/[0.07]">
          <div className="h-full" style={{ width: `${share}%`, background: prize.tone }} />
        </div>
      </div>
    </div>
  );
}

export default function PrizesSection() {
  return (
    <section id="prizes" className="relative px-5 pb-10 pt-28 md:px-10 md:pb-12 md:pt-36">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            index="05"
            kicker="Championship"
            title={<><span className="hl-green">₹6K+</span> in prizes.</>}
            sub="Three places on the leaderboard. Ship something remarkable."
          />
          <Reveal delay={0.1} className="mb-12 shrink-0 border-l border-white/10 pl-5 lg:text-right lg:border-l-0 lg:border-r lg:pl-0 lg:pr-5">
            <p className="hud-label">Total pool</p>
            <p className="display mt-2 text-5xl text-[#F3F0E9]">{TOTAL_PRIZE_POOL}</p>
            <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-slate-500">
              {PRIZES.length} places · 1 special award
            </p>
          </Reveal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {PRIZES.map((p, i) => (
            <Reveal
              key={p.place}
              delay={i * 0.1}
              className={i === 0 ? "h-full md:col-span-2 lg:col-span-7 lg:row-span-2" : "h-full lg:col-span-5"}
            >
              <PrizeCard prize={p} rank={i + 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
