import MagneticButton from "./MagneticButton";

/** Bottom-of-home prompt. The list of club members answering queries lives on the /support page. */
export default function SupportCta() {
  return (
    <section
      id="contact"
      aria-label="Contact support"
      className="relative isolate overflow-hidden px-5 py-24 md:px-10 md:py-32"
    >
      {/* Top edge feathered into the 3D scene; the bottom meets the footer at its rule line. */}
      <div
        aria-hidden
        className="grid-surface grid-surface-soft pointer-events-none absolute inset-0 -z-10 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_22%)] [mask-image:linear-gradient(to_bottom,transparent,black_22%)]"
      />
      <div className="relative z-0 mx-auto grid max-w-7xl items-end gap-8 md:grid-cols-2 md:gap-12">
        <h2 className="display text-[clamp(2.8rem,7vw,6rem)] leading-[0.94] text-[#F3F0E9]">
          Questions?
          <br />
          <span className="text-[#38B878]">Ask MATRIX.</span>
        </h2>
        <div className="md:justify-self-end md:pb-2">
          <p className="max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
            Registration, problem statements or anything else about Vibe Coding
            2.0. MATRIX club members are on hand to answer your queries on
            WhatsApp, or reach the club on Instagram.
          </p>
          <div className="mt-7">
            <MagneticButton to="/support" variant="solid">
              Contact support →
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
