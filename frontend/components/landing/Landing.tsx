'use client';

import Link from 'next/link';
import { NavIcon } from '@/components/NavIcon';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

/* ───────────── yordamchi hooklar ───────────── */

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={`reveal ${seen ? 'in' : ''} ${className}`}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setVal(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setVal(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <span ref={ref}>
      {val.toLocaleString('uz-UZ').replace(/,/g, ' ')}
      {suffix}
    </span>
  );
}

// Kursor ostidagi yorug'lik (bento kartalar uchun)
function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/* ───────────── ma'lumotlar ───────────── */

const CATEGORIES = [
  { key: 'ROAD', label: "Yo'l", icon: 'road' },
  { key: 'LIGHTING', label: 'Yoritish', icon: 'bulb' },
  { key: 'WASTE', label: 'Chiqindi', icon: 'trash' },
  { key: 'WATER', label: 'Suv', icon: 'droplet' },
  { key: 'LANDSCAPING', label: 'Obodonlashtirish', icon: 'tree' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

interface DemoIssue {
  id: number;
  title: string;
  category: CategoryKey;
  votes: number;
}

const INITIAL_ISSUES: DemoIssue[] = [
  { id: 1, title: "5-uy oldidagi yo'l o'ydim-chuqur", category: 'ROAD', votes: 128 },
  { id: 2, title: "Bolalar maydonchasida chiroqlar yonmaydi", category: 'LIGHTING', votes: 97 },
  { id: 3, title: "Chiqindi konteyneri haftada bir marta bo'shatiladi", category: 'WASTE', votes: 64 },
  { id: 4, title: "Ichimlik suvi bosimi kechqurun tushib ketadi", category: 'WATER', votes: 41 },
];

const MAX_VOTES = 3;

const STEPS = [
  {
    key: 'send',
    title: 'Muammoni yuboring',
    short: 'Yuborish',
    text: "Rasm yoki video bilan, bir necha soniyada. Kategoriya tanlang, joyni yozing — shu kifoya.",
    status: 'Moderatsiyada',
    tone: 'warn',
    detail: [
      { i: 'camera', t: '3 tagacha rasm, 1 ta video' },
      { i: 'lock', t: 'EXIF/GPS avtomatik tozalanadi' },
      { i: 'repeat', t: 'Takroriy yuborishdan himoya' },
    ],
  },
  {
    key: 'review',
    title: "Admin ko'rib chiqadi",
    short: 'Moderatsiya',
    text: "Admin postni tasdiqlaydi, tuzatishni so'raydi yoki o'xshash muammolar bilan birlashtiradi.",
    status: 'Ovoz berilmoqda',
    tone: 'info',
    detail: [
      { i: 'check', t: 'Tasdiqlansa — ovozga chiqadi' },
      { i: 'edit', t: 'Rad etilsa — sababi yoziladi' },
      { i: 'link', t: 'Dublikatlar birlashtiriladi' },
    ],
  },
  {
    key: 'vote',
    title: 'Mahalla ovoz beradi',
    short: 'Ovoz berish',
    text: "Har bir aholi oyiga 3 ta ovoz oladi. Eng ko'p ovoz olgan muammo oy g'olibi bo'ladi.",
    status: 'Oylik ovozda tanlandi',
    tone: 'ok',
    detail: [
      { i: 'vote', t: 'Oyiga 3 ta ovoz' },
      { i: 'hourglass', t: 'Oy yakuni avtomatik' },
      { i: 'undo', t: 'Yutmaganlar keyingi oyga o‘tadi' },
    ],
  },
  {
    key: 'done',
    title: "Hal bo'lishini kuzating",
    short: 'Natija',
    text: "G'olib muammo ishga olinadi. Har bir o'zgarish haqida bildirishnoma olasiz — ish natijasi rasmi bilan.",
    status: "Hal qilingan",
    tone: 'done',
    detail: [
      { i: 'bell', t: 'Push bildirishnomalar' },
      { i: 'eye', t: 'Kuzatib borish' },
      { i: 'chat', t: 'Muallif fikri — natijaga baho' },
    ],
  },
] as const;

const FAQ = [
  {
    q: "Kim ovoz bera oladi?",
    a: "Faqat admin tomonidan ro'yxatga olingan mahalla aholisi. Har bir aholi o'z mahallasi muammolarini ko'radi — boshqa mahallalar bilan ma'lumotlar aralashmaydi.",
  },
  {
    q: "Nega oyiga faqat 3 ta ovoz?",
    a: "Cheklov odamlarni haqiqatan muhim narsaga e'tibor qaratishga majbur qiladi va ovozlarni «sepib yuborish»ning oldini oladi. Yutmagan muammolar keyingi oyga o'tadi.",
  },
  {
    q: "Mening rasmim va joylashuvim xavfsizmi?",
    a: "Ha. Serverga yuklangan rasmlardan EXIF va GPS ma'lumotlari o'chiriladi, o'lcham kichraytiriladi. Yashirilgan postlarning media'si hech kimga berilmaydi.",
  },
  {
    q: "Admin nima qila oladi?",
    a: "Moderatsiya navbati, shikoyatlarni ko'rish, ovoz davrlari, aholi ro'yxati, tadbir va e'lonlar, hamda har bir amalning audit jurnali — hammasi veb-panelda.",
  },
  {
    q: "Ilova qaysi qurilmalarda ishlaydi?",
    a: "Aholi uchun — Android va iOS mobil ilova, adminlar uchun — veb-panel. Ikkalasi ham bitta API orqali ishlaydi.",
  },
];

/* ───────────── Navbar ───────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const links = [
    ['#qanday', 'Qanday ishlaydi'],
    ['#imkoniyatlar', 'Imkoniyatlar'],
    ['#sinab-koring', "Sinab ko'ring"],
    ['#admin', 'Admin panel'],
    ['#faq', 'Savollar'],
  ];
  return (
    <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-wrap lp-nav-row">
        <a href="#top" className="lp-brand">
          <img src="/logo-mark.png" alt="" className="lp-logo" />Mahalladosh
        </a>
        <nav className={`lp-links ${open ? 'open' : ''}`}>
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link href="/login" className="lp-btn lp-btn-dark lp-links-cta">
            Kirish
          </Link>
        </nav>
        <Link href="/login" className="lp-btn lp-btn-dark lp-nav-cta">
          Kirish
        </Link>
        <button
          type="button"
          className={`lp-burger ${open ? 'open' : ''}`}
          aria-label="Menyu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </div>
    </header>
  );
}

/* ───────────── Hero + interaktiv telefon ───────────── */

function PhoneDemo() {
  const [issues, setIssues] = useState(INITIAL_ISSUES);
  const [mine, setMine] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [pop, setPop] = useState<number | null>(null);
  const left = MAX_VOTES - mine.length;
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const toggle = (id: number) => {
    const has = mine.includes(id);
    if (!has && left === 0) {
      say("Bu oy uchun 3 ta ovozingizdan foydalandingiz");
      return;
    }
    setMine((m) => (has ? m.filter((x) => x !== id) : [...m, id]));
    setIssues((list) => list.map((i) => (i.id === id ? { ...i, votes: i.votes + (has ? -1 : 1) } : i)));
    setPop(id);
    setTimeout(() => setPop(null), 400);
    if (!has && left === 1) say("Oxirgi ovozingizni ishlatdingiz");
  };

  const sorted = [...issues].sort((a, b) => b.votes - a.votes);
  const max = sorted[0]?.votes ?? 1;

  // Tilt
  const tiltRef = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  };
  const onLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = '';
  };

  return (
    <div className="phone-stage" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="phone" ref={tiltRef}>
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="ph-head">
            <div>
              <small>Yunusobod mahallasi</small>
              <strong>Noyabr ovozi</strong>
            </div>
            <div className="ph-votes" aria-label={`${left} ta ovoz qoldi`}>
              {Array.from({ length: MAX_VOTES }).map((_, i) => (
                <span key={i} className={i < left ? 'dot on' : 'dot'} />
              ))}
            </div>
          </div>
          <div className="ph-list">
            {sorted.map((it, idx) => {
              const cat = CATEGORIES.find((c) => c.key === it.category)!;
              const voted = mine.includes(it.id);
              return (
                <button
                  type="button"
                  key={it.id}
                  className={`ph-card ${voted ? 'voted' : ''} ${pop === it.id ? 'pop' : ''}`}
                  onClick={() => toggle(it.id)}
                  style={{ order: idx }}
                >
                  <span className="ph-rank">{idx + 1}</span>
                  <span className="ph-body">
                    <span className="ph-cat">
                      <NavIcon name={cat.icon} size={14} /> {cat.label}
                    </span>
                    <span className="ph-title">{it.title}</span>
                    <span className="ph-bar">
                      <i style={{ width: `${(it.votes / max) * 100}%` }} />
                    </span>
                  </span>
                  <span className="ph-vote">
                    <b>
                      <NavIcon name="chevron-up" size={12} />
                    </b>
                    {it.votes}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`ph-toast ${toast ? 'show' : ''}`}>{toast}</div>
        </div>
      </div>
      <div className="float-chip c1">
        <NavIcon name="bell" size={14} /> Muammoingiz ovozga chiqdi
      </div>
      <div className="float-chip c2">
        <NavIcon name="check" size={14} /> Yo‘l ta’mirlandi
      </div>
      <p className="phone-hint">
        <NavIcon name="pointer" size={14} /> Bosib ovoz bering — haqiqiy qoidalar bilan
      </p>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', `${((e.clientX - r.left) / r.width - 0.5) * 2}`);
    el.style.setProperty('--py', `${((e.clientY - r.top) / r.height - 0.5) * 2}`);
  };
  return (
    <section id="top" className="hero" ref={ref} onMouseMove={onMove}>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="grain" />
      <div className="lp-wrap hero-grid">
        <div className="hero-copy">
          <span className="pill">
            <i /> Mahalla aholisi va adminlari uchun
          </span>
          <h1>
            Mahalla ovozi —{' '}
            <span className="hl">
              eshitiladi<svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 C 60 1, 140 1, 298 7" /></svg>
            </span>
            .
          </h1>
          <p className="lead">
            Muammoni yuboring, oyiga 3 ta ovoz bering va u hal bo‘lguncha kuzating. Shaffof, adolatli, hamma ko‘rib
            turadi.
          </p>
          <div className="hero-cta">
            <Link href="/login" className="lp-btn lp-btn-primary">
              Admin panelga kirish <span aria-hidden="true">→</span>
            </Link>
            <a href="#qanday" className="lp-btn lp-btn-ghost">
              Qanday ishlaydi
            </a>
          </div>
          <ul className="hero-trust">
            <li>
              <NavIcon name="vote" size={15} /> Oyiga 3 ta ovoz
            </li>
            <li>
              <NavIcon name="lock" size={15} /> Mahallalar ajratilgan
            </li>
            <li>
              <NavIcon name="phone" size={15} /> Android · iOS · Veb
            </li>
          </ul>
        </div>
        <PhoneDemo />
      </div>
    </section>
  );
}

/* ───────────── Raqamlar ───────────── */

function Stats() {
  const items = [
    { n: 3, s: '', l: 'ovoz — har oy, har aholiga' },
    { n: 75, s: '', l: 'API endpoint, to‘liq hujjatlangan' },
    { n: 8, s: '', l: 'bosqichli muammo holati' },
    { n: 100, s: '%', l: 'shaffof moderatsiya jurnali' },
  ];
  return (
    <section className="stats">
      <div className="lp-wrap stats-grid">
        {items.map((s, i) => (
          <Reveal key={s.l} delay={i * 80} className="stat">
            <strong>
              <CountUp to={s.n} suffix={s.s} />
            </strong>
            <span>{s.l}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Qanday ishlaydi (stepper) ───────────── */

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 4500);
    return () => clearInterval(t);
  }, [auto]);
  const step = STEPS[active]!;
  return (
    <section id="qanday" className="section">
      <div className="lp-wrap">
        <Reveal>
          <p className="eyebrow">Qanday ishlaydi</p>
          <h2>To‘rt qadam — muammodan natijagacha</h2>
        </Reveal>
        <div className="how">
          <Reveal className="how-tabs">
            <div className="how-rail">
              <i style={{ height: `${(active / (STEPS.length - 1)) * 100}%` }} />
            </div>
            {STEPS.map((s, i) => (
              <button
                type="button"
                key={s.key}
                className={`how-tab ${i === active ? 'active' : ''} ${i < active ? 'past' : ''}`}
                onClick={() => {
                  setActive(i);
                  setAuto(false);
                }}
              >
                <span className="how-num">{i < active ? <NavIcon name="check" size={14} /> : i + 1}</span>
                <span>
                  <b>{s.title}</b>
                  <small>{s.text}</small>
                </span>
              </button>
            ))}
          </Reveal>
          <Reveal delay={120} className="how-panel-wrap">
            <div className="how-panel" key={step.key}>
              <div className="how-panel-top">
                <span className={`status ${step.tone}`}>{step.status}</span>
                <small>Qadam {active + 1} / {STEPS.length}</small>
              </div>
              <h3>{step.short}</h3>
              <ul>
                {step.detail.map((d) => (
                  <li key={d.t}>
                    <NavIcon name={d.i} size={16} />
                    {d.t}
                  </li>
                ))}
              </ul>
              <div className="how-progress">
                {STEPS.map((s, i) => (
                  <i key={s.key} className={i <= active ? 'on' : ''} />
                ))}
              </div>
              <button type="button" className="lp-btn lp-btn-ghost sm" onClick={() => setAuto((v) => !v)}>
                {auto ? '⏸ To‘xtatish' : '▶ Avtomatik'}
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Imkoniyatlar (bento) ───────────── */

function EventRsvp() {
  const [going, setGoing] = useState(false);
  return (
    <div className="mini-event">
      <div className="date">
        <b>14</b>
        <span>DEK</span>
      </div>
      <div className="grow">
        <strong>Hasharga chiqamiz</strong>
        <small>Markaziy xiyobon · {42 + (going ? 1 : 0)} kishi boradi</small>
      </div>
      <button type="button" className={`chip-btn ${going ? 'on' : ''}`} onClick={() => setGoing((v) => !v)}>
        {going ? (
          <>
            <NavIcon name="check" size={14} /> Boraman
          </>
        ) : (
          'Boraman'
        )}
      </button>
    </div>
  );
}

function MiniChat() {
  const [msgs, setMsgs] = useState([
    { me: false, t: 'Assalomu alaykum! Ertaga suv o‘chadimi?' },
    { me: true, t: 'E’londa yozilgan: 10:00–14:00.' },
  ]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = endRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [msgs]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { me: true, t }]);
    setText('');
  };
  return (
    <div className="mini-chat">
      <div className="chat-box">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.me ? 'me' : ''}`}>
            {m.t}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Xabar yozing…" maxLength={80} />
        <button type="submit" aria-label="Yuborish">
          <NavIcon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}

function Features() {
  return (
    <section id="imkoniyatlar" className="section alt">
      <div className="lp-wrap">
        <Reveal>
          <p className="eyebrow">Imkoniyatlar</p>
          <h2>Mahalla hayoti uchun kerak bo‘lgan hamma narsa</h2>
        </Reveal>
        <div className="bento">
          <Reveal className="bento-cell span2" delay={0}>
            <div className="card spot" onMouseMove={spotlight}>
              <span className="ico">
                <NavIcon name="vote" size={22} />
              </span>
              <h3>Oylik ovoz berish</h3>
              <p>Har oy yangi davr. 3 ta ovoz, shaffof natija, avtomatik yakun va yutmaganlar uchun carry-over.</p>
              <div className="vote-dots">
                {[1, 2, 3].map((n) => (
                  <i key={n} style={{ '--i': n } as CSSProperties} />
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal className="bento-cell" delay={80}>
            <div className="card spot" onMouseMove={spotlight}>
              <span className="ico">
                <NavIcon name="chat" size={22} />
              </span>
              <h3>Mahalla chati</h3>
              <p>Real vaqtda. Yozib ko‘ring:</p>
              <MiniChat />
            </div>
          </Reveal>
          <Reveal className="bento-cell" delay={0}>
            <div className="card spot" onMouseMove={spotlight}>
              <span className="ico">
                <NavIcon name="calendar" size={22} />
              </span>
              <h3>Tadbirlar</h3>
              <p>Hasharlar, yig‘inlar, bayramlar. Bir bosishda qatnashing.</p>
              <EventRsvp />
            </div>
          </Reveal>
          <Reveal className="bento-cell" delay={80}>
            <div className="card spot" onMouseMove={spotlight}>
              <span className="ico">
                <NavIcon name="megaphone" size={22} />
              </span>
              <h3>E’lonlar</h3>
              <p>Muhim xabarlar to‘g‘ridan-to‘g‘ri telefonga — push bilan.</p>
              <div className="mini-ann">
                <b>MUHIM</b> Ertaga 10:00–14:00 suv o‘chadi
              </div>
            </div>
          </Reveal>
          <Reveal className="bento-cell" delay={160}>
            <div className="card spot" onMouseMove={spotlight}>
              <span className="ico">
                <NavIcon name="shield" size={22} />
              </span>
              <h3>Xavfsizlik</h3>
              <p>Rate limit, CSRF, EXIF tozalash, mahallalar izolyatsiyasi, to‘liq audit.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Sinab ko'ring (composer) ───────────── */

function TryIt() {
  const [cat, setCat] = useState<CategoryKey>('ROAD');
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<'edit' | 'sending' | 'review' | 'open'>('edit');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const category = CATEGORIES.find((c) => c.key === cat)!;
  const valid = title.trim().length >= 5;

  const submit = () => {
    if (!valid || phase !== 'edit') return;
    setPhase('sending');
    timers.current = [
      setTimeout(() => setPhase('review'), 900),
      setTimeout(() => setPhase('open'), 2700),
    ];
  };
  const reset = () => {
    timers.current.forEach(clearTimeout);
    setPhase('edit');
    setTitle('');
  };

  const statusFor = {
    edit: { t: 'Qoralama', c: 'muted' },
    sending: { t: 'Yuborilmoqda…', c: 'muted' },
    review: { t: 'Moderatsiyada', c: 'warn' },
    open: { t: 'Ovoz berilmoqda', c: 'info' },
  }[phase];

  return (
    <section id="sinab-koring" className="section">
      <div className="lp-wrap try">
        <Reveal className="try-copy">
          <p className="eyebrow">Sinab ko‘ring</p>
          <h2>Muammoni yuborish — bir necha soniya</h2>
          <p className="lead-dark">
            Kategoriyani tanlang, muammoni yozing — o‘ng tomonda postingiz moderatsiya orqali ovozga chiqishini
            ko‘rasiz.
          </p>
        </Reveal>
        <Reveal delay={100} className="try-card">
          <div className="composer">
            <label>Kategoriya</label>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  disabled={phase !== 'edit'}
                  className={`chip ${cat === c.key ? 'on' : ''}`}
                  onClick={() => setCat(c.key)}
                >
                  <NavIcon name={c.icon} size={14} /> {c.label}
                </button>
              ))}
            </div>
            <label htmlFor="try-title">
              Sarlavha <span className={title.length > 100 ? 'warn-txt' : ''}>{title.length}/120</span>
            </label>
            <input
              id="try-title"
              value={title}
              disabled={phase !== 'edit'}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Maktab oldidagi svetofor ishlamayapti"
            />
            <p className="hint">{valid ? 'Tayyor' : 'Kamida 5 ta belgi yozing'}</p>
            {phase === 'open' ? (
              <button type="button" className="lp-btn lp-btn-ghost" onClick={reset}>
                <NavIcon name="refresh" size={15} /> Qaytadan
              </button>
            ) : (
              <button type="button" className="lp-btn lp-btn-primary" disabled={!valid || phase !== 'edit'} onClick={submit}>
                {phase === 'sending' ? 'Yuborilmoqda…' : 'Yuborish'}
              </button>
            )}
          </div>
          <div className="preview">
            <div className={`pcard ${phase}`}>
              <div className="pcard-top">
                <span>
                  <NavIcon name={category.icon} size={14} /> {category.label}
                </span>
                <span className={`status ${statusFor.c}`}>{statusFor.t}</span>
              </div>
              <h4>{title.trim() || 'Sarlavha shu yerda ko‘rinadi…'}</h4>
              <div className="timeline">
                {['Yuborildi', 'Moderatsiya', 'Ovozda'].map((l, i) => {
                  const reached = (phase === 'sending' && i === 0) || (phase === 'review' && i <= 1) || phase === 'open';
                  return (
                    <div key={l} className={`tl ${reached ? 'on' : ''}`}>
                      <i />
                      <span>{l}</span>
                    </div>
                  );
                })}
              </div>
              {phase === 'open' && <div className="pcard-vote"><NavIcon name="chevron-up" size={12} /> 0 · Birinchi bo‘lib ovoz bering!</div>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Admin panel ───────────── */

const ADMIN_TABS = [
  {
    key: 'moderation',
    label: 'Moderatsiya',
    rows: [
      ["Ko'chada o'ra ochiq qoldirilgan", 'Suv', 'Tasdiqlash'],
      ['Skver skameykalari singan', 'Obodonlashtirish', 'Tasdiqlash'],
      ['Yo‘lda chuqur (takroriy)', "Yo'l", 'Birlashtirish'],
    ],
  },
  {
    key: 'rounds',
    label: 'Ovoz davrlari',
    rows: [
      ['Noyabr 2026', 'Faol', '412 ovoz'],
      ['Oktyabr 2026', 'Yakunlangan', '388 ovoz'],
      ['Sentyabr 2026', 'Yakunlangan', '351 ovoz'],
    ],
  },
  {
    key: 'audit',
    label: 'Audit jurnali',
    rows: [
      ['admin.yunusobod', 'Postni tasdiqladi', '2 daq oldin'],
      ['admin.yunusobod', 'E’lon yaratdi', '1 soat oldin'],
      ['admin.yunusobod', 'Aholi qo‘shdi', 'Kecha'],
    ],
  },
] as const;

function AdminPanel() {
  const [tab, setTab] = useState(0);
  const t = ADMIN_TABS[tab]!;
  return (
    <section id="admin" className="section dark">
      <div className="lp-wrap admin">
        <Reveal className="admin-copy">
          <p className="eyebrow light">Adminlar uchun</p>
          <h2>Butun mahalla — bitta panelda</h2>
          <p className="lead-light">
            Moderatsiya navbati, shikoyatlar, ovoz davrlari, aholi, tadbirlar va e’lonlar. Har bir amal audit jurnaliga
            yoziladi.
          </p>
          <Link href="/login" className="lp-btn lp-btn-light">
            Panelga kirish →
          </Link>
        </Reveal>
        <Reveal delay={120} className="admin-win">
          <div className="win">
            <div className="win-bar">
              <i /> <i /> <i />
              <span>admin.mahalladosh.uz</span>
            </div>
            <div className="win-body">
              <aside>
                {ADMIN_TABS.map((a, i) => (
                  <button type="button" key={a.key} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>
                    {a.label}
                  </button>
                ))}
              </aside>
              <div className="win-main" key={t.key}>
                <div className="kpis">
                  <div>
                    <b>
                      <CountUp to={412} />
                    </b>
                    <span>Ovozlar</span>
                  </div>
                  <div>
                    <b>
                      <CountUp to={7} />
                    </b>
                    <span>Kutmoqda</span>
                  </div>
                  <div>
                    <b>
                      <CountUp to={2} />
                    </b>
                    <span>Shikoyat</span>
                  </div>
                </div>
                {t.rows.map((r) => (
                  <div className="row" key={r[0]}>
                    <span>{r[0]}</span>
                    <small>{r[1]}</small>
                    <em>{r[2]}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── FAQ ───────────── */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="section">
      <div className="lp-wrap faq">
        <Reveal>
          <p className="eyebrow">Savollar</p>
          <h2>Ko‘p so‘raladigan savollar</h2>
        </Reveal>
        <div className="faq-list">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 50}>
              <div className={`faq-item ${open === i ? 'open' : ''}`}>
                <button
                  type="button"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {f.q}
                  <span aria-hidden="true">+</span>
                </button>
                <div className="faq-a">
                  <p>{f.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── CTA + Footer ───────────── */

function Cta() {
  return (
    <section className="cta">
      <div className="lp-wrap">
        <Reveal>
          <h2>Mahallangiz ovozini bugun eshittiring</h2>
          <p>Admin akkaunt bilan kiring va birinchi ovoz davrini oching.</p>
          <div className="hero-cta center">
            <Link href="/login" className="lp-btn lp-btn-light">
              Kirish →
            </Link>
            <a href="#top" className="lp-btn lp-btn-outline">
              Yuqoriga ↑
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const [year] = useState(() => new Date().getFullYear());
  return (
    <footer className="lp-footer">
      <div className="lp-wrap foot-row">
        <a href="#top" className="lp-brand">
          <img src="/logo-mark.png" alt="" className="lp-logo" />Mahalladosh
        </a>
        <span>© {year} Mahalladosh · Mahalla uchun, mahalla bilan</span>
        <div className="foot-links">
          <Link href="/login">Kirish</Link>
          <a href="#faq">Savollar</a>
        </div>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="lp">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <TryIt />
        <AdminPanel />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
