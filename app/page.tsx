import Image from "next/image";
import { Inter } from "next/font/google";
import { PosterExamples } from "./components/PosterExamples";
import logo from "./azteuno.png";
import songPreview from "./song.jpg";
import momentPreview from "./moment.jpg";
import mapPreview from "./examples/nuevayol-poster-1000.jpg";
import videoPreview from "./Video.jpg";

const inter = Inter({ subsets: ["latin"] });
const interSemibold = Inter({ subsets: ["latin"], weight: "600" });

const formatSlides = [
  {
    title: "Special Moment",
    description: "Turn a memory into a shareable visual.",
    href: "/create-2",
    cta: "Create moment visual",
    image: momentPreview,
    imageAlt: "Special Moment format preview",
  },
  {
    title: "Video Reveal",
    description: "Turn your text and photo into a minimal reveal video visual.",
    href: "/create-4",
    cta: "Create reveal visual",
    image: videoPreview,
    imageAlt: "Video Reveal format preview",
  },
  {
    title: "Map Message",
    description: "Turn a place into a meaningful visual.",
    href: "/create-3",
    cta: "Create map visual",
    image: mapPreview,
    imageAlt: "Map Message format preview",
  },
  {
    title: "Favorite Song",
    description: "Turn a song into a refined visual.",
    href: "/create",
    cta: "Create song visual",
    image: songPreview,
    imageAlt: "Favorite Song format preview",
  },
];

const featureCards = [
  {
    title: "Search any song",
    description:
      "Find a track in seconds and pull in the details you need to begin a polished visual layout.",
  },
  {
    title: "Generate a refined visual",
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
    q: "Can I create visuals without design experience?",
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
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <header className="mx-auto max-w-md py-2 text-center md:py-4">
          <Image
            src={logo}
            alt="Azteuno"
            className="mx-auto h-auto w-52 md:w-64"
            priority
          />
          <p
            className={`${interSemibold.className} mt-5 text-base leading-tight tracking-tight text-stone-950 sm:text-lg md:mt-6 md:whitespace-nowrap`}
          >
            Songs, moments, places. Made <span className="text-[#FF6B57]">visual</span>.
          </p>
        </header>

        <section className="mt-5 md:mt-7">
          <div className="mobile-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pl-1 pr-8">
            {formatSlides.map((slide, index) => (
              <article
                key={slide.title}
                className="flex w-[80%] shrink-0 snap-start flex-col rounded-3xl border border-stone-200 bg-white p-3.5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] md:w-[44%] md:p-4 lg:w-[31%]"
              >
                <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-100/80 p-2.5 md:p-3">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    width={840}
                    height={1080}
                    className="h-full w-full rounded-xl object-contain"
                    priority={index === 0}
                    sizes="(max-width: 768px) 80vw, (max-width: 1024px) 44vw, 31vw"
                  />
                </div>
                <div className="mt-3 flex flex-1 flex-col px-0.5">
                  <h2 className={`${inter.className} text-lg font-semibold tracking-tight text-stone-900`}>
                    {slide.title}
                  </h2>
                  <p className="mt-1 text-sm leading-snug text-stone-600 md:min-h-[2.75rem]">{slide.description}</p>
                  <a
                    href={slide.href}
                    className="mt-2.5 inline-flex w-fit rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 md:mt-auto"
                  >
                    {slide.cta}
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-2 flex justify-center gap-2 md:mt-3">
            {formatSlides.map((slide) => (
              <span key={slide.title} className="h-1.5 w-6 rounded-full bg-stone-300" aria-hidden="true" />
            ))}
          </div>
        </section>

        <PosterExamples />

        <section id="how-it-works" className="mt-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">Everything you need to make a visual.</h2>
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
            <p className="text-sm text-stone-500">Create a timeless visual from the songs you love.</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/create"
                className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                Your Favorite Song
              </a>
              <a
                href="/create-2"
                className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                Your Special Moment
              </a>
              <a
                href="/create-4"
                className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                Your Minimal Reveal
              </a>
              <a
                href="/create-3"
                className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                Your Map Message
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
