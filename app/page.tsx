import Image from "next/image";
import { Inter } from "next/font/google";
import { PosterExamples } from "./components/PosterExamples";

const inter = Inter({ subsets: ["latin"] });

const navItems = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const featureCards = [
  {
    title: "Search any song",
    description:
      "Find a track in seconds and pull in the details you need to begin a polished poster layout.",
  },
  {
    title: "Generate a refined poster",
    description:
      "Create an elegant composition with balanced typography and artwork that feels gallery-ready.",
  },
  {
    title: "Download or print",
    description:
      "Export high-resolution files for sharing online, framing at home, or printing professionally.",
  },
];

const faqs = [
  {
    q: "Can I create posters without design experience?",
    a: "Yes. The app handles layout and style automatically so you can focus on the song and mood.",
  },
  {
    q: "What kind of songs can I use?",
    a: "Any track you love—new releases, classics, or your own music. The tool is designed to be flexible.",
  },
  {
    q: "Are downloads print-ready?",
    a: "Yes. You can export clean, high-resolution files suitable for both digital sharing and physical prints.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <header className="flex items-center justify-between rounded-full border border-stone-200 bg-white/90 px-6 py-3">
          <p className={`${inter.className} text-xl tracking-tight`}>
            <span className="font-bold text-[#111]">Sound</span>
            <span className="font-light text-[#777]">frame</span>
          </p>
          <nav className="hidden gap-8 text-sm text-stone-600 md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-stone-900">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="/create"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
          >
            Create
          </a>
        </header>

        <section className="mt-20 rounded-3xl border border-stone-200 bg-white px-8 py-14 md:px-14 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Music Poster Generator</p>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-stone-900 md:text-6xl">
                Turn any song into an elegant poster.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
                Create beautifully composed music posters in moments—minimal, refined, and ready to share or print.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="/create"
                  className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Create
                </a>
                <a
                  href="#how-it-works"
                  className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                >
                  Explore features
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
                <Image
                  src="/examples/conspiraciones-poster.jpg"
                  alt="Featured poster preview"
                  width={840}
                  height={1080}
                  className="h-auto w-full rounded-xl object-cover"
                  sizes="360px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <PosterExamples />

        <section id="how-it-works" className="mt-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">Everything you need to make a poster.</h2>
            <p className="max-w-xl text-stone-600">
              A simple flow designed for music lovers who want striking, print-worthy artwork without complexity.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featureCards.map((feature, index) => (
              <article key={feature.title} className="rounded-2xl border border-stone-200 bg-white p-7">
                <p className="text-sm font-medium text-stone-500">0{index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-20 rounded-3xl border border-stone-200 bg-white p-8 md:p-10">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="font-semibold text-stone-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{faq.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-stone-200 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-stone-500">Create a timeless poster from the songs you love.</p>
            <a
              href="/create"
              className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Create
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
