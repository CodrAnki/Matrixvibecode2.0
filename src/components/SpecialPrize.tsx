import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";
import { useRegistrationOpen } from "../lib/eventPhase";
import { useAuth } from "../context/AuthContext";

/**
 * "Special Prize for First Year", styled as an admission ticket: a stub carrying the award code,
 * a perforated divider, and the body. Sits directly under the prize leaderboard and shares its
 * card surface so the two read as one championship block.
 */
export default function SpecialPrize() {
  const registrationOpen = useRegistrationOpen();
  const { team } = useAuth();
  return (
    <section
      id="special-prize"
      aria-label="Special Prize for First Year"
      className="relative px-5 pb-28 md:px-10 md:pb-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="glass holo-card relative grid overflow-hidden md:grid-cols-[minmax(0,17rem)_1fr]">
            <div className="relative flex flex-col justify-between gap-8 border-b border-dashed border-white/15 p-6 md:border-b-0 md:border-r md:p-8">
              <div className="flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-[0.22em]">
                <span className="text-[#C44552]">Special award</span>
                <span className="text-white/35">SA-Y1</span>
              </div>
              <p
                aria-hidden
                className="display select-none text-[7rem] leading-[0.8] text-transparent md:text-[8.5rem]"
                style={{ WebkitTextStroke: "1.5px rgba(196,69,82,0.75)" }}
              >
                Y1
              </p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-slate-400">
                Admits first-year teams only
              </p>
            </div>

            <div className="flex flex-col justify-center p-6 md:p-10">
              <p className="hud-label mb-4">Exclusive award</p>
              <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] text-[#F3F0E9]">
                Special Prize for <span className="hl-red">First Year</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
                A prize created exclusively for First Year participants and teams. If you are in your
                first year, this one is all yours to win. Build boldly and show what a first-year
                team can ship.
              </p>
              {/* Already-registered teams never see a "register" prompt here, whether or not
                  registration is still open. */}
              {!team && registrationOpen && (
                <div className="mt-8">
                  <MagneticButton to="/register" variant="solid">
                    Register your team →
                  </MagneticButton>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
