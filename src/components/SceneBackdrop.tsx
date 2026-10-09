import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { detectTier, type Tier } from "../lib/capabilities";

const MatrixScene = lazy(() => import("../scenes/MatrixScene"));

export function StaticBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-void">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,69,82,0.22),rgba(196,69,82,0.1)_45%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#3A0B12]/25 to-transparent" />
    </div>
  );
}

class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("3D scene disabled:", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function SceneBackdrop({
  variant = "hero",
  className = "",
}: {
  variant?: "hero" | "auth";
  className?: string;
}) {
  const [tier, setTier] = useState<Tier | null>(null);
  useEffect(() => setTier(detectTier()), []);
  if (tier === null)
    return (
      <div className={className}>
        <StaticBackdrop />
      </div>
    );
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      {tier === "none" ? (
        <StaticBackdrop />
      ) : (
        <Boundary fallback={<StaticBackdrop />}>
          <Suspense fallback={<StaticBackdrop />}>
            <MatrixScene tier={tier} variant={variant} />
          </Suspense>
        </Boundary>
      )}
    </div>
  );
}
