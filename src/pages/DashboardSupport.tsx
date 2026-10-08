import PageHeader from '../components/PageHeader'
import ContactList from '../components/ContactList'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../data/event'

/**
 * The dashboard's own Support page — same contact content as the public /support page (ContactList,
 * Instagram card), but rendered inside DashboardLayout's sidebar/shell instead of navigating a
 * signed-in team away to the public site's Navbar/Footer/3D-scene page.
 */
export default function DashboardSupport() {
  return (
    <>
      <PageHeader kicker="Support" title="Contact support" sub="Registration, problem statements or anything else about Vibe Coding 2.0 — MATRIX club members are on hand on WhatsApp, or reach the club on Instagram." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="glass hud-corners relative p-6">
          <p className="hud-label mb-5">WhatsApp a club member</p>
          <ContactList />
        </section>

        <section className="glass hud-corners relative p-6">
          <p className="hud-label mb-5">Instagram</p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl border border-white/10 p-5 outline-none transition-colors hover:border-[#38B878]/50 focus-visible:ring-1 focus-visible:ring-[#38B878]/50"
          >
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">MATRIX, JEC</span>
            <span className="display mt-3 block break-words text-2xl text-[#F3F0E9] transition-colors group-hover:text-[#70D6A2] md:text-3xl">
              {INSTAGRAM_HANDLE}
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-slate-400">Follow for event updates, or send us a DM.</span>
            <span className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-300 transition-colors group-hover:text-[#70D6A2]">
              Open Instagram <span aria-hidden>↗</span>
            </span>
          </a>
        </section>
      </div>
    </>
  )
}
