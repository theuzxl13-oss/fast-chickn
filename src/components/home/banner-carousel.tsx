"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Banner } from "@/types";
import { cn } from "@/utils/cn";

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const timer = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (index + 1) % banners.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(timer);
  }, [index, banners.length, paused]);

  if (!banners.length) return null;

  return (
    <section aria-roledescription="carrossel" aria-label="Promoções" className="relative">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const t = e.currentTarget;
          setIndex(Math.round(t.scrollLeft / t.clientWidth));
        }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-4xl"
      >
        {banners.map((b, i) => {
          const content = (
            <div
              className="speed-lines relative flex h-40 w-full items-center justify-between overflow-hidden rounded-4xl px-6 text-white md:h-52 md:px-10"
              style={{ backgroundColor: b.bg_color }}
            >
              {b.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
              )}
              <div className="relative max-w-[65%]">
                <p className="text-2xl font-black italic leading-tight md:text-4xl">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-sm font-medium text-white/90 md:text-base">{b.subtitle}</p>}
              </div>
              {b.emoji && (
                <span className="relative text-6xl drop-shadow-lg md:text-8xl" aria-hidden>
                  {b.emoji}
                </span>
              )}
            </div>
          );
          return (
            <div
              key={b.id}
              className="w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${banners.length}`}
            >
              {b.link_url ? <Link href={b.link_url}>{content}</Link> : content}
            </div>
          );
        })}
      </div>
      {banners.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Ir para o banner ${i + 1}`}
              onClick={() => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: "smooth" })}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand-500" : "w-1.5 bg-ink-200")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
