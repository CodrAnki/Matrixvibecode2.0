import { WHATSAPP_CONTACTS } from "../data/event";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden
    >
      <path
        d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-4.7A8.5 8.5 0 1 1 20.5 11.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WhatsAppContacts() {
  return (
    <section
      id="contact"
      aria-label="Contact an organizer"
      className="contact-organizers relative isolate overflow-hidden px-5 py-24 md:px-10 md:py-32"
    >
      <div className="relative z-0 mx-auto max-w-7xl">
        <div className="mb-12 grid items-end gap-6 md:mb-16 md:grid-cols-2 md:gap-12">
          <h2 className="display text-[clamp(2.8rem,7vw,6rem)] leading-[0.94] text-[#F3F0E9]">
            Questions?
            <br />
            <span className="text-[#38B878]">Ask an organizer.</span>
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-slate-400 md:justify-self-end md:pb-2 md:text-lg">
            Registration, problem statements or anything else about Vibe Coding
            2.0. Message an organizer directly on WhatsApp.
          </p>
        </div>

        <div className="border-t border-white/[0.1]">
          {WHATSAPP_CONTACTS.map((contact, index) => {
            const initials = contact.name
              .split(" ")
              .map((part) => part[0])
              .join("");

            return (
              <a
                key={contact.wa}
                href={contact.wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Message ${contact.name} on WhatsApp at ${contact.phone}`}
                className="group grid min-h-[88px] grid-cols-[2rem_2.75rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-2 border-b border-white/[0.1] px-2 py-4 outline-none transition-colors duration-300 hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#38B878]/45 sm:grid-cols-[3rem_3rem_minmax(0,1fr)_auto_3rem] sm:gap-x-5 sm:px-3 md:min-h-[90px] md:gap-x-6 md:px-4"
              >
                <span className="font-mono text-xs tracking-wide text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.14] font-mono text-xs font-semibold text-slate-200 transition-colors duration-300 group-hover:border-[#38B878] group-hover:bg-[#38B878] group-hover:text-[#07110B] group-focus-visible:border-[#38B878] group-focus-visible:bg-[#38B878] group-focus-visible:text-[#07110B]">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xl font-semibold tracking-tight text-[#F3F0E9] transition-colors duration-300 group-hover:text-[#70D6A2] sm:text-2xl">
                    {contact.name}
                  </span>
                  <span className="mt-1 block font-mono text-xs tracking-wide text-slate-500 sm:hidden">
                    {contact.phone}
                  </span>
                </span>
                <span className="hidden font-mono text-sm tracking-wide text-slate-400 sm:block">
                  {contact.phone}
                </span>
                <span className="grid h-10 w-10 place-items-center text-slate-500 transition-colors duration-300 group-hover:text-[#38B878]">
                  <WhatsAppIcon className="h-5 w-5" />
                  <span className="sr-only">Open WhatsApp chat</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
