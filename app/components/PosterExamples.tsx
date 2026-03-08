import Image from "next/image";

const posters = [
  {
    src: "/examples/Póster 1.jpg",
    alt: "Poster 1 example",
    caption: "Póster 1",
  },
  {
    src: "/examples/Póster 2.jpg",
    alt: "Poster 2 example",
    caption: "Póster 2",
  },
  {
    src: "/examples/Póster 3.jpg",
    alt: "Poster 3 example",
    caption: "Póster 3",
  },
];

export function PosterExamples() {
  return (
    <section className="mt-20" aria-labelledby="poster-examples-title">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Selected examples</p>
      <h2 id="poster-examples-title" className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
        Posters created with the product
      </h2>
      <p className="mt-4 max-w-2xl text-stone-600">
        A few examples showing different moods, palettes, and compositions.
      </p>

      <div className="mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {posters.map((poster) => (
          <article
            key={poster.src}
            className="rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
              <Image
                src={poster.src}
                alt={poster.alt}
                width={800}
                height={1000}
                className="h-auto w-full object-cover"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
            </div>
            <p className="mt-2 text-xs text-stone-600">{poster.caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
