import { motion, useReducedMotion } from "framer-motion";

export default function EvolutionTransition() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-label="The evolution from Vibe Coding 1.0 to 2.0"
      className="relative isolate overflow-hidden border-y border-white/[0.06] px-5 py-16 md:px-10 md:py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),radial-gradient(ellipse_at_72%_58%,rgba(56,184,120,0.08),transparent_34%),radial-gradient(ellipse_at_22%_52%,rgba(196,69,82,0.07),transparent_32%)] bg-[size:72px_72px,72px_72px,auto,auto]"
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#C44552]/70 sm:text-xs sm:tracking-[0.22em]"
          >
            Vibe Coding 1.0 / 25 Jul 2025
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, delay: shouldReduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="text-right font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#38B878] sm:text-xs sm:tracking-[0.22em]"
          >
            Vibe Coding 2.0 / 14 Oct 2026
          </motion.div>
        </div>

        <div className="mt-2 grid grid-cols-2 items-center gap-4 sm:mt-0">
          <motion.p
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -36 }}
            whileInView={{ opacity: shouldReduceMotion ? 0.3 : [0, 1, 0.3], x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              opacity: { duration: shouldReduceMotion ? 0.2 : 1.8, times: [0, 0.3, 1] },
              x: { duration: shouldReduceMotion ? 0.2 : 0.85, ease: [0.22, 1, 0.36, 1] },
            }}
            className="select-none text-[clamp(6rem,26vw,17rem)] font-bold leading-[0.95] tracking-[-0.09em] text-[#C44552]/25"
            aria-label="1.0"
          >
            1.0
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.85, delay: shouldReduceMotion ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="select-none text-right text-[clamp(6rem,26vw,17rem)] font-bold leading-[0.95] tracking-[-0.09em] text-[#38B878]"
            aria-label="2.0"
          >
            2.0
          </motion.p>
        </div>

        <div className="relative mx-auto mt-5 h-px w-[92%] bg-white/[0.14] sm:mt-8">
          <motion.div
            aria-hidden="true"
            initial={shouldReduceMotion ? { width: "68%", backgroundColor: "#38B878" } : { width: "0%", backgroundColor: "#C44552" }}
            whileInView={shouldReduceMotion
              ? { width: "68%", backgroundColor: "#38B878" }
              : { width: ["0%", "68%", "68%"], backgroundColor: ["#C44552", "#C44552", "#38B878"] }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 2,
              delay: shouldReduceMotion ? 0 : 0.25,
              times: [0, 0.68, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-y-0 left-0"
          />
          <motion.span
            aria-hidden="true"
            initial={shouldReduceMotion
              ? { left: "68%", backgroundColor: "#38B878", boxShadow: "0 0 16px rgba(56,184,120,0.7)" }
              : { left: "0%", backgroundColor: "#C44552", boxShadow: "0 0 16px rgba(196,69,82,0.7)" }}
            whileInView={shouldReduceMotion
              ? { left: "68%", backgroundColor: "#38B878", boxShadow: "0 0 16px rgba(56,184,120,0.7)" }
              : {
                  left: ["0%", "68%", "68%"],
                  backgroundColor: ["#C44552", "#C44552", "#38B878"],
                  boxShadow: ["0 0 16px rgba(196,69,82,0.7)", "0 0 16px rgba(196,69,82,0.7)", "0 0 16px rgba(56,184,120,0.7)"],
                }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 2, delay: shouldReduceMotion ? 0 : 0.25, times: [0, 0.68, 1], ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, delay: shouldReduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-slate-400 sm:mt-8 sm:text-xs sm:tracking-[0.28em]"
        >
          The idea, then the next step.
        </motion.p>
      </div>
    </section>
  );
}
