/**
 * Mind Mirage — single source of truth for brand, content, and routing.
 */

export const SITE = {
  name: "Mind Mirage",
  tagline: "Step out of the Mind Matrix",
  domain: "mindmirageindia.com",
  url: "https://mindmirageindia.com",
  email: "namaste@mindmirageindia.com",
  whatsapp: "917302431279",
  whatsappDisplay: "+91 73024 31279",
  location: "Advaita Sadhana Kutir Ashram, Rishikesh, India — 249201",
  founder: "Acharya Bhagyashree Joshi Ji",
  tradition: "Adi Shankaracharya · Kevala Advaita · Bhāratīya Jñāna Paramparā",
} as const;

/* Self-hosted 720p re-encode (~1.2 MB) — the original CloudFront file is
   30 MB and never finishes loading on mobile connections. */
export const VIDEO_HERO_URL = "/hero-720.mp4";
export const VIDEO_HERO_POSTER = "/hero-poster.jpg";

/* ────────────  Sanskrit  ──────────── */

export const SANSKRIT = {
  mahavakya: {
    deva: "तत् त्वम् असि",
    iast: "Tat Tvam Asi",
    en: "That thou art",
    ref: "Chāndogya Upaniṣad 6.8.7 · Sāma Veda",
  },
  guruStotram: {
    deva: "गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः ।\nगुरुः साक्षात् परब्रह्म तस्मै श्री गुरवे नमः ॥",
    en: "The Guru is Brahmā, the Guru is Viṣṇu, the Guru is Śiva. The Guru is verily the Supreme Brahman — to that Guru, I bow.",
  },
  shankara: {
    deva: "ब्रह्म सत्यं जगन्मिथ्या जीवो ब्रह्मैव नापरः ।",
    en: "Brahman alone is real, the world is appearance, the individual self is none other than Brahman.",
    ref: "Adi Shankarācārya",
  },
  taittiriya: {
    deva: "आचार्यात् पादमादत्ते पादं शिष्यः स्वमेधया ।\nपादं सब्रह्मचारिभ्यः पादं कालक्रमेण च ॥",
    en: "One quarter of knowledge comes from the teacher, one quarter from one's own intellect, one quarter from fellow students, one quarter through time.",
    ref: "Taittirīya Upaniṣad",
  },
  closing: {
    deva: "ॐ तत् सत्",
    en: "Om. That is Truth.",
  },
  breath: {
    in: { deva: "श्वास लें…", en: "Breathe in" },
    hold: { deva: "रोकें…", en: "Hold" },
    out: { deva: "छोड़ें…", en: "Breathe out" },
  },
} as const;

/* ────────────  Navigation  ──────────── */

export const NAV_PRIMARY = [
  { href: "/programs", label: "Offerings" },
  { href: "/newsletters", label: "Newsletters" },
  { href: "/about-us", label: "About" },
  { href: "/contact", label: "Reach Us" },
] as const;

export const NAV_FOOTER_SIT = [
  { href: "/mentorship", label: "Mentorship" },
  { href: "/counselling", label: "Counselling" },
  { href: "/consultation", label: "Consultation" },
] as const;

export const NAV_FOOTER_ABOUT = [
  { href: "/about-us", label: "About Us" },
  { href: "/our-team", label: "Our Team" },
  { href: "/events", label: "Events & Retreats" },
] as const;

export const NAV_FOOTER_RESEARCH = [
  { href: "/research#publications", label: "Publications" },
  { href: "/research#bibliography", label: "Bibliography" },
  { href: "/collaboration", label: "Collaboration" },
  { href: "/research", label: "All Research" },
] as const;

