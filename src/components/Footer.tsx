import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import Logo from "./Logo";
import { SOCIAL_ICON } from "./icons";
import { NAV_LINKS } from "./Navbar";
import { EVENT } from "../data/event";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:px-10">
        <div>
          <Logo className="h-9" />
          <p className="mt-5 max-w-xs text-silver">
            Organiser of Vibe Coding 2.0.
            <br />
            The technical community of Jabalpur Engineering College.
          </p>
        </div>

        <nav aria-label="Footer">
          <h4 className="meta mb-4">Vibe Coding 2.0</h4>
          <ul className="space-y-2.5 text-paper">
            {NAV_LINKS.map((n) => (
              <li key={n.id}>
                <Link className="u-link" to={{ pathname: "/", hash: `#${n.id}` }}>{n.label}</Link>
              </li>
            ))}
            <li><Link className="u-link" to="/register">Register</Link></li>
            <li><Link className="u-link" to="/login">Team login</Link></li>
          </ul>
        </nav>

        <div>
          <h4 className="meta mb-4">Follow MATRIX</h4>
          <ul className="space-y-2.5">
            {EVENT.contact.socials.map((s) => {
              const Icon = SOCIAL_ICON[s.label];
              return (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2.5 text-paper">
                    {Icon && <Icon className="h-4 w-4 text-silver transition-colors group-hover:text-accent" />}
                    <span className="u-link">{s.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="meta mb-4">Contact</h4>
          <ul className="space-y-3 text-paper">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-1 h-4 w-4 shrink-0 text-silver" strokeWidth={1.5} />
              <a className="u-link break-all" href={`mailto:${EVENT.contact.email}`}>{EVENT.contact.email}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-silver" strokeWidth={1.5} />
              <span>{EVENT.contact.location}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 md:flex-row md:justify-between md:px-10">
          <p className="meta">&copy; {new Date().getFullYear()} MATRIX, Jabalpur Engineering College</p>
          <p className="meta">Site developed by Ankit Dubey</p>
        </div>
      </div>
    </footer>
  );
}
