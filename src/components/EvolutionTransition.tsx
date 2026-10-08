import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useMediaQuery } from "../hooks/useMediaQuery";

const RED = "#C44552";
const GREEN = "#38B878";
const TICKS = Array.from({ length: 11 }, (_, i) => i * 10);
const ramp = (v: number, from: number, to: number) => Math.min(1, Math.max(0, (v - from) / (to - from)));

/** A version numeral drawn as a permanent outline with a solid fill wiped over it, so it never
 *  passes through a washed-out half-opacity state. */
function Numeral({ text, color, clip, size = "text-[clamp(4.5rem,17vw,14rem)]" }: { text: string; color: string; clip: MotionValue<string> | string; size?: string }) {
  const cls = `display block select-none ${size} leading-[0.82] tracking-[-0.06em]`;
  return (
    <span className="relative inline-block" aria-label={text}>
      <span aria-hidden className={`${cls} text-transparent`} style={{ WebkitTextStroke: `1.5px ${color}` }}>
        {text}
      </span>
      <motion.span aria-hidden className={`${cls} absolute inset-0`} style={{ color, clipPath: clip }}>
        {text}
      </motion.span>
    </span>
  );
}

function Tick({ head, at, vertical = false }: { head: MotionValue<number>; at: number; vertical?: boolean }) {
  const opacity = useTransform(head, [at - 1, at], [0.22, 1]);
  const major = at % 50 === 0;
  const color = at < 50 ? RED : at > 50 ? GREEN : "#F3F0E9";
  return (
    <motion.span
      aria-hidden
      className={
        vertical
          ? `absolute left-1/2 h-px -translate-x-1/2 -translate-y-1/2 ${major ? "w-4" : "w-2"}`
          : `absolute top-1/2 w-px -translate-x-1/2 -translate-y-1/2 ${major ? "h-4" : "h-2"}`
      }
      style={{ [vertical ? "top" : "left"]: `${at}%`, background: color, opacity }}
    />
  );
}

/**
 * Pinned, scroll-scrubbed hand-over from 1.0 to 2.0. The section pins for a fixed stretch of
 * scroll; across it 1.0's fill drains, a version rail ticks from v1.0 to v2.0, then 2.0 fills in.
 * Scrubbing back up reverses everything.
 */
