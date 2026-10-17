import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { toFa } from "../utils/geo";
import { cn } from "../utils/cn";

interface Props {
  images: string[];
  alt: string;
  emoji?: string;
  className?: string;
}

/** گالری تصاویر افقی با قابلیت تمام‌صفحه */
export default function Gallery({ images, alt, emoji, className }: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(0);
    setFailed({});
    ref.current?.scrollTo({ left: 0 });
  }, [images]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(images.length - 1, Math.max(0, i)));
  };

  const scrollTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const clamped = (i + images.length) % images.length;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  };

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500",
          className
        )}
      >
        <div className="text-center">
          <div className="text-5xl">{emoji ?? "📍"}</div>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs">
            <ImageOff className="h-3.5 w-3.5" /> تصویری ثبت نشده
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("group relative bg-slate-200", className)}>
        <div
          ref={ref}
          dir="ltr"
          onScroll={onScroll}
          className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {images.map((src, i) => (
            <div key={src + i} className="h-full w-full shrink-0 snap-center">
              {failed[i] ? (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-400">
                  <ImageOff className="h-8 w-8" />
                </div>
              ) : (
                <img
                  src={src}
                  alt={`${alt} — تصویر ${toFa(i + 1)}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                  onClick={() => setOpen(true)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {/* شمارنده و دکمه تمام‌صفحه */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            {toFa(index + 1)} / {toFa(images.length)}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto rounded-full bg-black/55 p-2 text-white backdrop-blur hover:bg-black/70"
            aria-label="نمایش تمام‌صفحه"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={() => scrollTo(index - 1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-slate-800 shadow hover:bg-white md:group-hover:block"
              aria-label="قبلی"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollTo(index + 1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-slate-800 shadow hover:bg-white md:group-hover:block"
              aria-label="بعدی"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* نقطه‌های پیمایش */}
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full bg-white/80 shadow transition-all",
                    i === index ? "w-5" : "w-1.5 opacity-70"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {open &&
        createPortal(
          <Lightbox
            images={images}
            start={index}
            alt={alt}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}

function Lightbox({
  images,
  start,
  alt,
  onClose,
}: {
  images: string[];
  start: number;
  alt: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/95 animate-fade-in"
      onClick={onClose}
      dir="ltr"
    >
      <img
        src={images[i]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain shadow-2xl"
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"
        aria-label="بستن"
      >
        <X className="h-6 w-6" />
      </button>
      <span className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
        {toFa(i + 1)} / {toFa(images.length)}
      </span>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"
            aria-label="قبلی"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"
            aria-label="بعدی"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}
    </div>
  );
}
