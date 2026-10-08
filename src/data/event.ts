// Central place for all event content. Edit here to update the whole site.

// Shared social URLs, so every Instagram / LinkedIn button on the site opens the same page.
export const INSTAGRAM_URL =
  "https://www.instagram.com/matrix.jec?stkn=MXI1OGw1eGw4cmNqeQ==";
export const INSTAGRAM_HANDLE = "@matrix.jec";
export const LINKEDIN_URL = "https://www.linkedin.com/company/matrix-jec/";

export const EVENT = {
  // Keep the event name (Vibe Coding 2.0) and the club name (MATRIX) separate rather than fused
  // into one string — `org` already carries MATRIX, and most call sites show both side by side.
  name: "VIBE CODING 2.0",
  org: "MATRIX, JEC",
  tagline: "Where Ideas Meet Impact.",
  sub: "A hackathon to build, innovate and turn ideas into real world impact.",
  contact: {
    email: "team.matrix.jec@gmail.com",
    location: "JEC Campus, Jabalpur, Madhya Pradesh, India",
    socials: [
      { label: "Instagram", href: INSTAGRAM_URL },
      { label: "LinkedIn", href: LINKEDIN_URL },
    ],
    organizers: [
      { role: "Event Lead", team: "MATRIX Core Team" },
      { role: "Technical & Judging", team: "MATRIX Tech Wing" },
      { role: "Design & Media", team: "MATRIX Creative Wing" },
      { role: "Operations & Logistics", team: "MATRIX Ops Wing" },
    ],
  },
};

// Event start: 14 October 2026, 00:00 local time (month is 0-indexed)
// Event day starts at midnight IST for everyone. `new Date(2026, 9, 14)` would mean midnight in each
// visitor's own timezone, flipping the hero to "event day" at a different moment per visitor.
export const EVENT_DATE = new Date("2026-10-14T00:00:00+05:30");

// JEC's own published write-up of the first event. The URL slug says "19-july" but the page itself
// (title and body) dates the event 25 July 2025, which is what the site uses.
export const VIBE_CODING_1_REPORT = {
  url: "https://jecjabalpur.ac.in/college-activity/college-activity-2025-26/matrix-club-hosts-vibe-coding-event-at-jec-19-july-2025",
  title: "Matrix Club Hosts “Vibe Coding” Event at JEC: 25 July 2025",
  quote: "The event encouraged students to think creatively and enhance their technological skills.",
};

export const STATS = [
  { value: 500, suffix: "+", prefix: "", label: "Participants" },
  { value: 4, suffix: "+", prefix: "", label: "Problem Statements" },
  { value: 6, suffix: "K+", prefix: "₹", label: "Prize Pool" },
];

export const ABOUT = [
  {
    code: "01",
    title: "Build",
    text: 'Turn a raw idea into a working product using modern stacks and AI-assisted "vibe coding" workflows.',
  },
  {
    code: "02",
    title: "Innovate",
    text: "Solve curated real-world problem statements from industry, campus and community challenges.",
  },
  {
    code: "03",
    title: "Impact",
    text: "Get mentored by engineers and showcased to a wider audience of builders.",
  },
];

// Light, crowd-wide mini-games that run between build sessions — not competition formats. Every
// team is heads-down building for most of the event; these are the loud, five-minute breaks.
export const EVENTS = [
  {
    code: "G-01",
    title: "CHILLY SHOT",
    text: "A question lands on two participants. Answer wrong, and the shot is yours — chilli sauce, a lemon shot, or whatever's on the tray.",
    more: "Two players step up, a quickfire question is read out, and there's no hiding from a wrong answer. The loser knocks it back in front of the whole room — chilli sauce, sharp lemon juice, or whatever the hosts are serving that round.",
    tags: ["On-stage", "No mercy"],
  },
  {
    code: "G-02",
    title: "OPEN QUIZ",
    text: "Open floor, open mic. Whoever answers first and right walks off with a small prize — no teams, no turns.",
    more: "Questions are thrown open to the entire auditorium. No sign-up, no waiting your turn — the fastest correct answer from anywhere in the room takes a small prize on the spot.",
    tags: ["Open floor", "Fastest wins"],
  },
  {
    code: "G-03",
    title: "TECH OR BULLSHIT?",
    text: "Two \"facts\" about tech, read back to back. One's real, one's made up — call it A or B before the timer runs out.",
    more: "One true tech fact and one convincing lie, read out one after another — like \"Python was named after Monty Python.\" Two participants call it, A or B, before time's up. Get it right and you're still standing for the next round.",
    tags: ["True or false", "Quickfire"],
  },
];

export const WORKFLOW = [
  {
    title: "REGISTER",
    text: "Create your team account — enter solo or lock in your teammate.",
  },
  {
    title: "TEAM FORMATION",
    text: "Add your teammate, confirm details and get verified by MATRIX.",
  },
  {
    title: "PROBLEM STATEMENT",
    text: "Choose a problem statement that matches your team’s strengths.",
  },
  { title: "BUILD", text: "Design, code and iterate with mentors on call." },
];

// Rank is expressed as intensity on the site palette (brand red at the top, cooling to neutral),
// not as gold/silver/bronze — three extra hues would fight the red/green/neutral system.
export const PRIZES = [
  { place: "1ST", name: "1st Prize", amount: "₹3,000", tone: "#C44552" },
  { place: "2ND", name: "2nd Prize", amount: "₹2,000", tone: "#C9C5BE" },
  { place: "3RD", name: "3rd Prize", amount: "₹1,000", tone: "#7A7872" },
];
export const TOTAL_PRIZE_POOL = "₹6K+";

export const PROBLEM_STATEMENTS = [
  "Smart Campus Assistant",
  "AI Study Companion for Students",
  "Sustainable Energy Monitoring Dashboard",
  "Healthcare Access for Rural Communities",
  "Local Business Digital Storefront",
  "Accessible Learning Tools for Everyone",
  "Public Transport Live Tracker",
  "Waste Segregation & Recycling Tracker",
  "Farmer Advisory & Market Prices",
  "Cybersecurity Awareness Platform",
  "Open Innovation (own problem statement)",
];

// MATRIX club members assigned to answer participant queries on WhatsApp (MATRIX as a whole is the
// organizer). `wa` is the wa.me link: country code + number, digits only.
// wa.me opens the WhatsApp app on phones and WhatsApp Web / desktop app on computers.
export const WHATSAPP_CONTACTS = [
  {
    name: "Jayendra Patel",
    phone: "+91 78988 23061",
    wa: "https://wa.me/917898823061",
  },
  {
    name: "Mohit Patel",
    phone: "+91 81030 46547",
    wa: "https://wa.me/918103046547",
  },
  {
    name: "Ayan Khan",
    phone: "+91 90394 85800",
    wa: "https://wa.me/919039485800",
  },
  {
    name: "Garvit Dayal",
    phone: "+91 76920 79667",
    wa: "https://wa.me/917692079667",
  },
  {
    name: "Ankit Dubey",
    phone: "+91 93434 10747",
    wa: "https://wa.me/919343410747",
  },
];