export default function EvolutionTransition() {
  const reduce = useReducedMotion();
  const narrow = useMediaQuery("(max-width: 767px)");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Light smoothing only: wheel input is already eased by Lenis, this mainly evens out touch.
  const p = useSpring(scrollYProgress, { stiffness: 220, damping: 36, restDelta: 0.001 });

  // Entry runs while the section rises into view (before it pins); exit while it scrolls away.
  // The graph-paper surface fades in from the 3D scene first, then the content arrives on it;
  // on exit the content leaves first, then the surface dissolves back into the scene.
  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const { scrollYProgress: leave } = useScroll({ target: ref, offset: ["end end", "end start"] });
  const surfaceOpacity = useTransform([enter, leave], ([a, b]: number[]) =>
    Math.min(ramp(a, 0, 0.6), 1 - ramp(b, 0.4, 1)),
  );
  const contentOpacity = useTransform([enter, leave], ([a, b]: number[]) =>
    Math.min(ramp(a, 0.4, 0.95), 1 - ramp(b, 0, 0.5)),
  );
  const contentY = useTransform([enter, leave], ([a, b]: number[]) =>
    (1 - ramp(a, 0.4, 1)) * 70 - ramp(b, 0, 0.6) * 50,
  );

  // 0–0.1 hold on 1.0 · 0.1–0.5 drain 1.0 · 0.5–0.9 fill 2.0 · 0.9–1 hold on 2.0
  const head = useTransform(p, [0.1, 0.9], [0, 100]);
  const complete = useMotionValue(100);
  const oldClip = useTransform(p, [0.1, 0.5], ["inset(0% 0% 0% 0%)", "inset(0% 100% 0% 0%)"]);
  const newClip = useTransform(p, [0.5, 0.9], ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"]);
  const oldClipV = useTransform(p, [0.1, 0.5], ["inset(0% 0% 0% 0%)", "inset(100% 0% 0% 0%)"]);
  const newClipV = useTransform(p, [0.5, 0.9], ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)"]);
  const redWidth = useTransform(head, (v) => `${Math.min(v, 50)}%`);
  const greenWidth = useTransform(head, (v) => `${Math.max(v - 50, 0)}%`);
  const headLeft = useTransform(head, (v) => `${v}%`);
  const headColor = useTransform(head, (v) => (v < 50 ? RED : GREEN));
  const version = useTransform(head, (v) => `v${(1 + Math.round(v / 10) / 10).toFixed(1)}`);

  return (
    <section
      ref={ref}
      aria-label="The evolution from Vibe Coding 1.0 to 2.0"
      className={reduce ? "relative" : "relative h-[240vh]"}
    >
      <div className={`relative overflow-hidden ${reduce ? "" : "sticky top-0 h-[100svh]"}`}>
        {/* Feathered top and bottom edges so the surface blends into the 3D scene rather than
            sweeping across it as a hard-edged slab. */}
        <motion.div
          aria-hidden
          className="grid-surface absolute inset-0 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]"
          style={{ opacity: reduce ? 1 : surfaceOpacity }}
        />
        <motion.div
          className="relative flex h-full items-center px-5 py-16 md:px-10 md:py-20"
          style={reduce ? undefined : { opacity: contentOpacity, y: contentY }}
        >
        {narrow ? (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: RED }}>
            Vibe Coding 1.0 / 25 Jul 2025
          </span>
          <div className="mt-3">
            <Numeral text="1.0" color={RED} size="text-[min(30vw,15svh)]" clip={reduce ? "inset(100% 0% 0% 0%)" : oldClipV} />
          </div>

          <div className="relative my-5 h-[18svh] w-10">
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/[0.08]" />
            <motion.span
              className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2"
              style={{ height: reduce ? "50%" : redWidth, background: RED }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 w-[2px] -translate-x-1/2"
              style={{ height: reduce ? "50%" : greenWidth, background: GREEN }}
            />
            {TICKS.map((at) => (
              <Tick key={at} vertical head={reduce ? complete : head} at={at} />
            ))}
            <span className="absolute right-full top-0 mr-4 -translate-y-1/2 font-mono text-[0.55rem] tracking-[0.2em] text-slate-500">v1.0</span>
            <span className="absolute bottom-0 right-full mr-4 translate-y-1/2 font-mono text-[0.55rem] tracking-[0.2em] text-slate-500">v2.0</span>

            <motion.div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ top: reduce ? "100%" : headLeft }}
            >
              <motion.span
                className="block h-3 w-3 rotate-45 border-2 bg-[#090909]"
                style={{ borderColor: reduce ? GREEN : headColor }}
              />
              <motion.span
                className="absolute left-full top-1/2 ml-4 -translate-y-1/2 border bg-[#090909] px-2 py-1 font-mono text-[0.6rem] tracking-[0.14em]"
                style={{ color: reduce ? GREEN : headColor, borderColor: reduce ? GREEN : headColor }}
              >
                {reduce ? "v2.0" : version}
              </motion.span>
            </motion.div>
          </div>

          <Numeral text="2.0" color={GREEN} size="text-[min(30vw,15svh)]" clip={reduce ? "inset(0% 0% 0% 0%)" : newClipV} />
          <span className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: GREEN }}>
            Vibe Coding 2.0 / 14 Oct 2026
          </span>

          <p className="mt-8 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-slate-300">
            The idea, then the <span style={{ color: GREEN }}>next step.</span>
          </p>
        </div>
        ) : (
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-2 gap-4 font-mono text-[0.58rem] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.24em]">
            <span style={{ color: RED }}>Vibe Coding 1.0 / 25 Jul 2025</span>
            <span className="text-right" style={{ color: GREEN }}>Vibe Coding 2.0 / 14 Oct 2026</span>
          </div>

          <div className="mt-4 grid grid-cols-2 items-end gap-4">
            <Numeral text="1.0" color={RED} clip={reduce ? "inset(0% 100% 0% 0%)" : oldClip} />
            <div className="text-right">
              <Numeral text="2.0" color={GREEN} clip={reduce ? "inset(0% 0% 0% 0%)" : newClip} />
            </div>
          </div>

          <div className="relative mx-6 mt-12 h-10 md:mt-16">
            <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/[0.08]" />
            <motion.span
              className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2"
              style={{ width: reduce ? "50%" : redWidth, background: RED }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 h-[2px] -translate-y-1/2"
              style={{ width: reduce ? "50%" : greenWidth, background: GREEN }}
            />
            {TICKS.map((at) => (
              <Tick key={at} head={reduce ? complete : head} at={at} />
            ))}

            <motion.div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: reduce ? "100%" : headLeft }}
            >
              <motion.span
                className="block h-3 w-3 rotate-45 border-2 bg-[#090909]"
                style={{ borderColor: reduce ? GREEN : headColor }}
              />
              <motion.span
                className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 border bg-[#090909] px-2 py-1 font-mono text-[0.62rem] tracking-[0.14em]"
                style={{ color: reduce ? GREEN : headColor, borderColor: reduce ? GREEN : headColor }}
              >
                {reduce ? "v2.0" : version}
              </motion.span>
            </motion.div>
          </div>

          <div className="mx-6 mt-2 flex justify-between font-mono text-[0.58rem] tracking-[0.2em] text-slate-500">
            <span>v1.0</span>
            <span>v2.0</span>
          </div>

          <p className="mt-10 text-center font-mono text-[0.62rem] uppercase tracking-[0.24em] text-slate-300 sm:text-xs sm:tracking-[0.3em]">
            The idea, then the <span style={{ color: GREEN }}>next step.</span>
          </p>
        </div>
        )}
        </motion.div>
      </div>
    </section>
  );
}
