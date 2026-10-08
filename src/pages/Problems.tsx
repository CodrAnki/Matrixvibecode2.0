import PageShell from "../components/PageShell";
import ProblemsGrid from "../components/ProblemsGrid";

export default function Problems() {
  return (
    <PageShell
      kicker="Problem statements"
      title={<>Pick your <span className="hl-green">challenge.</span></>}
      sub="Every published brief for Vibe Coding 2.0. Tap a card to read the full statement, constraints and formats."
    >
      <ProblemsGrid />
    </PageShell>
  );
}
