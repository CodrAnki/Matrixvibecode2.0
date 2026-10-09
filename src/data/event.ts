// Central place for all event content. Edit here to update the whole site.

// Shared social URLs, so every Instagram / LinkedIn button on the site opens the same page.
export const INSTAGRAM_URL =
  "https://www.instagram.com/matrix.jec?stkn=MXI1OGw1eGw4cmNqeQ==";
export const LINKEDIN_URL = "https://www.linkedin.com/company/matrix-jec/";

export const EVENT = {
  name: "MATRIX VIBE CODING 2.0",
  org: "MATRIX, JEC",
  tagline: "Where Ideas Meet Impact.",
  sub: "A tech event to build, innovate and turn ideas into real world impact.",
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
export const EVENT_DATE = new Date(2026, 9, 14, 0, 0, 0);

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

export const EVENTS = [
  {
    code: "MOD-01",
    title: "VIBE CODING",
    text: "The flagship round. Prompt, iterate and ship a working product with AI-assisted development.",
    more: "Teams of up to 5 pick a problem statement and build end-to-end: idea, prototype, deployment. Originality, execution and real-world fit are scored.",
    tags: ["AI-Assisted", "Flagship"],
  },
  {
    code: "MOD-02",
    title: "BUILD CHALLENGE",
    text: "A timed build sprint where constraints spark creativity and every commit counts.",
    more: "Surprise constraints are revealed on the day. Mentors circulate for live feedback while teams push toward a demo-ready build.",
    tags: ["Timed", "Hands-on"],
  },
  {
    code: "MOD-03",
    title: "TEAM BATTLE",
    text: "Head-to-head demo showdowns where the best teams pitch live in front of the audience.",
    more: "Finalists present live, defend their choices and face rapid-fire questions.",
    tags: ["Live Pitch", "Finals"],
  },
];

export const WORKFLOW = [
  {
    title: "REGISTER",
    text: "Create your team account and lock in your squad.",
  },
  {
    title: "TEAM FORMATION",
    text: "Add members, confirm details and get verified by organizers.",
  },
  {
    title: "PROBLEM STATEMENT",
    text: "Choose a problem statement that matches your team’s strengths.",
  },
  { title: "BUILD", text: "Design, code and iterate with mentors on call." },
];

export const PRIZES = [
  { place: "1ST", name: "1st Prize", amount: "₹3,000", tone: "#facc15" },
  { place: "2ND", name: "2nd Prize", amount: "₹2,000", tone: "#cbd5e1" },
  { place: "3RD", name: "3rd Prize", amount: "₹1,000", tone: "#fb923c" },
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

// Organizers reachable on WhatsApp. `wa` is the wa.me link: country code + number, digits only.
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
    name: "Dhruv Kolare",
    phone: "+91 89890 61904",
    wa: "https://wa.me/918989061904",
  },
  {
    name: "Ankit Dubey",
    phone: "+91 93434 10747",
    wa: "https://wa.me/919343410747",
  },
  {
    name: "Garvit Dayal",
    phone: "+91 76920 79667",
    wa: "https://wa.me/917692079667",
  },
];
