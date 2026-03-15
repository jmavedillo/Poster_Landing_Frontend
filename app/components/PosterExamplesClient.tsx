"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ExampleImage = {
  id: string;
  src: string;
  alt: string;
};

type ViewerBounds = {
  x: number;
  y: number;
};

type ViewerImageSize = {
  width: number;
  height: number;
};

export function PosterExamplesClient({ images }: { images: ExampleImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [bounds, setBounds] = useState<ViewerBounds>({ x: 0, y: 0 });
  const [viewerImageSize, setViewerImageSize] = useState<ViewerImageSize>({ width: 0, height: 0 });

  const activeImage = activeIndex !== null ? images[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex]);

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    const img = new window.Image();
    img.src = activeImage.src;
    img.onload = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ratio = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
      const renderedWidth = img.naturalWidth * ratio;
      const renderedHeight = img.naturalHeight * ratio;

      setViewerImageSize({
        width: renderedWidth,
        height: renderedHeight,
      });

      setBounds({
        x: Math.max(0, (renderedWidth - vw) / 2),
        y: Math.max(0, (renderedHeight - vh) / 2),
      });
      setOffset({ x: 0, y: 0 });
    };
  }, [activeImage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const hasImages = images.length > 0;
  const isPannable = bounds.x > 0 || bounds.y > 0;

  const gridItems = useMemo(() => images.slice(0, 12), [images]);

  return (
    <section className="mt-16 md:mt-20" aria-labelledby="poster-examples-title">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Examples gallery</p>
      <h2 id="poster-examples-title" className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
        See what your song could become
      </h2>
      <p className="mt-4 max-w-2xl text-stone-600">
        Open any poster and feel it full screen—like it already belongs on your wall.
      </p>

      {hasImages ? (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {gridItems.map((poster, index) => (
            <button
              key={poster.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.14)]"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
                <Image
                  src={poster.src}
                  alt={poster.alt}
                  fill
                  unoptimized
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
          No examples were found in <span className="font-semibold">/app/examples</span>.
        </p>
      )}

      {activeImage ? (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black" role="dialog" aria-modal="true" aria-label="Fullscreen poster preview">
          <div
            className={`absolute inset-0 touch-none ${isPannable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
            onPointerDown={(event) => {
              if (!isPannable) {
                return;
              }

              const startX = event.clientX;
              const startY = event.clientY;
              const origin = { ...offset };
              (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

              const onMove = (moveEvent: PointerEvent) => {
                const nextX = origin.x + moveEvent.clientX - startX;
                const nextY = origin.y + moveEvent.clientY - startY;

                setOffset({
                  x: Math.min(bounds.x, Math.max(-bounds.x, nextX)),
                  y: Math.min(bounds.y, Math.max(-bounds.y, nextY)),
                });
              };

              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <Image
              src={activeImage.src}
              alt={activeImage.alt}
              width={Math.max(1, Math.round(viewerImageSize.width || 1))}
              height={Math.max(1, Math.round(viewerImageSize.height || 1))}
              unoptimized
              className="absolute left-1/2 top-1/2 max-w-none select-none object-cover"
              sizes="100vw"
              draggable={false}
              style={{
                width: viewerImageSize.width ? `${viewerImageSize.width}px` : "100vw",
                height: viewerImageSize.height ? `${viewerImageSize.height}px` : "100dvh",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-stone-900 shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur"
            aria-label="Close fullscreen viewer"
          >
            ×
          </button>

          <p className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] text-white/90 backdrop-blur-sm">
            Made with AZTE.UNO
          </p>
        </div>
      ) : null}
    </section>
  );
}
