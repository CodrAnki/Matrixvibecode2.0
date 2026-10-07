import { ArrowUpRight, MessageCircle } from 'lucide-react'
import Reveal from './Reveal'
import SectionHead from './SectionHead'
import { WHATSAPP_CONTACTS } from '../data/event'

const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('')

/**
 * Event organizers reachable on WhatsApp: a ruled roster of name and number.
 * Each row opens that organizer's wa.me chat. (Branch / year / portraits are not in the data yet; add them to
 * WHATSAPP_CONTACTS in data/event.ts and extend this row when available.)
 */
export default function OrganizerContacts() {
  return (
    <section id="contact" aria-label="Contact the organizers" className="relative px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHead index="07" label="Contact" title={<>Questions?<br />Ask an organizer.</>}>
          Registration, problem statements or anything else about Vibe Coding 2.0. Message an organizer directly on WhatsApp.
        </SectionHead>

          <Reveal>
            <ul className="border-t border-white/10">
              {WHATSAPP_CONTACTS.map((c, i) => (
                <li key={c.wa} className="border-b border-white/10">
                  <a href={c.wa} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${c.name} on WhatsApp`} className="row-hover group grid grid-cols-[2.2rem_3rem_1fr_auto] items-center gap-x-4 px-1 py-5 md:grid-cols-[4rem_3.5rem_1fr_11rem_2rem] md:gap-x-6 md:px-3">
                    <span className="font-mono text-xs text-silver md:text-sm">{String(i + 1).padStart(2, '0')}</span>
                    <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full border border-white/20 font-display text-sm font-bold text-paper transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-ink md:h-12 md:w-12">{initials(c.name)}</span>
                    <span className="min-w-0">
                      <span className="block break-words font-display text-xl font-bold leading-tight tracking-tight text-paper md:text-2xl">{c.name}</span>
                      <span className="meta mt-1 block md:hidden">{c.phone}</span>
                    </span>
                    <span className="hidden font-mono text-sm text-silver md:block">{c.phone}</span>
                    <span className="flex items-center gap-2 justify-self-end text-silver transition-colors group-hover:text-accent">
                      <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                      <ArrowUpRight className="hidden h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 md:block" strokeWidth={1.5} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
      </div>
    </section>
  )
}