export const NAV_FOOTER_ENGAGE = [
  { href: "/newsletters", label: "Newsletters" },
  { href: "/internship", label: "Internship" },
  { href: "/volunteer", label: "Karma Yoga" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

/* ────────────  Three Paths  ──────────── */

export const THREE_PATHS = [
  {
    deva: "स्वाध्याय",
    iast: "Svādhyāya",
    en: "Self-Paced Study",
    description:
      "Study at your own rhythm. Each lesson is sent to you as you complete the last — letting the teaching settle before the next arrives.",
    href: "/programs",
  },
  {
    deva: "गुरुमुख",
    iast: "Guru-Mukha",
    en: "From the Guru's Lips",
    description:
      "Live classes with the team on Zoom. Personal guidance, direct answers, the warmth of the traditional Guru-Śiṣya Paramparā.",
    href: "/sit-with-guruji",
  },
  {
    deva: "सत्सङ्ग",
    iast: "Satsaṅga",
    en: "In the Company of the Good",
    description:
      "Live Q&A and group satsang where sādhaks gather, listen, ask, and study together — held in the spirit of the gurukulam.",
    href: "/live-qa",
  },
] as const;

/* ────────────  Courses (self-paced)  ──────────── */

export type Course = {
  /** Delivery formats — all courses are self-paced; some also run live on Zoom. */
  formats?: readonly string[];
  slug: string;
  title: string;
  deva: string;
  tradition: string;
  excerpt: string;
  syllabus: string[];
  duration: string;
  prerequisites: string;
  priceINR: number;
};

export const COURSES: Course[] = [
  {
    slug: "yoga-sutras",
    title: "Patañjali's Yoga Sūtras",
    deva: "योगसूत्राणि",
    tradition: "Classical Yoga · Aṣṭāṅga",
    excerpt:
      "The 196 aphorisms that gave Yoga its grammar — from the stilling of thought to the eight limbs that prepare the mind for absorption.",
    syllabus: [
      "Samādhi Pāda — what Yoga is, the modes of mind",
      "Sādhana Pāda — the eight limbs, the kleśas, kriyā yoga",
      "Vibhūti Pāda — concentration, contemplation, the powers",
      "Kaivalya Pāda — liberation, the standalone witness",
    ],
    duration: "Self-paced · ~3 months at a gentle rhythm",
    prerequisites: "None. A quiet hour and a notebook.",
    priceINR: 4999,
  },
  {
    slug: "bhagavad-gita",
    formats: ["Self-paced", "Live classes on Zoom"],
    title: "Bhagavad Gītā",
    deva: "भगवद्गीता",
    tradition: "Vedānta · Karma Yoga · Bhakti",
    excerpt:
      "The dialogue between Kṛṣṇa and Arjuna on the battlefield of the inner life — duty without grasping, action without authorship.",
    syllabus: [
      "Arjuna's despair and the call to inquiry",
      "Sāṅkhya Yoga — the field and the knower",
      "Karma Yoga — action without attachment",
      "Jñāna Yoga — knowledge as liberation",
      "Bhakti Yoga — the path of devotion",
      "The universal form and the surrender of the small self",
    ],
    duration: "Self-paced · ~5 months",
    prerequisites: "Open mind. No Sanskrit required.",
    priceINR: 5999,
  },
  {
    slug: "advaita-vedanta",
    formats: ["Self-paced", "Live classes on Zoom"],
    title: "Advaita Vedānta",
    deva: "अद्वैत वेदान्त",
    tradition: "Adi Shankarācārya",
    excerpt:
      "The non-dual teaching at the root of the Indian philosophical tradition. Brahman alone is real; the world is appearance; the self is none other than Brahman.",
    syllabus: [
      "Tattva-bodha — the basic vocabulary",
      "Ātma-bodha — knowledge of the Self",
      "Vivekacūḍāmaṇi — the crest jewel of discrimination",
      "Upadeśa Sāhasrī — the thousand teachings",
      "Methods of inquiry: dṛg-dṛśya, neti-neti, anvaya-vyatireka",
    ],
    duration: "Self-paced · ~6 months",
    prerequisites: "Familiarity with the Gītā helps but is not required.",
    priceINR: 6999,
  },
  {
    slug: "meditation",
    title: "Meditation · Dhyāna",
    deva: "ध्यान",
    tradition: "Classical & Tantric",
    excerpt:
      "Meditation as the natural state, not a technique. Posture, breath, attention, and the quiet recognition of the witness — taught classically.",
    syllabus: [
      "Āsana, prāṇāyāma, pratyāhāra",
      "Dhāraṇā — the gathering of attention",
      "Dhyāna — sustained, effortless presence",
      "The five sheaths and the witness behind them",
      "Trouble-shooting the meditative life",
    ],
    duration: "Self-paced · ~2 months",
    prerequisites: "None.",
    priceINR: 2999,
  },
  {
    slug: "sankhya-darshan",
    title: "Sānkhya Darśan",
    deva: "सांख्य दर्शन",
    tradition: "Kapila's Cosmology",
    excerpt:
      "The oldest enumerative philosophy of India — twenty-five tattvas mapping consciousness, nature, and the spectator who is never bound.",
    syllabus: [
      "Puruṣa and Prakṛti",
      "The three guṇas — sattva, rajas, tamas",
      "The 24 evolutes of Prakṛti",
      "Liberation through discriminative knowledge",
    ],
    duration: "Self-paced · ~2 months",
    prerequisites: "None.",
    priceINR: 3499,
  },
  {
    slug: "buddhism",
    title: "Buddhism",
    deva: "बौद्ध दर्शन",
    tradition: "Theravāda · Madhyamaka",
    excerpt:
      "The Four Noble Truths, dependent origination, and Nāgārjuna's middle way — read in conversation with the Vedāntic darśanas.",
    syllabus: [
      "The historical Buddha and the first turning",
      "Four Noble Truths · Eightfold Path",
      "Dependent origination",
      "Madhyamaka — emptiness as the middle way",
      "Vedānta and Buddhism in dialogue",
    ],
    duration: "Self-paced · ~3 months",
    prerequisites: "None.",
    priceINR: 3999,
  },
  {
    slug: "lalita-for-women",
    formats: ["Self-paced", "Live classes on Zoom"],
    title: "Lalitā for Women",
    deva: "ललिता",
    tradition: "Śākta · Śrī Vidyā",
    excerpt:
      "A devotional study of the Lalitā Sahasranāma offered for women sādhaks — the Goddess as the very ground of awareness, beauty, and play.",
    syllabus: [
      "Introduction to the Śākta tradition",
      "Lalitā Sahasranāma — selected names",
      "The Śrī Cakra and its symbolism",
      "Daily contemplative practice",
    ],
    duration: "Self-paced · ~4 months",
    prerequisites: "Open to women sādhaks of any background.",
    priceINR: 4499,
  },
  {
    slug: "jyotisha",
    formats: ["Self-paced", "Live classes on Zoom"],
    title: "Astrology · Jyotiṣa",
    deva: "ज्योतिष",
    tradition: "Vedic",
    excerpt:
      "Jyotiṣa as the eye of the Veda — not prediction, but a contemplative map of time, karma, and the rhythm of one's incarnation.",
    syllabus: [
      "The 12 rāśis and 27 nakṣatras",
      "The nine grahas",
      "Reading a birth chart contemplatively",
      "Daśās and the timing of life events",
    ],
    duration: "Self-paced · ~5 months",
    prerequisites: "Curiosity. Birth details if you wish to study your own chart.",
    priceINR: 5499,
  },
];

export const formatINR = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise);

/* ────────────  Personal Guidance  ──────────── */

export type GuidanceSubject = {
  slug: string;
  name: string;
  deva?: string;
  priceINR: number;
  notes?: string;
};

export const GUIDANCE_SUBJECTS: GuidanceSubject[] = [
  { slug: "guided-meditation", name: "Guided Meditation", deva: "ध्यान", priceINR: 3000 },
  { slug: "pranayama", name: "Prāṇāyāma", deva: "प्राणायाम", priceINR: 3000 },
  { slug: "asanas", name: "Āsanas", deva: "आसन", priceINR: 3000 },
  { slug: "shatkarma", name: "Shatkarma", deva: "षट्कर्म", priceINR: 3000 },
  { slug: "ayurveda", name: "Āyurveda", deva: "आयुर्वेद", priceINR: 3000 },
  { slug: "jyotisha", name: "Jyotiṣa (Astrology)", deva: "ज्योतिष", priceINR: 3000 },
  { slug: "western-philosophy", name: "Western Philosophy", priceINR: 5000 },
  { slug: "contemplation", name: "Contemplation", priceINR: 3000 },
  { slug: "mentorship", name: "Mentorship", priceINR: 0, notes: "Application-based — custom" },
];

/* 1:1 subjects as purchasable items — each is a complete course of eight
   classes on Zoom, bought through the same cart/checkout as courses. */
export const SESSION_COURSES: Course[] = GUIDANCE_SUBJECTS.filter(
  (s) => s.priceINR && s.priceINR > 0,
).map((s) => ({
  slug: `1on1-${s.slug}`,
  title: s.name,
  deva: s.deva ?? "",
  tradition: "Live on Zoom",
  excerpt: `Eight live classes on Zoom — ${s.name}.`,
  syllabus: [],
  duration: "Eight live classes",
  prerequisites: "None.",
  priceINR: s.priceINR as number,
}));


/* Booklist sets — bought through checkout; the team confirms shipping. */
export const BOOK_SETS: Course[] = [
  { slug: "booklist-beginner", title: "Booklist · Beginner", deva: "ग्रन्थसूची", tradition: "Booklist", excerpt: "The Beginner booklist from the ashram.", syllabus: [], duration: "Shipped by the ashram", prerequisites: "None.", priceINR: 2500 },
  { slug: "booklist-intermediate", title: "Booklist · Intermediate", deva: "ग्रन्थसूची", tradition: "Booklist", excerpt: "The Intermediate booklist from the ashram.", syllabus: [], duration: "Shipped by the ashram", prerequisites: "None.", priceINR: 3500 },
  { slug: "booklist-advanced", title: "Booklist · Advanced", deva: "ग्रन्थसूची", tradition: "Booklist", excerpt: "The Advanced booklist from the ashram.", syllabus: [], duration: "Shipped by the ashram", prerequisites: "None.", priceINR: 5000 },
];

/* Everything that can be added to the basket. */
export const CATALOG: Course[] = [...COURSES, ...SESSION_COURSES, ...BOOK_SETS];

export const SLOTS = [
  {
    id: "A",
    label: "Slot A — Afternoon",
    ist: "12:00 PM – 1:00 PM",
    uk: "7:30 AM",
    usaET: "2:30 AM",
    uae: "2:30 PM",
  },
  {
    id: "B",
    label: "Slot B — Evening",
    ist: "6:00 PM – 7:00 PM",
    uk: "1:30 PM",
    usaET: "8:30 AM",
    uae: "8:00 PM",
  },
] as const;

/* ────────────  Inquiry subjects  ──────────── */

/* ────────────  Booklist (sold by the ashram)  ────────────
   Ordered via WhatsApp/form; payment collected on confirmation. */

export type Book = {
  title: string;
  deva?: string;
  author: string;
  note: string;
};

export const BOOKS: Book[] = [
  {
    title: "Vivekacūḍāmaṇi",
    deva: "विवेकचूडामणि",
    author: "Adi Shankarācārya",
    note: "The crest-jewel of discrimination — the central manual of Advaita sādhanā.",
  },
  {
    title: "Bhagavad Gītā with Śāṅkara Bhāṣya",
    deva: "भगवद्गीता",
    author: "Vyāsa · commentary by Shankarācārya",
    note: "The Gītā with the classical Advaita commentary.",
  },
  {
    title: "Yoga Sūtras of Patañjali",
    deva: "योगसूत्राणि",
    author: "Patañjali · with classical commentaries",
    note: "The 196 aphorisms with Vyāsa's commentary.",
  },
  {
    title: "Upadeśa Sāhasrī",
    deva: "उपदेशसाहस्री",
    author: "Adi Shankarācārya",
    note: "The thousand teachings — Shankarācārya's own systematic prose work.",
  },
  {
    title: "Ātma-bodha & Tattva-bodha",
    deva: "आत्मबोधः",
    author: "Adi Shankarācārya",
    note: "The two beginner texts every sādhak starts with at the kuṭīr.",
  },
  {
    title: "Sānkhya Kārikā",
    deva: "सांख्यकारिका",
    author: "Īśvarakṛṣṇa",
    note: "The oldest surviving manual of Sānkhya philosophy.",
  },
];

export const INQUIRY_SUBJECTS = [
  "Course inquiry",
  "Personal guidance",
  "Mentorship",
  "Research collaboration",
  "Internship",
  "Karma Yoga",
  "Other",
] as const;

/* ────────────  Coupons  ────────────
   Code → percent off. Edit this table to add/retire codes.
   Codes are case-insensitive at entry. */

export const COUPONS: Record<string, number> = {
  WELCOME10: 10,
  SEEKER15: 15,
  GURUKULAM20: 20,
};

export function applyCoupon(totalINR: number, code: string) {
  const percent = COUPONS[code.trim().toUpperCase()];
  if (!percent) return null;
  const discountINR = Math.round((totalINR * percent) / 100);
  return { percent, discountINR, finalINR: totalINR - discountINR };
}

/* ────────────  Helpers  ──────────── */

export const whatsappLink = (text?: string) => {
  const msg =
    text ?? "Namaste.\n\nI have a question about Mind Mirage.";
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}`;
};

export const mailtoLink = (subject?: string, body?: string) => {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${SITE.email}${qs ? `?${qs}` : ""}`;
};
