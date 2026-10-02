import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";
import TiltCard from "./TiltCard";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { LINKEDIN_URL, WHATSAPP_CONTACTS } from "../data/event";

const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const LinkedInIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

/**
 * "Contact Us on WhatsApp": four organizer cards plus the MATRIX JEC LinkedIn card. Each whole card is a link to that person's
 * wa.me URL (opens the WhatsApp app on phones, WhatsApp Web / desktop app on computers).
 */
export default function WhatsAppContacts() {
  const narrow = useMediaQuery("(max-width: 767px)");
  return (
    <section
      id="contact"
      aria-label="Contact us on WhatsApp"
      className="relative px-5 py-28 md:px-10 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          kicker="Contact"
          title="Contact Us on WhatsApp"
          sub="Questions about registration, problem statements or sponsorship? Message an organizer directly."
        />
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6"
          style={{ perspective: 1200 }}
        >
          {WHATSAPP_CONTACTS.map((c, i) => (
            <Reveal key={c.wa} delay={i * 0.1} className="h-full lg:col-span-2">
              <a
                href={c.wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Chat with ${c.name} on WhatsApp`}
                className="block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#00FF66]"
              >
                <TiltCard
                  className="flex h-full flex-col overflow-hidden p-6"
                  max={narrow ? 5 : 10}
                >
                  <div className="flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#00FF66]/35 bg-[#00FF66]/10 text-[#25D366] shadow-[0_0_28px_-8px_rgba(0,255,102,0.7)]">
                      <WhatsAppIcon className="h-8 w-8" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-cyan-300/70">
                        Organizer
                      </p>
                      <h3 className="mt-1 break-words text-xl font-bold tracking-wide text-white">
                        {c.name}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-6 break-words font-mono text-lg tracking-wider text-sky-100/80">
                    {c.phone}
                  </p>
                  <span className="btn btn-solid mt-6 w-full">
                    <WhatsAppIcon className="h-4 w-4" />
                    Chat on WhatsApp
                  </span>
                </TiltCard>
              </a>
            </Reveal>
          ))}
          <Reveal
            delay={WHATSAPP_CONTACTS.length * 0.1}
            className="h-full lg:col-span-2"
          >
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Matrix JEC on LinkedIn"
              className="block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#00FF66]"
            >
              <TiltCard
                className="flex h-full flex-col overflow-hidden p-6"
                max={narrow ? 5 : 10}
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#00FF66]/35 bg-[#00FF66]/10 text-[#0A66C2] shadow-[0_0_28px_-8px_rgba(0,255,102,0.7)]">
                    <LinkedInIcon className="h-8 w-8" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-cyan-300/70">
                      LinkedIn
                    </p>
                    <h3 className="mt-1 break-words text-xl font-bold tracking-wide text-white">
                      Matrix JEC
                    </h3>
                  </div>
                </div>
                <p className="mt-6 break-words font-mono text-lg tracking-wider text-sky-100/80">
                  linkedin.com/company/matrix-jec
                </p>
                <span className="btn btn-solid mt-6 w-full">
                  <LinkedInIcon className="h-4 w-4" />
                  Follow on LinkedIn
                </span>
              </TiltCard>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
